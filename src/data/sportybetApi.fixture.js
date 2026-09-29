const mockFetch=async()=>({
  ok:true,
  status:200,
  async json(){return {source:"SportyBet",eventCount:1,events:[]};}
});

const {createSportyBetApiClient}=await import("./sportybetApi.js");
const client=createSportyBetApiClient(mockFetch);
const result=await client.football();
const basketball=await createSportyBetApiClient(async url=>({
  ok:true,
  status:200,
  async json(){return {source:"SportyBet",sport:"basketball",eventCount:1,events:[]};}
})).basketball();
if(result?.source!=="SportyBet"||result?.eventCount!==1||basketball?.sport!=="basketball")throw new Error("SportyBet API client fixture failed");
console.log("SportyBet API client fixture passed");
