const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

function teamStrength(profile){
  if(!profile||!profile.sample)return null;
  const goalDiff=(profile.avgGoalsFor??0)-(profile.avgGoalsAgainst??0);
  const pointsRate=(profile.points??0)/(profile.sample*3);
  return clamp(.5+(goalDiff*.10)+((pointsRate-.5)*.35));
}

function blend(a,b,wa=.5){
  if(a==null&&b==null)return null;
  if(a==null)return clamp(b);
  if(b==null)return clamp(a);
  return clamp((a*wa)+(b*(1-wa)));
}

function selectionName(name){return String(name??"").trim().toLowerCase();}

function probabilityForFootball(event,market,selection,historical){
  const home=historical?.home, away=historical?.away;
  if(!home&&!away)return null;
  const hs=teamStrength(home), as=teamStrength(away);
  const homeEdge=hs!=null&&as!=null?clamp(.5+(hs-as)*.75):historical?.formSignal??.5;
  const goalEdge=historical?.goalSignal??.5;
  const n=selectionName(selection?.name);
  const m=selectionName(market?.name);

  if(m==="1x2"){
    if(["home","1"].includes(n))return clamp(.32+(homeEdge*.50));
    if(["draw","x"].includes(n))return clamp(.18+((1-Math.abs(homeEdge-.5)*2)*.18));
    if(["away","2"].includes(n))return clamp(.32+((1-homeEdge)*.50));
  }

  if(m.includes("double chance")){
    if(n.includes("home")&&n.includes("draw"))return clamp(.55+(homeEdge*.35));
    if(n.includes("draw")&&n.includes("away"))return clamp(.55+((1-homeEdge)*.35));
    if(n.includes("home")&&n.includes("away"))return clamp(.70+(Math.abs(homeEdge-.5)*.20));
  }

  if(m==="draw no bet"||m.includes("no bet")){
    if(["home","1"].includes(n))return clamp(.48+(homeEdge*.42));
    if(["away","2"].includes(n))return clamp(.48+((1-homeEdge)*.42));
  }

  if(m.includes("both teams")||m.includes("gg/ng")){
    if(["yes","gg"].includes(n))return clamp(.25+(goalEdge*.50));
    if(["no","ng"].includes(n))return clamp(.25+((1-goalEdge)*.50));
  }

  if(m.includes("over/under")){
    const totalRate=blend(home?.over25Rate,away?.over25Rate,.5);
    if(totalRate==null)return null;
    const over=n.includes("over"), under=n.includes("under");
    if(over)return clamp(.15+(totalRate*.70));
    if(under)return clamp(.15+((1-totalRate)*.70));
  }

  if(m.includes("teams to score")){
    const sideHome=n.includes("home")||n.includes("1");
    const sideAway=n.includes("away")||n.includes("2");
    const rate=sideHome?clamp(.20+(Number(home?.bttsRate??0)*.65)):sideAway?clamp(.20+(Number(away?.bttsRate??0)*.65)):null;
    return rate;
  }

  return null;
}

function confidenceFromSamples(home,away){
  const sample=Math.min(home?.sample??0,away?.sample??0);
  return clamp(.30+(Math.min(sample,5)/5)*.50);
}

export function buildHistoricalModel(event,market,selection,historical={}){
  if(String(event?.sport).toLowerCase()!=="football")return null;
  const probability=probabilityForFootball(event,market,selection,historical);
  if(probability==null)return null;
  const sample=Math.min(historical.home?.sample??0,historical.away?.sample??0);
  if(sample<2)return null;
  const confidence=confidenceFromSamples(historical.home,historical.away);
  const evidence=[
    "Independent historical-form model derived from stored SportyBet settled results.",
    "Uses recent team form, scoring/conceding rates and home/away splits where available.",
    "Model is withheld when the historical sample is too small."
  ];
  return{
    modelProbability:probability,
    confidence,
    dataQuality:clamp(.30+(Math.min(sample,5)/5)*.55),
    sample,
    modelType:"sportybet-historical-form-v1",
    evidence,
    historicalModel:true
  };
}

export function combineModelSignals(models=[]){
  const valid=models.filter(x=>Number.isFinite(Number(x?.modelProbability)));
  if(!valid.length)return null;
  const total=valid.reduce((s,x)=>s+(Number(x.confidence)||0),0);
  const probability=total?valid.reduce((s,x)=>s+(Number(x.modelProbability)||0)*(Number(x.confidence)||0),0)/total:valid.reduce((s,x)=>s+Number(x.modelProbability),0)/valid.length;
  return{
    modelProbability:clamp(probability),
    confidence:clamp(valid.reduce((s,x)=>s+(Number(x.confidence)||0),0)/valid.length),
    dataQuality:clamp(valid.reduce((s,x)=>s+(Number(x.dataQuality)||0),0)/valid.length),
    evidence:valid.flatMap(x=>x.evidence??[]),
    modelType:valid.map(x=>x.modelType).join("+"),
    modelCount:valid.length,
    historicalModel:valid.some(x=>x?.historicalModel===true)
  };
}
