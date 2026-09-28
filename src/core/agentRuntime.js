import { AGENT_ROLES } from "./agents.js";
import { createAnalysisCase, recordAgentReport, addDebateMessage, finalizeHeadDecision } from "./analysisEngine.js";

export function createRuntimeCase(event, markets=event.markets){
  return createAnalysisCase({...event,markets});
}

export function runAgent(caseFile, agentId, analyzer){
  const role=AGENT_ROLES.find(a=>a.id===agentId);
  if(!role) throw new Error(`Unknown agent: ${agentId}`);
  if(typeof analyzer!=="function") throw new Error("Analyzer must be a function");
  const report=analyzer({role,eventId:caseFile.eventId,markets:caseFile.markets});
  return recordAgentReport(caseFile,agentId,report);
}

export function runDebateRound(caseFile, messages=[]){
  return messages.reduce((state,m)=>addDebateMessage(state,m.from,m.to,m.message),caseFile);
}

export function makeHeadDecision(caseFile, decision){
  return finalizeHeadDecision(caseFile,decision);
}
