import { validateEvent } from "./types.js";
import { validateTicketAgainstEvents } from "./ticketEngine.js";

export function validateSportyBetFeed(events=[]){
  const issues=[];
  const duplicateIds=events.map(e=>e?.eventId).filter((id,i,a)=>id&&a.indexOf(id)!==i);
  for(const event of events){
    const eventId=String(event?.eventId??"");
    if(!validateEvent(event)){
      issues.push({type:"event",eventId,reason:"missing_required_event_fields"});
      continue;
    }
    if(!Array.isArray(event.markets)||event.markets.length===0){
      issues.push({type:"market",eventId,reason:"event_has_no_markets"});
      continue;
    }
    const marketIds=new Set();
    for(const market of event.markets){
      const marketId=String(market?.marketId??"");
      if(!marketId||!market?.name){
        issues.push({type:"market",eventId,marketId,reason:"missing_market_identity"});
        continue;
      }
      if(marketIds.has(marketId)){
        issues.push({type:"market",eventId,marketId,reason:"duplicate_market_id"});
      }
      marketIds.add(marketId);
      if(!Array.isArray(market.selections)||market.selections.length===0){
        issues.push({type:"market",eventId,marketId,reason:"market_has_no_selections"});
        continue;
      }
      const selectionIds=new Set();
      for(const selection of market.selections){
        const selectionId=String(selection?.selectionId??"");
        const odds=Number(selection?.odds);
        if(!selectionId||!selection?.name||!Number.isFinite(odds)||odds<=1){
          issues.push({type:"selection",eventId,marketId,selectionId,reason:"invalid_selection_or_odds"});
        }
        if(selectionIds.has(selectionId)){
          issues.push({type:"selection",eventId,marketId,selectionId,reason:"duplicate_selection_id"});
        }
        selectionIds.add(selectionId);
      }
    }
  }
  return {
    valid:issues.length===0&&duplicateIds.length===0,
    invalidCount:new Set(issues.map(x=>x.eventId)).size,
    duplicateIds,
    issues,
    issueCount:issues.length
  };
}

export function validateCandidates(tickets,events){
  return tickets.map(ticket=>({...ticket,revalidation:validateTicketAgainstEvents(ticket,events)}));
}
