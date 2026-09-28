import { parseFootballMainRows } from "./sportybetParser.js";
const sample=`England - Premier League
15:00 ID 22471
Aston Villa  Brentford
2.68 3.59 2.58`;
const events=parseFootballMainRows(sample);
if(events.length!==1||events[0].eventId!=="22471"||events[0].home!=="Aston Villa"||events[0].away!=="Brentford"||events[0].markets[0].selections[1].odds!==3.59) throw new Error("SportyBet parser fixture failed");
console.log("SportyBet parser fixture passed");
