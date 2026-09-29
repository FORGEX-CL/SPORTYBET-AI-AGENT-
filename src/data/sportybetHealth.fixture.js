import { createSessionToken } from "../../api/auth/_auth.js";
process.env.SPORTYBET_AUTH_SECRET="health-fixture-secret-that-is-long-enough-123456";
const session=createSessionToken("health-user",Math.floor(Date.now()/1000));
const originalFetch=globalThis.fetch;
let mode="football";
globalThis.fetch=async()=>new Response(mode==="football"?`<html><body>England - Premier League
15:00 ID 22471
Aston Villa  Brentford
2.68 3.59 2.58</body></html>`:`<html><body>International - Eurocup, Women
23/09 Wednesday
Points
Over
Under
18:30 ID 50645
AEO Proteas Voulas  Elizur Ramla
150.5
1.96 1.73
<a href="/ng/lite/preMatch/detail?eventId=sr:match:73576406">AEO Proteas Voulas Elizur Ramla</a></body></html>`,{status:200});
const { default: handler }=await import("../../api/health.js");
let payload=null,statusCode=null;
const req={method:"GET",query:{},headers:{cookie:`sportybet_session=${session}`}};
const res={setHeader(){},status(code){statusCode=code;return this;},json(data){payload=data;}};
await handler(req,res);
if(statusCode!==200||payload?.status!=="ok"||payload?.parsedFootballEvents!==1||payload?.eventsWithMarkets!==1||payload?.pricedSelections!==3)throw new Error("Health endpoint fixture failed");
mode="basketball";
payload=null;statusCode=null;
req.query={sport:"basketball"};
await handler(req,res);
if(statusCode!==200||payload?.status!=="ok"||payload?.sport!=="basketball"||payload?.parsedEvents!==1||payload?.eventsWithMarkets!==1||payload?.pricedSelections!==2||payload?.canonicalDetailEvents!==1)throw new Error("Basketball health endpoint fixture failed");
globalThis.fetch=originalFetch;
console.log("SportyBet health endpoint fixtures passed");
