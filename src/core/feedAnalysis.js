import { buildAgentCandidates } from "./agentPipeline.js";
import { buildTicketPortfolio } from "./ticketPortfolio.js";

export function analyzeSportyBetFeed(feed,{evidenceByEvent={},modelProbabilitiesByEvent={},agentPerformance={}}={}){
  if(!feed?.events?.length)return{eventAnalyses:[],reports:[],debate:[],decision:{accepted:[],rejected:[],noBet:true,reasoning:"NO BET: no verified SportyBet events available."},tickets:[]};
  const eventAnalyses=[],reports=[],debate=[];
  for(const event of feed.events){
    const result=buildAgentCandidates(event,{evidence:evidenceByEvent[event.eventId]??{},modelProbabilities:modelProbabilitiesByEvent[event.eventId]??{},agentPerformance});
    eventAnalyses.push({eventId:event.eventId,decision:result.decision,reportCount:result.reports.length,debateCount:result.debate.length,signalCount:Object.keys(result.signals??{}).length});
    reports.push(...result.reports);
    debate.push(...result.debate);
  }
  const accepted=eventAnalyses.flatMap(x=>x.decision.accepted);
  const oddsReports=reports.filter(r=>r.agentId==="odds");
  const modelSummary={id:"sportybet-ensemble-v2",pricedSelections:oddsReports.length,positiveValueSelections:oddsReports.filter(r=>Number(r.value)>0).length,negativeValueSelections:oddsReports.filter(r=>Number(r.value)<0).length,historicalModelSelections:oddsReports.filter(r=>r.modelType?.includes("historical-poisson")).length,independentModelSelections:oddsReports.filter(r=>r.independentEvidence===1).length};
  return{eventAnalyses,reports,debate,modelSummary,decision:{accepted,rejected:reports.filter(r=>!accepted.some(a=>a.eventId===r.eventId&&a.marketId===r.marketId&&a.selectionId===r.selectionId)),noBet:accepted.length===0,reasoning:accepted.length?"Candidates survived specialist analysis, Risk/Contrarian challenges and historical feedback gates.":"NO BET: no selection survived verified evidence, challenges, data-quality and historical-feedback gates."},tickets:buildTicketPortfolio(accepted,{sourceUrl:feed.sourceUrl,capturedAt:feed.capturedAt})};
}
