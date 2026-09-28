import { analyzeEventMarkets } from "./marketAnalyzer.js";
import { statisticsAnalysis, footballAnalysis, multiSportAnalysis, marketAnalysis, oddsAnalysis, riskAnalysis, scoreReport } from "./specialists.js";
import { buildChallengeRound } from "./debate.js";
import { runHeadAnalyst } from "./headAnalyst.js";
import { applyHistoricalFeedback, feedbackForReport } from "./learningFeedback.js";
import { buildSportyBetMarketSignals, getSportyBetMarketSignal } from "./sourceSignalEngine.js";

export function buildAgentCandidates(event,{evidence={},modelProbabilities={},agentPerformance={}}={}){
  const markets=analyzeEventMarkets(event);
  const signals=buildSportyBetMarketSignals(event);
  const reports=[];
  for(const market of markets){
    const rawMarket=event.markets.find(m=>m.marketId===market.marketId);
    for(const selection of market.selections){
      const signal=getSportyBetMarketSignal(signals,event,rawMarket,selection);
      const selectionKey=selection.selectionId;
      const context=evidence[selectionKey]??{};
      const historical=evidence.__historical??{};
      const historicalEvidence=Array.isArray(historical.evidence)?historical.evidence:[];
      const statisticsContext={...(context.statistics??{}),evidence:[...(context.statistics?.evidence??[]),...historicalEvidence],confidence:Math.max(Number(context.statistics?.confidence)||0,Number(historical.confidence)||0),dataQuality:Math.max(Number(context.statistics?.dataQuality)||0,Number(historical.dataQuality)||0),formSignal:historical.formSignal??null,goalSignal:historical.goalSignal??null};
      const footballContext={...(context.football??{}),evidence:[...(context.football?.evidence??[]),...historicalEvidence],confidence:Math.max(Number(context.football?.confidence)||0,Number(historical.confidence)||0),dataQuality:Math.max(Number(context.football?.dataQuality)||0,Number(historical.dataQuality)||0),formSignal:historical.formSignal??null,goalSignal:historical.goalSignal??null};
      const suppliedModel=modelProbabilities[selectionKey];
      const modelInput=suppliedModel??signal;
      const reportsForSelection=[
        statisticsAnalysis(event,rawMarket,selection,{...statisticsContext,marketSignal:signal}),
        footballAnalysis(event,rawMarket,selection,{...footballContext,marketSignal:signal}),
        multiSportAnalysis(event,rawMarket,selection,{...(context.multiSport??{}),marketSignal:signal}),
        marketAnalysis(event,rawMarket,selection),
        oddsAnalysis(event,rawMarket,selection,modelInput),
        riskAnalysis(event,rawMarket,selection,context.risks??[],{marketSignal:signal})
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
  return{
    markets,
    signals,
    reports,
    debate,
    decision:runHeadAnalyst(reports,{debate})
  };
}
