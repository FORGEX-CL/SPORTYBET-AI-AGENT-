import { applyHistoricalFeedback } from "./learningFeedback.js";

export function scoreSelection({confidence=0,value=0,risk=0,dataQuality=0,agreement=0,historicalAdjustment=0}={}){
  const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
  return (clamp(confidence)*0.30)+(clamp(value)*0.20)+(clamp(dataQuality)*0.20)+(clamp(agreement)*0.15)+((1-clamp(risk))*0.15)+(clamp(historicalAdjustment)*0);
}

export function scoreTicket(selections){
  if(!selections.length)return 0;
  return selections.reduce((sum,s)=>sum+Number(s.score||0),0)/selections.length;
}

export function diversifyTickets(tickets,maxTickets=10){
  const used=new Set(),result=[];
  for(const ticket of [...tickets].sort((a,b)=>(b.score||0)-(a.score||0))){
    const key=ticket.selections.map(s=>s.selectionId).sort().join("|");
    if(used.has(key))continue;
    used.add(key);result.push(ticket);
    if(result.length===maxTickets)break;
  }
  return result;
}
