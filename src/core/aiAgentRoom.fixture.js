import { buildAiReply } from "./aiAgentRoom.js";

const state={
  feed:{eventCount:2,marketCount:4,capturedAt:"2026-09-29T00:00:00.000Z"},
  analysis:{
    reports:[
      {agentId:"odds",eventId:"e1",marketId:"m1",selectionId:"s1",odds:2.10,value:.12},
      {agentId:"football",eventId:"e1",marketId:"m1",selectionId:"s1"}
    ],
    debate:[{eventId:"e1",marketId:"m1",selectionId:"s1",message:"price risk"}],
    decision:{accepted:[{eventId:"e1",marketId:"m1",selectionId:"s1"}],reasoning:"Evidence gate passed."},
    tickets:[{}]
  },
  selectedTicket:{
    selections:[{eventId:"e1",marketId:"m1",selectionId:"s1",selection:"Home",marketName:"3 Way",odds:2.1}]
  }
};

const a=buildAiReply(state,"Explain selection 1");
if(!a.includes("Selection 1: Home")||!a.includes("2.10"))throw new Error("AI ticket explanation fixture failed");
const b=buildAiReply(state,"What did the Odds Agent find?");
if(!b.includes("1 priced report(s)"))throw new Error("Odds agent fixture failed");
const c=buildAiReply(state,"What is the source status?");
if(!c.includes("2 events")||!c.includes("4 markets"))throw new Error("Source status fixture failed");
console.log("ai-agent-room fixtures: ok");
