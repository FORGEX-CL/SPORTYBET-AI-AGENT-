const KEY=r=>`${r.eventId}:${r.marketId}:${r.selectionId}`;

export function buildChallengeRound(reports=[],{maxCandidates=30}={}){
  const byKey=new Map();
  for(const report of reports){
    if(report.agentId==="market")continue;
    const key=KEY(report);
    const item=byKey.get(key)||{eventId:report.eventId,marketId:report.marketId,selectionId:report.selectionId,selection:report.selection,odds:report.odds,reports:[]};
    item.reports.push(report);
    byKey.set(key,item);
  }
  const ranked=[...byKey.values()].sort((a,b)=>{
    const avg=x=>x.reports.length?x.reports.reduce((s,r)=>s+(Number(r.confidence)||0),0)/x.reports.length:0;
    return avg(b)-avg(a);
  }).slice(0,maxCandidates);
  const messages=[];
  for(const item of ranked){
    const predictive=item.reports.filter(r=>["statistics","football","multiSport","odds"].includes(r.agentId));
    const risk=item.reports.find(r=>r.agentId==="risk");
    if(predictive.length){
      const strongest=[...predictive].sort((a,b)=>(Number(b.confidence)||0)-(Number(a.confidence)||0))[0];
      const weakest=[...predictive].sort((a,b)=>(Number(a.confidence)||0)-(Number(b.confidence)||0))[0];
      if(strongest&&weakest&&strongest.agentId!==weakest.agentId&&Math.abs((Number(strongest.confidence)||0)-(Number(weakest.confidence)||0))>=.15){
        messages.push({from:weakest.agentId,to:strongest.agentId,eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,severity:"medium",message:`Counter-analysis: ${weakest.agentId} confidence ${(Number(weakest.confidence)*100).toFixed(0)}% is materially below ${strongest.agentId} at ${(Number(strongest.confidence)*100).toFixed(0)}%; the selection requires reconciliation before approval.`});
      }
    }
    const risks=Array.isArray(risk?.risks)?risk.risks.filter(Boolean):[];
    if(risks.length){
      messages.push({from:"risk",to:predictive.map(r=>r.agentId).join(",")||"head",eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,severity:risks.length>=2?"high":"medium",message:`Risk challenge: ${risks.join("; ")}`});
    }else{
      messages.push({from:"risk",to:predictive.map(r=>r.agentId).join(",")||"head",eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,severity:"unverified",message:"Risk challenge: no explicit failure-mode evidence was supplied; independent verification is required before approval."});
    }
    const valueReports=predictive.filter(r=>Number.isFinite(Number(r.value)));
    if(valueReports.length>=2){
      const maxValue=Math.max(...valueReports.map(r=>Number(r.value)));
      const minValue=Math.min(...valueReports.map(r=>Number(r.value)));
      if(maxValue-minValue>=.15){
        messages.push({from:"odds",to:"head",eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,severity:"medium",message:`Value disagreement: model/value estimates range from ${(minValue*100).toFixed(1)}% to ${(maxValue*100).toFixed(1)}%; do not treat the highest estimate as consensus.`});
      }
    }
  }
  return messages;
}
