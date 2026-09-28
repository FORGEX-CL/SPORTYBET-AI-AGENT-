import { buildTicket, MAX_TICKETS } from "./ticketEngine.js";
import { scoreReport } from "./specialists.js";

export function buildCandidates(selections){
  const scored=selections.map(s=>({...s,score:s.score??scoreReport(s,s.agreement??0).score}));
  const sorted=[...scored].sort((a,b)=>b.score-a.score);
  const tickets=[];
  for(let size of [50,30,20,10,5]){
    if(tickets.length>=MAX_TICKETS) break;
    const picks=sorted.slice(0,size);
    if(!picks.length) continue;
    try{tickets.push(buildTicket(picks,{score:picks.reduce((n,x)=>n+x.score,0)/picks.length}));}catch{}
  }
  return tickets;
}
