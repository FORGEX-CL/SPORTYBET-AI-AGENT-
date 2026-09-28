import { parseFootballMainRows, parseMarketBlock, parseSportyBetFootballPage } from "./sportybetParser.js";
const sample=`England - Premier League
15:00 ID 22471
Aston Villa  Brentford
2.68 3.59 2.58`;
const events=parseFootballMainRows(sample);
if(events.length!==1||events[0].eventId!=="22471"||events[0].home!=="Aston Villa"||events[0].away!=="Brentford"||events[0].markets[0].selections[1].odds!==3.59) throw new Error("SportyBet parser fixture failed");
const detail=`1X2
Home 2.10
Draw 3.20
Away 3.40
Exact Goals
0 7.10
1 3.70
2 3.10
Teams to Score
None 7.35
Both teams 2.00
Smart Combo
Home / Over 1.5 2.95
`;
const markets=parseMarketBlock(detail,{eventId:"22471"});
if(markets.length<3||markets.find(m=>m.name==="Exact Goals")?.selections.length!==3||markets.find(m=>m.name==="Teams to Score")?.selections.length!==2)throw new Error("SportyBet market detail fixture failed");
const merged=parseSportyBetFootballPage(sample+"\n"+detail,{eventId:"22471"});
if(!merged||merged.markets.length<3)throw new Error("SportyBet event detail merge fixture failed");
console.log("SportyBet parser fixtures passed");
