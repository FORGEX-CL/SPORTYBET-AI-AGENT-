import { impliedProbability } from "./analysisEngine.js";
import { scoreSelection } from "./ticketScoring.js";
import { evaluateSportEvidence } from "./sportRules.js";
import { assessSelectionRisk } from "./riskEngine.js";

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
  const historicalSupport=Number(stats.dataQuality)>0?{confidence:Number(stats.confidence)||0,dataQuality:Number(stats.dataQuality)||0,formSignal:stats.formSignal??null,goalSignal:stats.goalSignal??null}:null;
  const historicalModel=stats.historicalModel;
  const modelEdge=historicalModel&&Number.isFinite(Number(selection.odds))?Math.abs(Number(historicalModel.modelProbability)-Number(impliedProbability(selection.odds))):0;
  const modelConfidence=historicalModel?Math.min(1,Number(historicalModel.confidence||0)+modelEdge*.35):0;
  return{
    ...base(event,market,selection),
    agentId:"statistics",
    evidence:[...externalEvidence,...derived.evidence],
    confidence:Math.max(Number(stats.confidence)||0,derived.confidence*.82,modelConfidence),
    dataQuality:Math.max(Number(stats.dataQuality)||0,derived.dataQuality,historicalSupport?.dataQuality??0),
    historicalSupport,
    independentEvidence:historicalSupport?1:0,
    sportEvaluation:evaluateSportEvidence(event.sport,{evidenceCount:(externalEvidence.length+derived.evidence.length),dataQuality:Math.max(Number(stats.dataQuality)||0,derived.dataQuality),marketName:market.name}),
    analysisBasis:historicalModel?.modelType??derived.modelType??"no-source-model",
    modelProbability:historicalModel?.modelProbability??null
  };
}

export function footballAnalysis(event,market,selection,context={}){
  const signal=context.marketSignal;
  const derived=signalEvidence(signal,"Football market consistency");
  const externalEvidence=context.evidence??[];
  const consistency=Number(signal?.crossMarketAgreement)||0;
  const historicalModel=context.historicalModel;
  const modelEdge=historicalModel&&Number.isFinite(Number(selection.odds))?Math.abs(Number(historicalModel.modelProbability)-Number(impliedProbability(selection.odds))):0;
  const historicalModelConfidence=historicalModel?Math.min(1,Number(historicalModel.confidence||0)+modelEdge*.25):0;
  const historicalSupport={dataQuality:Number(context.dataQuality)||0,formSignal:context.formSignal??null,goalSignal:context.goalSignal??null};
  return{
    ...base(event,market,selection),
    agentId:"football",
    evidence:[...externalEvidence,...derived.evidence],
    confidence:Math.max(Number(context.confidence)||0,Math.min(1,derived.confidence*.75+consistency*.20),historicalModelConfidence),
    dataQuality:Math.max(Number(context.dataQuality)||0,derived.dataQuality),
    historicalSupport,
    independentEvidence:Number(context.dataQuality)>0?1:0,
    crossMarketAgreement:consistency,
    analysisBasis:historicalModel?.modelType??derived.modelType??"no-source-model",
    modelProbability:historicalModel?.modelProbability??null
  };
}

export function multiSportAnalysis(event,market,selection,context={}){
  const signal=context.marketSignal;
  const derived=signalEvidence(signal,"Multi-sport market structure");
  const externalEvidence=context.evidence??[];
  const sportEvaluation=evaluateSportEvidence(event.sport,{evidenceCount:externalEvidence.length+derived.evidence.length,dataQuality:Math.max(Number(context.dataQuality)||0,derived.dataQuality),marketName:market.name});
  const sportConfidence=sportEvaluation.preferredMarket?sportEvaluation.score:Math.min(.78,sportEvaluation.score);
  return{
    ...base(event,market,selection),
    agentId:"multiSport",
    evidence:[...externalEvidence,...derived.evidence],
    confidence:Math.max(Number(context.confidence)||0,derived.confidence*.78,sportConfidence),
    dataQuality:Math.max(Number(context.dataQuality)||0,derived.dataQuality),
    sportEvaluation,
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
  const robust=typeof modelProbability==="object"?(modelProbability.robustProbability??model):model;
  const value=robust==null||implied==null?null:(robust*Number(selection.odds))-1;
  return{
    ...base(event,market,selection),
    agentId:"odds",
    modelProbability:model,
    robustProbability:robust,
    conservativeProbability:modelProbability?.conservativeProbability??robust,
    optimisticProbability:modelProbability?.optimisticProbability??model,
    uncertainty:modelProbability?.uncertainty??null,
    robustness:modelProbability?.robustness??null,
    value,
    expectedValue:value,
    rawExpectedValue:model==null?null:(model*Number(selection.odds))-1,
    confidence:modelProbability==null?0:Math.max(0,Math.min(1,Number(modelProbability.confidence??.5)||0)),
    dataQuality:modelProbability==null?0:Math.max(0,Math.min(1,Number(modelProbability.dataQuality??.6)||0)),
    evidence:modelProbability?.evidence??[],
    marketConsensus:modelProbability?.consensusProbability??model,
    modelType:modelProbability?.modelType??"external-model",
    independentEvidence:modelProbability?.historicalModel||String(modelProbability?.modelType??"").startsWith("external")?1:0
  };
}

export function riskAnalysis(event,market,selection,risks=[],context={}){
  const signal=context.marketSignal;
  const assessment=assessSelectionRisk({
    event,
    market,
    selection,
    signal,
    historicalModel:context.historicalModel,
    platinumEnsemble:context.platinumEnsemble,
    explicitRisks:risks
  });
  return{
    ...base(event,market,selection),
    agentId:"risk",
    risks:assessment.risks,
    riskScore:assessment.riskScore,
    riskSeverity:assessment.severity,
    requiresExtraVerification:assessment.requiresExtraVerification,
    confidence:assessment.confidence,
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
      risk:Number.isFinite(Number(report.riskScore))?Number(report.riskScore):report.risks?.length?Math.min(1,report.risks.length*.2):0,
      dataQuality:report.dataQuality,
      agreement
    })
  };
}
