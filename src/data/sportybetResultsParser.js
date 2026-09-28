const cleanLines=text=>text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const TIME_ID=/^\d{1,2}:\d{2}\s+ID\s+(\d+)$/;
const DATE_TIME_ID=/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}$/;
const SCORE=/^(\d+)\s*:\s*(\d+)$/;
const HALF_SCORE=/^H1\s+(\d+)\s*:\s*(\d+)$/i;

function parseScore(line){
  const match=line.match(SCORE);
  return match?{home:Number(match[1]),away:Number(match[2])}:null;
}

export function parseSportyBetFootballResults(text=""){
  const lines=cleanLines(text),results=[];
  for(let i=0;i<lines.length;i++){
    if(!DATE_TIME_ID.test(lines[i])&&!TIME_ID.test(lines[i]))continue;
    let cursor=i+1;
    const eventId=(lines[i].match(TIME_ID)?.[1])??(lines[cursor++]??"");
    if(!/^\d+$/.test(eventId))continue;
    const home=lines[cursor++]??"";
    const finalScore=parseScore(lines[cursor++]??"");
    if(!home||!finalScore)continue;
    let halfTime=null;
    if(HALF_SCORE.test(lines[cursor]??"")){const m=lines[cursor].match(HALF_SCORE);halfTime={home:Number(m[1]),away:Number(m[2])};cursor++;}
    const away=lines[cursor++]??"";
    if(!away||SCORE.test(away))continue;
    results.push({eventId,sport:"football",home,away,finalScore,halfTime,status:"settled",source:"SportyBet"});
    i=cursor-1;
  }
  return results;
}

function resultFor1X2(result,name){
  const n=String(name).toLowerCase(),h=result.finalScore.home,a=result.finalScore.away;
  if(n==="home"||n==="1")return h>a?"won":"lost";
  if(n==="away"||n==="2")return a>h?"won":"lost";
  if(n==="draw"||n==="x")return h===a?"won":"lost";
  return"unknown";
}

function resultForDoubleChance(result,name){
  const n=String(name).toLowerCase(),h=result.finalScore.home,a=result.finalScore.away;
  if(n.includes("home")&&n.includes("draw"))return h>=a?"won":"lost";
  if(n.includes("draw")&&n.includes("away"))return a>=h?"won":"lost";
  if(n.includes("home")&&n.includes("away"))return h!==a?"won":"lost";
  return"unknown";
}

function resultForDrawNoBet(result,name){
  const n=String(name).toLowerCase(),h=result.finalScore.home,a=result.finalScore.away;
  if(h===a)return"void_or_push";
  if(n==="home"||n==="1")return h>a?"won":"lost";
  if(n==="away"||n==="2")return a>h?"won":"lost";
  return"unknown";
}

function parseLineTotal(name){
  const m=String(name).match(/(over|under)\s*(\d+(?:\.\d+)?)/i);
  return m?{side:m[1].toLowerCase(),line:Number(m[2])}:null;
}

function resultForTotals(result,name){
  const parsed=parseLineTotal(name),total=result.finalScore.home+result.finalScore.away;
  if(!parsed)return"unknown";
  if(total===parsed.line)return"void_or_push";
  return parsed.side==="over"?(total>parsed.line?"won":"lost"):(total<parsed.line?"won":"lost");
}

function resultForBothTeams(result,name){
  const both=result.finalScore.home>0&&result.finalScore.away>0;
  const n=String(name).toLowerCase();
  const yes=n.includes("yes")||n.includes("gg")||n.includes("both teams");
  return yes?(both?"won":"lost"):(both?"lost":"won");
}

function resultForGG2Plus(result,name){
  const yes=result.finalScore.home>=2&&result.finalScore.away>=2;
  return String(name).toLowerCase().includes("yes")?(yes?"won":"lost"):(yes?"lost":"won");
}

function resultForExactGoals(result,name){
  const total=result.finalScore.home+result.finalScore.away;
  const n=String(name).trim().toLowerCase();
  const plus=n.match(/^(\d+)\+$/);
  if(plus)return total>=Number(plus[1])?"won":"lost";
  const line=Number(n);
  return Number.isFinite(line)?(total===line?"won":"lost"):"unknown";
}

function resultForGoalRange(result,name){
  const total=result.finalScore.home+result.finalScore.away;
  const n=String(name).trim();
  const range=n.match(/^(\d+)\s*-\s*(\d+)$/);
  if(range)return total>=Number(range[1])&&total<=Number(range[2])?"won":"lost";
  const plus=n.match(/^(\d+)\+\s*$/);
  return plus?(total>=Number(plus[1])?"won":"lost"):"unknown";
}

function resultForWinningMargin(result,name){
  const h=result.finalScore.home,a=result.finalScore.away,diff=Math.abs(h-a),n=String(name).toLowerCase();
  if(n==="draw")return diff===0?"won":"lost";
  const side=n.startsWith("home")?"home":n.startsWith("away")?"away":null;
  if(!side)return"unknown";
  const isThreePlus=n.includes("3+");
  const margin=Number(n.match(/(\d+)/)?.[1]);
  if(!Number.isFinite(margin))return"unknown";
  return side==="home"?(h>a&&(isThreePlus?diff>=margin:diff===margin)?"won":"lost"):(a>h&&(isThreePlus?diff>=margin:diff===margin)?"won":"lost");
}

