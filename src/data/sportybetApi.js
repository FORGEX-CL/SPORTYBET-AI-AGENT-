async function getJson(url,fetchImpl=globalThis.fetch){
  if(typeof fetchImpl!=="function")throw new Error("SportyBet API fetch implementation is unavailable");
  const response=await fetchImpl(url,{headers:{Accept:"application/json"}});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error??`SportyBet API request failed: ${response.status}`);
  return payload;
}

export function createSportyBetApiClient(fetchImpl=globalThis.fetch){
  const request=url=>getJson(url,fetchImpl);
  return Object.freeze({
    football:()=>request("/api/sportybet-football"),
    results:()=>request("/api/sportybet-results"),
    health:()=>request("/api/health")
  });
}

export async function fetchSportyBetFootballApi(){
  return createSportyBetApiClient(globalThis.fetch).football();
}

export async function fetchSportyBetResultsApi(){
  return createSportyBetApiClient(globalThis.fetch).results();
}

export async function fetchSportyBetHealthApi(){
  return createSportyBetApiClient(globalThis.fetch).health();
}
