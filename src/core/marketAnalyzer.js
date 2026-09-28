import { impliedProbability } from "./analysisEngine.js";
import { classifyMarket } from "./marketCatalogue.js";
import { classifySportMarket } from "./sportMarketCatalogue.js";
export function analyzeMarket(event,market){const category=classifySportMarket(event.sport,market.name)||classifyMarket(market.name);const selections=market.selections.map(selection=>({eventId:event.eventId,marketId:market.marketId,marketName:market.name,category,sport:event.sport,selectionId:selection.selectionId,selection:selection.name,odds:Number(selection.odds),impliedProbability:impliedProbability(selection.odds),available:selection.available!==false})).filter(x=>x.available&&Number.isFinite(x.odds)&&x.odds>1);return{eventId:event.eventId,marketId:market.marketId,name:market.name,category,sport:event.sport,selections};}
export function analyzeEventMarkets(event){return(event.markets??[]).map(m=>analyzeMarket(event,m));}
