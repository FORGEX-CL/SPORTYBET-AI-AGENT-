import { createRuntimeCase, runAgent, runDebateRound, makeHeadDecision } from "./agentRuntime.js";
import { runHeadAnalyst } from "./headAnalyst.js";

export function analyzeEvent(event,{analyzers={},minScore=.55,maxSelections=50}={}){
  let state=createRuntimeCase(event,event.markets);
  const specialistIds=["statistics","football","multiSport","market","odds","risk"];
  for(const id of specialistIds){
    const analyzer=analyzers[id];
    if(typeof analyzer==="function") state=runAgent(state,id,analyzer);
  }
  const reports=state.agentReports.map(x=>x.report);
  const decision=runHeadAnalyst(reports,{minScore,maxSelections});
  state=runDebateRound(state,decision.accepted.slice(0,5).flatMap(s=>
    reports.filter(r=>r.eventId===s.eventId&&r.marketId===s.marketId&&r.selectionId===s.selectionId)
      .filter(r=>r.agentId!=="head").map(r=>({from:"head",to:r.agentId,message:`Candidate retained after score ${s.score.toFixed(3)}.`}))
  ));
  return makeHeadDecision(state,decision);
}
