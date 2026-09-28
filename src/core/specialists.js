import { impliedProbability } from "./analysisEngine.js";
import { scoreSelection } from "./ticketScoring.js";

function base(event,market,selection){
  return {eventId:event.eventId,marketId:market.marketId,selectionId:selection.selectionId,selection:selection.name,odds:Number(selection.odds),impliedProbability:impliedProbability(selection.odds)};
}

export function statisticsAnalysis(event,market,selection,stats={}){
  return {...base(event,market,selection),agentId:"statistics",evidence:stats.evidence??[],confidence:stats.confidence??0,dataQuality:stats.dataQuality??0};
}
export function footballAnalysis(event,market,selection,context={}){
  return {...base(event,market,selection),agentId:"football",evidence:context.evidence??[],confidence:context.confidence??0,dataQuality:context.dataQuality??0};
}
export function multiSportAnalysis(event,market,selection,context={}){
  return {...base(event,market,selection),agentId:"multiSport",evidence:context.evidence??[],confidence:context.confidence??0,dataQuality:context.dataQuality??0};
}
export function marketAnalysis(event,market,selection){
  return {...base(event,market,selection),agentId:"market",marketCategory:market.category??"other",confidence:1,dataQuality:1,evidence:["Market exists in the normalized SportyBet feed."]};
}
export function oddsAnalysis(event,market,selection,modelProbability=null){
  const implied=impliedProbability(selection.odds);
  const value=modelProbability==null||implied==null?null:modelProbability-implied;
  return {...base(event,market,selection),agentId:"odds",modelProbability,value,confidence:modelProbability==null?0:Math.max(0,Math.min(1,modelProbability)),dataQuality:modelProbability==null?0:1};
}
export function riskAnalysis(event,market,selection,risks=[]){
  return {...base(event,market,selection),agentId:"risk",risks,confidence:risks.length?Math.max(0,1-risks.length*.2):1,dataQuality:1};
}
export function scoreReport(report,agreement=0){
  return {...report,score:scoreSelection({confidence:report.confidence,value:Math.max(0,report.value??0),risk:report.risks?.length?Math.min(1,report.risks.length*.2):0,dataQuality:report.dataQuality,agreement})};
}
