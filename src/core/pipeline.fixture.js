import { normalizeSportyBetFeed } from "./feedPipeline.js";
import { buildCandidateTickets } from "./ticketBuilder.js";
const event={eventId:"fixture-1",sport:"football",league:"Fixture League",home:"Alpha FC",away:"Beta FC",startTime:"12:00",markets:[{marketId:"m1",name:"1X2",group:"Main",selections:[{selectionId:"1",name:"Home",odds:2.1},{selectionId:"X",name:"Draw",odds:3.2},{selectionId:"2",name:"Away",odds:3.4}]}]};
const feed=normalizeSportyBetFeed([event]);
if(feed.eventCount!==1||feed.marketCount!==1)throw new Error("Feed normalization fixture failed");
const tickets=buildCandidateTickets([{eventId:"fixture-1",marketId:"m1",selectionId:"1",name:"Home",odds:2.1,available:true,score:.8}]);
if(tickets.length!==1||tickets[0].selectionCount!==1)throw new Error("Ticket fixture failed");
console.log("Feed pipeline fixture passed");
