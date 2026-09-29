import { normalizeEvent, normalizeMarket, normalizeSelection } from "../core/types.js";
import { stripHtml, extractPrematchLinks } from "./sportybetParser.js";

const cleanLines=text=>text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const numbers=line=>[...String(line??"").matchAll(/\d+(?:\.\d+)?/g)].map(x=>Number(x[0]));
const teamKey=value=>String(value??"").toLowerCase().replace(/[^a-z0-9]+/g,"");

function splitBasketballTeams(line=""){
  const candidates=line.split(/\s{2,}/).map(x=>x.trim()).filter(Boolean);
  if(candidates.length>=2)return[candidates[0],candidates.slice(1).join(" ")];
  const words=line.trim().split(/\s+/).filter(Boolean);
  if(words.length<2)return[];
  const half=Math.ceil(words.length/2);
  return[words.slice(0,half).join(" "),words.slice(half).join(" ")];
}

function isDateLine(line=""){return /^(?:\d{1,2}\/\d{1,2}\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+\d{1,2}\/\d{1,2})?$/i.test(line.trim());}

function mapCanonicalLinks(events,html){
  const links=extractPrematchLinks(html);
  const unused=[...links];
  return events.map((event,index)=>{
    const home=teamKey(event.home),away=teamKey(event.away);
    let linkIndex=unused.findIndex(link=>{
      const text=teamKey(link.text);
      return home&&away&&text.includes(home)&&text.includes(away);
    });
    if(linkIndex<0)linkIndex=Math.min(index,unused.length-1);
    if(linkIndex<0)return event;
    const link=unused.splice(linkIndex,1)[0];
    return normalizeEvent({...event,eventId:link.eventId,sourceEventId:event.sourceEventId||event.eventId,detailUrl:link.url});
  });
}

export function parseBasketballMainRows(text=""){
  const lines=cleanLines(text),events=[];
  let league="";
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(isDateLine(line)||/^(Points|Over|Under)$/i.test(line))continue;
    if(/\b(\d{1,2}:\d{2})\s+ID\s+(\d+)\b/i.test(line)){
      const match=line.match(/\b(\d{1,2}:\d{2})\s+ID\s+(\d+)\b/i);
      const startTime=match[1],sourceEventId=match[2];
      const teams=splitBasketballTeams(lines[i+1]??"");
      const lineValue=Number(lines[i+2]);
      const odds=numbers(lines[i+3]??"");
      if(teams.length!==2||!Number.isFinite(lineValue)||odds.length<2)continue;
      events.push(normalizeEvent({
        eventId:sourceEventId,
        sourceEventId,
        sport:"basketball",
        league,
        home:teams[0],
        away:teams[1],
        startTime,
        markets:[normalizeMarket({
          marketId:"main-total-points",
          name:"Total Points",
          group:"Main",
          selections:[
            normalizeSelection({selectionId:"over",name:`Over ${lineValue}`,odds:odds[0]}),
            normalizeSelection({selectionId:"under",name:`Under ${lineValue}`,odds:odds[1]})
          ]
        })]
      }));
      i+=3;
      continue;
    }
    if(line.length<120&&!/^(?:1|X|2|Over|Under|Points)$/i.test(line)&&!/^\d/.test(line)&&!line.includes("Refresh")&&!line.includes("Basketball League")){
      league=line;
    }
  }
  return events;
}

export function parseBasketballMainPage(html=""){
  const text=stripHtml(html);
  return mapCanonicalLinks(parseBasketballMainRows(text),html);
}
