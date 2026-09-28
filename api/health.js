import { createSportyBetAdapter } from "../src/data/sportybetAdapter.js";
import { parseFootballMainPage } from "../src/data/sportybetParser.js";

const SOURCE_URL="https://lite.sportybet.com/ng/lite";

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Source","SportyBet");
  if(req.method!=="GET"){res.status(405).json({status:"error",error:"Method not allowed"});return;}
  const started=Date.now();
  try{
    const adapter=createSportyBetAdapter();
    const response=await adapter.fetchPublicPage(SOURCE_URL);
    const html=await response.text();
    const events=parseFootballMainPage(html);
    const ok=response.ok&&events.length>0;
    res.status(ok?200:502).json({
      status:ok?"ok":"degraded",
      source:"SportyBet",
      sourceUrl:SOURCE_URL,
      httpStatus:response.status,
      parsedFootballEvents:events.length,
      latencyMs:Date.now()-started,
      checkedAt:new Date().toISOString()
    });
  }catch(error){
    res.status(502).json({
      status:"unavailable",
      source:"SportyBet",
      sourceUrl:SOURCE_URL,
      latencyMs:Date.now()-started,
      checkedAt:new Date().toISOString(),
      error:error instanceof Error?error.message:"SportyBet health check failed"
    });
  }
}
