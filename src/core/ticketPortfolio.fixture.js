import { buildTicketPortfolio } from "./ticketPortfolio.js";
const selections=Array.from({length:50},(_,i)=>({
  eventId:\`e\${i+1}\`,marketId:"m1",selectionId:"1",sport:i%2?"football":"basketball",league:i%5?"L1":"L2",marketName:i%3?"1X2":"Over/Under",
  selection:\`Pick \${i+1}\`,odds:2,score:.8-(i*.005),dataQuality:.9,predictiveAgents:["statistics","football"],available:true
}));
const tickets=buildTicketPortfolio(selections,{sourceUrl:"https://lite.sportybet.com/ng/lite",capturedAt:"2026-09-28T17:00:00.000Z"});
if(tickets.length!==10)throw new Error("Portfolio should create 10 unique ticket profiles with 50 viable events");
if(tickets[0].selectionCount!==3||tickets[1].selectionCount!==5||tickets[2].selectionCount!==8||tickets.at(-1).selectionCount!==50)throw new Error("Ticket profile sizing failed");
if(tickets.some(t=>new Set(t.selections.map(s=>s.eventId)).size!==t.selectionCount))throw new Error("Ticket contains duplicate event");
if(tickets.some(t=>t.selectionCount>50))throw new Error("Ticket exceeded SportyBet selection limit");
if(tickets.some(t=>t.frozen!==true||t.snapshot?.source!=="SportyBet"))throw new Error("Ticket snapshot metadata missing");
console.log("Ticket portfolio fixture passed");
