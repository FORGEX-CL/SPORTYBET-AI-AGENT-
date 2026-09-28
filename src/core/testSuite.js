import { normalizeSportyBetFeed } from "./feedPipeline.js";
import { buildCandidateTickets } from "./ticketBuilder.js";
import { createPredictionRecord, settlePrediction, summarizeLearning } from "./learning.js";
import { revalidateTicket } from "./revalidation.js";

export function runCoreFixtures(){
 const event={eventId:"fixture-1",sport:"football",league:"Fixture League",home:"Alpha FC",away:"Beta FC",startTime:"12:00",markets:[{marketId:"m1",name:"1X2",group:"Main",selections:[{selectionId:"1",name:"Home",odds:2.1},{selectionId:"X",name:"Draw",odds:3.2},{selectionId:"2",name:"Away",odds:3.4}]}]};
 const feed=normalizeSportyBetFeed([event]);
 const tickets=buildCandidateTickets([{eventId:"fixture-1",marketId:"m1",selectionId:"1",name:"Home",odds:2.1,available:true,score:.8}]);
 if(tickets.length!==1)throw new Error("Ticket fixture failed");
 const ticket=tickets[0];
 const valid=revalidateTicket(ticket,feed,{maxAgeMs:120000});
 if(!valid.valid)throw new Error("Fresh ticket revalidation failed");
 const prediction=createPredictionRecord(ticket);
 const settled=settlePrediction(prediction,[{eventId:"fixture-1",marketId:"m1",selectionId:"1",result:"won"}]);
 if(settled.status!=="won")throw new Error("Prediction settlement failed");
 const summary=summarizeLearning([settled]);
 if(summary.winRate!==1)throw new Error("Learning summary failed");
 return {ok:true,checks:["feed","ticket","revalidation","settlement","learning"]};
}
