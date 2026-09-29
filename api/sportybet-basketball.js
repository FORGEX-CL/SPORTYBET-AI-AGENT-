import { createSportyBetAdapter } from "../src/data/sportybetAdapter.js";
import { normalizeSportyBetFeed } from "../src/core/feedPipeline.js";
import { parseBasketballMainPage } from "../src/data/sportybetSportsParser.js";

const SOURCE_URL="https://lite.sportybet.com/ng/lite/events?marketId=18&sportId=sr%3Asport%3A2";

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Source","SportyBet");
  if(req.method!=="GET"){res.status(405).json({error:"Method not allowed"});return;}
  try{
    const adapter=createSportyBetAdapter();
    const response=await adapter.fetchPublicPage(SOURCE_URL);
    const html=await response.text();
    const events=parseBasketballMainPage(html);
    if(!events.length)throw new Error("SportyBet source returned no parseable basketball event rows");
    const feed=normalizeSportyBetFeed(events,{sourceUrl:SOURCE_URL,capturedAt:new Date().toISOString()});
    res.status(200).json({...feed,ingestion:"server"});
  }catch(error){
    res.status(502).json({source:"SportyBet",status:"unavailable",error:error instanceof Error?error.message:"SportyBet basketball ingestion failed"});
  }
}
