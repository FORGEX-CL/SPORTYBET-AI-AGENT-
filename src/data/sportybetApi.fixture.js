const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>({
  ok:true,
  status:200,
  async json(){return {source:"SportyBet",eventCount:1,events:[]};}
});
try{
  const {fetchSportyBetFootballApi}=await import("./sportybetApi.js");
  const result=await fetchSportyBetFootballApi();
  if(result?.source!=="SportyBet"||result?.eventCount!==1)throw new Error("SportyBet API client fixture failed");
}finally{
  globalThis.fetch=originalFetch;
}
console.log("SportyBet API client fixture passed");
