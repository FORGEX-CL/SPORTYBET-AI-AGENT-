import { validateTicketAgainstEvents } from "./ticketEngine.js";
import { requireFreshFeed } from "./feedPipeline.js";

export function revalidateTicket(ticket,feed,{maxAgeMs=120000}={}){
  const freshness=requireFreshFeed(feed,{maxAgeMs});
  if(!freshness.fresh) return {valid:false,reason:"stale_or_missing_feed",freshness,issues:[]};
  const result=validateTicketAgainstEvents(ticket,feed.events);
  return {valid:result.valid,reason:result.valid?"validated":"selection_data_changed",freshness,issues:result.issues};
}
