import { updateCalibration, calibrationSummary, calibratedConfidence } from "./agentCalibration.js";

const stat={};
for(let i=0;i<10;i++)updateCalibration(stat,.9,i<4?"won":"lost");
const summary=calibrationSummary(stat);
if(summary.samples!==10)throw new Error("Calibration sample count failed");
if(!(summary.calibrationGap<0))throw new Error("Expected overconfidence gap");
const adjusted=calibratedConfidence(.9,stat);
if(!(adjusted.confidence<.9))throw new Error("Overconfident forecast was not shrunk");
if(!(summary.brierScore>=0&&summary.brierScore<=1))throw new Error("Invalid Brier score");
console.log("agentCalibration fixture: ok");
