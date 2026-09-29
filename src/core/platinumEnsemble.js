const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

function weightedMean(items){
  const valid=items.filter(x=>Number.isFinite(Number(x.probability))&&Number(x.weight)>0);
  if(!valid.length)return null;
  const total=valid.reduce((s,x)=>s+Number(x.weight),0);
  return clamp(valid.reduce((s,x)=>s+Number(x.probability)*Number(x.weight),0)/total);
}

function shrink(a,b,ratio){
  return clamp(Number(a)+(Number(b)-Number(a))*clamp(ratio));
}

function disagreement(models){
  const values=models.map(x=>Number(x.probability)).filter(Number.isFinite);
  if(values.length<2)return 0;
  const mean=values.reduce((s,x)=>s+x,0)/values.length;
  return Math.sqrt(values.reduce((s,x)=>s+((x-mean)**2),0)/values.length);
}

export function buildPlatinumEnsemble({marketProbability=null,marketConfidence=0,independentModels=[],dataQuality=0,sourceAgreement=0,odds=null}={}){
  const components=[];
  if(Number.isFinite(Number(marketProbability)))components.push({id:"sportybet-market",probability:Number(marketProbability),weight:.55*clamp(marketConfidence||.5)});
  for(const model of independentModels){
    if(!Number.isFinite(Number(model?.modelProbability)))continue;
    const confidence=clamp(model.confidence??.5);
    const quality=clamp(model.dataQuality??.5);
    const weight=.45*confidence*(.65+.35*quality);
    components.push({id:model.modelType??"independent",probability:Number(model.modelProbability),pushProbability:Number(model.pushProbability)||0,weight});
  }
  const base=weightedMean(components);
  if(base==null)return null;

  const market=Number.isFinite(Number(marketProbability))?clamp(marketProbability):base;
  const pushComponents=components.filter(x=>Number(x.pushProbability)>0);
  const pushProbability=pushComponents.length?weightedMean(pushComponents.map(x=>({probability:x.pushProbability,weight:x.weight}))):0;
  const independent=independentModels.map(x=>Number(x?.modelProbability)).filter(Number.isFinite);
  const modelDisagreement=independent.length?disagreement(independent.map((p,i)=>({probability:p,weight:1}))):0;
  const marketDisagreement=Math.abs(base-market);
  const uncertainty=clamp((modelDisagreement*.90)+(marketDisagreement*.65)+((1-clamp(dataQuality))*.30)+((1-clamp(sourceAgreement))*.20));

  const scenarios=[
    base,
    shrink(base,market,.25),
    shrink(base,.50,.18),
    clamp(base-uncertainty*.60),
    clamp(base+uncertainty*.40)
  ];
  const conservative=Math.min(...scenarios);
  const optimistic=Math.max(...scenarios);
  const robustness=clamp(1-((optimistic-conservative)*1.35));
  const robustProbability=clamp((conservative*.70)+(base*.30));
  const robustPush=clamp(pushProbability);
  const robustLoss=clamp(1-robustProbability-robustPush);
  const optimisticPush=robustPush;
  const conservativePush=robustPush;
  const value=Number.isFinite(Number(odds))?((robustProbability*(Number(odds)-1))-robustLoss):null;
  const upsideValue=Number.isFinite(Number(odds))?((optimistic*(Number(odds)-1))-clamp(1-optimistic-optimisticPush)):null;
  const downsideValue=Number.isFinite(Number(odds))?((conservative*(Number(odds)-1))-clamp(1-conservative-conservativePush)):null;

  return{
    modelProbability:base,
    robustProbability,
    pushProbability:robustPush,
    lossProbability:robustLoss,
    conservativeProbability:conservative,
    optimisticProbability:optimistic,
    uncertainty,
    robustness,
    modelDisagreement,
    marketDisagreement,
    expectedValue:value,
    downsideExpectedValue:downsideValue,
    upsideExpectedValue:upsideValue,
    confidence:clamp((1-uncertainty)*.55+(robustness*.25)+clamp(dataQuality)*.20),
    dataQuality:clamp(dataQuality),
    modelType:"sportybet-platinum-ensemble-v1",
    historicalModel:independentModels.some(x=>x?.historicalModel===true),
    independentEvidence:independentModels.length>0,
    components,
    scenarioCount:scenarios.length,
    evidence:[
      "Platinum ensemble combines SportyBet market consensus with independent model evidence.",
      "Probability is stress-tested toward market consensus and neutral probability before approval.",
      "Robust probability is conservative; expected value is calculated from robust probability rather than the optimistic case."
    ]
  };
}

export function rankEnsembleCandidates(candidates=[]){
  return [...candidates].sort((a,b)=>{
    const av=(Number(a?.robustProbability)||0)*.35+(Number(a?.robustness)||0)*.25+(Number(a?.confidence)||0)*.20+Math.max(0,Number(a?.expectedValue)||0)*.20;
    const bv=(Number(b?.robustProbability)||0)*.35+(Number(b?.robustness)||0)*.25+(Number(b?.confidence)||0)*.20+Math.max(0,Number(b?.expectedValue)||0)*.20;
    return bv-av;
  });
}
