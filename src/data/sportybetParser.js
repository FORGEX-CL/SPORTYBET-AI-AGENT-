import { normalizeEvent, normalizeMarket, normalizeSelection } from "../core/types.js";

const ID=/ID\s+(\d+)/i;
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

function stripHtml(value=""){
  return value.replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g," ").trim();
}

function extractPrematchLinks(html=""){
  const matches=[...html.matchAll(/<a\b[^>]*href=["']([^"']*\/preMatch\/detail[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen=new Set(),links=[];
  for(const match of matches){
    try{
      const url=new URL(match[1],"https://lite.sportybet.com");
      const eventId=url.searchParams.get("eventId");
      if(!eventId||!/^sr:match:\d+$/.test(eventId)||seen.has(eventId))continue;
      seen.add(eventId);
      links.push({eventId,url:url.toString(),text:stripHtml(match[2])});
    }catch{}
  }
  return links;
}

export function parseFootballMainRows(text=""){
  const lines=cleanLines(text),events=[];let league="";
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/^\d{1,2}:\d{2}\s+ID\s+\d+$/i.test(line)){
      const id=line.match(ID)?.[1],startTime=line.match(/^\d{1,2}:\d{2}/)?.[0]??"";
      const teams=splitTeams(lines[i+1]??""),odds=numericTokens(lines[i+2]??"");
      if(!id||teams.length!==2||odds.length<3)continue;
      events.push(normalizeEvent({eventId:id,sourceEventId:id,sport:"football",league,home:teams[0],away:teams[1],startTime,
        markets:[normalizeMarket({marketId:"main-1x2",name:"1X2",group:"Main",
          selections:[normalizeSelection({selectionId:"1",name:"Home",odds:odds[0]}),normalizeSelection({selectionId:"X",name:"Draw",odds:odds[1]}),normalizeSelection({selectionId:"2",name:"Away",odds:odds[2]})]})]}));
      i+=2;
    }else if(line.length<100&&/\s-\s/.test(line)&&!/^\d/.test(line))league=line;
  }
  return events;
}

function parseDetailEventMeta(text=""){
  const lines=cleanLines(text);
  const displayIndex=lines.findIndex(line=>/(?:\d{1,2}\/\d{1,2}\/\d{4}\s+)?\d{1,2}:\d{2}\s+ID\s+\d+/i.test(line));
  if(displayIndex<0)return{};
  const match=lines[displayIndex].match(/(?:^|\s)(\d{1,2}:\d{2})\s+ID\s+(\d+)/i);
  return {displayIndex,sourceEventId:match?.[2]??"",startTime:match?.[1]??"",home:lines[displayIndex+1]??"",away:lines[displayIndex+2]??""};
}

const MARKET_HEADER=/^(1X2(?:\s*-\s*(?:1UP|2UP|Never Down))?|Over\/Under(?:\s*-\s*Early Goals)?|Double Chance(?:\s*-\s*1UP)?|1st Goal|Handicap(?:\s+[^\d]+)?|Asian Handicap(?:\s+[^\d]+)?|GG\/NG(?:\s+\d+\+)?|Both Teams To Score|Teams to Score|Odd\/Even|Smart Combo|Home No Bet|Away No Bet|Winning Margin|Exact Goals|Goal Range|Goal Bounds|Excluded Number of Goals|Correct Score(?:.*)?|Half Time\/Full Time|Last Goal|Draw No Bet|Match Winner|Set Winner|Game Handicap|Set Handicap|Total Games|Player Total Games|Point Handicap|Total Points|Team Total Points|Total Sets|Quarter Winner|Quarter Total Points|Half Winner|Half Total Points|Precanned BetBuilder|Any Team To Score \d+ or More Goals in a Row|Home Team To Score \d+ or More Goals in a Row|Away Team To Score \d+ or More Goals in a Row|Any Team to lead by \d+ Goals at any time|Home Team to lead by \d+ Goals at any time|Away Team to lead by \d+ Goals at any time)$/i;

const FOOTER_MARKERS=/^(T&C|How to Play|About|Contact Us|Cashout Betslip|Back|Refresh|Register|Log In)$/i;
const oddsAtEnd=line=>{const match=line.match(/(?:^|\s)(\d+(?:\.\d+)?)$/);return match?Number(match[1]):null;};

export function parseMarketBlock(text="",{eventId="",sport="football"}={}){
  const lines=cleanLines(text),markets=[],byName=new Map();let current=null;
  for(const raw of lines){
    const header=raw.replace(/\s+/g," ").trim();
    if(FOOTER_MARKERS.test(header)){current=null;continue;}
    if(MARKET_HEADER.test(header)){
      current=byName.get(header);
      if(!current){
        current={name:header,group:header.toLowerCase().includes("player")?"Players":"Main",sport,selections:[]};
        byName.set(header,current);
        markets.push(current);
      }
      continue;
    }
    if(!current)continue;
    const odds=oddsAtEnd(header);
    if(!Number.isFinite(odds)||odds<=1)continue;
    const name=header.slice(0,header.lastIndexOf(String(odds))).trim().replace(/\s+$/,"");
    if(!name||/^\d+(?:\.\d+)?$/.test(name))continue;
    current.selections.push(normalizeSelection({selectionId:current.name+":"+name,name,odds}));
  }
  return markets.filter(m=>m.selections.length).map((m,index)=>normalizeMarket({...m,marketId:eventId+":market:"+(index+1)}));
}

export function parseSportyBetFootballPage(htmlOrText="",{eventId=""}={}){
  const text=htmlOrText.includes("<")?stripHtml(htmlOrText):htmlOrText;
  const meta=parseDetailEventMeta(text);
  const detailMarkets=parseMarketBlock(text,{eventId,sport:"football"});
  if(!eventId&&!meta.sourceEventId&&!detailMarkets.length)return null;
  return normalizeEvent({
    eventId:eventId||meta.sourceEventId,
    sourceEventId:meta.sourceEventId||eventId,
    sport:"football",
    home:meta.home,
    away:meta.away,
    startTime:meta.startTime,
    markets:detailMarkets
  });
}

export function parseFootballMainPage(html=""){
  const text=stripHtml(html);
  const events=parseFootballMainRows(text);
  const links=extractPrematchLinks(html);
  return events.map((event,index)=>{
    const link=links[index];
    if(!link)return event;
    return normalizeEvent({...event,eventId:link.eventId,sourceEventId:event.sourceEventId||event.eventId,detailUrl:link.url,sport:"football"});
  });
}

export { stripHtml, extractPrematchLinks, parseDetailEventMeta };
