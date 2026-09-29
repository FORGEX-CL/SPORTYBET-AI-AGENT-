import { runFootballWalkForwardBacktest } from "./walkForwardBacktest.js";

const resultHistory=[
  {eventId:"p1",sport:"football",home:"Alpha",away:"Beta",finalScore:{home:1,away:0},playedAt:"2026-09-20T18:00:00.000Z",status:"settled"},
  {eventId:"p2",sport:"football",home:"Beta",away:"Gamma",finalScore:{home:1,away:1},playedAt:"2026-09-21T18:00:00.000Z",status:"settled"},
  {eventId:"p3",sport:"football",home:"Gamma",away:"Alpha",finalScore:{home:0,away:2},playedAt:"2026-09-22T18:00:00.000Z",status:"settled"},
  {eventId:"p4",sport:"football",home:"Alpha",away:"Delta",finalScore:{home:2,away:1},playedAt:"2026-09-23T18:00:00.000Z",status:"settled"},
  {eventId:"p5",sport:"football",home:"Delta",away:"Beta",finalScore:{home:1,away:1},playedAt:"2026-09-24T18:00:00.000Z",status:"settled"},
  {eventId:"target",sport:"football",home:"Alpha",away:"Beta",finalScore:{home:2,away:0},playedAt:"2026-09-29T18:00:00.000Z",status:"settled"}
];
const oddsHistory={
  "target:m1:home":{
    meta:{eventId:"target",marketId:"m1",selectionId:"home",marketName:"1X2",selectionName:"Home",sport:"football",league:"Fixture",home:"Alpha",away:"Beta",startTime:"2026-09-29T18:00:00.000Z"},
    points:[[Date.parse("2026-09-29T12:00:00.000Z"),2.10],[Date.parse("2026-09-29T17:00:00.000Z"),2.00]]
  },
  "target:m1:draw":{
    meta:{eventId:"target",marketId:"m1",selectionId:"draw",marketName:"1X2",selectionName:"Draw",sport:"football",league:"Fixture",home:"Alpha",away:"Beta",startTime:"2026-09-29T18:00:00.000Z"},
    points:[[Date.parse("2026-09-29T12:00:00.000Z"),3.30],[Date.parse("2026-09-29T17:00:00.000Z"),3.20]]
  },
  "target:m1:away":{
    meta:{eventId:"target",marketId:"m1",selectionId:"away",marketName:"1X2",selectionName:"Away",sport:"football",league:"Fixture",home:"Alpha",away:"Beta",startTime:"2026-09-29T18:00:00.000Z"},
    points:[[Date.parse("2026-09-29T12:00:00.000Z"),3.90],[Date.parse("2026-09-29T17:00:00.000Z"),3.80]]
  }
};
const backtest=runFootballWalkForwardBacktest({resultHistory,oddsHistory,minPriorMatches:2});
if(backtest.predictions<1)throw new Error("Walk-forward backtest produced no eligible prediction");
if(!Number.isFinite(backtest.overall.brierScore))throw new Error("Brier score missing");
if(!Number.isFinite(backtest.overall.logLoss))throw new Error("Log loss missing");
console.log("walkForwardBacktest fixture: ok");
