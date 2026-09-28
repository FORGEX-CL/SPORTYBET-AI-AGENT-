import { analyzeEventMarkets } from "./marketAnalyzer.js";
import { statisticsAnalysis, footballAnalysis, multiSportAnalysis, marketAnalysis, oddsAnalysis, riskAnalysis, scoreReport } from "./specialists.js";
import { buildChallengeRound } from "./debate.js";
import { runHeadAnalyst } from "./headAnalyst.js";
import { applyHistoricalFeedback, feedbackForReport } from "./learningFeedback.js";

export function buildAgentCandidates(event,{evidence={},modelProbabilities={},agentPerformance={}}={}){
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
      ].map(report=>{
        const feedback=feedbackForReport(agentPerformance,report);
        const adjusted=applyHistoricalFeedback(report.confidence,feedback);
        return{...report,historicalFeedback:feedback,historicalConfidence:adjusted.confidence,historicalAdjustment:adjusted.adjustment};
      });
      const agreement=reportsForSelection.filter(r=>["statistics","football","multiSport","odds"].includes(r.agentId)&&Number(r.historicalConfidence)>0&&Number(r.dataQuality)>0).length/4;
      reports.push(...reportsForSelection.map(r=>scoreReport({...r,confidence:r.historicalConfidence},agreement)));
    }
  }
  const debate=buildChallengeRound(reports);
  return{markets,reports,debate,decision:runHeadAnalyst(reports,{debate})};
}
