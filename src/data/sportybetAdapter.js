const ALLOWED_SPORTYBET_HOSTS=new Set(["sportybet.com","www.sportybet.com","lite.sportybet.com","mobile.sportybet.com"]);
export const SPORTYBET_BASE="https://www.sportybet.com/ng/";
export const SPORTYBET_LITE="https://lite.sportybet.com/ng/lite";

export function assertSportyBetSource(url){
  if(typeof url!=="string") throw new Error("SportyBet source URL is required");
  let parsed;
  try{parsed=new URL(url);}catch{throw new Error("Invalid SportyBet source URL");}
  if(parsed.protocol!=="https:"||!ALLOWED_SPORTYBET_HOSTS.has(parsed.hostname)||!parsed.pathname.startsWith("/ng/"))
    throw new Error("Only verified SportyBet Nigeria HTTPS URLs are accepted");
  return true;
}

export function createSportyBetAdapter({fetcher=fetch}={}){
  return {
    source:SPORTYBET_BASE,
    async fetchPublicPage(url=SPORTYBET_LITE,{timeoutMs=15000}={}){
      assertSportyBetSource(url);
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),timeoutMs);
      let response;
      try{
        response=await fetcher(url,{headers:{"Accept":"text/html,application/xhtml+xml"},signal:controller.signal});
      }catch(error){
        if(error?.name==="AbortError")throw new Error(`SportyBet request timed out after ${timeoutMs}ms`);
        throw error;
      }finally{clearTimeout(timeout);}
      if(!response?.ok) throw new Error(`SportyBet request failed: ${response?.status??"unknown"}`);
      return response;
    }
  };
}
