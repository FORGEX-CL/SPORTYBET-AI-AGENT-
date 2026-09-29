const KEY=r=>`${r.eventId}:${r.marketId}:${r.selectionId}`;

function predictive(reports){
  return reports.filter(r=>["statistics","football","multiSport","odds"].includes(r.agentId));
}

function strongest(reports){
  return [...reports].sort((a,b)=>(Number(b.confidence)||0)-(Number(a.confidence)||0))[0]??null;
}

function disagreementMetrics(reports){
  const confidences=predictive(reports).map(r=>Number(r.confidence)).filter(Number.isFinite);
  if(confidences.length<2)return{meanConfidence:confidences[0]??0,confidenceRange:0,disagreementIndex:0};
  const mean=confidences.reduce((s,x)=>s+x,0)/confidences.length;
  const range=Math.max(...confidences)-Math.min(...confidences);
  const variance=confidences.reduce((s,x)=>s+((x-mean)**2),0)/confidences.length;
  return{meanConfidence:mean,confidenceRange:range,disagreementIndex:Math.min(1,Math.sqrt(variance)*2.5)};
}

function buildInitial(item){
  const messages=[];
  const agents=predictive(item.reports);
  const risk=item.reports.find(r=>r.agentId==="risk");
  const strongestReport=strongest(agents);
  const weakest=[...agents].sort((a,b)=>(Number(a.confidence)||0)-(Number(b.confidence)||0))[0]??null;

  if(strongestReport&&weakest&&strongestReport.agentId!==weakest.agentId&&Math.abs((Number(strongestReport.confidence)||0)-(Number(weakest.confidence)||0))>=.15){
    messages.push({
      round:1,type:"challenge",from:weakest.agentId,to:strongestReport.agentId,
      eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,
      severity:"medium",
      message:`Confidence disagreement: ${weakest.agentId} is materially below ${strongestReport.agentId}; independent evidence must reconcile the difference.`
    });
  }

  const risks=Array.isArray(risk?.risks)?risk.risks.filter(Boolean):[];
  if(risks.length){
    messages.push({
      round:1,type:"challenge",from:"risk",to:agents.map(r=>r.agentId).join(",")||"head",
      eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,
      severity:risks.length>=2?"high":"medium",
      message:`Risk challenge: ${risks.join("; ")}`
    });
  }else{
    messages.push({
      round:1,type:"challenge",from:"risk",to:agents.map(r=>r.agentId).join(",")||"head",
      eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,
      severity:"unverified",
      message:"Risk challenge: no explicit failure-mode evidence was supplied."
    });
  }

  const valueReports=agents.filter(r=>Number.isFinite(Number(r.value)));
  if(valueReports.length>=2){
    const vals=valueReports.map(r=>Number(r.value));
    const spread=Math.max(...vals)-Math.min(...vals);
    if(spread>=.15){
      messages.push({
        round:1,type:"challenge",from:"odds",to:"head",
        eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,
        severity:"medium",
        message:`Value disagreement spread is ${(spread*100).toFixed(1)} percentage points; the highest value estimate is not consensus.`
      });
    }
  }
  return messages;
}

export { disagreementMetrics };

function buildRebuttal(item,initial){
  if(!initial.length)return[];
  const agents=predictive(item.reports);
  const rebuttals=[];
  for(const challenge of initial){
    if(challenge.from==="risk"){
      const supported=agents.filter(r=>Number(r.dataQuality)>=.70&&Number(r.confidence)>=.60);
      rebuttals.push({
        ...challenge,round:2,type:"rebuttal",from:"predictive-panel",to:"risk",
        severity:supported.length>=2?"low":"medium",
        message:supported.length>=2
          ?`Rebuttal: ${supported.length} predictive agents have material data quality/confidence support; risk remains but is not independently confirmed as a veto.`
          :`Rebuttal: insufficient predictive-agent support to neutralize the Risk challenge.`
      });
    }else{
      const top=strongest(agents);
      rebuttals.push({
        ...challenge,round:2,type:"rebuttal",from:top?.agentId??"head",to:challenge.from,
        severity:top&&Number(top.dataQuality)>=.70?"low":"medium",
        message:top
          ?`Rebuttal: strongest available predictive report is ${top.agentId} with confidence ${(Number(top.confidence)*100).toFixed(0)}% and data quality ${(Number(top.dataQuality)*100).toFixed(0)}%.`
          :"Rebuttal: no sufficiently supported predictive report is available."
      });
    }
  }
  return rebuttals;
}

function buildResolution(item,initial,rebuttals){
  const high=initial.filter(x=>x.severity==="high").length;
  const medium=initial.filter(x=>x.severity==="medium").length;
  const unresolvedHigh=high>0;
  const support=predictive(item.reports).filter(r=>Number(r.dataQuality)>=.70&&Number(r.confidence)>=.60).length;
  const metrics=disagreementMetrics(item.reports);
  const decision=unresolvedHigh||support<2?"reject":"conditional";
  return{
    round:3,type:"resolution",from:"head",to:"all",
    eventId:item.eventId,marketId:item.marketId,selectionId:item.selectionId,
    severity:decision==="reject"?"high":medium>0?"medium":"low",
    decision,
    unresolvedHighRisk:unresolvedHigh,
    supportingAgents:support,
    meanConfidence:metrics.meanConfidence,
    confidenceRange:metrics.confidenceRange,
    disagreementIndex:metrics.disagreementIndex,
    message:decision==="reject"
      ?"Resolution: unresolved high-severity risk or insufficient predictive support; selection remains blocked."
      :"Resolution: conditional approval path; selection still requires final Head Analyst score and fresh-feed validation."
  };
}

export function buildChallengeRound(reports=[],{maxCandidates=30,maxRounds=3}={}){
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
    const round1=buildInitial(item);
    messages.push(...round1);
    if(maxRounds>=2){
      const round2=buildRebuttal(item,round1);
      messages.push(...round2);
      if(maxRounds>=3)messages.push(buildResolution(item,round1,round2));
    }
  }
  return messages;
}
