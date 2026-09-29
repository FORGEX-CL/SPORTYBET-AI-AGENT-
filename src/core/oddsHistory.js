const MAX_POINTS_PER_KEY=12;

const keyOf=s=>`${s.eventId}:${s.marketId}:${s.selectionId}`;

export function recordSportyBetOddsSnapshot(history={},events=[],capturedAt=null){
  const next={...history};
  const at=capturedAt??new Date().toISOString();
  for(const event of events??[]){
    for(const market of event.markets??[]){
      for(const selection of market.selections??[]){
        if(selection.available===false||!Number.isFinite(Number(selection.odds))||Number(selection.odds)<=1)continue;
        const key=keyOf({eventId:event.eventId,marketId:market.marketId,selectionId:selection.selectionId});
        const points=Array.isArray(next[key])?[...next[key]]:[];
        points.push({
          capturedAt:at,
          odds:Number(selection.odds),
          eventId:String(event.eventId),
          marketId:String(market.marketId),
          selectionId:String(selection.selectionId),
          marketName:market.name??"",
          sport:event.sport??"",
          league:event.league??""
        });
        next[key]=points.slice(-MAX_POINTS_PER_KEY);
      }
    }
  }
  return next;
}

export function analyzeOddsMovement(points=[]){
  const rows=(Array.isArray(points)?points:[]).filter(x=>Number.isFinite(Number(x?.odds))).sort((a,b)=>Date.parse(a.capturedAt||0)-Date.parse(b.capturedAt||0));
  if(rows.length<2)return{samples:rows.length,movement:"insufficient_history",direction:"flat",change:null,volatility:null};
  const first=Number(rows[0].odds),latest=Number(rows.at(-1).odds);
  const changes=[];
  for(let i=1;i<rows.length;i++){
    const prev=Number(rows[i-1].odds),curr=Number(rows[i].odds);
    if(prev>1)changes.push((curr-prev)/prev);
  }
  const mean=changes.reduce((s,x)=>s+x,0)/(changes.length||1);
  const volatility=Math.sqrt(changes.reduce((s,x)=>s+((x-mean)**2),0)/(changes.length||1));
  const change=first>1?(latest-first)/first:0;
  const direction=change<-.03?"shortening":change>.03?"drifting_longer":"stable";
  return{
    samples:rows.length,
    firstOdds:first,
    latestOdds:latest,
    change,
    direction,
    volatility,
    minOdds:Math.min(...rows.map(x=>Number(x.odds))),
    maxOdds:Math.max(...rows.map(x=>Number(x.odds)))
  };
}

export function buildOddsMovementBySelection(history={}){
  return Object.fromEntries(Object.entries(history).map(([key,points])=>[key,analyzeOddsMovement(points)]));
}

export function oddsMovementForSelection(movement={},selection){
  return movement[keyOf(selection)]??null;
}
