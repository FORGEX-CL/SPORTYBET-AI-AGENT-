import { normalizeEvent, normalizeMarket, normalizeSelection } from "../core/types.js";

const ID=/ID\s+(\d+)/;
const NUMBER=/\d+(?:\.\d+)?/;
const cleanLines=text=>text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const numericTokens=line=>[...line.matchAll(new RegExp(NUMBER.source,"g"))].map(x=>Number(x[0]));

function splitTeams(line=""){
  const normalized=line.replace(/\s+/g," ").trim();
  const candidates=line.split(/\s{2,}/).map(x=>x.trim()).filter(Boolean);
  if(candidates.length>=2)return[candidates[0],candidates.slice(1).join(" ")];
  const words=normalized.split(" ").filter(Boolean);
  if(words.length<2)return[];
  const half=Math.ceil(words.length/2);
  return[words.slice(0,half).join(" "),words.slice(half).join(" ")];
}

export function parseFootballMainRows(text=""){
  const lines=cleanLines(text),events=[];let league="";
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/^\d{1,2}:\d{2}\s+ID\s+\d+$/i.test(line)){
      const id=line.match(ID)?.[1],startTime=line.match(/^\d{1,2}:\d{2}/)?.[0]??"";
      const teams=splitTeams(lines[i+1]??""),odds=numericTokens(lines[i+2]??"");
      if(!id||teams.length!==2||odds.length<3)continue;
      events.push(normalizeEvent({eventId:id,sport:"football",league,home:teams[0],away:teams[1],startTime,
        markets:[normalizeMarket({marketId:"main-1x2",name:"1X2",group:"Main",
          selections:[normalizeSelection({selectionId:"1",name:"Home",odds:odds[0]}),normalizeSelection({selectionId:"X",name:"Draw",odds:odds[1]}),normalizeSelection({selectionId:"2",name:"Away",odds:odds[2]})]})]}));
      i+=2;
    }else if(line.length<100&&/\s-\s/.test(line)&&!/^\d/.test(line))league=line;
  }
  return events;
}

const MARKET_HEADER=/^(1X2|Over\/Under(?:\s*-\s*Early Goals)?|Double Chance(?:\s*-\s*1UP)?|1st Goal|Handicap(?:\s+[^\d]+)?|Asian Handicap(?:\s+[^\d]+)?|GG\/NG(?:\s+\d+\+)?|Both Teams To Score|Teams to Score|Odd\/Even|Smart Combo|Home No Bet|Away No Bet|Winning Margin|Exact Goals|Goal Range|Correct Score.*|Match Winner|Set Winner|Game Handicap|Set Handicap|Total Games|Player Total Games|Point Handicap|Total Points|Team Total Points|Total Sets|Quarter Winner|Quarter Total Points|Half Winner|Half Total Points|Precanned BetBuilder)/i;

const FOOTER_MARKERS=/^(T&C|How to Play|About|Contact Us|Cashout Betslip|Back|Refresh)$/i;
const oddsAtEnd=line=>{const match=line.match(/(?:^|\s)(\d+(?:\.\d+)?)$/);return match?Number(match[1]):null;};

export function parseMarketBlock(text="",{eventId="",sport="football"}={}){
  const lines=cleanLines(text),markets=[];let current=null;
  for(const raw of lines){
    const header=raw.replace(/\s+/g," ").trim();
    if(FOOTER_MARKERS.test(header)){current=null;continue;}
    if(MARKET_HEADER.test(header)){current={name:header,group:header.toLowerCase().includes("player")?"Players":"Main",sport,selections:[]};markets.push(current);continue;}
    if(!current)continue;
    const odds=oddsAtEnd(header);
    if(!Number.isFinite(odds)||odds<=1)continue;
    const name=header.slice(0,header.lastIndexOf(String(odds))).trim().replace(/\s+$/,"");
    if(!name||/^\d+(?:\.\d+)?$/.test(name))continue;
    current.selections.push(normalizeSelection({selectionId:`${current.name}:${name}`,name,odds}));
  }
  return markets.filter(m=>m.selections.length).map((m,i)=>normalizeMarket({...m,marketId:`${eventId}:market:${i+1}`}));
}

export function parseSportyBetFootballPage(text="",{eventId=""}={}){
  const lines=cleanLines(text);
  const events=parseFootballMainRows(text);
  const detailMarkets=parseMarketBlock(text,{eventId,sport:"football"});
  if(events.length){
    const base=events[0];
    const existing=new Set(base.markets.map(m=>m.name));
    return normalizeEvent({...base,markets:[...base.markets,...detailMarkets.filter(m=>!existing.has(m.name))]});
  }
  return eventId&&detailMarkets.length?normalizeEvent({eventId,sport:"football",markets:detailMarkets}):null;
}
