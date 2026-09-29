import { normalizeSportyBetFeed, requireFreshFeed } from "./feedPipeline.js";
const empty=normalizeSportyBetFeed([]);
if(requireFreshFeed(empty).fresh)throw new Error("Empty SportyBet feed must not be fresh");
const feed=normalizeSportyBetFeed([{eventId:"1",sport:"football",home:"A",away:"B",markets:[{marketId:"main-1x2",name:"1X2",group:"Main",selections:[{selectionId:"1",name:"Home",odds:2.1},{selectionId:"X",name:"Draw",odds:3.2},{selectionId:"2",name:"Away",odds:3.4}]}]}],{sourceUrl:"https://lite.sportybet.com/ng/lite",capturedAt:new Date().toISOString()});
if(!requireFreshFeed(feed).fresh)throw new Error("Verified SportyBet feed freshness failed");
console.log("SportyBet feed pipeline fixture passed");
