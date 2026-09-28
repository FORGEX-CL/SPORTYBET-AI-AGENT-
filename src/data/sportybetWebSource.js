import { createSportyBetAdapter } from "./sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../core/feedPipeline.js";
import { parseFootballMainPage, parseSportyBetFootballPage } from "./sportybetParser.js";

function htmlToVisibleText(html=""){
  return html.replace(/<script[\s\S]*?<\/script>/gi,"\n").replace(/<style[\s\S]*?<\/style>/gi,"\n").replace(/<noscript[\s\S]*?<\/noscript>/gi,"\n").replace(/<svg[\s\S]*?<\/svg>/gi,"\n").replace(/<[^>]+>/g,"\n").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\r/g,"");
}
export function buildSportyBetEventDetailUrl(eventId){
  const normalized=String(eventId);
  if(!/^sr:match:\d+$/.test(normalized))throw new Error("SportyBet detail URL requires the canonical sr:match event ID from a verified source link");
  return `https://lite.sportybet.com/ng/lite/preMatch/detail?eventId=${encodeURIComponent(normalized)}`;
}
export async function fetchSportyBetFootballSnapshot({fetcher=fetch,url="https://lite.sportybet.com/ng/lite"}={}){
  const adapter=createSportyBetAdapter({fetcher});const response=await adapter.fetchPublicPage(url);const html=await response.text();
  const events=parseFootballMainPage(html);
  if(!events.length)throw new Error("SportyBet source returned no parseable football event rows");
  return normalizeSportyBetFeed(events,{sourceUrl:url,capturedAt:new Date().toISOString()});
}
export async function fetchSportyBetFootballEvent({fetcher=fetch,eventId}={}){
  const url=buildSportyBetEventDetailUrl(eventId);
  const adapter=createSportyBetAdapter({fetcher});const response=await adapter.fetchPublicPage(url);const html=await response.text();
  const event=parseSportyBetFootballPage(html,{eventId:String(eventId)});
  if(!event)throw new Error("SportyBet event page returned no parseable event/markets");
  return {source:"SportyBet",sourceUrl:url,capturedAt:new Date().toISOString(),event};
}
export async function enrichSportyBetFootballEvents(events,{fetcher=fetch,maxEvents=50}={}){
  const selected=events.filter(e=>e?.sport==="football"&&e?.eventId).slice(0,maxEvents);
  const enriched=[];const failures=[];
  for(const event of selected){
    try{const detail=await fetchSportyBetFootballEvent({fetcher,eventId:event.eventId});enriched.push({...event,...detail.event,markets:detail.event.markets.length?detail.event.markets:event.markets});}
    catch(error){failures.push({eventId:event.eventId,error:error instanceof Error?error.message:"event_detail_failed"});enriched.push(event);}
  }
  return {events:enriched,failures,requested:selected.length};
}
export { htmlToVisibleText };
