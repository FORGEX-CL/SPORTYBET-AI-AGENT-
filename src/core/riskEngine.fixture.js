import { assessSelectionRisk } from "./riskEngine.js";

const assessment=assessSelectionRisk({
  event:{status:"scheduled"},
  market:{name:"Over/Under - Early Goals"},
  selection:{name:"Over 2.5",odds:4.5},
  signal:{overround:.16,marketDepth:2,crossMarketAgreement:.55,fairProbability:.48},
  historicalModel:{modelProbability:.73,sample:2},
  explicitRisks:[]
});
if(assessment.severity!=="high")throw new Error("Complex high-risk market was not escalated");
if(!assessment.requiresExtraVerification)throw new Error("Risk engine failed verification gate");
if(!assessment.risks.some(x=>x.includes("Early Goals")))throw new Error("Market-specific risk reason missing");
console.log("riskEngine fixture: ok");
