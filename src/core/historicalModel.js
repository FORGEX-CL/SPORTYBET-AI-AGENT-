const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const PRIOR_GOALS=1.35;
const MAX_GOALS=8;

function poisson(k,lambda){
  if(!Number.isFinite(lambda)||lambda<=0)return 0;
  let p=Math.exp(-lambda);
  for(let i=1;i<=k;i++)p*=lambda/i;
  return p;
}

function shrinkRate(rate,sample,prior=PRIOR_GOALS){
  const n=Math.max(0,Number(sample)||0);
  const weight=Math.min(0.80,n/(n+5));
  return prior+(Number(rate||prior)-prior)*weight;
}

function expectedGoals(home,away){
  if(!home||!away)return null;
  const homeAttack=home.homeHome?.avgGoalsFor??home.avgGoalsFor;
  const homeDefense=home.homeHome?.avgGoalsAgainst??home.avgGoalsAgainst;
  const awayAttack=away.awayAway?.avgGoalsFor??away.avgGoalsFor;
  const awayDefense=away.awayAway?.avgGoalsAgainst??away.avgGoalsAgainst;
  if([homeAttack,homeDefense,awayAttack,awayDefense].some(x=>!Number.isFinite(Number(x))))return null;
  const homeLambdaRaw=(Number(homeAttack)+Number(awayDefense))/2;
  const awayLambdaRaw=(Number(awayAttack)+Number(homeDefense))/2;
  return{
    homeLambda:clamp(shrinkRate(homeLambdaRaw,Math.min(home.homeHome?.sample??home.sample,away.awayAway?.sample??away.sample))),
    awayLambda:clamp(shrinkRate(awayLambdaRaw,Math.min(away.awayAway?.sample??away.sample,home.homeHome?.sample??home.sample)))
  };
}

function scoreMatrix(homeLambda,awayLambda){
  const rows=[];
  let total=0;
  for(let h=0;h<=MAX_GOALS;h++){
    for(let a=0;a<=MAX_GOALS;a++){
      const p=poisson(h,homeLambda)*poisson(a,awayLambda);
      rows.push({h,a,p});total+=p;
    }
  }
  return rows.map(x=>({...x,p:x.p/total}));
}

function distributionFromMatrix(matrix){
  let home=0,draw=0,away=0,btts=0,over25=0,homeScore=0,awayScore=0;
  for(const row of matrix){
    if(row.h>row.a)home+=row.p;
    else if(row.h===row.a)draw+=row.p;
    else away+=row.p;
    if(row.h>0&&row.a>0)btts+=row.p;
    if(row.h+row.a>2)over25+=row.p;
    if(row.h>0)homeScore+=row.p;
    if(row.a>0)awayScore+=row.p;
  }
  return{home,draw,away,btts,over25,homeScore,awayScore};
}

function selectionName(name){return String(name??"").trim().toLowerCase();}

function parseLine(name,fallback=2.5){
  const match=String(name??"").match(/(\d+(?:\.\d+)?)/);
  return match?Number(match[1]):fallback;
}

function tailUnderPoisson(lambda,line){
  const threshold=Math.floor(line);
  let p=0;
  for(let k=0;k<=threshold;k++)p+=poisson(k,lambda);
  return clamp(p);
}

