import { buildChallengeRound } from "./debate.js";
import { runHeadAnalyst } from "./headAnalyst.js";
const reports=[
 {agentId:"statistics",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:.8,confidence:.8},
 {agentId:"football",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:.8,confidence:.7},
 {agentId:"odds",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:.8,confidence:.7,modelProbability:.65,value:.15},
 {agentId:"risk",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:1,confidence:.6,risks:["weak away form","late team news"]},
 {agentId:"market",eventId:"e1",marketId:"m1",selectionId:"1",selection:"Home",odds:2,dataQuality:1,confidence:1}
];
const debate=buildChallengeRound(reports);
if(!debate.some(x=>x.round===1&&x.from==="risk"&&x.severity==="high"))throw new Error("Risk debate challenge fixture failed");
if(!debate.some(x=>x.round===2&&x.type==="rebuttal"))throw new Error("Debate rebuttal fixture failed");
if(!debate.some(x=>x.round===3&&x.type==="resolution"&&x.decision==="reject"))throw new Error("Debate resolution fixture failed");
const decision=runHeadAnalyst(reports,{debate});
if(!decision.noBet||decision.accepted.length!==0)throw new Error("High-risk challenge must block Head Analyst approval");
console.log("Risk debate + Head Analyst veto fixture passed");
