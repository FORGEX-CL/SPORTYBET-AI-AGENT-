import { buildAgentCandidates } from "./agentPipeline.js";
import { buildCandidateTickets } from "./ticketBuilder.js";

export function analyzeSportyBetFeed(feed,{evidenceByEvent={},modelProbabilitiesByEvent={}}={}){
  if(!feed?.events?.length)return{eventAnalyses:[],reports:[],decision:{accepted:[],rejected:[],noBet:true,reasoning:"NO BET: no verified SportyBet events available."},tickets:[]};
  const eventAnalyses=[],reports=[];
  for(const event of feed.events){
    const result=buildAgentCandidates(event,{evidence:evidenceByEvent[event.eventId]??{},modelProbabilities:modelProbabilitiesByEvent[event.eventId]??{}});
    eventAnalyses.push({eventId:event.eventId,decision:result.decision,reportCount:result.reports.length});
    reports.push(...result.reports);
  }
  const accepted=eventAnalyses.flatMap(x=>x.decision.accepted);
  return{eventAnalyses,reports,decision:{accepted,rejected:reports.filter(r=>!accepted.some(a=>a.eventId===r.eventId&&a.marketId===r.marketId&&a.selectionId===r.selectionId)),noBet:accepted.length===0,reasoning:accepted.length?"Candidates passed per-event Head Analyst filters and were forwarded to ticket construction.":"NO BET: verified SportyBet markets were available, but no selection had enough predictive evidence."},tickets:buildCandidateTickets(accepted)};
}
