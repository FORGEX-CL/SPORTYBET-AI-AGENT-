import { buildTicket, MAX_SELECTIONS_PER_TICKET, MAX_TICKETS } from "./ticketEngine.js";

export const TICKET_PROFILES=Object.freeze([
  {id:"core",label:"Core",target:3},
  {id:"balanced",label:"Balanced",target:5},
  {id:"selective",label:"Selective",target:8},
  {id:"expanded",label:"Expanded",target:10},
  {id:"diversified",label:"Diversified",target:15},
  {id:"broad",label:"Broad",target:20},
  {id:"wide",label:"Wide",target:25},
  {id:"full",label:"Full",target:30},
  {id:"max",label:"Max",target:40},
  {id:"limit",label:"Limit",target:50}
]);

const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const eventKey=s=>String(s.eventId);
const contextKey=s=>\`\${s.sport??"unknown"}::\${s.marketName??"unknown"}::\${s.league??"unknown"}\`;

function candidatePriority(selection,usedContexts){
  const base=Number(selection.score)||0;
  const context=contextKey(selection);
  const penalty=usedContexts.has(context)?0.06:0;
  return base-penalty;
}

function selectForTarget(candidates,target,seed=[]){
  const chosen=[...seed];
  const usedEvents=new Set(chosen.map(eventKey));
  const usedContexts=new Set(chosen.map(contextKey));
  const remaining=candidates.filter(s=>!usedEvents.has(eventKey(s)));
  while(chosen.length<target&&remaining.length){
    remaining.sort((a,b)=>candidatePriority(b,usedContexts)-candidatePriority(a,usedContexts));
    const next=remaining.shift();
    chosen.push(next);
    usedEvents.add(eventKey(next));
    usedContexts.add(contextKey(next));
  }
  return chosen;
}

function scorePortfolio(selections){
  if(!selections.length)return 0;
  const average=selections.reduce((sum,s)=>sum+(Number(s.score)||0),0)/selections.length;
  const contexts=new Set(selections.map(contextKey)).size;
  const contextDiversity=contexts/selections.length;
  const eventDiversity=new Set(selections.map(eventKey)).size/selections.length;
  return (average*.65)+(contextDiversity*.20)+(eventDiversity*.15);
}

function stableSortCandidates(selections){
  return [...selections]
    .filter(s=>s?.available!==false)
    .filter(s=>Number(s.dataQuality)>=.5)
    .filter(s=>Array.isArray(s.predictiveAgents)?s.predictiveAgents.length>=2:true)
    .filter(s=>Number.isFinite(Number(s.odds))&&Number(s.odds)>1)
    .sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0));
}

export function buildTicketPortfolio(selections,{maxTickets=MAX_TICKETS,sourceUrl=null,capturedAt=null}={}){
  const candidates=stableSortCandidates(selections);
  if(!candidates.length)return[];
  const tickets=[];
  const usedFingerprints=new Set();

  for(const profile of TICKET_PROFILES){
    if(tickets.length>=maxTickets)break;
    const target=Math.min(profile.target,MAX_SELECTIONS_PER_TICKET,candidates.length);
    if(target<1)continue;

    const previous=tickets[tickets.length-1];
    const seed=profile.id==="core"?[]:(previous?.selections?.slice(0,Math.min(2,previous.selections.length))??[]);
    const picks=selectForTarget(candidates,target,seed);
    if(!picks.length)continue;

    const fingerprint=picks.map(s=>\`\${s.eventId}:\${s.marketId}:\${s.selectionId}\`).sort().join("|");
    if(usedFingerprints.has(fingerprint))continue;
    usedFingerprints.add(fingerprint);

    try{
      const portfolioScore=scorePortfolio(picks);
      tickets.push(buildTicket(picks,{snapshot:{source:"SportyBet",sourceUrl,capturedAt:capturedAt??new Date().toISOString()},
        strategy:profile.id,
        strategyLabel:profile.label,
        score:portfolioScore,
        selectionProfile:{target,actual:picks.length,uniqueEvents:new Set(picks.map(eventKey)).size,uniqueContexts:new Set(picks.map(contextKey)).size}
      }));
    }catch{}
  }

  return tickets.slice(0,maxTickets);
}
