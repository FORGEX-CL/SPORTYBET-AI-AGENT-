import { createLearningLedger, registerTickets, settleLedger, learningSummary } from "./learningLedger.js";
const ticket={ticketId:"ledger-t1",createdAt:new Date().toISOString(),combinedOdds:2,selections:[{eventId:"e1",marketId:"m1",selectionId:"1",sport:"football",marketName:"1X2",odds:2,score:.8,confidence:.8,dataQuality:.9,predictiveAgents:["statistics","football"],agents:["statistics","football","market"],debate:[]}]};
let ledger=createLearningLedger();
ledger=registerTickets(ledger,[ticket]);
if(ledger.predictions.length!==1)throw new Error("Ledger registration failed");
ledger=settleLedger(ledger,[{ticketId:"ledger-t1",eventId:"e1",marketId:"m1",selectionId:"1",result:"won",source:"fixture"}]);
const summary=learningSummary(ledger);
if(summary.won!==1||summary.settled!==1)throw new Error("Ledger settlement failed");
console.log("Learning ledger fixture passed");
