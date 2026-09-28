import { getAgentHistoricalFeedback, applyHistoricalFeedback } from "./learningFeedback.js";

const performance={agents:{statistics:{predictions:4,won:4,lost:0,bySport:{football:{predictions:4,won:4,lost:0}},byMarket:{},byOddsRange:{},byConfidenceBand:{}}}};
const insufficient=getAgentHistoricalFeedback(performance,"statistics",{sport:"football",market:"1X2"});
if(insufficient.available||insufficient.weight!==0)throw new Error("Learning feedback must not activate below five settled outcomes");
const enough={agents:{statistics:{predictions:5,won:5,lost:0,bySport:{football:{predictions:5,won:5,lost:0}},byMarket:{},byOddsRange:{},byConfidenceBand:{}}}};
const feedback=getAgentHistoricalFeedback(enough,"statistics",{sport:"football",market:"1X2"});
const adjusted=applyHistoricalFeedback(.6,feedback);
if(!feedback.available||adjusted.confidence<=.6)throw new Error("Historical feedback should raise confidence after sufficient verified history");
console.log("Learning feedback fixture passed");
