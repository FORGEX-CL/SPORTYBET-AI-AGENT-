export const AGENT_ROLES=Object.freeze([
{id:"statistics",name:"Statistics Agent",focus:"historical and sport-specific evidence"},
{id:"football",name:"Football Specialist",focus:"football-specific context and markets"},
{id:"multiSport",name:"Multi-Sport Specialist",focus:"non-football sport analysis"},
{id:"market",name:"SportyBet Market Intelligence",focus:"SportyBet's currently exposed market catalogue"},
{id:"odds",name:"Odds & Value Agent",focus:"odds, implied probability and value"},
{id:"risk",name:"Risk / Contrarian Agent",focus:"counter-evidence and failure modes"},
{id:"head",name:"Head Analyst",focus:"debate, filtering and ticket construction"}
]);
export function createAnalysisCase(event){return{caseId:crypto.randomUUID(),eventId:event.eventId,createdAt:new Date().toISOString(),agentReports:[],debate:[],decision:null};}
export function recordAgentReport(c,agentId,report){return{...c,agentReports:[...c.agentReports,{agentId,report,recordedAt:new Date().toISOString()}]};}
export function addDebateMessage(c,from,to,message){return{...c,debate:[...c.debate,{from,to,message,createdAt:new Date().toISOString()}]};}
