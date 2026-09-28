import { isObservedSportyBetMarket } from "./marketCatalogue.js";
const expected=["1X2","Over/Under","Over/Under - Early Goals","Double Chance","Double Chance - 1UP","1st Goal","Handicap","Asian Handicap"];
if(!expected.every(isObservedSportyBetMarket))throw new Error("Observed SportyBet market catalogue fixture failed");
console.log("Observed SportyBet market catalogue fixture passed");
