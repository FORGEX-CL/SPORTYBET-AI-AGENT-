import { createSportyBetAdapter } from "../src/data/sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../src/core/feedPipeline.js";
import { parseFootballMainRows } from "../src/data/sportybetParser.js";
import { parseSportyBetFootballPage } from "../src/data/sportybetParser.js";
import { buildSportyBetEventDetailUrl } from "../src/data/sportybetWebSource.js";

const LIST_URL="https://lite.sportybet.com/ng/lite";
const MAX_EVENTS=20;

function htmlToVisibleText(html=""){
  return html.replace(/<script[\s\S]*?<\/script>/gi,"\n")
    .replace(/<style[\s\S]*?<\/style>/gi,"\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi,"\n")
    .replace(/<svg[\s\S]*?<\/svg>/gi,"\n")
    .replace(/<[^>]+>/g,"\n")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'");
}

async function fetchText(adapter,url){
  const response=await adapter.fetchPublicPage(url);
  return response.text();
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Source","SportyBet");
  if(req.method!=="GET"){
    res.status(405).json({error:"Method not allowed"});
    return;
  }

  try{
    const adapter=createSportyBetAdapter();
    const sourceText=await fetchText(adapter,LIST_URL);
    const events=parseFootballMainRows(htmlToVisibleText(sourceText));
    if(!events.length)throw new Error("SportyBet source returned no parseable football events");

    const enriched=[];
    const failures=[];
    for(const event of events.slice(0,MAX_EVENTS)){
      try{
        const detailUrl=buildSportyBetEventDetailUrl(event.eventId);
        const detailText=await fetchText(adapter,detailUrl);
        const detail=parseSportyBetFootballPage(htmlToVisibleText(detailText),{eventId:event.eventId});
        enriched.push(detail?{...event,...detail,markets:detail.markets.length?detail.markets:event.markets}:event);
      }catch(error){
        failures.push({eventId:event.eventId,error:error instanceof Error?error.message:"detail_failed"});
        enriched.push(event);
      }
    }

    const feed=normalizeSportyBetFeed(enriched,{
      sourceUrl:LIST_URL,
      capturedAt:new Date().toISOString()
    });

    res.status(200).json({
      ...feed,
      ingestion:"server",
      detailFailures:failures,
      requestedEvents:Math.min(events.length,MAX_EVENTS)
    });
  }catch(error){
    res.status(502).json({
      source:"SportyBet",
      status:"unavailable",
      error:error instanceof Error?error.message:"SportyBet ingestion failed"
    });
  }
}
