import { buildAgentCandidates } from "./agentPipeline.js";
import { buildTicketPortfolio } from "./ticketPortfolio.js";

export function analyzeSportyBetFeed(feed,{evidenceByEvent={},modelProbabilitiesByEvent={},agentPerformance={}}={}){
  if(!feed?.events?.length)return{eventAnalyses:[],reports:[],debate:[],decision:{accepted:[],rejected:[],noBet:true,reasoning:"NO BET: no verified SportyBet events available."},tickets:[]};
  const eventAnalyses=[],reports=[],debate=[];
  for(const event of feed.events){
    const result=buildAgentCandidates(event,{evidence:evidenceByEvent[event.eventId]??{},modelProbabilities:modelProbabilitiesByEvent[event.eventId]??{},agentPerformance});
    eventAnalyses.push({eventId:event.eventId,decision:result.decision,reportCount:result.reports.length,debateCount:result.debate.length});
    reports.push(...result.reports);
    debate.push(...result.debate);
  }
  const accepted=eventAnalyses.flatMap(x=>x.decision.accepted);
  return{eventAnalyses,reports,debate,decision:{accepted,rejected:reports.filter(r=>!accepted.some(a=>a.eventId===r.eventId&&a.marketId===r.marketId&&a.selectionId===r.selectionId)),noBet:accepted.length===0,reasoning:accepted.length?"Candidates survived specialist analysis, Risk/Contrarian challenges and historical feedback gates.":"NO BET: no selection survived verified evidence, challenges, data-quality and historical-feedback gates."},tickets:buildTicketPortfolio(accepted)};
}
