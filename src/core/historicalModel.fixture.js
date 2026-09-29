import { buildHistoricalModel, combineModelSignals } from "./historicalModel.js";

const event={eventId:"fixture-1",sport:"football",home:"Alpha FC",away:"Beta FC"};
const market={marketId:"1x2",name:"1X2"};
const selection={selectionId:"home",name:"Home",odds:2.1};
const historical={
  home:{sample:5,points:12,avgGoalsFor:1.8,avgGoalsAgainst:0.9,bttsRate:.6,over25Rate:.6},
  away:{sample:5,points:6,avgGoalsFor:1.0,avgGoalsAgainst:1.6,bttsRate:.6,over25Rate:.6},
  formSignal:.65,goalSignal:.62
};
const model=buildHistoricalModel(event,market,selection,historical);
if(!model||!Number.isFinite(model.modelProbability))throw new Error("Historical model failed");
if(model.modelType!=="sportybet-historical-form-v1")throw new Error("Unexpected model type");
const blended=combineModelSignals([model,{modelProbability:.55,confidence:.6,dataQuality:.7,modelType:"sportybet-market-implied-v1"}]);
if(!blended?.historicalModel)throw new Error("Historical provenance was lost");
if(!Number.isFinite(blended.modelProbability))throw new Error("Blended probability missing");
console.log("historicalModel fixture: ok");
