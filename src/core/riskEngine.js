const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

const COMPLEX_PATTERNS=[
  {test:n=>n.includes("early goals"),risk:.18,reason:"Early Goals has a time-window settlement rule and can diverge from the normal final score outcome."},
  {test:n=>n.includes("1up"),risk:.14,reason:"1UP markets can settle on an in-match lead condition before full-time."},
  {test:n=>n.includes("correct score"),risk:.16,reason:"Correct Score is intrinsically high variance and sensitive to the exact scoreline."},
  {test:n=>n.includes("player"),risk:.14,reason:"Player markets depend on player availability and role-specific event data."},
  {test:n=>n.includes("betbuilder")||n.includes("smart combo")||n.includes("&"),risk:.12,reason:"Combination markets contain multiple conditions and higher rule/settlement complexity."},
  {test:n=>n.includes("live"),risk:.10,reason:"Live markets can move rapidly and require time-sensitive source integrity."}
];

export function assessSelectionRisk({event={},market={},selection={},signal=null,historicalModel=null,platinumEnsemble=null,explicitRisks=[]}={}){
  const risks=[...explicitRisks];
  let riskScore=0;
  const marketName=String(market?.name??"").toLowerCase();

  if(signal?.overround>.12){
    riskScore+=.18;
    risks.push("SportyBet market overround is above 12%, reducing price efficiency confidence.");
  }
  if(Number(signal?.marketDepth)<2){
    riskScore+=.10;
    risks.push("Very shallow market depth limits internal price cross-checking.");
  }
  if(Number(signal?.crossMarketAgreement)<.70){
    riskScore+=.14;
    risks.push("Cross-market probabilities disagree materially.");
  }
  if(Number(selection?.odds)>=8){
    riskScore+=.16;
    risks.push("Long odds create high outcome variance and require unusually strong evidence.");
  }
  if(historicalModel&&Number.isFinite(Number(signal?.fairProbability))){
    const edge=Math.abs(Number(historicalModel.modelProbability)-Number(signal.fairProbability));
    if(edge>=.20){
      riskScore+=.20;
      risks.push("Historical model and SportyBet market fair probability diverge by at least 20 percentage points.");
    }else if(edge>=.12){
      riskScore+=.10;
      risks.push("Historical model and SportyBet market fair probability show a meaningful disagreement.");
    }
  }
  if(historicalModel&&Number(historicalModel.sample)<3){
    riskScore+=.12;
    risks.push("Historical model sample is still small.");
  }
  if(platinumEnsemble){
    if(Number(platinumEnsemble.uncertainty)>=.25){
      riskScore+=.14;
      risks.push("Platinum ensemble uncertainty is elevated.");
    }
    if(Number(platinumEnsemble.robustness)<.55){
      riskScore+=.16;
      risks.push("Platinum ensemble is not robust across its stress scenarios.");
    }
    if(Number(platinumEnsemble.downsideExpectedValue)<-.10){
      riskScore+=.12;
      risks.push("Stress-tested downside value is materially negative.");
    }
  }

  for(const pattern of COMPLEX_PATTERNS){
    if(pattern.test(marketName)){
      riskScore+=pattern.risk;
      risks.push(pattern.reason);
    }
  }

  if(String(event?.status??"scheduled").toLowerCase()!=="scheduled"){
    riskScore+=.12;
    risks.push("Event is not in scheduled status; stale or changing market state requires verification.");
  }

  const capped=clamp(riskScore);
  const severity=capped>=.50?"high":capped>=.25?"medium":capped>0?"low":"none";
  return{riskScore:capped,severity,risks:[...new Set(risks)],confidence:clamp(1-capped*.90),requiresExtraVerification:capped>=.25};
}
