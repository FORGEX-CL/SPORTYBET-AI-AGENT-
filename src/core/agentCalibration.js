const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

export function predictionOutcome(result){
  if(result==="won")return 1;
  if(result==="lost")return 0;
  return null;
}

export function updateCalibration(stat={},confidence,result){
  const outcome=predictionOutcome(result);
  const p=Number(confidence);
  if(outcome==null||!Number.isFinite(p))return stat;
  const probability=clamp(p);
  stat.calibrationSamples=Number(stat.calibrationSamples||0)+1;
  stat.confidenceSum=Number(stat.confidenceSum||0)+probability;
  stat.outcomeSum=Number(stat.outcomeSum||0)+outcome;
  stat.brierSum=Number(stat.brierSum||0)+((probability-outcome)**2);
  const clipped=Math.min(.999,Math.max(.001,probability));
  stat.logLossSum=Number(stat.logLossSum||0)-((outcome*Math.log(clipped))+((1-outcome)*Math.log(1-clipped)));
  return stat;
}

export function calibrationSummary(stat={}){
  const n=Number(stat.calibrationSamples||0);
  if(n<=0)return{samples:0,meanConfidence:null,empiricalRate:null,brierScore:null,logLoss:null,calibrationGap:null};
  const meanConfidence=Number(stat.confidenceSum||0)/n;
  const empiricalRate=Number(stat.outcomeSum||0)/n;
  return{
    samples:n,
    meanConfidence,
    empiricalRate,
    brierScore:Number(stat.brierSum||0)/n,
    logLoss:Number(stat.logLossSum||0)/n,
    calibrationGap:empiricalRate-meanConfidence
  };
}

export function calibratedConfidence(confidence,stat={},maxAdjustment=.12){
  const base=clamp(confidence);
  const summary=calibrationSummary(stat);
  if(summary.samples<5)return{confidence:base,adjustment:0,summary};
  const sampleWeight=clamp((summary.samples-4)/26);
  const gap=Math.max(-maxAdjustment,Math.min(maxAdjustment,summary.calibrationGap));
  const adjustment=gap*sampleWeight;
  return{confidence:clamp(base+adjustment),adjustment,summary};
}
