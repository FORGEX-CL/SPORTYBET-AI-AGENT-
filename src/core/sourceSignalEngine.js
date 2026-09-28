const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const keyOf=(eventId,marketId,selectionId)=>String(eventId)+":"+String(marketId)+":"+String(selectionId);

function normalizedSelections(market){
  const selections=(market?.selections??[]).filter(s=>s?.available!==false&&Number.isFinite(Number(s.odds))&&Number(s.odds)>1);
  const raw=selections.map(s=>1/Number(s.odds));
  const total=raw.reduce((sum,p)=>sum+p,0);
  if(!selections.length||!Number.isFinite(total)||total<=0)return null;
  return {selections,total,overround:Math.max(0,total-1),fair:new Map(selections.map((s,i)=>[s.selectionId,raw[i]/total]))};
}

function marketSignals(event){
  const signals=new Map();
  for(const market of event?.markets??[]){
    const normalized=normalizedSelections(market);
    if(!normalized)continue;
    const {selections,fair,overround}=normalized;
    for(const selection of selections){
      const probability=fair.get(selection.selectionId);
      const key=keyOf(event.eventId,market.marketId,selection.selectionId);
      signals.set(key,{
        key,eventId:event.eventId,marketId:market.marketId,marketName:market.name,selectionId:selection.selectionId,
        selection:selection.name,odds:Number(selection.odds),impliedProbability:1/Number(selection.odds),
        fairProbability:probability,overround,marketDepth:selections.length,sourceFamilies:1,
        confidence:clamp(.55+(Math.min(4,selections.length)/4)*.15-(Math.min(.25,overround)*.4)),
        dataQuality:clamp(.62+(Math.min(4,selections.length)/4)*.12-(Math.min(.25,overround)*.2)),
        evidence:[
          "SportyBet market "+market.name+": "+selection.name+" at "+Number(selection.odds).toFixed(2)+".",
          "Normalized fair probability from the selections in this SportyBet market: "+(probability*100).toFixed(1)+"%.",
          "Market overround: "+(overround*100).toFixed(1)+"%."
        ],
        modelType:"sportybet-market-implied-v1",
        consensus:[{probability,label:market.name}]
      });
    }
  }
  return signals;
}

function findSelection(event,predicate){
  for(const market of event?.markets??[]){
    const found=market.selections?.find(s=>predicate(market,s));
    if(found)return{market,selection:found};
  }
  return null;
}

function selectionSignal(signals,event,market,selection){
  return signals.get(keyOf(event.eventId,market.marketId,selection.selectionId));
}

function addConsensus(target,probability,label){
  if(!Number.isFinite(probability)||probability<0||probability>1)return;
  target.consensus.push({probability,label});
}

