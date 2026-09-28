import { createSportyBetAdapter } from "./sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../core/feedPipeline.js";
import { parseFootballMainPage, parseSportyBetFootballPage } from "./sportybetParser.js";

function htmlToVisibleText(html=""){
  return html.replace(/<script[\s\S]*?<\/script>/gi,"\n").replace(/<style[\s\S]*?<\/style>/gi,"\n").replace(/<noscript[\s\S]*?<\/noscript>/gi,"\n").replace(/<svg[\s\S]*?<\/svg>/gi,"\n").replace(/<[^>]+>/g,"\n").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\r/g,"");
}
export function buildSportyBetEventDetailUrl(eventId){
  if(!/^\d+$/.test(String(eventId))&& !/^sr%3Amatch%3A\d+$/.test(String(eventId)))throw new Error("SportyBet eventId must come from a verified SportyBet source");
  const normalized=String(eventId).startsWith("sr%3Amatch%3A")?decodeURIComponent(String(eventId)):String(eventId).startsWith("sr:match:")?String(eventId):`sr:match:${eventId}`;
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
  const visibleText=htmlToVisibleText(html);const event=parseSportyBetFootballPage(visibleText,{eventId:String(eventId).replace(/^sr:match:/,"")});
  if(!event)throw new Error("SportyBet event page returned no parseable event/markets");
  return {source:"SportyBet",sourceUrl:url,capturedAt:new Date().toISOString(),event};
}
export async function enrichSportyBetFootballEvents(events,{fetcher=fetch,maxEvents=20}={}){
  const selected=events.filter(e=>e?.sport==="football"&&e?.eventId).slice(0,maxEvents);
  const enriched=[];const failures=[];
  for(const event of selected){
    try{const detail=event.detailUrl?await fetchSportyBetFootballEvent({fetcher,eventId:event.eventId}):await fetchSportyBetFootballEvent({fetcher,eventId:event.eventId});enriched.push({...event,...detail.event,markets:detail.event.markets.length?detail.event.markets:event.markets});}
    catch(error){failures.push({eventId:event.eventId,error:error instanceof Error?error.message:"event_detail_failed"});enriched.push(event);}
  }
  return {events:enriched,failures,requested:selected.length};
}
export { htmlToVisibleText };
