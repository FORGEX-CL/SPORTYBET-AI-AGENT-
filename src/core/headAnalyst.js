import { scoreSelection } from "./ticketScoring.js";

const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const PREDICTIVE_AGENTS=new Set(["statistics","football","multiSport","odds","risk"]);

export function aggregateSelectionReports(reports=[]){
  const byKey=new Map();
  for(const r of reports){
    const key=`${r.eventId}:${r.marketId}:${r.selectionId}`;
    const item=byKey.get(key)||{...r,agents:[],predictiveAgents:[],agreement:0,risk:0,value:0,confidence:0,dataQuality:0};
    item.agents.push(r.agentId);
    if(PREDICTIVE_AGENTS.has(r.agentId)&&clamp(r.dataQuality)>0&&clamp(r.confidence)>0)item.predictiveAgents.push(r.agentId);
    item.confidence=Math.max(item.confidence,clamp(r.confidence));
    item.dataQuality=Math.max(item.dataQuality,clamp(r.dataQuality));
    item.value=Math.max(item.value,Number(r.value)||0);
    item.risk=Math.max(item.risk,r.risks?.length?Math.min(1,r.risks.length*.2):0);
    byKey.set(key,item);
  }
  return [...byKey.values()].map(x=>({...x,predictiveAgreement:x.predictiveAgents.length/5,agreement:x.predictiveAgents.length/5,score:scoreSelection({...x,agreement:x.predictiveAgents.length/5})})).sort((a,b)=>b.score-a.score);
}
export function runHeadAnalyst(reports,{minScore=.55,maxSelections=50,minPredictiveAgents=2,minDataQuality=.5}={}){
  const aggregated=aggregateSelectionReports(reports);
  const candidates=aggregated.filter(x=>x.predictiveAgents.length>=minPredictiveAgents&&x.dataQuality>=minDataQuality&&x.score>=minScore);
  const rejected=aggregated.filter(x=>!candidates.includes(x));
  const accepted=candidates.slice(0,maxSelections);
  return{accepted,rejected,noBet:accepted.length===0,reasoning:accepted.length?"Accepted only selections supported by the minimum number of predictive agents, sufficient data quality and the configured score threshold.":"NO BET: no selection met predictive-agent, data-quality and score requirements.",requirements:{minScore,minPredictiveAgents,minDataQuality},decidedAt:new Date().toISOString()};
}
