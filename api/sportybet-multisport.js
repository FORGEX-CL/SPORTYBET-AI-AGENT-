import { createSportyBetAdapter } from "../src/data/sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../src/core/feedPipeline.js";
import { parseFootballMainPage } from "../src/data/sportybetParser.js";
import { parseSportyBetWinnerPage } from "../src/data/sportybetSportsParser.js";
import { requireAuth } from "./auth/_auth.js";

const SOURCES={
  football:{url:"https://mobile.sportybet.com/ng/m/sport/football?currentSort=0&days=Daily&isCalendar=false",parser:html=>parseFootballMainPage(html)},
  basketball:{url:"https://www.sportybet.com/ng/m/sport/basketball?currentSort=0&days=Daily&isCalendar=false",parser:html=>parseSportyBetWinnerPage(html,"basketball")},
  tennis:{url:"https://www.sportybet.com/ng/m/sport/tennis?currentSort=0&days=Daily&isCalendar=false",parser:html=>parseSportyBetWinnerPage(html,"tennis")},
  volleyball:{url:"https://www.sportybet.com/ng/m/sport/volleyball?currentSort=0&days=Daily&isCalendar=false",parser:html=>parseSportyBetWinnerPage(html,"volleyball")},
  tableTennis:{url:"https://www.sportybet.com/ng/m/sport/tableTennis?currentSort=0&days=Daily&isCalendar=false",parser:html=>parseSportyBetWinnerPage(html,"table-tennis")}
};

async function read(adapter,source){
  const response=await adapter.fetchPublicPage(source.url,{timeoutMs:7000});
  const html=await response.text();
  return source.parser(html);
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Source","SportyBet");
  if(req.method!=="GET"){res.status(405).json({error:"Method not allowed"});return;}
  if(!requireAuth(req,res))return;
  const adapter=createSportyBetAdapter();
  const requested=String(req.query?.sports??"football,basketball,tennis,volleyball,tableTennis")
    .split(",").map(x=>x.trim()).filter(x=>SOURCES[x]);
  const sports=requested.length?requested:Object.keys(SOURCES);
  try{
    const settled=await Promise.allSettled(sports.map(async sport=>{
      const source=SOURCES[sport];
      const events=await read(adapter,source);
      return{sport,sourceUrl:source.url,events};
    }));
    const successful=settled.filter(x=>x.status==="fulfilled").map(x=>x.value);
    const failed=settled.map((x,i)=>x.status==="rejected"?{sport:sports[i],error:x.reason instanceof Error?x.reason.message:"source_failed"}:null).filter(Boolean);
    const events=successful.flatMap(x=>x.events);
    if(!events.length)throw new Error("SportyBet returned no parseable events across the requested sports");
    const feed=normalizeSportyBetFeed(events,{sourceUrl:"SportyBet multi-sport",capturedAt:new Date().toISOString()});
    res.status(200).json({...feed,ingestion:"server",sports,sourceStatus:successful.map(x=>({sport:x.sport,eventCount:x.events.length,sourceUrl:x.sourceUrl})),sourceFailures:failed});
  }catch(error){
    res.status(502).json({source:"SportyBet",status:"unavailable",error:error instanceof Error?error.message:"SportyBet multi-sport ingestion failed"});
  }
}
