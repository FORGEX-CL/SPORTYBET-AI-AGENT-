import { createSportyBetAdapter } from "./sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../core/feedPipeline.js";
import { parseFootballMainRows } from "./sportybetParser.js";

export async function fetchSportyBetFootballSnapshot({fetcher=fetch,url="https://lite.sportybet.com/ng/lite"}={}){
  const adapter=createSportyBetAdapter({fetcher});
  const response=await adapter.fetchPublicPage(url);
  const html=await response.text();
  const events=parseFootballMainRows(html);
  if(!events.length)throw new Error("SportyBet source returned no parseable football event rows");
  return normalizeSportyBetFeed(events,{sourceUrl:url,capturedAt:new Date().toISOString()});
}
