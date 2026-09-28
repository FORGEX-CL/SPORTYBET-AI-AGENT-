import { normalizeSportyBetFeed, requireFreshFeed } from "./feedPipeline.js";
const empty=normalizeSportyBetFeed([]);
if(requireFreshFeed(empty).fresh)throw new Error("Empty SportyBet feed must not be fresh");
const feed=normalizeSportyBetFeed([{eventId:"1",sport:"football",home:"A",away:"B",markets:[]}],{sourceUrl:"https://lite.sportybet.com/ng/lite",capturedAt:new Date().toISOString()});
if(!requireFreshFeed(feed).fresh)throw new Error("Verified SportyBet feed freshness failed");
console.log("SportyBet feed pipeline fixture passed");
