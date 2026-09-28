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

export function parseVisibleFootballRows(text=""){
  const rows=[];
  const pattern=/([^\n]+?)\s+ID\s+(\d+)\s+([^\n]+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g;
  for(const match of text.matchAll(pattern)){
    rows.push({league:match[1].trim(),eventId:match[2],matchup:match[3].trim(),odds:[Number(match[4]),Number(match[5])]});
  }
  return rows;
}

// The public SportyBet pages visibly expose event IDs, markets and odds,
// but the application must not guess private JSON endpoints or booking-code APIs.
// A verified transport/parser can be added here without changing the core models.
