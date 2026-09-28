import { buildHistoricalEvidence, buildHistoricalEvidenceByEvent, mergeSportyBetResultHistory } from "./sportybetHistory.js";

const results=[
  {eventId:"1",sport:"football",home:"Alpha",away:"Beta",finalScore:{home:2,away:0},playedAt:"2026-09-20T18:00:00.000Z",source:"SportyBet"},
  {eventId:"2",sport:"football",home:"Beta",away:"Gamma",finalScore:{home:1,away:1},playedAt:"2026-09-21T18:00:00.000Z",source:"SportyBet"},
  {eventId:"3",sport:"football",home:"Alpha",away:"Delta",finalScore:{home:1,away:2},playedAt:"2026-09-22T18:00:00.000Z",source:"SportyBet"},
  {eventId:"4",sport:"football",home:"Gamma",away:"Alpha",finalScore:{home:0,away:3},playedAt:"2026-09-23T18:00:00.000Z",source:"SportyBet"}
];
const merged=mergeSportyBetResultHistory([],results);
const evidence=buildHistoricalEvidence({eventId:"5",sport:"football",home:"Alpha",away:"Beta"},merged);
if(evidence.home?.sample!==3||evidence.away?.sample!==2)throw new Error("SportyBet history sample fixture failed");
if(!evidence.evidence.length||evidence.dataQuality<=0)throw new Error("SportyBet historical evidence fixture failed");
const map=buildHistoricalEvidenceByEvent([{eventId:"5",sport:"football",home:"Alpha",away:"Beta"}],merged);
if(!map["5"]?.home)throw new Error("Historical evidence-by-event fixture failed");
console.log("SportyBet history fixture passed");
