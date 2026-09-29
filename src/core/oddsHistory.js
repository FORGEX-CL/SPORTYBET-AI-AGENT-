const MAX_POINTS_PER_KEY=6;
const MAX_KEYS=8000;

const keyOf=s=>`${s.eventId}:${s.marketId}:${s.selectionId}`;

function normalizeEntry(entry){
  if(Array.isArray(entry))return{meta:entry.at(-1)?{eventId:entry.at(-1).eventId,marketId:entry.at(-1).marketId,selectionId:entry.at(-1).selectionId,marketName:entry.at(-1).marketName,sport:entry.at(-1).sport,league:entry.at(-1).league}:null,points:entry.map(x=>[Date.parse(x.capturedAt||0),Number(x.odds)]).filter(x=>Number.isFinite(x[0])&&Number.isFinite(x[1]))};
  if(entry&&Array.isArray(entry.points))return{meta:entry.meta??null,points:entry.points.filter(x=>Array.isArray(x)&&x.length>=2&&Number.isFinite(Number(x[0]))&&Number.isFinite(Number(x[1])))};
  return{meta:null,points:[]};
}

export function recordSportyBetOddsSnapshot(history={},events=[],capturedAt=null){
  const next={};
  for(const [key,value] of Object.entries(history??{})){
    const normalized=normalizeEntry(value);
    if(normalized.points.length)next[key]={
      meta:normalized.meta,
      points:normalized.points.slice(-MAX_POINTS_PER_KEY)
    };
  }
  const at=Date.parse(capturedAt??new Date().toISOString());
  for(const event of events??[]){
    for(const market of event.markets??[]){
      for(const selection of market.selections??[]){
        if(selection.available===false||!Number.isFinite(Number(selection.odds))||Number(selection.odds)<=1)continue;
        const key=keyOf({eventId:event.eventId,marketId:market.marketId,selectionId:selection.selectionId});
        const entry=normalizeEntry(next[key]);
        entry.meta={
          eventId:String(event.eventId),
          marketId:String(market.marketId),
          selectionId:String(selection.selectionId),
          marketName:market.name??"",
          selectionName:selection.name??"",
          sport:event.sport??"",
          league:event.league??"",
          home:event.home??"",
          away:event.away??"",
          startTime:event.startTime??null
        };
        entry.points=[...entry.points,[Number.isFinite(at)?at:Date.now(),Number(selection.odds)]].slice(-MAX_POINTS_PER_KEY);
        next[key]=entry;
      }
    }
  }

  const keys=Object.entries(next).sort((a,b)=>{
    const at=a[1].points.at(-1)?.[0]??0;
    const bt=b[1].points.at(-1)?.[0]??0;
    return bt-at;
  }).slice(0,MAX_KEYS);
  return Object.fromEntries(keys);
}

function normalizedPoints(points=[]){
  return (Array.isArray(points)?points:[]).map(x=>{
    if(Array.isArray(x))return{at:Number(x[0]),odds:Number(x[1])};
    return{at:Date.parse(x?.capturedAt||0),odds:Number(x?.odds)};
  }).filter(x=>Number.isFinite(x.at)&&Number.isFinite(x.odds)&&x.odds>1).sort((a,b)=>a.at-b.at);
}

export function analyzeOddsMovement(entry){
  const rows=normalizedPoints(entry?.points??entry);
  if(rows.length<2)return{samples:rows.length,movement:"insufficient_history",direction:"flat",change:null,volatility:null};
  const first=rows[0].odds,latest=rows.at(-1).odds;
  const changes=[];
  for(let i=1;i<rows.length;i++){
    const prev=rows[i-1].odds,curr=rows[i].odds;
    if(prev>1)changes.push((curr-prev)/prev);
  }
  const mean=changes.reduce((s,x)=>s+x,0)/(changes.length||1);
  const volatility=Math.sqrt(changes.reduce((s,x)=>s+((x-mean)**2),0)/(changes.length||1));
  const change=first>1?(latest-first)/first:0;
  return{
    samples:rows.length,
    firstOdds:first,
    latestOdds:latest,
    change,
    direction:change<-.03?"shortening":change>.03?"drifting_longer":"stable",
    volatility,
    minOdds:Math.min(...rows.map(x=>x.odds)),
    maxOdds:Math.max(...rows.map(x=>x.odds))
  };
}

export function buildOddsMovementBySelection(history={}){
  return Object.fromEntries(Object.entries(history).map(([key,entry])=>[key,analyzeOddsMovement(entry)]));
}

export function oddsMovementForSelection(movement={},selection){
  return movement[keyOf(selection)]??null;
}
