import { createSportyBetAdapter } from "../src/data/sportybetAdapter.js";
import { parseSportyBetFootballResults } from "../src/data/sportybetResultsParser.js";

const RESULTS_URL="https://www.sportybet.com/ng/liveResult/";

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

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Source","SportyBet");
  if(req.method!=="GET"){
    res.status(405).json({error:"Method not allowed"});
    return;
  }

  try{
    const adapter=createSportyBetAdapter();
    const response=await adapter.fetchPublicPage(RESULTS_URL);
    const html=await response.text();
    const results=parseSportyBetFootballResults(htmlToVisibleText(html));
    if(!results.length)throw new Error("SportyBet Results source returned no parseable football results");
    res.status(200).json({
      source:"SportyBet",
      sourceUrl:RESULTS_URL,
      capturedAt:new Date().toISOString(),
      resultCount:results.length,
      results,
      ingestion:"server"
    });
  }catch(error){
    res.status(502).json({
      source:"SportyBet",
      status:"unavailable",
      error:error instanceof Error?error.message:"SportyBet result ingestion failed"
    });
  }
}
