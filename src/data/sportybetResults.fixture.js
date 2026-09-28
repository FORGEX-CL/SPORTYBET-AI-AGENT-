import { parseSportyBetFootballResults, settleFootballSelection } from "./sportybetResultsParser.js";
const sample=`24/09/2026 18:45
35093
Austria
3:1
H1 1:0
Israel`;
const results=parseSportyBetFootballResults(sample);
if(results.length!==1||results[0].eventId!=="35093"||results[0].finalScore.home!==3||results[0].away!=="Israel")throw new Error("SportyBet result parser fixture failed");
if(settleFootballSelection(results[0],{marketName:"1X2",selectionName:"Home"})!=="won")throw new Error("1X2 settlement fixture failed");
if(settleFootballSelection(results[0],{marketName:"Over/Under",selectionName:"Over 3.5"})!=="lost")throw new Error("Total settlement fixture failed");
console.log("SportyBet results fixture passed");
