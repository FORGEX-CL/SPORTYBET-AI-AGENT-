import { buildPlatinumEnsemble } from "./platinumEnsemble.js";

const result=buildPlatinumEnsemble({
  marketProbability:.50,
  marketConfidence:.80,
  independentModels:[
    {modelProbability:.72,confidence:.82,dataQuality:.85,modelType:"historical"},
    {modelProbability:.68,confidence:.78,dataQuality:.80,modelType:"external"}
  ],
  dataQuality:.82,
  sourceAgreement:.88,
  odds:2.1
});
if(!result)throw new Error("Platinum ensemble did not build");
if(!(result.robustProbability>=result.conservativeProbability&&result.robustProbability<=result.optimisticProbability))throw new Error("Robust probability bounds failed");
if(!(result.uncertainty>=0&&result.uncertainty<=1))throw new Error("Uncertainty bounds failed");
if(!(result.robustness>=0&&result.robustness<=1))throw new Error("Robustness bounds failed");
if(!Number.isFinite(result.expectedValue))throw new Error("Robust expected value missing");
console.log("platinumEnsemble fixture: ok");
