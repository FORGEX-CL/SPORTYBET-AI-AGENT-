import { createPredictionRecord, settlePrediction, settlePredictionFromSportyBetResults, updateAgentPerformance, summarizeAgentPerformance, summarizeLearning } from "./learning.js";
export const LEARNING_STORAGE_KEY="sportybet-ai-agent:learning:v1";
const cloneValue=value=>{
  if(value==null)return value;
  if(typeof structuredClone==="function"){
    try{return structuredClone(value);}catch{}
  }
  return JSON.parse(JSON.stringify(value));
};
const ticketFingerprint=ticket=>[...(ticket.selections??[])].map(s=>`${s.eventId}:${s.marketId}:${s.selectionId}`).sort().join("|");
export function createLearningLedger({predictions=[],performance={},resultHistory=[],oddsHistory={}}={}){return{version:2,predictions:[...predictions],performance:cloneValue(performance),resultHistory:[...resultHistory],oddsHistory:cloneValue(oddsHistory),updatedAt:new Date().toISOString()};}
export function recordSportyBetOddsHistory(ledger,oddsHistory={}){return createLearningLedger({predictions:ledger.predictions??[],performance:ledger.performance,resultHistory:ledger.resultHistory??[],oddsHistory});}
export function registerTickets(ledger,tickets=[]){const existing=new Set((ledger.predictions??[]).map(p=>p.fingerprint??[...(p.selections??[])].map(s=>`${s.eventId}:${s.marketId}:${s.selectionId}`).sort().join("|")));const additions=tickets.filter(t=>t?.ticketId&&!existing.has(ticketFingerprint(t))).map(t=>({...createPredictionRecord(t),fingerprint:ticketFingerprint(t)}));return additions.length?createLearningLedger({predictions:[...(ledger.predictions??[]),...additions],performance:ledger.performance,resultHistory:ledger.resultHistory??[],oddsHistory:ledger.oddsHistory??{}}):ledger;}
export function settleLedger(ledger,results=[]){if(!Array.isArray(results)||!results.length)return ledger;const byTicket=new Map();for(const result of results){if(!result?.ticketId)continue;const list=byTicket.get(result.ticketId)??[];list.push(result);byTicket.set(result.ticketId,list);}const predictions=(ledger.predictions??[]).map(p=>{const r=byTicket.get(p.ticketId);return r?settlePrediction(p,r):p;});return rebuildLedgerPerformance(predictions,ledger.resultHistory??[],ledger.oddsHistory??{});}
export function settlePendingFromSportyBetResults(ledger,selectionResults=[]){if(!Array.isArray(selectionResults)||!selectionResults.length)return ledger;const predictions=(ledger.predictions??[]).map(p=>p.status==="won"||p.status==="lost"?p:settlePredictionFromSportyBetResults(p,selectionResults));return rebuildLedgerPerformance(predictions,ledger.resultHistory??[],ledger.oddsHistory??{});}
export function recordSportyBetResults(ledger,results=[],capturedAt=null){
 const byId=new Map((ledger.resultHistory??[]).filter(r=>r?.eventId).map(r=>[String(r.eventId),r]));
 for(const result of Array.isArray(results)?results:[])if(result?.eventId)byId.set(String(result.eventId),{...result,capturedAt:result.capturedAt??capturedAt??null});
 return createLearningLedger({predictions:ledger.predictions??[],performance:ledger.performance,resultHistory:[...byId.values()],oddsHistory:ledger.oddsHistory??{}});
}
function rebuildLedgerPerformance(predictions,resultHistory=[],oddsHistory={}){const performance=updateAgentPerformance({},predictions.filter(p=>p.status==="won"||p.status==="lost"||p.status==="partial"));return createLearningLedger({predictions,performance,resultHistory,oddsHistory});}
export function learningSummary(ledger){return{...summarizeLearning(ledger.predictions??[]),agents:summarizeAgentPerformance(ledger.performance??{})};}
function resolveStorage(storage){
  if(storage!==undefined)return storage;
  try{return globalThis.localStorage??null;}catch{return null;}
}
export function saveLearningLedger(ledger,{storage}={}){const resolved=resolveStorage(storage);if(!resolved)throw new Error("localStorage unavailable");resolved.setItem(LEARNING_STORAGE_KEY,JSON.stringify(ledger));return ledger;}
export function loadLearningLedger({storage}={}){const resolved=resolveStorage(storage);if(!resolved)return createLearningLedger();try{const raw=resolved.getItem(LEARNING_STORAGE_KEY);if(!raw)return createLearningLedger();const parsed=JSON.parse(raw);return createLearningLedger({predictions:Array.isArray(parsed.predictions)?parsed.predictions:[],performance:parsed.performance&&typeof parsed.performance==="object"?parsed.performance:{},resultHistory:Array.isArray(parsed.resultHistory)?parsed.resultHistory:[],oddsHistory:parsed.oddsHistory&&typeof parsed.oddsHistory==="object"?parsed.oddsHistory:{}});}catch{return createLearningLedger();}}
