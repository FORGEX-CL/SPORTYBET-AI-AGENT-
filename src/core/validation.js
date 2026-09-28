import { validateEvent } from "./types.js";
import { validateTicketAgainstEvents } from "./ticketEngine.js";

export function validateSportyBetFeed(events=[]){
  const invalid=events.filter(e=>!validateEvent(e));
  const duplicateIds=events.map(e=>e.eventId).filter((id,i,a)=>a.indexOf(id)!==i);
  return {valid:invalid.length===0&&duplicateIds.length===0,invalidCount:invalid.length,duplicateIds};
}

export function validateCandidates(tickets,events){
  return tickets.map(ticket=>({...ticket,revalidation:validateTicketAgainstEvents(ticket,events)}));
}
