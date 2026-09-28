import { scoreSelection } from "./ticketScoring.js";

const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

export function aggregateSelectionReports(reports=[]){
  const byKey=new Map();
  for(const r of reports){
    const key=`${r.eventId}:${r.marketId}:${r.selectionId}`;
    const item=byKey.get(key)||{...r,agents:[],agreement:0,risk:0,value:0,confidence:0,dataQuality:0};
    item.agents.push(r.agentId);
    item.confidence=Math.max(item.confidence,clamp(r.confidence));
    item.dataQuality=Math.max(item.dataQuality,clamp(r.dataQuality));
    item.value=Math.max(item.value,Number(r.value)||0);
    item.risk=Math.max(item.risk,r.risks?.length?Math.min(1,r.risks.length*.2):0);
    byKey.set(key,item);
  }
  return [...byKey.values()].map(x=>({...x,agreement:x.agents.length/7,score:scoreSelection(x)})).sort((a,b)=>b.score-a.score);
}

export function runHeadAnalyst(reports,{minScore=.55,maxSelections=50}={}){
  const candidates=aggregateSelectionReports(reports).filter(x=>x.score>=minScore);
  const accepted=candidates.slice(0,maxSelections);
  const rejected=candidates.slice(maxSelections);
  return {
    accepted,
    rejected,
    noBet:accepted.length===0,
    reasoning:accepted.length
      ? "Accepted only selections with sufficient evidence and multi-agent support; remaining candidates were filtered."
      : "No selection met the configured evidence threshold.",
    decidedAt:new Date().toISOString()
  };
}
