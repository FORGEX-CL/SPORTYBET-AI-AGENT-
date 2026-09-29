import { recordSportyBetOddsSnapshot, buildOddsMovementBySelection } from "./oddsHistory.js";

const event={
  eventId:"e1",
  sport:"football",
  league:"L1",
  markets:[{
    marketId:"m1",
    name:"1X2",
    selections:[{selectionId:"home",name:"Home",odds:2.2}]
  }]
};
let history={};
history=recordSportyBetOddsSnapshot(history,[event],"2026-09-29T10:00:00.000Z");
history=recordSportyBetOddsSnapshot(history,[{...event,markets:[{...event.markets[0],selections:[{selectionId:"home",name:"Home",odds:2.0}]}]}],"2026-09-29T10:01:00.000Z");
const key="e1:m1:home";
const movement=buildOddsMovementBySelection(history)[key];
if(!movement||movement.samples!==2)throw new Error("Odds history snapshot failed");
if(movement.direction!=="shortening")throw new Error("Odds movement direction failed");
if(movement.change>=0)throw new Error("Odds movement change failed");
console.log("oddsHistory fixture: ok");
