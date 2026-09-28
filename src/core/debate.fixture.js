import { buildChallengeRound } from "./debate.js";
const reports=[
 {agentId:"statistics",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:.8,confidence:.8},
 {agentId:"football",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:.8,confidence:.7},
 {agentId:"risk",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:1,confidence:.6,risks:["weak away form","late team news"]},
 {agentId:"market",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:1,confidence:1}
];
const debate=buildChallengeRound(reports);
if(debate.length!==1||debate[0].severity!=="high"||debate[0].from!=="risk")throw new Error("Risk debate fixture failed");
console.log("Risk debate fixture passed");
