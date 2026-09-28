import { validateSportyBetFeed } from "./validation.js";
import { buildMarketCatalogue } from "./marketCatalogue.js";
import { analyzeEventMarkets } from "./marketAnalyzer.js";

export function normalizeSportyBetFeed(events=[]){
  const validation=validateSportyBetFeed(events);
  if(!validation.valid) throw new Error(`Invalid SportyBet feed: ${validation.invalidCount} invalid events, ${validation.duplicateIds.length} duplicate IDs`);
  const normalized=events.map(event=>({...event,markets:buildMarketCatalogue(event.markets)}));
  return {
    source:"SportyBet",
    capturedAt:new Date().toISOString(),
    eventCount:normalized.length,
    events:normalized,
    marketCount:normalized.reduce((n,e)=>n+e.markets.length,0),
    marketViews:normalized.flatMap(analyzeEventMarkets)
  };
}

export function requireFreshFeed(feed,{maxAgeMs=120000,now=Date.now()}={}){
  if(!feed?.capturedAt) return {fresh:false,reason:"missing_capture_time"};
  const age=now-new Date(feed.capturedAt).getTime();
  return {fresh:Number.isFinite(age)&&age>=0&&age<=maxAgeMs,ageMs:age};
}
