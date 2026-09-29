import { calibrationSummary, updateCalibration } from "./agentCalibration.js";

function outcomeOf(result){
  if(result==="won")return 1;
  if(result==="lost")return 0;
  return null;
}

function collectAgentForecasts(predictions,agentId){
  const rows=[];
  for(const record of predictions??[]){
    for(const selection of record.settledSelections??[]){
      const outcome=outcomeOf(selection.result);
      if(outcome==null)continue;
      const forecast=(selection.agentAttribution?.agentForecasts??[]).find(x=>x.agentId===agentId);
      if(!forecast||!Number.isFinite(Number(forecast.confidence)))continue;
      rows.push({at:record.settledAt??record.createdAt??"",confidence:Number(forecast.confidence),outcome});
    }
  }
  return rows.sort((a,b)=>Date.parse(a.at||0)-Date.parse(b.at||0));
}

function scoreRows(rows){
  if(!rows.length)return null;
  const stat={};
  for(const row of rows)updateCalibration(stat,row.confidence,row.outcome?"won":"lost");
  return calibrationSummary(stat);
}

export function buildAgentDriftReport(predictions=[],agentId,{recentWindow=30,minSamples=10}={}){
  const rows=collectAgentForecasts(predictions,agentId);
  if(rows.length<minSamples)return{status:"insufficient_history",samples:rows.length,recentSamples:0,reliabilityMultiplier:1,drift:null};
  const recent=rows.slice(-Math.min(recentWindow,rows.length));
  const older=rows.slice(0,Math.max(0,rows.length-recent.length));
  if(older.length<Math.max(5,Math.floor(minSamples/2)))return{status:"insufficient_baseline",samples:rows.length,recentSamples:recent.length,reliabilityMultiplier:1,drift:null};
  const recentScore=scoreRows(recent),olderScore=scoreRows(older);
  const brierDelta=Number(recentScore?.brierScore??0)-Number(olderScore?.brierScore??0);
  const logLossDelta=Number(recentScore?.logLoss??0)-Number(olderScore?.logLoss??0);
  const calibrationDelta=Math.abs(Number(recentScore?.calibrationGap??0))-Math.abs(Number(olderScore?.calibrationGap??0));
  const severity=(brierDelta>=.08||logLossDelta>=.18)?"degrading":(brierDelta>=.04||logLossDelta>=.08||calibrationDelta>=.05)?"warning":"stable";
  const reliabilityMultiplier=severity==="degrading"?.65:severity==="warning"?.82:1;
  return{
    status:severity,
    samples:rows.length,
    recentSamples:recent.length,
    brierDelta,
    logLossDelta,
    calibrationDelta,
    reliabilityMultiplier,
    recent:recentScore,
    baseline:olderScore
  };
}
