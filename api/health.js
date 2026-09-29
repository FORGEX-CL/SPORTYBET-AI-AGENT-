import { createSportyBetAdapter } from "../src/data/sportybetAdapter.js";
import { parseFootballMainPage } from "../src/data/sportybetParser.js";
import { parseBasketballMainPage } from "../src/data/sportybetSportsParser.js";
import { requireAuth } from "./auth/_auth.js";

const SOURCES=Object.freeze({
  football:{url:"https://lite.sportybet.com/ng/lite",parser:parseFootballMainPage},
  basketball:{url:"https://lite.sportybet.com/ng/lite/events?marketId=18&sportId=sr%3Asport%3A2",parser:parseBasketballMainPage}
});

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Source","SportyBet");
  if(req.method!=="GET"){res.status(405).json({status:"error",error:"Method not allowed"});return;}
  if(!requireAuth(req,res))return;
  const sport=String(req.query?.sport??"football").toLowerCase();
  const source=SOURCES[sport];
  if(!source){res.status(400).json({status:"error",error:"Unsupported SportyBet sport"});return;}
  const started=Date.now();
  try{
    const adapter=createSportyBetAdapter();
    const response=await adapter.fetchPublicPage(source.url);
    const html=await response.text();
    const events=source.parser(html);
    const eventsWithMarkets=events.filter(e=>Array.isArray(e.markets)&&e.markets.length>0).length;
    const pricedSelections=events.reduce((count,event)=>count+event.markets.reduce((n,market)=>n+market.selections.filter(selection=>Number.isFinite(Number(selection.odds))&&Number(selection.odds)>1).length,0),0);
    const canonicalDetailEvents=events.filter(e=>/^sr:match:\d+$/.test(String(e.eventId))).length;
    const ok=response.ok&&events.length>0&&eventsWithMarkets>0&&pricedSelections>0;
    res.status(ok?200:502).json({
      status:ok?"ok":"degraded",
      source:"SportyBet",
      sport,
      sourceUrl:source.url,
      httpStatus:response.status,
      parsedEvents:events.length,
      ...(sport==="football"?{parsedFootballEvents:events.length}:{}),
      eventsWithMarkets,
      pricedSelections,
      canonicalDetailEvents,
      sourceContract:canonicalDetailEvents===events.length?"canonical_ids":"partial_canonical_ids",
      latencyMs:Date.now()-started,
      checkedAt:new Date().toISOString()
    });
  }catch(error){
    res.status(502).json({status:"unavailable",source:"SportyBet",sport,sourceUrl:source.url,latencyMs:Date.now()-started,checkedAt:new Date().toISOString(),error:error instanceof Error?error.message:"SportyBet health check failed"});
  }
}
