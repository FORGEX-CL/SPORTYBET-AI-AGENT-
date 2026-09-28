const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));

function eventResultKey(result){
  return String(result?.eventId??"");
}

function normalizeResult(result={},capturedAt=null){
  return {
    eventId:eventResultKey(result),
    sport:String(result.sport??"football").toLowerCase(),
    home:String(result.home??""),
    away:String(result.away??""),
    finalScore:{
      home:Number(result.finalScore?.home),
      away:Number(result.finalScore?.away)
    },
    halfTime:result.halfTime??null,
    playedAt:result.playedAt??null,
    capturedAt:result.capturedAt??capturedAt??null,
    source:result.source??"SportyBet"
  };
}

export function mergeSportyBetResultHistory(existing=[],incoming=[],capturedAt=null){
  const byId=new Map((Array.isArray(existing)?existing:[]).filter(x=>x?.eventId).map(x=>[eventResultKey(x),x]));
  for(const raw of Array.isArray(incoming)?incoming:[]){
    const result=normalizeResult(raw,capturedAt);
    if(!result.eventId||!result.home||!result.away||!Number.isFinite(result.finalScore.home)||!Number.isFinite(result.finalScore.away))continue;
    byId.set(result.eventId,result);
  }
  return [...byId.values()];
}

function resultForTeam(result,team){
  const name=String(team).toLowerCase();
  const home=String(result.home).toLowerCase()===name;
  const away=String(result.away).toLowerCase()===name;
  if(!home&&!away)return null;
  const gf=home?result.finalScore.home:result.finalScore.away;
  const ga=home?result.finalScore.away:result.finalScore.home;
  const outcome=gf>ga?"W":gf===ga?"D":"L";
  return {outcome,gf,ga,home};
}

function sortRecent(results=[]){
  return [...results].sort((a,b)=>{
    const at=a.playedAt?Date.parse(a.playedAt):0;
    const bt=b.playedAt?Date.parse(b.playedAt):0;
    return bt-at;
  });
}

function teamProfile(history,team,{venue=null,lastN=5}={}){
  const name=String(team);
  const matches=sortRecent(history.map(r=>resultForTeam(r,name)?r:null).filter(Boolean)).filter(r=>{
    if(venue==="home")return String(r.home).toLowerCase()===name.toLowerCase();
    if(venue==="away")return String(r.away).toLowerCase()===name.toLowerCase();
    return true;
  }).slice(0,lastN);
  if(!matches.length)return null;
  const rows=matches.map(r=>resultForTeam(r,name));
  const wins=rows.filter(r=>r.outcome==="W").length;
  const draws=rows.filter(r=>r.outcome==="D").length;
  const losses=rows.filter(r=>r.outcome==="L").length;
  const goalsFor=rows.reduce((sum,r)=>sum+r.gf,0);
  const goalsAgainst=rows.reduce((sum,r)=>sum+r.ga,0);
  const cleanSheets=rows.filter(r=>r.ga===0).length;
  const btts=rows.filter(r=>r.gf>0&&r.ga>0).length;
  const over25=rows.filter(r=>r.gf+r.ga>2).length;
  return{
    sample:rows.length,wins,draws,losses,points:(wins*3)+draws,
    goalsFor,goalsAgainst,avgGoalsFor:goalsFor/rows.length,avgGoalsAgainst:goalsAgainst/rows.length,
    cleanSheetRate:cleanSheets/rows.length,bttsRate:btts/rows.length,over25Rate:over25/rows.length,
    form:rows.map(r=>r.outcome).join(""),
    venue
  };
}

export function buildHistoricalEvidence(event,history=[]){
  const source=Array.isArray(history)?history:[];
  const home=teamProfile(source,event?.home,{lastN:5});
  const away=teamProfile(source,event?.away,{lastN:5});
  const homeHome=teamProfile(source,event?.home,{venue:"home",lastN:5});
  const awayAway=teamProfile(source,event?.away,{venue:"away",lastN:5});
  const evidence=[];
  if(home)evidence.push("SportyBet result history: "+event.home+" last "+home.sample+" matches form "+home.form+"; goals "+home.goalsFor+" scored / "+home.goalsAgainst+" conceded.");
  if(away)evidence.push("SportyBet result history: "+event.away+" last "+away.sample+" matches form "+away.form+"; goals "+away.goalsFor+" scored / "+away.goalsAgainst+" conceded.");
  if(homeHome)evidence.push("SportyBet home split: "+event.home+" "+homeHome.form+" across "+homeHome.sample+" home matches.");
  if(awayAway)evidence.push("SportyBet away split: "+event.away+" "+awayAway.form+" across "+awayAway.sample+" away matches.");
  const dataQuality=clamp((Math.min(home?.sample??0,5)+Math.min(away?.sample??0,5))/10);
  const formEdge=home&&away?clamp(.5+((home.points/home.sample)-(away.points/away.sample))/.15):.5;
  const goalEdge=home&&away?clamp(.5+((home.avgGoalsFor-home.avgGoalsAgainst)-(away.avgGoalsFor-away.avgGoalsAgainst))/.8):.5;
  return{
    evidence,home,away,homeHome,awayAway,dataQuality,
    formSignal:formEdge,goalSignal:goalEdge,
    confidence:clamp(.35+(dataQuality*.45))
  };
}

export function buildHistoricalEvidenceByEvent(events=[],history=[]){
  const output={};
  for(const event of events){
    const historical=buildHistoricalEvidence(event,history);
    output[event.eventId]=historical;
  }
  return output;
}
