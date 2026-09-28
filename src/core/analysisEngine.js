import { createAnalysisCase, recordAgentReport, addDebateMessage } from "./agents.js";

export function impliedProbability(odds){const n=Number(odds);return Number.isFinite(n)&&n>1?1/n:null;}

export function createEvidenceReport({agentId,event,market,selection,evidence=[],confidence=null}){
  return {agentId,eventId:event.eventId,marketId:market.marketId,selectionId:selection.selectionId,
    selection:selection.name,odds:Number(selection.odds),impliedProbability:impliedProbability(selection.odds),
    evidence,confidence,status:"unreviewed",createdAt:new Date().toISOString()};
}

export function addSpecialistReport(caseFile,report){
  return recordAgentReport(caseFile,report.agentId,report);
}

export function challengeReport(caseFile,challengerId,targetAgentId,challenge){
  return addDebateMessage(caseFile,challengerId,targetAgentId,challenge);
}

export function finalizeHeadDecision(caseFile,{accepted=[],rejected=[],reasoning=""}={}){
  return {...caseFile,decision:{accepted,rejected,reasoning,decidedAt:new Date().toISOString()}};
}
