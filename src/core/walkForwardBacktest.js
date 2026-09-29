import { buildHistoricalEvidence } from "./sportybetHistory.js";
import { buildHistoricalModel } from "./historicalModel.js";
import { settleFootballSelection } from "../data/sportybetResultsParser.js";
import { impliedProbability } from "./analysisEngine.js";

function normalizeEntry(entry){
  if(!entry)return{meta:null,points:[]};
  if(Array.isArray(entry))return{meta:entry.at(-1)??null,points:entry.map(x=>({at:Date.parse(x?.capturedAt||0),odds:Number(x?.odds),selectionName:x?.selectionName??""})).filter(x=>Number.isFinite(x.at)&&Number.isFinite(x.odds))};
  return{meta:entry.meta??null,points:(entry.points??[]).map(x=>Array.isArray(x)?{at:Number(x[0]),odds:Number(x[1])}:{at:Date.parse(x?.capturedAt||0),odds:Number(x?.odds)}).filter(x=>Number.isFinite(x.at)&&Number.isFinite(x.odds))};
}

function latestPreKickoff(entry,startMs){
  const points=normalizeEntry(entry).points.filter(x=>x.at<startMs).sort((a,b)=>a.at-b.at);
  return points.at(-1)??null;
}

function keyParts(key){
  const [eventId,marketId,selectionId]=String(key).split(":");
  return{eventId,marketId,selectionId};
}

function addMetric(store,metric){
  const bucket=store[metric.market]??={predictions:0,won:0,lost:0,brier:0,logLoss:0,valueSum:0};
  bucket.predictions++;
  if(metric.outcome===1)bucket.won++;else bucket.lost++;
  bucket.brier+=((metric.probability-metric.outcome)**2);
  const p=Math.min(.999,Math.max(.001,metric.probability));
  bucket.logLoss-=metric.outcome*Math.log(p)+(1-metric.outcome)*Math.log(1-p);
  bucket.valueSum+=metric.expectedValue??0;
  store[metric.market]=bucket;
}

function finalizeMetrics(store){
  return Object.fromEntries(Object.entries(store).map(([market,b])=>[market,{
    market,
    predictions:b.predictions,
    won:b.won,
    lost:b.lost,
    winRate:b.predictions?b.won/b.predictions:null,
    brierScore:b.predictions?b.brier/b.predictions:null,
    logLoss:b.predictions?b.logLoss/b.predictions:null,
    avgExpectedValue:b.predictions?b.valueSum/b.predictions:null
  }]));
}

export function runFootballWalkForwardBacktest({resultHistory=[],oddsHistory={},minPriorMatches=2}={}){
  const resultsById=new Map((resultHistory??[]).filter(x=>x?.eventId).map(x=>[String(x.eventId),x]));
  const events=new Map();
  for(const [key,entry] of Object.entries(oddsHistory??{})){
    const {eventId,marketId,selectionId}=keyParts(key);
    const normalized=normalizeEntry(entry);
    const meta=normalized.meta??{};
    if(!eventId||!meta.startTime)continue;
    const startMs=Date.parse(meta.startTime);
    if(!Number.isFinite(startMs))continue;
    const point=latestPreKickoff(entry,startMs);
    if(!point)continue;
    const event=events.get(eventId)||{eventId,sport:meta.sport??"football",league:meta.league??"",home:meta.home??"",away:meta.away??"",startTime:meta.startTime,markets:new Map()};
    const market=event.markets.get(marketId)||{marketId,name:meta.marketName??"",selections:[]};
    market.selections.push({selectionId, name:meta.selectionName??"", odds:point.odds});
    event.markets.set(marketId,market);
    events.set(eventId,event);
  }

  const metrics={};
  let considered=0, skippedNoHistory=0, skippedUnsupported=0, skippedUnknown=0, skippedPush=0;
  const ordered=[...events.values()].sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
  const predictions=[];

  for(const event of ordered){
    const result=resultsById.get(String(event.eventId));
    if(!result||result.status&&result.status!=="settled")continue;
    const priorHistory=(resultHistory??[]).filter(r=>r?.playedAt&&Date.parse(r.playedAt)<Date.parse(event.startTime));
    const historical=buildHistoricalEvidence(event,priorHistory);
    const minSample=Math.min(historical.home?.sample??0,historical.away?.sample??0);
    if(minSample<minPriorMatches){skippedNoHistory++;continue;}

    for(const market of event.markets.values()){
      for(const selection of market.selections){
        const settlement=settleFootballSelection(result,{marketName:market.name,selectionName:selection.name});
        if(settlement==="unknown"){skippedUnknown++;continue;}
        if(settlement!=="won"&&settlement!=="lost"){skippedPush++;continue;}
        const model=buildHistoricalModel(event,market,selection,historical);
        if(!model){skippedUnsupported++;continue;}
        const outcome=settlement==="won"?1:0;
        const expectedValue=Number.isFinite(Number(selection.odds))?((model.modelProbability*Number(selection.odds))-1):null;
        const metric={eventId:event.eventId,market:market.name,selection:selection.name,probability:model.modelProbability,outcome,expectedValue,odds:selection.odds};
        addMetric(metrics,metric);
        predictions.push(metric);
        considered++;
      }
    }
  }

  const marketMetrics=finalizeMetrics(metrics);
  const all=Object.values(metrics).reduce((s,b)=>s+b.predictions,0);
  return{
    modelType:"sportybet-historical-poisson-v2",
    predictions:considered,
    markets:marketMetrics,
    overall:{
      predictions:all,
      winRate:all?Object.values(metrics).reduce((s,b)=>s+b.won,0)/all:null,
      brierScore:all?Object.values(metrics).reduce((s,b)=>s+b.brier,0)/all:null,
      logLoss:all?Object.values(metrics).reduce((s,b)=>s+b.logLoss,0)/all:null,
      avgExpectedValue:all?Object.values(metrics).reduce((s,b)=>s+b.valueSum,0)/all:null
    },
    skipped:{noHistory:skippedNoHistory,unsupported:skippedUnsupported,unknownSettlement:skippedUnknown,pushOrVoid:skippedPush},
    predictionsDetail:predictions
  };
}