function applyCrossMarketConsensus(event,signals){
  for(const base of signals.values()){
    const name=String(base.selection).toLowerCase();
    const market=String(base.marketName).toLowerCase();

    if(market==="1x2"&&(name==="home"||name==="1"||name==="away"||name==="2"||name==="draw"||name==="x")){
      const oneXtwo=findSelection(event,(m,s)=>String(m.name).toLowerCase()==="1x2");
      const draw=oneXtwo?.market?.selections?.find(s=>["draw","x"].includes(String(s.name).toLowerCase()));
      const drawSignal=draw?selectionSignal(signals,event,oneXtwo.market,draw):null;
      const drawP=drawSignal?.fairProbability;
      const dcHome=findSelection(event,(m,s)=>String(m.name).toLowerCase().includes("double chance")&&["home or draw","draw or home"].includes(String(s.name).toLowerCase()));
      const dcAway=findSelection(event,(m,s)=>String(m.name).toLowerCase().includes("double chance")&&["draw or away","away or draw"].includes(String(s.name).toLowerCase()));
      const dcHomeAway=findSelection(event,(m,s)=>String(m.name).toLowerCase().includes("double chance")&&["home or away","away or home"].includes(String(s.name).toLowerCase()));
      const dnbHome=findSelection(event,(m,s)=>String(m.name).toLowerCase()==="draw no bet"&&["home","1"].includes(String(s.name).toLowerCase()));
      const dnbAway=findSelection(event,(m,s)=>String(m.name).toLowerCase()==="draw no bet"&&["away","2"].includes(String(s.name).toLowerCase()));
      if(drawP!=null){
        if(name==="home"||name==="1"){
          if(dcHome){const p=selectionSignal(signals,event,dcHome.market,dcHome.selection)?.fairProbability;if(p!=null)addConsensus(base,p-drawP,"Double Chance - Home or Draw minus Draw");}
          if(dnbHome){const p=selectionSignal(signals,event,dnbHome.market,dnbHome.selection)?.fairProbability;if(p!=null)addConsensus(base,p*(1-drawP),"Draw No Bet conditional Home");}
        }else if(name==="away"||name==="2"){
          if(dcAway){const p=selectionSignal(signals,event,dcAway.market,dcAway.selection)?.fairProbability;if(p!=null)addConsensus(base,p-drawP,"Double Chance - Draw or Away minus Draw");}
          if(dnbAway){const p=selectionSignal(signals,event,dnbAway.market,dnbAway.selection)?.fairProbability;if(p!=null)addConsensus(base,p*(1-drawP),"Draw No Bet conditional Away");}
        }else if(dcHomeAway){
          const p=selectionSignal(signals,event,dcHomeAway.market,dcHomeAway.selection)?.fairProbability;
          if(p!=null)addConsensus(base,1-p,"Double Chance - Home or Away complement");
        }
      }
    }

    if(market==="draw no bet"){
      const side=findSelection(event,(m,s)=>String(m.name).toLowerCase()==="1x2"&&String(s.name).toLowerCase()===name);
      const draw=findSelection(event,(m,s)=>String(m.name).toLowerCase()==="1x2"&&["draw","x"].includes(String(s.name).toLowerCase()));
      const sideP=side?selectionSignal(signals,event,side.market,side.selection)?.fairProbability:null;
      const drawP=draw?selectionSignal(signals,event,draw.market,draw.selection)?.fairProbability:null;
      if(sideP!=null&&drawP!=null)addConsensus(base,sideP/Math.max(.01,1-drawP),"1X2 conditional probability");
    }

    base.consensusProbability=clamp(base.consensus.reduce((sum,x)=>sum+x.probability,0)/base.consensus.length);
    base.modelProbability=base.consensusProbability;
    base.sourceFamilies=base.consensus.length;
    base.consensusSpread=base.consensus.length>1?Math.max(...base.consensus.map(x=>x.probability))-Math.min(...base.consensus.map(x=>x.probability)):0;
    base.crossMarketAgreement=clamp(1-(base.consensusSpread*.9));
    base.confidence=clamp(base.confidence+(Math.min(base.sourceFamilies-1,2)*.08)+(base.crossMarketAgreement*.08));
    base.dataQuality=clamp(base.dataQuality+(Math.min(base.sourceFamilies-1,2)*.08));
    base.expectedValue=(base.modelProbability*base.odds)-1;
    base.evidence.push("Cross-market consensus sources: "+base.consensus.map(x=>x.label).join(", ")+".");
    base.evidence.push("Market-consensus probability: "+(base.modelProbability*100).toFixed(1)+"%; expected value proxy: "+(base.expectedValue*100).toFixed(1)+"%.");
    base.evidenceCount=base.evidence.length;
  }
  return signals;
}

export function buildSportyBetMarketSignals(event){
  return Object.fromEntries(applyCrossMarketConsensus(event,marketSignals(event)));
}

export function getSportyBetMarketSignal(signalIndex,event,market,selection){
  return signalIndex?.[keyOf(event.eventId,market.marketId,selection.selectionId)]??null;
}
