const uid=()=>crypto.randomUUID();
const keyOf=s=>`${s.eventId}:${s.marketId}:${s.selectionId}`;
const bucketOdds=odds=>{const n=Number(odds);if(!Number.isFinite(n))return"unknown";if(n<1.5)return"<1.50";if(n<2)return"1.50-1.99";if(n<3)return"2.00-2.99";if(n<5)return"3.00-4.99";return"5.00+";};

export function createPredictionRecord(ticket){
  return{
    predictionId:uid(),
    ticketId:ticket.ticketId,
    createdAt:ticket.createdAt,
    selections:ticket.selections.map(s=>({
      ...s,
      agentAttribution:{
        predictiveAgents:Array.isArray(s.predictiveAgents)?[...s.predictiveAgents]:[],
        supportingAgents:Array.isArray(s.agents)?[...s.agents]:[],
        challengeCount:Array.isArray(s.debate)?s.debate.length:0,
        challenges:Array.isArray(s.debate)?s.debate.map(d=>({...d})):[],
        scoreAtCreation:Number(s.score)||0,
        confidenceAtCreation:Number(s.confidence)||null,
        dataQualityAtCreation:Number(s.dataQuality)||0
      }
    })),
    combinedOddsAtCreation:ticket.combinedOdds,
    status:"pending"
  };
}

export function settlePrediction(record,results){
  const settledSelections=record.selections.map(s=>{
    const r=results.find(x=>x.eventId===s.eventId&&x.marketId===s.marketId&&x.selectionId===s.selectionId);
    return{...s,result:r?.result??"unknown",settlementSource:r?.source??null};
  });
  const unresolved=settledSelections.some(s=>s.result==="unknown");
  return{...record,settledAt:new Date().toISOString(),status:unresolved?"partial":settledSelections.every(s=>s.result==="won")?"won":"lost",settledSelections};
}

export function classifyErrors(record){
  if(!["lost","partial"].includes(record.status))return[];
  return record.settledSelections.filter(s=>s.result==="lost").map(s=>({
    eventId:s.eventId,marketId:s.marketId,selectionId:s.selectionId,
    errorType:"selection_failed",
    sport:s.sport,
    marketName:s.marketName,
    oddsRange:bucketOdds(s.odds),
    confidenceAtCreation:s.agentAttribution?.confidenceAtCreation??null,
    scoreAtCreation:s.agentAttribution?.scoreAtCreation??null
  }));
}

function ensureStat(stats,key){
  return stats[key]??{predictions:0,won:0,lost:0,unknown:0,challengeCount:0,challengeVindicated:0,challengeFalsePositive:0,bySport:{},byMarket:{},byOddsRange:{},byConfidenceBand:{}};
}
function confidenceBand(value){
  const n=Number(value);
  if(!Number.isFinite(n))return"unknown";
  if(n<.55)return"<0.55";
  if(n<.70)return"0.55-0.69";
  if(n<.85)return"0.70-0.84";
  return"0.85+";
}
function recordBucket(stat,bucket,result){
  const current=stat[bucket][result]??0;
  stat[bucket][result]=current+1;
}

export function updateAgentPerformance(performance={},records=[]){
  const next=structuredClone(performance);
  next.updatedAt=new Date().toISOString();
  next.agents=next.agents??{};
  for(const record of records){
    for(const selection of record.settledSelections??[]){
      const result=selection.result;
      if(!["won","lost","unknown"].includes(result))continue;
      const attribution=selection.agentAttribution??{};
      const agents=new Set([...(attribution.predictiveAgents??[]),...(attribution.supportingAgents??[])]);
      const sport=selection.sport??"unknown";
      const market=selection.marketName??"unknown";
      const oddsRange=bucketOdds(selection.odds);
      const confidenceBandName=confidenceBand(attribution.confidenceAtCreation);
      for(const agentId of agents){
        next.agents[agentId]=next.agents[agentId]??{predictions:0,won:0,lost:0,unknown:0,challengeCount:0,challengeVindicated:0,challengeFalsePositive:0,bySport:{},byMarket:{},byOddsRange:{},byConfidenceBand:{}};
        const stat=next.agents[agentId];
        stat.predictions++;
        stat[result]++;
        const sports=stat.bySport[sport]??{predictions:0,won:0,lost:0,unknown:0};
        sports.predictions++;sports[result]++;stat.bySport[sport]=sports;
        const markets=stat.byMarket[market]??{predictions:0,won:0,lost:0,unknown:0};
        markets.predictions++;markets[result]++;stat.byMarket[market]=markets;
        const odds=stat.byOddsRange[oddsRange]??{predictions:0,won:0,lost:0,unknown:0};
        odds.predictions++;odds[result]++;stat.byOddsRange[oddsRange]=odds;
        const conf=stat.byConfidenceBand[confidenceBandName]??{predictions:0,won:0,lost:0,unknown:0};
        conf.predictions++;conf[result]++;stat.byConfidenceBand[confidenceBandName]=conf;
      }
      for(const challenge of attribution.challenges??[]){
        if(challenge.from!=="risk")continue;
        for(const agentId of attribution.predictiveAgents??[]){
          const stat=next.agents[agentId]??(next.agents[agentId]={predictions:0,won:0,lost:0,unknown:0,challengeCount:0,challengeVindicated:0,challengeFalsePositive:0,bySport:{},byMarket:{},byOddsRange:{},byConfidenceBand:{}});
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
    return{agentId,predictions:stat.predictions,settled,won:stat.won,lost:stat.lost,unknown:stat.unknown,winRate:settled?stat.won/settled:null,challengeCount:stat.challengeCount,challengeVindicated:stat.challengeVindicated,challengeFalsePositive:stat.challengeFalsePositive};
  }).sort((a,b)=>(b.predictions||0)-(a.predictions||0));
}

export function summarizeLearning(records=[]){
  const settled=records.filter(r=>r.status==="won"||r.status==="lost");
  const won=settled.filter(r=>r.status==="won").length;
  return{totalPredictions:records.length,settled:settled.length,won,lost:settled.length-won,partial:records.filter(r=>r.status==="partial").length,winRate:settled.length?won/settled.length:null};
}
