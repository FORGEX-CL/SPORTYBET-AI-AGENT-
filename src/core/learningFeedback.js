import { calibratedConfidence, calibrationSummary } from "./agentCalibration.js";

const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const DEFAULT_PRIOR=.5;

function settledCount(stat={}){
  return Number(stat.won||0)+Number(stat.lost||0);
}

function smoothedWinRate(stat={},priorStrength=4){
  const settled=settledCount(stat);
  return (Number(stat.won||0)+DEFAULT_PRIOR*priorStrength)/(settled+priorStrength);
}

function sampleWeight(stat={},minimum=5,maximum=30){
  const settled=settledCount(stat);
  return clamp((settled-minimum+1)/Math.max(1,maximum-minimum+1));
}

function contextStat(statStore,key){
  return key&&statStore&&typeof statStore[key]==="object"?statStore[key]:null;
}

function blendCalibration(local,overall,localWeight){
  const l=calibrationSummary(local??{}),o=calibrationSummary(overall??{});
  if(!l.samples&&!o.samples)return null;
  if(!o.samples)return l;
  if(!l.samples)return o;
  const a=clamp(localWeight),b=1-a;
  return{
    samples:Math.round((l.samples*a)+(o.samples*b)),
    meanConfidence:(Number(l.meanConfidence||.5)*a)+(Number(o.meanConfidence||.5)*b),
    empiricalRate:(Number(l.empiricalRate||.5)*a)+(Number(o.empiricalRate||.5)*b),
    brierScore:(Number(l.brierScore||.25)*a)+(Number(o.brierScore||.25)*b),
    logLoss:(Number(l.logLoss||.69)*a)+(Number(o.logLoss||.69)*b),
    calibrationGap:(Number(l.calibrationGap||0)*a)+(Number(o.calibrationGap||0)*b)
  };
}

export function getAgentHistoricalFeedback(performance={},agentId,{sport="unknown",market="unknown",oddsRange="unknown",confidenceBand="unknown"}={}){
  const agent=performance.agents?.[agentId];
  if(!agent)return{available:false,reliability:.5,weight:0,source:"none",settled:0,calibration:null};

  const candidates=[
    {source:"sport+market",stat:contextStat(agent.bySportMarket,`${sport}::${market}`)},
    {source:"sport",stat:contextStat(agent.bySport,sport)},
    {source:"market",stat:contextStat(agent.byMarket,market)},
    {source:"odds",stat:contextStat(agent.byOddsRange,oddsRange)},
    {source:"confidence",stat:contextStat(agent.byConfidenceBand,confidenceBand)},
    {source:"overall",stat:agent}
  ];
  const overall=agent;
  for(const candidate of candidates){
    const settled=settledCount(candidate.stat);
    if(settled>=5){
      const localWeight=clamp(settled/(settled+20));
      const localReliability=smoothedWinRate(candidate.stat);
      const overallReliability=smoothedWinRate(overall);
      const reliability=(localReliability*localWeight)+(overallReliability*(1-localWeight));
      const calibration=blendCalibration(candidate.stat,overall,localWeight);
      return{
        available:true,
        reliability,
        weight:sampleWeight(candidate.stat)*(agent.drift?.reliabilityMultiplier??1),
        source:candidate.source+"+overall_prior",
        drift:agent.drift??null,
        settled,
        calibration
      };
    }
  }
  return{
    available:false,
    reliability:.5,
    weight:0,
    source:"insufficient_history",
    settled:settledCount(agent),
    calibration:calibrationSummary(agent)
  };
}

export function applyHistoricalFeedback(confidence,feedback,{maxAdjustment=.10}={}){
  const base=clamp(confidence);
  if(!feedback?.available||feedback.weight<=0)return{confidence:base,adjustment:0,calibrationAdjustment:0,feedback};
  const reliabilityAdjustment=(feedback.reliability-.5)*2*maxAdjustment*clamp(feedback.weight);
  const calibrated=calibratedConfidence(base,{...feedback.calibration,...{}} , .12);
  const calibrationAdjustment=Number(calibrated.adjustment)||0;
  const adjustment=Math.max(-.12,Math.min(.12,reliabilityAdjustment+calibrationAdjustment));
  return{
    confidence:clamp(base+adjustment),
    adjustment,
    calibrationAdjustment,
    feedback
  };
}

export function feedbackForReport(performance,report){
  const odds=Number(report.odds);
  const oddsRange=!Number.isFinite(odds)?"unknown":odds<1.5?"<1.50":odds<2?"1.50-1.99":odds<3?"2.00-2.99":odds<5?"3.00-4.99":"5.00+";
  const c=Number(report.confidence);
  const confidenceBand=!Number.isFinite(c)?"unknown":c<.55?"<0.55":c<.70?"0.55-0.69":c<.85?"0.70-0.84":"0.85+";
  return getAgentHistoricalFeedback(performance,report.agentId,{sport:report.sport,market:report.marketName,oddsRange,confidenceBand});
}
