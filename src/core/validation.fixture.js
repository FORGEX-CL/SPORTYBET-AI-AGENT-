import { validateSportyBetFeed } from "./validation.js";

const good=[{
  eventId:"18041",
  sport:"football",
  home:"Arbroath FC",
  away:"Queens Park FC",
  markets:[{
    marketId:"main-1x2",
    name:"1X2",
    group:"Main",
    selections:[
      {selectionId:"1",name:"Home",odds:1.93},
      {selectionId:"X",name:"Draw",odds:3.33},
      {selectionId:"2",name:"Away",odds:4.10}
    ]
  }]
}];

if(!validateSportyBetFeed(good).valid)throw new Error("Valid SportyBet source contract was rejected");

const noMarkets=[{...good[0],markets:[]}];
const noMarketResult=validateSportyBetFeed(noMarkets);
if(noMarketResult.valid||!noMarketResult.issues.some(x=>x.reason==="event_has_no_markets"))throw new Error("Missing-market drift guard failed");

const badOdds=[{...good[0],markets:[{...good[0].markets[0],selections:[{selectionId:"1",name:"Home",odds:0},{selectionId:"X",name:"Draw",odds:3.33}]}]}];
const badOddsResult=validateSportyBetFeed(badOdds);
if(badOddsResult.valid||!badOddsResult.issues.some(x=>x.reason==="invalid_selection_or_odds"))throw new Error("Invalid-odds drift guard failed");

console.log("SportyBet source-contract validation fixture passed");
