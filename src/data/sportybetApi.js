async function getJson(url,fetchImpl=globalThis.fetch,timeoutMs=12000){
  if(typeof fetchImpl!=="function")throw new Error("SportyBet API fetch implementation is unavailable");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url,{headers:{Accept:"application/json"},signal:controller.signal});
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(payload?.error??`SportyBet API request failed: ${response.status}`);
    return payload;
  }catch(error){
    if(error?.name==="AbortError")throw new Error("SportyBet API request timed out");
    throw error;
  }finally{
    clearTimeout(timer);
  }
}

export function createSportyBetApiClient(fetchImpl=globalThis.fetch){
  const request=url=>getJson(url,fetchImpl);
  return Object.freeze({
    football:()=>request("/api/sportybet-football"),
    basketball:()=>request("/api/sportybet-basketball"),
    results:()=>request("/api/sportybet-results"),
    health:(sport="football")=>request(`/api/health?sport=${encodeURIComponent(String(sport).toLowerCase())}`)
  });
}

export async function fetchSportyBetFootballApi(){
  return createSportyBetApiClient(globalThis.fetch).football();
}

export async function fetchSportyBetBasketballApi(){
  return createSportyBetApiClient(globalThis.fetch).basketball();
}

export async function fetchSportyBetResultsApi(){
  return createSportyBetApiClient(globalThis.fetch).results();
}

export async function fetchSportyBetHealthApi(sport="football"){
  return createSportyBetApiClient(globalThis.fetch).health(sport);
}
