const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(`<html><body>England - Premier League
15:00 ID 22471
Aston Villa  Brentford
2.68 3.59 2.58</body></html>`,{status:200});
const { default: handler }=await import("../../api/health.js");
let payload=null,statusCode=null;
const req={method:"GET"};
const res={setHeader(){},status(code){statusCode=code;return this;},json(data){payload=data;}};
await handler(req,res);
if(statusCode!==200||payload?.status!=="ok"||payload?.parsedFootballEvents!==1||payload?.eventsWithMarkets!==1||payload?.pricedSelections!==3)throw new Error("Health endpoint fixture failed");
globalThis.fetch=originalFetch;
console.log("SportyBet health endpoint fixture passed");
