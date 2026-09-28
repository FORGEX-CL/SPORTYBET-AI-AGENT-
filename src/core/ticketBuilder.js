import { buildTicket, MAX_SELECTIONS_PER_TICKET, MAX_TICKETS } from "./ticketEngine.js";

function uniqueBest(selections){
  const seenEvents=new Set();
  return [...selections].sort((a,b)=>(b.score??0)-(a.score??0)).filter(s=>{if(seenEvents.has(s.eventId))return false;seenEvents.add(s.eventId);return true;});
}
export function buildCandidateTickets(selections){
  const ranked=uniqueBest(selections).filter(s=>s.available!==false).filter(s=>Number(s.dataQuality)>=0.5).filter(s=>Array.isArray(s.predictiveAgents)?s.predictiveAgents.length>=2:true);
  const sizes=[Math.min(50,ranked.length),30,20,10,5,3,2,1],tickets=[];
  for(const size of sizes){if(tickets.length>=MAX_TICKETS)break;const picks=ranked.slice(0,size);if(!picks.length)continue;try{tickets.push(buildTicket(picks,{score:picks.reduce((n,x)=>n+(Number(x.score)||0),0)/picks.length}));}catch{}}
  return tickets;
}
export const TICKET_LIMIT=MAX_SELECTIONS_PER_TICKET;
