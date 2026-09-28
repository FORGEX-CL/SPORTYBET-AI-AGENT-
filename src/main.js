import "./styles.css";
import { AGENT_ROLES } from "./core/agents.js";
import { analyzeSportyBetFeed } from "./core/feedAnalysis.js";
import { normalizeSportyBetFeed, requireFreshFeed } from "./core/feedPipeline.js";
import { enrichSportyBetFootballEvents, fetchSportyBetFootballSnapshot } from "./data/sportybetWebSource.js";

const emptyFeed=normalizeSportyBetFeed([]);
const state={feed:emptyFeed,analysis:analyzeSportyBetFeed(emptyFeed),agents:AGENT_ROLES.map(a=>({...a,status:"READY"})),loading:false,error:"",detailFailures:0};

const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

function renderAgentStatus(){
  const reportCount=state.analysis.reports.length;
  return state.agents.map((a,i)=>{
    let status="READY";
    if(state.loading)status="SCANNING";
    else if(a.id==="head")status=state.feed.eventCount?(state.analysis.decision.noBet?"NO BET":"DECIDED"):"READY";
    else if(reportCount)status="ANALYZED";
    return{...a,status};
  });
}

function render(){
  const fresh=requireFreshFeed(state.feed);
  const agents=renderAgentStatus();
  const status=state.loading?"Loading SportyBet…":state.feed.eventCount?"Verified normalized feed":"Awaiting verified SportyBet feed";
  const decisionText=state.feed.eventCount?(state.analysis.decision.noBet?"NO BET":"CANDIDATES READY"):"WAITING FOR VERIFIED DATA";
  const tickets=state.analysis.tickets??[];
  const debateCount=state.analysis.debate?.length??0;
  document.querySelector("#app").innerHTML=`
<header class="topbar"><div><div class="eyebrow">AUTONOMOUS SPORTS ANALYSIS</div><h1>SPORTYBET <span>AI AGENT</span></h1></div><div class="source"><i class="${fresh.fresh?"live":""}"></i> ${fresh.fresh?"VERIFIED FEED":"VERIFIED SOURCE REQUIRED"}</div></header>
<main>
<section class="hero"><div><p class="label">AI BOARD</p><h2>Seven specialists. One analysis room.</h2><p class="muted">Evidence, value, risk and debate are separated before a ticket becomes a candidate.</p></div><div class="scan-card"><div class="scan-title">DATA STATUS</div><strong>${status}</strong><span>${state.feed.eventCount} events · ${state.feed.marketCount} markets · ${fresh.fresh?"fresh":"no live feed loaded"}</span><button class="refresh" id="refresh-feed" ${state.loading?"disabled":""}>${state.loading?"LOADING…":"REFRESH SPORTYBET"}</button><div class="decision-line"><span>HEAD ANALYST</span><b>${decisionText}</b></div><div class="decision-line"><span>RISK CHALLENGES</span><b>${debateCount}</b></div>${state.detailFailures?`<em class="feed-error">${state.detailFailures} event detail page(s) could not be enriched; original verified event data retained.</em>`:""}${state.error?`<em class="feed-error">${escapeHtml(state.error)}</em>`:""}</div></section>
<section><div class="section-head"><div><p class="label">AGENT BOARD</p><h3>Specialists</h3></div><span class="count">${state.analysis.reports.length} REPORTS · ${debateCount} CHALLENGES</span></div><div class="agents">${agents.map((a,i)=>`<article class="agent"><div class="agent-num">${String(i+1).padStart(2,"0")}</div><div><h4>${a.name}</h4><p>${a.focus}</p></div><div class="agent-state">${a.status}</div></article>`).join("")}</div></section>
<section><div class="section-head"><div><p class="label">TICKET ENGINE</p><h3>Top 10 candidates</h3></div><span class="count">UP TO 50 PICKS EACH</span></div><div class="tickets">${Array.from({length:10},(_,i)=>{const ticket=tickets[i];return`<article class="ticket"><span class="ticket-id">TICKET #${i+1}</span><h4>${ticket?Number(ticket.combinedOdds).toFixed(2):"—"} <small>COMBINED ODDS</small></h4><div class="ticket-meta"><span>${ticket?ticket.selectionCount:0} selections</span><span>${ticket?"Candidate passed Head Analyst":"No approved candidate"}</span></div><button ${ticket?"":"disabled"}>${ticket?"VIEW TICKET":"UNAVAILABLE"}</button></article>`}).join("")}</div></section>
<section class="architecture"><div class="section-head"><div><p class="label">DECISION PIPELINE</p><h3>Evidence before selection</h3></div></div><div class="flow"><span>SportyBet</span><b>→</b><span>Normalize</span><b>→</b><span>Enrich</span><b>→</b><span>6 specialists</span><b>→</b><span>Risk challenge</span><b>→</b><span>Head Analyst</span><b>→</b><span>Tickets</span><b>→</b><span>Learning</span></div></section>
</main><footer>SportyBet AI Agent · v0.7 · No fabricated odds, match IDs or booking codes.</footer>`;
  document.querySelector("#refresh-feed")?.addEventListener("click",loadFeed);
}

async function loadFeed(){
  state.loading=true;
  state.error="";
  state.detailFailures=0;
  render();
  try{
    const snapshot=await fetchSportyBetFootballSnapshot();
    const enriched=await enrichSportyBetFootballEvents(snapshot.events,{maxEvents:20});
    state.detailFailures=enriched.failures.length;
    state.feed=normalizeSportyBetFeed(enriched.events,{sourceUrl:snapshot.sourceUrl,capturedAt:snapshot.capturedAt});
    state.analysis=analyzeSportyBetFeed(state.feed);
  }catch(error){
    state.feed=normalizeSportyBetFeed([]);
    state.analysis=analyzeSportyBetFeed(state.feed);
    state.error=error instanceof Error?error.message:"SportyBet feed could not be loaded";
  }finally{
    state.loading=false;
    render();
  }
}

render();
