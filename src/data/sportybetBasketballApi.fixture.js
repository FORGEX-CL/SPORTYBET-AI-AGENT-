import { createSessionToken } from "../../api/auth/_auth.js";
process.env.SPORTYBET_AUTH_SECRET="basketball-fixture-secret-that-is-long-enough";
const session=createSessionToken("basketball-user",Math.floor(Date.now()/1000));
const mockFetch=async()=>new Response(`International - Eurocup, Women
23/09 Wednesday
Points
Over
Under
18:30 ID 50645
AEO Proteas Voulas  Elizur Ramla
150.5
1.96 1.73
<a href="/ng/lite/preMatch/detail?eventId=sr:match:73576406">AEO Proteas Voulas Elizur Ramla</a>`,{status:200,headers:{"content-type":"text/html"}});

const {createBasketballHandler}=await import("../../api/sportybet-basketball.js");
let payload=null,statusCode=null;
const req={method:"GET",headers:{cookie:`sportybet_session=${session}`}};
const res={setHeader(){},status(code){statusCode=code;return this;},json(data){payload=data;}};
await createBasketballHandler({fetcher:mockFetch})(req,res);
if(statusCode!==200||payload?.source!=="SportyBet"||payload?.eventCount!==1||payload?.events?.[0]?.sport!=="basketball")throw new Error("SportyBet basketball API fixture failed");
console.log("SportyBet basketball API fixture passed");
