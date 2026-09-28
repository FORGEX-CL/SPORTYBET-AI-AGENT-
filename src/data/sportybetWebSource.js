import { createSportyBetAdapter } from "./sportybetAdapter.js";
import { parseFootballMainRows } from "./sportybetParser.js";

export async function fetchSportyBetFootballSnapshot({fetcher=fetch,url="https://lite.sportybet.com/ng/lite"}={}){
  const adapter=createSportyBetAdapter({fetcher});
  const response=await adapter.fetchPublicPage(url);
  const html=await response.text();
  const events=parseFootballMainRows(html);
  return {
    source:"SportyBet",
    sourceUrl:url,
    capturedAt:new Date().toISOString(),
    eventCount:events.length,
    events,
    parseStatus:events.length?"parsed":"no_events_parsed"
  };
}
