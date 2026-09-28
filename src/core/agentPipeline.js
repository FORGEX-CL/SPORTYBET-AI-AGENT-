import { analyzeEventMarkets } from "./marketAnalyzer.js";
import { statisticsAnalysis, footballAnalysis, multiSportAnalysis, marketAnalysis, oddsAnalysis, riskAnalysis, scoreReport } from "./specialists.js";
import { runHeadAnalyst } from "./headAnalyst.js";

export function buildAgentCandidates(event,{evidence={},modelProbabilities={}}={}){
  const markets=analyzeEventMarkets(event),reports=[];
  for(const market of markets){
    const rawMarket=event.markets.find(m=>m.marketId===market.marketId);
    for(const selection of market.selections){
      const context=evidence[selection.selectionId]??{};
      const reportsForSelection=[
        statisticsAnalysis(event,rawMarket,selection,context.statistics??{}),
        footballAnalysis(event,rawMarket,selection,context.football??{}),
        multiSportAnalysis(event,rawMarket,selection,context.multiSport??{}),
        marketAnalysis(event,rawMarket,selection),
        oddsAnalysis(event,rawMarket,selection,modelProbabilities[selection.selectionId]??null),
        riskAnalysis(event,rawMarket,selection,context.risks??[])
      ];
      const agreement=reportsForSelection.filter(r=>["statistics","football","multiSport","odds","risk"].includes(r.agentId)&&Number(r.confidence)>0&&Number(r.dataQuality)>0).length/5;
      reports.push(...reportsForSelection.map(r=>scoreReport(r,agreement)));
    }
  }
  return{markets,reports,decision:runHeadAnalyst(reports)};
}
