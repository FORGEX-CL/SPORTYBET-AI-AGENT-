import { buildAgentDriftReport } from "./modelDrift.js";

const predictions=Array.from({length:20},(_,i)=>({
  settledAt:"2026-09-"+String(i+1).padStart(2,"0")+"T18:00:00.000Z",
  settledSelections:[{
    result:i<10?"won":"lost",
    agentAttribution:{agentForecasts:[{agentId:"statistics",confidence:i<10?.60:.90}]}
  }]
}));
const drift=buildAgentDriftReport(predictions,"statistics",{recentWindow:10,minSamples:10});
if(drift.status!=="degrading")throw new Error("Agent drift was not detected");
if(!(drift.reliabilityMultiplier<1))throw new Error("Drift did not reduce reliability");
console.log("modelDrift fixture: ok");
