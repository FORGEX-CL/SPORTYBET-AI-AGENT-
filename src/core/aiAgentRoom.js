import { AGENT_ROLES } from "./agents.js";

export function agentEvidence(state,agentId){
  const reports=(state.analysis?.reports??[]).filter(r=>r.agentId===agentId);
  const accepted=(state.analysis?.decision?.accepted??[]).filter(x=>reports.some(r=>r.eventId===x.eventId&&r.marketId===x.marketId&&r.selectionId===x.selectionId));
  return{reports,accepted};
}
export function agentAnswer(state,agentId){
  const role=AGENT_ROLES.find(a=>a.id===agentId);
  if(!role)return"Unknown agent.";
  const {reports,accepted}=agentEvidence(state,agentId);
  if(!state.feed?.eventCount)return role.name+": no verified SportyBet feed is loaded yet.";
  if(agentId==="head")return`Head Analyst: ${accepted.length} selection(s) survived the current evidence and challenge gates. ${state.analysis?.decision?.reasoning??"No decision summary available."}`;
  if(agentId==="risk")return`Risk / Contrarian Agent: ${state.analysis?.debate?.length??0} challenge message(s) are recorded. I challenge failure modes and do not treat market availability alone as evidence.`;
  if(agentId==="odds")return`Odds & Value Agent: ${reports.length} priced selection report(s) are recorded; ${reports.filter(r=>Number(r.value)>0).length} have a positive value proxy in the current model.`;
  return role.name+`: ${reports.length} report(s) recorded. ${accepted.length} corresponding selection(s) are currently accepted by the decision layer.`;
}
export function ticketSelectionAnswer(state,ticket,index){
  const selection=ticket?.selections?.[index];
  if(!selection)return`This ticket has ${ticket?.selections?.length??0} selections. Ask about selection 1, selection 2, etc.`;
  const reports=(state.analysis?.reports??[]).filter(r=>r.eventId===selection.eventId&&r.marketId===selection.marketId&&r.selectionId===selection.selectionId);
  const challenges=(state.analysis?.debate??[]).filter(d=>String(d.message??"").toLowerCase().includes(String(selection.selection).toLowerCase()));
  const accepted=(state.analysis?.decision?.accepted??[]).some(x=>x.eventId===selection.eventId&&x.marketId===selection.marketId&&x.selectionId===selection.selectionId);
  return`Selection ${index+1}: ${selection.selection}. Market: ${selection.marketName??"unknown"}. Odds at snapshot: ${Number(selection.odds).toFixed(2)}. Specialist reports linked: ${reports.length}. Related challenge messages: ${challenges.length}. Decision-layer status: ${accepted?"accepted":"not accepted"}. Current ticket data should be rechecked before any use.`;
}
export function buildAiReply(state,q){
  const raw=String(q||"").trim(),s=raw.toLowerCase();
  if(!state.feed?.eventCount)return"No verified SportyBet feed is loaded. Refresh the source first.";
  if(state.selectedTicket){
    const match=s.match(/(?:selection|pick|leg)\s*(\d+)/);
    if(match)return ticketSelectionAnswer(state,state.selectedTicket,Math.max(0,Number(match[1])-1));
    if(s.includes("this ticket")||s.includes("each selection")||s.includes("selection by selection")){
      return state.selectedTicket.selections.map((_,i)=>ticketSelectionAnswer(state,state.selectedTicket,i)).join(" ");
    }
  }
  const agentMatch=AGENT_ROLES.find(a=>s.includes(a.name.toLowerCase())||s.includes(a.id.toLowerCase()));
  if(agentMatch)return agentAnswer(state,agentMatch.id);
  if(s.includes("who are")||s.includes("agents"))return"The room has 7 agents: Statistics, Football, Multi-Sport, SportyBet Market Intelligence, Odds & Value, Risk / Contrarian, and Head Analyst.";
  if(s.includes("risk"))return agentAnswer(state,"risk");
  if(s.includes("odds"))return agentAnswer(state,"odds");
  if(s.includes("head analyst")||s.includes("decision"))return agentAnswer(state,"head");
  if(s.includes("ticket"))return`Current candidates: ${state.analysis?.tickets?.length??0}. Open a candidate for exact selections and revalidation.`;
  if(s.includes("source")||s.includes("sportybet"))return`Current verified feed: ${state.feed.eventCount} events and ${state.feed.marketCount} markets. Source captured at ${state.feed.capturedAt??"unknown"}.`;
  return"I can explain the current SportyBet feed, any specialist agent, risk challenges, odds evidence, Head Analyst decisions, or a specific ticket selection.";
}
