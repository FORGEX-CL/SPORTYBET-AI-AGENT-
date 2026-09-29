import { parseBasketballMainPage } from "./sportybetSportsParser.js";

const html=`<html><body>
International - Eurocup, Women
23/09 Wednesday
Points
Over
Under
18:30 ID 50645
AEO Proteas Voulas  Elizur Ramla
150.5
1.96 1.73
<a href="/ng/lite/preMatch/detail?eventId=sr:match:73576406">AEO Proteas Voulas Elizur Ramla</a>
</body></html>`;
const events=parseBasketballMainPage(html);
if(events.length!==1)throw new Error("Basketball parser event count failed");
const event=events[0];
if(event.sport!=="basketball"||event.sourceEventId!=="50645"||event.home!=="AEO Proteas Voulas"||event.away!=="Elizur Ramla")throw new Error("Basketball parser identity failed");
if(event.markets[0]?.name!=="Total Points"||event.markets[0]?.selections?.length!==2)throw new Error("Basketball market parsing failed");
if(event.markets[0].selections[0].name!=="Over 150.5"||event.markets[0].selections[0].odds!==1.96)throw new Error("Basketball odds parsing failed");
if(!event.detailUrl?.includes("sr:match:73576406"))throw new Error("Basketball canonical detail link mapping failed");
console.log("SportyBet basketball parser fixture passed");
