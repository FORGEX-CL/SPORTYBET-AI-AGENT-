import { updateCalibration, calibrationSummary } from "./agentCalibration.js";

const uid=()=>crypto.randomUUID();
const marketContextKey=(sport,market)=>`${sport??"unknown"}::${market??"unknown"}`;
const bucketOdds=odds=>{const n=Number(odds);if(!Number.isFinite(n))return"unknown";if(n<1.5)return"<1.50";if(n<2)return"1.50-1.99";if(n<3)return"2.00-2.99";if(n<5)return"3.00-4.99";return"5.00+";};
const ensureAgentStat=stat=>{
  stat.predictions??=0;stat.won??=0;stat.lost??=0;stat.unknown??=0;stat.voidOrPush??=0;
  stat.challengeCount??=0;stat.challengeVindicated??=0;stat.challengeFalsePositive??=0;
  stat.bySport??={};stat.bySportMarket??={};stat.byMarket??={};stat.byOddsRange??={};stat.byConfidenceBand??={};
  return stat;
};
const updateBucket=(bucket,result,confidence)=>{
  bucket.predictions??=0;bucket.won??=0;bucket.lost??=0;bucket.unknown??=0;bucket.voidOrPush??=0;
  bucket.predictions++;
  if(result==="void_or_push")bucket.voidOrPush++;
  else bucket[result]++;
  if(result==="won"||result==="lost")updateCalibration(bucket,confidence,result);
  return bucket;
};

export function createPredictionRecord(ticket){
  return{
    predictionId:uid(),ticketId:ticket.ticketId,createdAt:ticket.createdAt,
    selections:ticket.selections.map(s=>({
      ...s,
      agentAttribution:{
        predictiveAgents:Array.isArray(s.predictiveAgents)?[...s.predictiveAgents]:[],
        supportingAgents:Array.isArray(s.agents)?[...s.agents]:[],
        challengeCount:Array.isArray(s.debate)?s.debate.length:0,
        challenges:Array.isArray(s.debate)?s.debate.map(d=>({...d})):[],
        scoreAtCreation:Number(s.score)||0,
        confidenceAtCreation:Number(s.confidence)||null,
        dataQualityAtCreation:Number(s.dataQuality)||0,
        agentForecasts:Array.isArray(s.agentForecasts)?s.agentForecasts.map(f=>({...f})):[]
      }
    })),
    combinedOddsAtCreation:ticket.combinedOdds,status:"pending"
  };
}

export function settlePrediction(record,results){
  const settledSelections=record.selections.map(s=>{
    const r=results.find(x=>x.eventId===s.eventId&&x.marketId===s.marketId&&x.selectionId===s.selectionId);
    return{...s,result:r?.result??"unknown",settlementSource:r?.source??null};
  });
  const unresolved=settledSelections.some(s=>s.result==="unknown");
  const hasLoss=settledSelections.some(s=>s.result==="lost");
  const resolvedWin=settledSelections.length>0&&!unresolved&&!hasLoss&&settledSelections.some(s=>s.result==="won");
  const allVoid=settledSelections.length>0&&!unresolved&&!hasLoss&&settledSelections.every(s=>s.result==="void_or_push");
  return{...record,settledAt:new Date().toISOString(),status:unresolved?"partial":resolvedWin?"won":allVoid?"partial":"lost",settledSelections};
}

export function settlePredictionFromSportyBetResults(record,selectionResults){
  const settledSelections=record.selections.map(s=>{
    const r=selectionResults.find(x=>x.eventId===s.eventId&&x.marketId===s.marketId&&x.selectionId===s.selectionId);
    return r?{...s,result:r.result,settlementSource:r.settlementSource??"SportyBet"}:{...s,result:"unknown",settlementSource:null};
  });
  const unresolved=settledSelections.some(s=>s.result==="unknown");
  const hasLoss=settledSelections.some(s=>s.result==="lost");
  const resolvedWin=settledSelections.length>0&&!unresolved&&!hasLoss&&settledSelections.some(s=>s.result==="won");
  const allVoid=settledSelections.length>0&&!unresolved&&!hasLoss&&settledSelections.every(s=>s.result==="void_or_push");
  return{...record,settledAt:new Date().toISOString(),status:unresolved?"partial":resolvedWin?"won":allVoid?"partial":"lost",settledSelections};
}

