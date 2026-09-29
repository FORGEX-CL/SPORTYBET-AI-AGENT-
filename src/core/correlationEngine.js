const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

function leagueKey(s){return `${s.sport??"unknown"}::${s.league??"unknown"}`;}
function marketKey(s){return String(s.marketName??"unknown").toLowerCase();}

export function pairCorrelation(a,b){
  if(String(a.eventId)===String(b.eventId))return 1;
  const sameLeague=leagueKey(a)===leagueKey(b);
  const sameMarket=marketKey(a)===marketKey(b);
  if(sameLeague&&sameMarket)return .34;
  if(sameLeague)return .18;
  if(String(a.sport??"")===String(b.sport??""))return .07;
  return .02;
}

export function portfolioCorrelation(selections=[]){
  if(selections.length<2)return 0;
  let pairs=0,total=0;
  for(let i=0;i<selections.length;i++){
    for(let j=i+1;j<selections.length;j++){
      total+=pairCorrelation(selections[i],selections[j]);
      pairs++;
    }
  }
  return pairs?clamp(total/pairs):0;
}

export function marginalCorrelationPenalty(candidate,chosen=[]){
  if(!chosen.length)return 0;
  const values=chosen.map(x=>pairCorrelation(candidate,x));
  return Math.min(.25,values.reduce((s,x)=>s+x,0)/values.length);
}
