import { AGENT_ROLES } from "./agents.js";

const pct=value=>Number.isFinite(Number(value))?Math.round(Number(value)*100)+"%":"n/a";
const topEvidence=reports=>reports
  .flatMap(r=>(r.evidence??[]).map(e=>({text:String(e),score:Number(r.score)||0,agent:r.agentId})))
  .sort((a,b)=>b.score-a.score)
  .slice(0,3);

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
  const avgConfidence=reports.length?reports.reduce((s,r)=>s+(Number(r.confidence)||0),0)/reports.length:0;
  const avgQuality=reports.length?reports.reduce((s,r)=>s+(Number(r.dataQuality)||0),0)/reports.length:0;
  const evidence=topEvidence(reports).map(x=>x.text).join(" | ");
  if(agentId==="head"){
    const rejected=state.analysis?.decision?.rejected?.length??0;
    return`Head Analyst: ${accepted.length} selection(s) survived the current evidence gates and ${rejected} are rejected. ${state.analysis?.decision?.reasoning??"No decision summary available."} Confidence context across specialist reports: ${pct(avgConfidence)}; data quality: ${pct(avgQuality)}.`;
  }
  if(agentId==="risk"){
    const debate=state.analysis?.debate??[];
    const high=debate.filter(x=>x.severity==="high").length;
    const medium=debate.filter(x=>x.severity==="medium").length;
    return`Risk / Contrarian Agent: ${debate.length} challenge message(s) are recorded, including ${high} high and ${medium} medium-severity challenges. This layer is designed to expose failure modes; market availability is not treated as proof.`;
  }
  if(agentId==="odds"){
    const priced=reports.filter(r=>Number.isFinite(Number(r.odds)));
    const positive=reports.filter(r=>Number(r.value)>0);
    const movement=reports.filter(r=>r.oddsMovement&&Number(r.oddsMovement.change)!==0).length;
    return`Odds & Value Agent: ${priced.length} priced report(s), ${positive.length} with a positive value proxy in the current model, and ${movement} with recorded odds movement. Average confidence: ${pct(avgConfidence)}.`;
  }
  return`${role.name}: ${reports.length} report(s), ${accepted.length} linked accepted selection(s). Average confidence: ${pct(avgConfidence)}; data quality: ${pct(avgQuality)}.${evidence?` Strongest recorded evidence: ${evidence}`:""}`;
}

export function ticketSelectionAnswer(state,ticket,index){
  const selection=ticket?.selections?.[index];
  if(!selection)return`This ticket has ${ticket?.selections?.length??0} selections. Ask about selection 1, selection 2, etc.`;
  const reports=(state.analysis?.reports??[]).filter(r=>r.eventId===selection.eventId&&r.marketId===selection.marketId&&r.selectionId===selection.selectionId);
  const challenges=(state.analysis?.debate??[]).filter(d=>{
    const message=String(d.message??"").toLowerCase();
    const pick=String(selection.selection??"").toLowerCase();
    return message.includes(pick)||message.includes(String(selection.eventId).toLowerCase());
  });
  const accepted=(state.analysis?.decision?.accepted??[]).some(x=>x.eventId===selection.eventId&&x.marketId===selection.marketId&&x.selectionId===selection.selectionId);
  const avgConfidence=reports.length?reports.reduce((s,r)=>s+(Number(r.confidence)||0),0)/reports.length:0;
  const riskReports=reports.filter(r=>Array.isArray(r.risks)&&r.risks.length);
  return`Selection ${index+1}: ${selection.selection}. Market: ${selection.marketName??"unknown"}. Odds at snapshot: ${Number(selection.odds).toFixed(2)}. Specialist reports linked: ${reports.length}. Average specialist confidence: ${pct(avgConfidence)}. Risk reports: ${riskReports.length}. Related challenge messages: ${challenges.length}. Decision-layer status: ${accepted?"accepted":"not accepted"}. Current ticket data should be rechecked before any use.`;
}

export function buildAiReply(state,q){
  const raw=String(q||"").trim(),s=raw.toLowerCase();
  if(!state.feed?.eventCount)return"No verified SportyBet feed is loaded. Refresh the source first.";
  const agentMatch=AGENT_ROLES.find(a=>s.includes(a.name.toLowerCase())||s.includes(a.id.toLowerCase()));
  if(agentMatch)return agentAnswer(state,agentMatch.id);
  if(state.selectedTicket){
    const match=s.match(/(?:selection|pick|leg)\s*(\d+)/);
    if(match)return ticketSelectionAnswer(state,state.selectedTicket,Math.max(0,Number(match[1])-1));
    if(s.includes("this ticket")||s.includes("each selection")||s.includes("selection by selection")){
      return state.selectedTicket.selections.map((_,i)=>ticketSelectionAnswer(state,state.selectedTicket,i)).join(" ");
    }
  }
  if(s.includes("who are")||s.includes("agents"))return"The room has 7 agents: Statistics, Football, Multi-Sport, SportyBet Market Intelligence, Odds & Value, Risk / Contrarian, and Head Analyst.";
  if(s.includes("risk"))return agentAnswer(state,"risk");
  if(s.includes("odds"))return agentAnswer(state,"odds");
  if(s.includes("head analyst")||s.includes("decision"))return agentAnswer(state,"head");
  if(s.includes("ticket"))return`Current candidates: ${state.analysis?.tickets?.length??0}. Open a candidate for exact selections and revalidation.`;
  if(s.includes("source")||s.includes("sportybet"))return`Current verified feed: ${state.feed.eventCount} events and ${state.feed.marketCount} markets. Source captured at ${state.feed.capturedAt??"unknown"}.`;
  return"I can explain the current SportyBet feed, specialist evidence, risk challenges, odds evidence, Head Analyst decisions, or a specific ticket selection.";
}
