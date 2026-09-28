import { runHeadAnalyst } from "./headAnalyst.js";
const reports=[
 {agentId:"market",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:1,confidence:1},
 {agentId:"risk",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:1,confidence:1,risks:[]}
];
const decision=runHeadAnalyst(reports);
if(!decision.noBet||decision.accepted.length!==0)throw new Error("Market-only confidence must not approve a selection");
console.log("Predictive confidence isolation fixture passed");
