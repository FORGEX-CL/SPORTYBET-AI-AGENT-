import { normalizeSelection } from "../core/types.js";

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
  const n=String(name).toLowerCase();
  const h=result.finalScore.home,a=result.finalScore.away;
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

function parseLineTotal(name){
  const m=String(name).match(/(over|under)\s*(\d+(?:\.\d+)?)/i);
  return m?{side:m[1].toLowerCase(),line:Number(m[2])}:null;
}

function resultForTotals(result,name){
  const parsed=parseLineTotal(name);
  if(!parsed)return"unknown";
  const total=result.finalScore.home+result.finalScore.away;
  if(total===parsed.line)return"void_or_push";
  return parsed.side==="over"?(total>parsed.line?"won":"lost"):(total<parsed.line?"won":"lost");
}

export function settleFootballSelection(result,{marketName="",selectionName=""}={}){
  const market=String(marketName).toLowerCase();
  if(market==="1x2"||market.includes("match winner"))return resultFor1X2(result,selectionName);
  if(market.includes("double chance"))return resultForDoubleChance(result,selectionName);
  if(market.includes("over/under")||market.includes("total goals")||market.includes("total points"))return resultForTotals(result,selectionName);
  if(market.includes("both teams to score")){
    const both=result.finalScore.home>0&&result.finalScore.away>0;
    return String(selectionName).toLowerCase().includes("yes")||String(selectionName).toLowerCase().includes("gg")?(both?"won":"lost"):(both?"lost":"won");
  }
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
