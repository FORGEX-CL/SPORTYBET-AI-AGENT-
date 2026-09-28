const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>new Response(JSON.stringify({source:"SportyBet",eventCount:1,events:[]}),{status:200,headers:{"content-type":"application/json"}});
const {fetchSportyBetFootballApi}=await import("./sportybetApi.js");
const result=await fetchSportyBetFootballApi();
if(result.source!=="SportyBet"||result.eventCount!==1)throw new Error("SportyBet API client fixture failed");
globalThis.fetch=originalFetch;
console.log("SportyBet API client fixture passed");
