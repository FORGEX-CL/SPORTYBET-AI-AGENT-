import { pairCorrelation, portfolioCorrelation, marginalCorrelationPenalty } from "./correlationEngine.js";

const a={eventId:"1",sport:"football",league:"L1",marketName:"1X2"};
const b={eventId:"2",sport:"football",league:"L1",marketName:"1X2"};
const c={eventId:"3",sport:"basketball",league:"L2",marketName:"Match Winner"};
if(pairCorrelation(a,a)!==1)throw new Error("Same-event correlation failed");
if(!(pairCorrelation(a,b)>pairCorrelation(a,c)))throw new Error("Context correlation ordering failed");
const p=portfolioCorrelation([a,b,c]);
if(!(p>0))throw new Error("Portfolio correlation missing");
if(!(marginalCorrelationPenalty(b,[a])>0))throw new Error("Marginal correlation penalty missing");
console.log("correlationEngine fixture: ok");
