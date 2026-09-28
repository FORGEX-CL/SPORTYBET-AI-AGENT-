import { createSportyBetAdapter } from "../src/data/sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../src/core/feedPipeline.js";
import { parseFootballMainPage } from "../src/data/sportybetParser.js";
import { parseSportyBetFootballPage } from "../src/data/sportybetParser.js";

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
    const events=parseFootballMainPage(sourceText);
    if(!events.length)throw new Error("SportyBet source returned no parseable football events");

    const enriched=[];
    const failures=[];
    const selected=events.slice(0,MAX_EVENTS);
    const batchSize=5;
    for(let offset=0;offset<selected.length;offset+=batchSize){
      const batch=selected.slice(offset,offset+batchSize);
      const settled=await Promise.allSettled(batch.map(async event=>{
        const detailUrl=event.detailUrl;
        if(!detailUrl)throw new Error("SportyBet event has no verified detail URL");
        const detailText=await fetchText(adapter,detailUrl);
        const detail=parseSportyBetFootballPage(detailText,{eventId:event.eventId});
        return detail?{...event,...detail,markets:detail.markets.length?detail.markets:event.markets}:event;
      }));
      settled.forEach((result,index)=>{
        const event=batch[index];
        if(result.status==="fulfilled"){
          enriched.push(result.value);
        }else{
          failures.push({eventId:event.eventId,error:result.reason instanceof Error?result.reason.message:"detail_failed"});
          enriched.push(event);
        }
      });
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