export function classifyErrors(record){
  if(!["lost","partial"].includes(record.status))return[];
  return record.settledSelections.filter(s=>s.result==="lost").map(s=>({
    eventId:s.eventId,marketId:s.marketId,selectionId:s.selectionId,errorType:"selection_failed",sport:s.sport,
    marketName:s.marketName,oddsRange:bucketOdds(s.odds),confidenceAtCreation:s.agentAttribution?.confidenceAtCreation??null,
    scoreAtCreation:s.agentAttribution?.scoreAtCreation??null
  }));
}

function confidenceBand(value){
  const n=Number(value);
  if(!Number.isFinite(n))return"unknown";
  if(n<.55)return"<0.55";if(n<.70)return"0.55-0.69";if(n<.85)return"0.70-0.84";return"0.85+";
}

export function updateAgentPerformance(performance={},records=[]){
  const next=structuredClone(performance);
  next.updatedAt=new Date().toISOString();
  next.agents=next.agents??{};
  for(const record of records){
    for(const selection of record.settledSelections??[]){
      const result=selection.result;
      if(!["won","lost","unknown","void_or_push"].includes(result))continue;
      const a=selection.agentAttribution??{};
      const agents=new Set([...(a.predictiveAgents??[]),...(a.supportingAgents??[])]);
      const forecastByAgent=new Map((a.agentForecasts??[]).map(f=>[f.agentId,f]));
      const sport=selection.sport??"unknown";
      const market=selection.marketName??"unknown";
      const oddsRange=bucketOdds(selection.odds);
      for(const agentId of agents){
        const stat=ensureAgentStat(next.agents[agentId]??={});
        stat.predictions++;
        if(result==="void_or_push")stat.voidOrPush++;
        else stat[result]++;
        const forecast=forecastByAgent.get(agentId);
        const hasPredictiveForecast=Boolean(forecast)||a.predictiveAgents?.includes(agentId);
        const forecastConfidence=forecast?.confidence??a.confidenceAtCreation;
        const conf=confidenceBand(forecastConfidence);
        if(hasPredictiveForecast&&(result==="won"||result==="lost"))updateCalibration(stat,forecastConfidence,result);

        const buckets=[
          ["bySport",sport],
          ["bySportMarket",marketContextKey(sport,market)],
          ["byMarket",market],
          ["byOddsRange",oddsRange],
          ["byConfidenceBand",conf]
        ];
        for(const [name,key] of buckets){
          const bucket=updateBucket(stat[name][key]??{},result,hasPredictiveForecast?forecastConfidence:null);
          if(!hasPredictiveForecast&&result!=="won"&&result!=="lost")bucket.calibrationSamples=bucket.calibrationSamples??0;
          stat[name][key]=bucket;
        }
      }

      for(const challenge of a.challenges??[]){
        if(challenge.from!=="risk")continue;
        for(const agentId of a.predictiveAgents??[]){
          const stat=ensureAgentStat(next.agents[agentId]??=(next.agents[agentId]={}));
          stat.challengeCount++;
          if(result==="lost")stat.challengeVindicated++;
          else if(result==="won")stat.challengeFalsePositive++;
        }
      }
    }
  }
  return next;
}

export function summarizeAgentPerformance(performance={}){
  return Object.entries(performance.agents??{}).map(([agentId,stat])=>{
    const settled=stat.won+stat.lost;
    const calibration=calibrationSummary(stat);
    return{
      agentId,predictions:stat.predictions,settled,won:stat.won,lost:stat.lost,unknown:stat.unknown,voidOrPush:stat.voidOrPush,
      winRate:settled?stat.won/settled:null,
      brierScore:calibration.brierScore,logLoss:calibration.logLoss,calibrationGap:calibration.calibrationGap,
      challengeCount:stat.challengeCount,challengeVindicated:stat.challengeVindicated,challengeFalsePositive:stat.challengeFalsePositive
    };
  }).sort((a,b)=>(b.predictions||0)-(a.predictions||0));
}

export function summarizeLearning(records=[]){
  const settled=records.filter(r=>r.status==="won"||r.status==="lost"),won=settled.filter(r=>r.status==="won").length;
  return{
    totalPredictions:records.length,settled:settled.length,won,lost:settled.length-won,
    partial:records.filter(r=>r.status==="partial").length,winRate:settled.length?won/settled.length:null
  };
}
