async function getJson(url){
  const response=await fetch(url,{headers:{Accept:"application/json"}});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error??`SportyBet API request failed: ${response.status}`);
  return payload;
}

export async function fetchSportyBetFootballApi(){
  return getJson("/api/sportybet-football");
}

export async function fetchSportyBetResultsApi(){
  return getJson("/api/sportybet-results");
}

export async function fetchSportyBetHealthApi(){
  return getJson("/api/health");
}
