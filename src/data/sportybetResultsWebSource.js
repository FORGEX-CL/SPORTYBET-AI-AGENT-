import { createSportyBetAdapter } from "./sportybetAdapter.js";
import { parseSportyBetFootballResults } from "./sportybetResultsParser.js";

function htmlToVisibleText(html=""){
  return html.replace(/<script[\s\S]*?<\/script>/gi,"\n").replace(/<style[\s\S]*?<\/style>/gi,"\n").replace(/<noscript[\s\S]*?<\/noscript>/gi,"\n").replace(/<svg[\s\S]*?<\/svg>/gi,"\n").replace(/<[^>]+>/g,"\n").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\r/g,"");
}

export async function fetchSportyBetFootballResults({fetcher=fetch,url="https://www.sportybet.com/ng/liveResult/"}={}){
  const adapter=createSportyBetAdapter({fetcher});
  const response=await adapter.fetchPublicPage(url);
  const html=await response.text();
  const results=parseSportyBetFootballResults(htmlToVisibleText(html));
  if(!results.length)throw new Error("SportyBet Results source returned no parseable football results");
  return{source:"SportyBet",sourceUrl:url,capturedAt:new Date().toISOString(),resultCount:results.length,results};
}

export { htmlToVisibleText };
