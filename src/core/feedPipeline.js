import { validateSportyBetFeed } from "./validation.js";
import { buildMarketCatalogue } from "./marketCatalogue.js";
import { analyzeEventMarkets } from "./marketAnalyzer.js";

export function normalizeSportyBetFeed(events=[],metadata={}){
  const validation=validateSportyBetFeed(events);
  if(!validation.valid) throw new Error(`Invalid SportyBet feed: ${validation.invalidCount} invalid events, ${validation.duplicateIds.length} duplicate IDs`);
  const normalized=events.map(event=>({...event,markets:buildMarketCatalogue(event.markets)}));
  return {
    source:"SportyBet",
    sourceUrl:metadata.sourceUrl??null,
    capturedAt:metadata.capturedAt??(normalized.length?new Date().toISOString():null),
    eventCount:normalized.length,
    events:normalized,
    marketCount:normalized.reduce((n,e)=>n+e.markets.length,0),
    marketViews:normalized.flatMap(analyzeEventMarkets),
    status:normalized.length?"verified":"empty"
  };
}

export function requireFreshFeed(feed,{maxAgeMs=120000,now=Date.now()}={}){
  if(!feed?.capturedAt)return{fresh:false,reason:"missing_capture_time"};
  if(feed.status!=="verified"||Number(feed.eventCount)<=0)return{fresh:false,reason:"empty_or_unverified_feed"};
  const captured=Date.parse(feed.capturedAt),age=now-captured;
  return{fresh:Number.isFinite(captured)&&age>=0&&age<=maxAgeMs,ageMs:age};
}