function modelForSelection(market,selection,distribution,goals){
  const n=selectionName(selection?.name),m=selectionName(market?.name);
  if(m==="1x2"){
    if(["home","1"].includes(n))return distribution.home;
    if(["draw","x"].includes(n))return distribution.draw;
    if(["away","2"].includes(n))return distribution.away;
  }
  if(m.includes("double chance")){
    if(n.includes("home")&&n.includes("draw"))return distribution.home+distribution.draw;
    if(n.includes("draw")&&n.includes("away"))return distribution.draw+distribution.away;
    if(n.includes("home")&&n.includes("away"))return distribution.home+distribution.away;
  }
  if(m.includes("draw no bet")||m.includes("no bet")){
    if(["home","1"].includes(n))return distribution.home/(distribution.home+distribution.away);
    if(["away","2"].includes(n))return distribution.away/(distribution.home+distribution.away);
  }
  if(m.includes("gg/ng")||m.includes("both teams")){
    if(["yes","gg"].includes(n))return distribution.btts;
    if(["no","ng"].includes(n))return 1-distribution.btts;
  }
  if(m.includes("over/under")){
    const line=parseLine(selection?.name);
    const over=1-tailUnderPoisson(goals.homeLambda+goals.awayLambda,line);
    if(n.includes("over"))return over;
    if(n.includes("under"))return 1-over;
  }
  if(m.includes("home o/u")){
    const line=parseLine(selection?.name);
    const over=1-tailUnderPoisson(goals.homeLambda,line);
    if(n.includes("over"))return over;
    if(n.includes("under"))return 1-over;
  }
  if(m.includes("away o/u")){
    const line=parseLine(selection?.name);
    const over=1-tailUnderPoisson(goals.awayLambda,line);
    if(n.includes("over"))return over;
    if(n.includes("under"))return 1-over;
  }
  if(m.includes("teams to score")){
    if(n.includes("home"))return distribution.homeScore;
    if(n.includes("away"))return distribution.awayScore;
  }
  return null;
}

export function buildHistoricalModel(event,market,selection,historical={}){
  if(String(event?.sport).toLowerCase()!=="football")return null;
  const home=historical?.home,away=historical?.away;
  const minimumSample=Math.min(home?.sample??0,away?.sample??0);
  if(minimumSample<2)return null;
  const goals=expectedGoals(home,away);
  if(!goals)return null;
  const matrix=scoreMatrix(goals.homeLambda,goals.awayLambda);
  const distribution=distributionFromMatrix(matrix);
  const probability=modelForSelection(market,selection,distribution,goals);
  if(!Number.isFinite(probability))return null;
  const confidence=clamp(.32+(Math.min(minimumSample,5)/5)*.46+(Math.min(1,Math.abs(goals.homeLambda-goals.awayLambda)/1.2)*.10));
  return{
    modelProbability:clamp(probability),
    confidence,
    dataQuality:clamp(.30+(Math.min(minimumSample,5)/5)*.55),
    sample:minimumSample,
    modelType:"sportybet-historical-poisson-v2",
    historicalModel:true,
    expectedGoals:{home:goals.homeLambda,away:goals.awayLambda},
    distribution,
    evidence:[
      "Independent historical Poisson score model derived from stored SportyBet settled results.",
      "Expected goals combine recent home/away scoring and conceding rates with Bayesian shrinkage toward a league-neutral prior.",
      "The same score distribution drives result, BTTS and totals probabilities.",
      "Model is withheld when the historical sample is too small."
    ]
  };
}

export function combineModelSignals(models=[]){
  const valid=models.filter(x=>Number.isFinite(Number(x?.modelProbability)));
  if(!valid.length)return null;
  const weights=valid.map(x=>Math.max(.01,Number(x.confidence)||.01));
  const total=weights.reduce((a,b)=>a+b,0);
  const probability=valid.reduce((sum,x,i)=>sum+(Number(x.modelProbability)||0)*weights[i],0)/total;
  return{
    modelProbability:clamp(probability),
    confidence:clamp(valid.reduce((s,x)=>s+(Number(x.confidence)||0),0)/valid.length),
    dataQuality:clamp(valid.reduce((s,x)=>s+(Number(x.dataQuality)||0),0)/valid.length),
    evidence:valid.flatMap(x=>x.evidence??[]),
    modelType:valid.map(x=>x.modelType).join("+"),
    modelCount:valid.length,
    historicalModel:valid.some(x=>x?.historicalModel===true),
    componentModels:valid.map(x=>({type:x.modelType,probability:x.modelProbability,confidence:x.confidence}))
  };
}
