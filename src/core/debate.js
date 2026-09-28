const KEY=r=>`${r.eventId}:${r.marketId}:${r.selectionId}`;

export function buildChallengeRound(reports=[],{maxCandidates=20}={}){
  const byKey=new Map();
  for(const report of reports){
    if(report.agentId==="market")continue;
    const key=KEY(report);
    const item=byKey.get(key)||{eventId:report.eventId,marketId:report.marketId,selectionId:report.selectionId,selection:report.selection,odds:report.odds,reports:[]};
    item.reports.push(report);
    byKey.set(key,item);
  }
  const ranked=[...byKey.values()].sort((a,b)=>{
    const ac=Math.max(...a.reports.map(r=>Number(r.confidence)||0),0);
    const bc=Math.max(...b.reports.map(r=>Number(r.confidence)||0),0);
    return bc-ac;
  }).slice(0,maxCandidates);
  const messages=[];
  for(const item of ranked){
    const risk=item.reports.find(r=>r.agentId==="risk");
    const targets=item.reports.filter(r=>r.agentId!=="risk"&&r.agentId!=="market").sort((a,b)=>(Number(b.confidence)||0)-(Number(a.confidence)||0));
    const target=targets[0];
    if(!target)continue;
    const risks=Array.isArray(risk?.risks)?risk.risks.filter(Boolean):[];
    if(risks.length){
      messages.push({from:"risk",to:target.agentId,eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,severity:risks.length>=2?"high":"medium",message:`Risk challenge: ${risks.join("; ")}`});
    }else{
      messages.push({from:"risk",to:target.agentId,eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,severity:"unverified",message:"Risk challenge: no explicit failure-mode evidence was supplied for this selection; supporting evidence should be independently verified before approval."});
    }
  }
  return messages;
}
