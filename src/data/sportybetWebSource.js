import { createSportyBetAdapter } from "./sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../core/feedPipeline.js";
import { parseFootballMainRows } from "./sportybetParser.js";

function htmlToVisibleText(html=""){
  return html
    .replace(/<script[\s\S]*?<\/script>/gi,"\n")
    .replace(/<style[\s\S]*?<\/style>/gi,"\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi,"\n")
    .replace(/<svg[\s\S]*?<\/svg>/gi,"\n")
    .replace(/<[^>]+>/g,"\n")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/\r/g,"");
}

export async function fetchSportyBetFootballSnapshot({fetcher=fetch,url="https://lite.sportybet.com/ng/lite"}={}){
  const adapter=createSportyBetAdapter({fetcher});
  const response=await adapter.fetchPublicPage(url);
  const html=await response.text();
  const visibleText=htmlToVisibleText(html);
  const events=parseFootballMainRows(visibleText);
  if(!events.length)throw new Error("SportyBet source returned no parseable football event rows");
  return normalizeSportyBetFeed(events,{sourceUrl:url,capturedAt:new Date().toISOString()});
}

export { htmlToVisibleText };
