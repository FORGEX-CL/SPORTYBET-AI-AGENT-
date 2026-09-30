import { createSportyBetAdapter } from "../src/data/sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../src/core/feedPipeline.js";
import { parseFootballMainPage } from "../src/data/sportybetParser.js";
import { parseSportyBetFootballPage } from "../src/data/sportybetParser.js";
import { requireAuth } from "./auth/_auth.js";

const LIST_URL="https://lite.sportybet.com/ng/lite";
const MAX_DETAIL_EVENTS=5;

async function fetchText(adapter,url,timeoutMs){
  const response=await adapter.fetchPublicPage(url,timeoutMs==null?{}:{timeoutMs});
  return response.text();
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Source","SportyBet");
  if(req.method!=="GET"){
    res.status(405).json({error:"Method not allowed"});
    return;
  }
  if(!requireAuth(req,res))return;

  try{
    const adapter=createSportyBetAdapter();
    const sourceText=await fetchText(adapter,LIST_URL,5500);
    const events=parseFootballMainPage(sourceText);
    if(!events.length)throw new Error("SportyBet source returned no parseable football events");

    const failures=[];
    const selected=events.slice(0,MAX_DETAIL_EVENTS);
    const enrichedById=new Map();
    const settled=await Promise.allSettled(selected.map(async event=>{
      const detailUrl=event.detailUrl;
      if(!detailUrl)throw new Error("SportyBet event has no verified detail URL");
      const detailText=await fetchText(adapter,detailUrl,4000);
      const detail=parseSportyBetFootballPage(detailText,{eventId:event.eventId});
      return detail?{...event,...detail,markets:detail.markets.length?detail.markets:event.markets}:event;
    }));
    settled.forEach((result,index)=>{
      const event=selected[index];
      if(result.status==="fulfilled"){
        enrichedById.set(event.eventId,result.value);
      }else{
        failures.push({eventId:event.eventId,error:result.reason instanceof Error?result.reason.message:"detail_failed"});
      }
    });

    // Keep every verified source event in the feed; enrichment is bounded to the first few.
    const mergedEvents=events.map(event=>enrichedById.get(event.eventId)??event);
    const feed=normalizeSportyBetFeed(mergedEvents,{
      sourceUrl:LIST_URL,
      capturedAt:new Date().toISOString()
    });

    res.status(200).json({
      ...feed,
      ingestion:"server",
      detailFailures:failures,
      requestedEvents:events.length,detailEnrichmentLimit:MAX_DETAIL_EVENTS
    });
  }catch(error){
    res.status(502).json({
      source:"SportyBet",
      status:"unavailable",
      error:error instanceof Error?error.message:"SportyBet ingestion failed"
    });
  }
}