function resultForOddEven(result,name){
  const total=result.finalScore.home+result.finalScore.away;
  return String(name).toLowerCase()===(total%2?"odd":"even")?"won":"lost";
}

function parseAdjustedSelection(name){
  const n=String(name);
  const pair=n.match(/\(\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*\)/);
  if(pair)return{type:"pair",home:Number(pair[1]),away:Number(pair[2]),side:n.toLowerCase().startsWith("home")?"home":n.toLowerCase().startsWith("away")?"away":n.toLowerCase().startsWith("draw")?"draw":null};
  const single=n.match(/\(\s*([+-]?\d+(?:\.\d+)?)\s*\)/);
  if(single)return{type:"single",line:Number(single[1]),side:n.toLowerCase().startsWith("home")?"home":n.toLowerCase().startsWith("away")?"away":null};
  return null;
}

function compareAdjusted(home,away,side){
  if(home>away)return side==="home"?"won":"lost";
  if(away>home)return side==="away"?"won":"lost";
  return side==="draw"?"won":"void_or_push";
}

function resultForHandicap(result,selectionName){
  const parsed=parseAdjustedSelection(selectionName);
  if(!parsed)return"unknown";
  if(parsed.type==="pair")return compareAdjusted(result.finalScore.home+parsed.home,result.finalScore.away+parsed.away,parsed.side);
  const adjustedHome=parsed.side==="home"?result.finalScore.home+parsed.line:result.finalScore.home;
  const adjustedAway=parsed.side==="away"?result.finalScore.away+parsed.line:result.finalScore.away;
  return compareAdjusted(adjustedHome,adjustedAway,parsed.side);
}

function resultForCorrectScore(result,name){
  const match=String(name).match(/^(\d+)\s*:\s*(\d+)$/);
  return match?(result.finalScore.home===Number(match[1])&&result.finalScore.away===Number(match[2])?"won":"lost"):"unknown";
}

function resultForGoalBounds(result,name){
  const total=result.finalScore.home+result.finalScore.away;
  const n=String(name).trim();
  const plus=n.match(/^(\d+)\+$/);
  if(plus)return total>=Number(plus[1])?"won":"lost";
  const range=n.match(/^(\d+)\s*-\s*(\d+)$/);
  return range?(total>=Number(range[1])&&total<=Number(range[2])?"won":"lost"):"unknown";
}

function resultForHalfTimeFullTime(result,name){
  if(!result.halfTime)return"unknown";
  const parts=String(name).split("/").map(x=>x.trim().toLowerCase());
  if(parts.length!==2)return"unknown";
  const h=result.finalScore.home,a=result.finalScore.away,hh=result.halfTime.home,ha=result.halfTime.away;
  const first=hh>ha?"home":hh<ha?"away":"draw",second=h>a?"home":h<a?"away":"draw";
  return parts[0]===first&&parts[1]===second?"won":"lost";
}

export function settleFootballSelection(result,{marketName="",selectionName=""}={}){
  const market=String(marketName).toLowerCase();
  if(market==="1x2"||market.includes("match winner"))return resultFor1X2(result,selectionName);
  if(market.includes("double chance"))return resultForDoubleChance(result,selectionName);
  if(market==="draw no bet")return resultForDrawNoBet(result,selectionName);
  if(market.includes("asian handicap")||market==="handicap"||market.startsWith("handicap "))return resultForHandicap(result,selectionName);
  if(market.includes("over/under")||market.includes("total goals")||market.includes("total points"))return resultForTotals(result,selectionName);
  if(market.includes("both teams to score"))return resultForBothTeams(result,selectionName);
  if(market.startsWith("gg/ng 2"))return resultForGG2Plus(result,selectionName);
  if(market.startsWith("gg/ng"))return resultForBothTeams(result,selectionName);
  if(market.includes("exact goals"))return resultForExactGoals(result,selectionName);
  if(market.includes("goal range"))return resultForGoalRange(result,selectionName);
  if(market.includes("goal bounds"))return resultForGoalBounds(result,selectionName);
  if(market.includes("winning margin"))return resultForWinningMargin(result,selectionName);
  if(market==="odd/even")return resultForOddEven(result,selectionName);
  if(market.includes("correct score"))return resultForCorrectScore(result,selectionName);
  if(market.includes("half time/full time")||market.includes("halftime/fulltime"))return resultForHalfTimeFullTime(result,selectionName);
  return"unknown";
}

export function settleSelectionsFromSportyBetResults(selections=[],results=[]){
  const byId=new Map(results.map(r=>[String(r.eventId),r]));
  return selections.map(selection=>{
    const result=byId.get(String(selection.eventId));
    if(!result)return{...selection,result:"unknown",settlementSource:null};
    return{...selection,result:settleFootballSelection(result,{marketName:selection.marketName,selectionName:selection.selection}),settlementSource:"SportyBet"};
  });
}
