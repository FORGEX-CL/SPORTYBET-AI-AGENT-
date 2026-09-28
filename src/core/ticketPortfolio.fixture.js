import { buildTicketPortfolio } from "./ticketPortfolio.js";
const selections=Array.from({length:12},(_,i)=>({
  eventId:\`e\${i+1}\`,marketId:"m1",selectionId:"1",sport:"football",league:i<6?"L1":"L2",marketName:i%2?"1X2":"Over/Under",
  selection:\`Pick \${i+1}\`,odds:2,score:.8-(i*.01),dataQuality:.9,predictiveAgents:["statistics","football"],available:true
}));
const tickets=buildTicketPortfolio(selections);
if(tickets.length!==8)throw new Error("Portfolio should create one ticket per viable target size up to the available 12 events");
if(tickets[0].selectionCount!==3||tickets[1].selectionCount!==5||tickets.at(-1).selectionCount!==12)throw new Error("Ticket profile sizing failed");
if(tickets.some(t=>new Set(t.selections.map(s=>s.eventId)).size!==t.selectionCount))throw new Error("Ticket contains duplicate event");
console.log("Ticket portfolio fixture passed");
