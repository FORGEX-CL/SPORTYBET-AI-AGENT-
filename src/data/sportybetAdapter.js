export const SPORTYBET_BASE="https://www.sportybet.com/ng/";
export const SPORTYBET_LITE=`${SPORTYBET_BASE}lite/`;

export function createSportyBetAdapter({fetcher=fetch}={}){
  return {
    source:SPORTYBET_BASE,
    async fetchPublicPage(url=SPORTYBET_LITE){
      if(!url.startsWith(SPORTYBET_BASE)) throw new Error("Only SportyBet Nigeria URLs are allowed");
      const response=await fetcher(url);
      if(!response.ok) throw new Error(`SportyBet request failed: ${response.status}`);
      return response;
    }
  };
}

export function assertSportyBetSource(url){
  if(typeof url!=="string"||!url.startsWith(SPORTYBET_BASE)) throw new Error("Only verified SportyBet Nigeria source URLs are accepted");
  return true;
}

// Do not guess private endpoints or booking-code APIs.
// A transport/parser must be explicitly verified before being connected to production ingestion.
