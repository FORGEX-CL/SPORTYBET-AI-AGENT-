import { scoreSelection } from "./ticketScoring.js";

const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const PREDICTIVE_AGENTS=new Set(["statistics","football","multiSport","odds"]);

const debateFor=(debate,key)=>debate.filter(m=>`${m.eventId}:${m.marketId}:${m.selectionId}`===key);

export function aggregateSelectionReports(reports=[],debate=[]){
  const byKey=new Map();
  for(const r of reports){
    const key=`${r.eventId}:${r.marketId}:${r.selectionId}`;
    const item=byKey.get(key)||{...r,agents:[],predictiveAgents:[],agreement:0,risk:0,value:0,confidence:0,predictiveConfidence:0,dataQuality:0,predictiveDataQuality:0,debate:[]};
    item.agents.push(r.agentId);
    if(PREDICTIVE_AGENTS.has(r.agentId)){
      if(clamp(r.dataQuality)>0&&clamp(r.confidence)>0)item.predictiveAgents.push(r.agentId);
      item.predictiveConfidence=Math.max(item.predictiveConfidence,clamp(r.confidence));
      item.predictiveDataQuality=Math.max(item.predictiveDataQuality,clamp(r.dataQuality));
      item.value=Math.max(item.value,Number(r.value)||0);
    }
    item.confidence=item.predictiveConfidence;
    item.dataQuality=item.predictiveDataQuality;
    if(r.agentId==="risk")item.risk=Math.max(item.risk,Array.isArray(r.risks)?Math.min(1,r.risks.length*.2):0);
    item.debate=debateFor(debate,key);
    byKey.set(key,item);
  }
  return [...byKey.values()].map(x=>{
    const highChallenges=x.debate.filter(d=>d.severity==="high").length;
    const mediumChallenges=x.debate.filter(d=>d.severity==="medium").length;
    const challengePenalty=Math.min(.35,highChallenges*.20+mediumChallenges*.10+(x.debate.some(d=>d.severity==="unverified")?.03:0));
    const baseScore=scoreSelection({...x,confidence:x.predictiveConfidence,dataQuality:x.predictiveDataQuality,agreement:x.predictiveAgents.length/4});
    return{...x,predictiveAgreement:x.predictiveAgents.length/4,agreement:x.predictiveAgents.length/4,challengePenalty,score:Math.max(0,baseScore-challengePenalty)};
  }).sort((a,b)=>b.score-a.score);
}

export function runHeadAnalyst(reports,{debate=[],minScore=.55,maxSelections=50,minPredictiveAgents=2,minDataQuality=.5}={}){
  const aggregated=aggregateSelectionReports(reports,debate);
  const candidates=aggregated.filter(x=>x.predictiveAgents.length>=minPredictiveAgents&&x.predictiveDataQuality>=minDataQuality&&x.score>=minScore&&!x.debate.some(d=>d.severity==="high"));
  const rejected=aggregated.filter(x=>!candidates.includes(x));
  const accepted=candidates.slice(0,maxSelections);
  return{accepted,rejected,noBet:accepted.length===0,reasoning:accepted.length?"Accepted only selections supported by predictive-agent evidence, adequate data quality and a survived Risk/Contrarian challenge.":"NO BET: no selection met predictive-agent, data-quality and Risk/Contrarian challenge requirements.",requirements:{minScore,minPredictiveAgents,minDataQuality},debateCount:debate.length,decidedAt:new Date().toISOString()};
}
