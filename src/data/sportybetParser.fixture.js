import { parseFootballMainRows, parseMarketBlock, parseSportyBetFootballPage, parseFootballMainPage } from "./sportybetParser.js";
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

const html=\`<div>International UEFA Nations League</div><div>28/09 Monday 19:45 ID 38043</div><div><a href="https://lite.sportybet.com/ng/lite/preMatch/detail?eventId=sr%3Amatch%3A68931476&fromUrl=%2Fng%2Flite">Belgium France</a></div><div>3.98</div><div>4.03</div><div>1.92</div>\`;
const mapped=parseFootballMainPage(html);
if(mapped.length!==1||mapped[0].eventId!=="sr:match:68931476"||mapped[0].sourceEventId!=="38043"||!mapped[0].detailUrl)throw new Error("SportyBet canonical event-link fixture failed");
const detailText=\`28/09 Monday 19:45 ID 38043
Belgium
France
1X2
Home 3.98
Draw 4.03
Away 1.92
Handicap 0:1
Home (0:1) 8.70
Draw (0:1) 6.10
Away (0:1) 1.28
Asian Handicap -0.5
Home (-0.5) 3.70
Away (+0.5) 1.28
\`;
const canonicalDetail=parseSportyBetFootballPage(detailText,{eventId:"sr:match:68931476"});
if(canonicalDetail?.home!=="Belgium"||canonicalDetail?.away!=="France"||canonicalDetail?.sourceEventId!=="38043"||canonicalDetail?.markets.some(m=>m.name==="Handicap 0:1")===false||canonicalDetail?.markets.some(m=>m.name==="Asian Handicap -0.5")===false)throw new Error("SportyBet canonical detail fixture failed");
console.log("SportyBet parser canonical-ID fixtures passed");
