import { requireFreshFeed } from "./feedPipeline.js";

const keyOf=s=>`${s.eventId}:${s.marketId}:${s.selectionId}`;

export function compareTicketToFeed(ticket,feed,{maxAgeMs=120000}={}){
  const freshness=requireFreshFeed(feed,{maxAgeMs});
  if(!freshness.fresh)return{status:"stale_feed",freshness,issues:[],unchanged:[],changed:[],currentSelections:[],currentCombinedOdds:null};

  const events=new Map((feed.events??[]).map(e=>[String(e.eventId),e]));
  const unchanged=[],changed=[],issues=[],currentSelections=[];
  for(const selection of ticket.selections??[]){
    const event=events.get(String(selection.eventId));
    if(!event){
      const issue={selection,reason:"event_missing"};
      changed.push(issue);issues.push(issue);continue;
    }
    const market=event.markets?.find(m=>String(m.marketId)===String(selection.marketId));
    if(!market){
      const issue={selection,reason:"market_missing"};
      changed.push(issue);issues.push(issue);continue;
    }
    const current=market.selections?.find(s=>String(s.selectionId)===String(selection.selectionId));
    if(!current||current.available===false){
      const issue={selection,reason:"selection_unavailable"};
      changed.push(issue);issues.push(issue);continue;
    }
    const oldOdds=Number(selection.odds),newOdds=Number(current.odds);
    const row={...selection,currentOdds:newOdds,oddsDelta:newOdds-oldOdds};
    currentSelections.push(row);
    if(newOdds!==oldOdds){
      changed.push({...row,reason:"odds_changed"});
      issues.push({...row,reason:"odds_changed"});
    }else{
      unchanged.push(row);
    }
  }

  const currentCombinedOdds=currentSelections.length===ticket.selections.length
    ?currentSelections.reduce((total,s)=>total*Number(s.currentOdds),1)
    :null;

  return{
    status:issues.length?"changed":"validated",
    freshness,
    issues,
    unchanged,
    changed,
    currentSelections,
    currentCombinedOdds,
    originalCombinedOdds:Number(ticket.combinedOdds),
    combinedOddsDelta:currentCombinedOdds==null?null:currentCombinedOdds-Number(ticket.combinedOdds)
  };
}
