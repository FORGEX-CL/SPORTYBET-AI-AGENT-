import { buildSportyBetMarketSignals } from "./sourceSignalEngine.js";

const event={
  eventId:"sr:match:fixture",
  sport:"football",
  markets:[
    {marketId:"1x2",name:"1X2",selections:[
      {selectionId:"1",name:"Home",odds:2.00},
      {selectionId:"X",name:"Draw",odds:3.50},
      {selectionId:"2",name:"Away",odds:4.00}
    ]},
    {marketId:"dc",name:"Double Chance",selections:[
      {selectionId:"hd",name:"Home or Draw",odds:1.25},
      {selectionId:"ha",name:"Home or Away",odds:1.18},
      {selectionId:"da",name:"Draw or Away",odds:1.75}
    ]},
    {marketId:"dnb",name:"Draw No Bet",selections:[
      {selectionId:"h",name:"Home",odds:1.55},
      {selectionId:"a",name:"Away",odds:2.20}
    ]}
  ]
};
const signals=buildSportyBetMarketSignals(event);
const home=signals["sr:match:fixture:1x2:1"];
if(!home||home.modelProbability<=0||home.sourceFamilies<2||!home.evidence.some(x=>x.includes("Cross-market")))throw new Error("SportyBet source-signal fixture failed");
if(!Number.isFinite(home.expectedValue))throw new Error("Expected-value proxy missing");
console.log("SportyBet source-signal fixture passed");
