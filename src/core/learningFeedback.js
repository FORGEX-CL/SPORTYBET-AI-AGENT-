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
  for(const candidate of candidates){
    const settled=settledCount(candidate.stat);
    if(settled>=5){
      const calibration=calibrationSummary(candidate.stat);
      return{
        available:true,
        reliability:smoothedWinRate(candidate.stat),
        weight:sampleWeight(candidate.stat),
        source:candidate.source,
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
  const adjustment=reliabilityAdjustment+calibrationAdjustment;
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
