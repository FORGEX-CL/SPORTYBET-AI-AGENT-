import { normalizeSportyBetFeed } from "./feedPipeline.js";
import { compareTicketToFeed } from "./ticketDelta.js";

const feed=normalizeSportyBetFeed([{eventId:"e1",sport:"football",home:"A",away:"B",markets:[{marketId:"m1",name:"1X2",selections:[{selectionId:"1",name:"Home",odds:2.2}]}]}],{capturedAt:new Date().toISOString()});
const ticket={combinedOdds:2,selections:[{eventId:"e1",marketId:"m1",selectionId:"1",odds:2,name:"Home"}]};
const delta=compareTicketToFeed(ticket,feed);
if(delta.status!=="changed"||delta.changed[0]?.reason!=="odds_changed"||delta.currentCombinedOdds!==2.2)throw new Error("Ticket delta fixture failed");
console.log("Ticket delta fixture passed");
