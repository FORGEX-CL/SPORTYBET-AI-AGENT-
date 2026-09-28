import { impliedProbability } from "./analysisEngine.js";
import { scoreSelection } from "./ticketScoring.js";
import { evaluateSportEvidence } from "./sportRules.js";

function base(event,market,selection){
  return{
    eventId:event.eventId,
    sourceEventId:event.sourceEventId??null,
    marketId:market.marketId,
    selectionId:selection.selectionId,
    selection:selection.name,
    odds:Number(selection.odds),
    impliedProbability:impliedProbability(selection.odds),
    sport:event.sport,
    marketName:market.name
  };
}

function signalEvidence(signal,prefix){
  if(!signal)return{evidence:[],confidence:0,dataQuality:0};
  return{
    evidence:(signal.evidence??[]).map(item=>prefix+": "+item),
    confidence:Number(signal.confidence)||0,
    dataQuality:Number(signal.dataQuality)||0,
    modelProbability:signal.modelProbability,
    expectedValue:signal.expectedValue,
    crossMarketAgreement:signal.crossMarketAgreement??0,
    modelType:signal.modelType
  };
}

export function statisticsAnalysis(event,market,selection,stats={}){
  const signal=stats.marketSignal;
  const derived=signalEvidence(signal,"Source statistics");
  const externalEvidence=stats.evidence??[];
  return{
    ...base(event,market,selection),
    agentId:"statistics",
    evidence:[...externalEvidence,...derived.evidence],
    confidence:Math.max(Number(stats.confidence)||0,derived.confidence*.82),
    dataQuality:Math.max(Number(stats.dataQuality)||0,derived.dataQuality),
    sportEvaluation:evaluateSportEvidence(event.sport,{evidenceCount:(externalEvidence.length+derived.evidence.length),dataQuality:Math.max(Number(stats.dataQuality)||0,derived.dataQuality),marketName:market.name}),
    analysisBasis:derived.modelType??"no-source-model"
  };
}

export function footballAnalysis(event,market,selection,context={}){
  const signal=context.marketSignal;
  const derived=signalEvidence(signal,"Football market consistency");
  const externalEvidence=context.evidence??[];
  const consistency=Number(signal?.crossMarketAgreement)||0;
  return{
    ...base(event,market,selection),
    agentId:"football",
    evidence:[...externalEvidence,...derived.evidence],
    confidence:Math.max(Number(context.confidence)||0,Math.min(1,derived.confidence*.75+consistency*.20)),
    dataQuality:Math.max(Number(context.dataQuality)||0,derived.dataQuality),
    crossMarketAgreement:consistency,
    analysisBasis:derived.modelType??"no-source-model"
  };
}

export function multiSportAnalysis(event,market,selection,context={}){
  const signal=context.marketSignal;
  const derived=signalEvidence(signal,"Multi-sport market structure");
  const externalEvidence=context.evidence??[];
  return{
    ...base(event,market,selection),
    agentId:"multiSport",
    evidence:[...externalEvidence,...derived.evidence],
    confidence:Math.max(Number(context.confidence)||0,derived.confidence*.78),
    dataQuality:Math.max(Number(context.dataQuality)||0,derived.dataQuality),
    sportEvaluation:evaluateSportEvidence(event.sport,{evidenceCount:(externalEvidence.length+derived.evidence.length),dataQuality:Math.max(Number(context.dataQuality)||0,derived.dataQuality),marketName:market.name}),
    analysisBasis:derived.modelType??"no-source-model"
  };
}

export function marketAnalysis(event,market,selection){
  return{
    ...base(event,market,selection),
    agentId:"market",
    marketCategory:market.category??"other",
    confidence:1,
    dataQuality:1,
    evidence:["Market exists in the normalized SportyBet feed.","Market and selection identifiers came from the verified SportyBet source."],
    analysisBasis:"sportybet-source-catalogue"
  };
}

export function oddsAnalysis(event,market,selection,modelProbability=null){
  const implied=impliedProbability(selection.odds);
  const model=typeof modelProbability==="number"?modelProbability:(modelProbability?.modelProbability??null);
  const value=model==null||implied==null?null:(model*Number(selection.odds))-1;
  return{
    ...base(event,market,selection),
    agentId:"odds",
    modelProbability:model,
    value,
    expectedValue:value,
    confidence:modelProbability==null?0:Math.max(0,Math.min(1,Number(modelProbability.confidence??.5)||0)),
    dataQuality:modelProbability==null?0:Math.max(0,Math.min(1,Number(modelProbability.dataQuality??.6)||0)),
    evidence:modelProbability?.evidence??[],
    marketConsensus:modelProbability?.consensusProbability??model,
    modelType:modelProbability?.modelType??"external-model"
  };
}

export function riskAnalysis(event,market,selection,risks=[],context={}){
  const signal=context.marketSignal;
  const derived=[];
  if(signal?.overround>.12)derived.push("High market overround reduces pricing confidence.");
  if(signal?.marketDepth<2)derived.push("Low market depth limits cross-checking.");
  if(Number(signal?.crossMarketAgreement)<.70)derived.push("Cross-market prices are inconsistent.");
  if(Number(selection.odds)>=8)derived.push("Long-odds selection has high variance and requires stronger evidence.");
  const allRisks=[...(risks??[]),...derived];
  return{
    ...base(event,market,selection),
    agentId:"risk",
    risks:allRisks,
    confidence:allRisks.length?Math.max(0,1-allRisks.length*.15):1,
    dataQuality:signal?Math.max(.7,Number(signal.dataQuality)||0):1,
    evidence:signal?.evidence??[]
  };
}

export function scoreReport(report,agreement=0){
  return{
    ...report,
    score:scoreSelection({
      confidence:report.confidence,
      value:Math.max(0,report.value??0),
      risk:report.risks?.length?Math.min(1,report.risks.length*.2):0,
      dataQuality:report.dataQuality,
      agreement
    })
  };
}
