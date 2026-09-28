import { normalizeSportyBetFeed } from "./feedPipeline.js";
import { analyzeSportyBetFeed } from "./feedAnalysis.js";
const event={eventId:"fixture-agent-1",sport:"football",league:"Fixture",home:"Alpha",away:"Beta",markets:[{marketId:"m1",name:"1X2",group:"Main",selections:[{selectionId:"1",name:"Home",odds:2.1},{selectionId:"X",name:"Draw",odds:3.2},{selectionId:"2",name:"Away",odds:3.4}]}]};
const feed=normalizeSportyBetFeed([event],{capturedAt:new Date().toISOString()});
const result=analyzeSportyBetFeed(feed);
if(result.reports.length!==18)throw new Error("Expected 18 reports for one 1X2 market");
if(!result.decision.noBet||result.tickets.length!==0)throw new Error("NO BET gate failed without predictive evidence");
console.log("SportyBet feed analysis fixture passed");
