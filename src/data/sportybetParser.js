import { normalizeEvent, normalizeMarket, normalizeSelection } from "../core/types.js";

const ID=/ID\s+(\d+)/;
const NUMBER=/\d+(?:\.\d+)?/;

export function parseFootballMainRows(text=""){
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const events=[]; let league="";
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/\bID\s+\d+\b/.test(line)){
      const id=line.match(ID)?.[1], time=line.match(/^\d{1,2}:\d{2}/)?.[0]??"";
      const body=line.replace(/^\d{1,2}:\d{2}\s*/,"").replace(/\s*ID\s+\d+\s*/," ").trim();
      const next=lines[i+1]??"";
      const odds=next.match(new RegExp(`^(${NUMBER.source})\\s+(${NUMBER.source})\\s+(${NUMBER.source})$`));
      if(!id||!body||!odds) continue;
      const names=body.split(/\s{2,}/); if(names.length<2) continue;
      const half=Math.ceil(names.length/2),home=names.slice(0,half).join(" "),away=names.slice(half).join(" ");
      events.push(normalizeEvent({eventId:id,sport:"football",league,home,away,startTime:time,
        markets:[normalizeMarket({marketId:"main-1x2",name:"1X2",group:"Main",selections:[
          normalizeSelection({selectionId:"1",name:"Home",odds:Number(odds[1])}),
          normalizeSelection({selectionId:"X",name:"Draw",odds:Number(odds[2])}),
          normalizeSelection({selectionId:"2",name:"Away",odds:Number(odds[3])})
        ]})]}));
      i++; continue;
    }
    if(line.length<100 && /\s-\s/.test(line) && !/^\d/.test(line)) league=line;
  }
  return events;
}

export function parseFootballMarketRows(text=""){
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  return lines.filter(x=>/^\d{1,2}:\d{2}/.test(x)&&/ID\s+\d+/.test(x)).map(line=>({
    eventId:line.match(ID)?.[1]??"",time:line.match(/^\d{1,2}:\d{2}/)?.[0]??""
  }));
}
