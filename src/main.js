import "./styles.css";
import { AGENT_ROLES } from "./core/agents.js";
import { normalizeSportyBetFeed, requireFreshFeed } from "./core/feedPipeline.js";
import { fetchSportyBetFootballSnapshot } from "./data/sportybetWebSource.js";

const state={
  feed:normalizeSportyBetFeed([]),
  agents:AGENT_ROLES.map(a=>({...a,status:"READY"})),
  tickets:[],
  loading:false,
  error:""
};

const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

function render(){
  const fresh=requireFreshFeed(state.feed);
  document.querySelector("#app").innerHTML=`
<header class="topbar"><div><div class="eyebrow">AUTONOMOUS SPORTS ANALYSIS</div><h1>SPORTYBET <span>AI AGENT</span></h1></div><div class="source"><i class="${fresh.fresh?"live":""}"></i> ${fresh.fresh?"VERIFIED FEED":"VERIFIED SOURCE REQUIRED"}</div></header>
<main>
<section class="hero"><div><p class="label">AI BOARD</p><h2>Seven specialists. One analysis room.</h2><p class="muted">Evidence, value, risk and debate are separated before a ticket becomes a candidate.</p></div><div class="scan-card"><div class="scan-title">DATA STATUS</div><strong>${state.loading?"Loading SportyBet…":state.feed.eventCount?"Verified normalized feed":"Awaiting verified SportyBet feed"}</strong><span>${state.feed.eventCount} events · ${state.feed.marketCount} markets · ${fresh.fresh?"fresh":"no live feed loaded"}</span><button class="refresh" id="refresh-feed" ${state.loading?"disabled":""}>${state.loading?"LOADING…":"REFRESH SPORTYBET"}</button>${state.error?`<em class="feed-error">${escapeHtml(state.error)}</em>`:""}</div></section>
<section><div class="section-head"><div><p class="label">AGENT BOARD</p><h3>Specialists</h3></div><span class="count">7 AGENTS</span></div><div class="agents">${state.agents.map((a,i)=>`<article class="agent"><div class="agent-num">${String(i+1).padStart(2,"0")}</div><div><h4>${a.name}</h4><p>${a.focus}</p></div><div class="agent-state">${a.status}</div></article>`).join("")}</div></section>
<section><div class="section-head"><div><p class="label">TICKET ENGINE</p><h3>Top 10 candidates</h3></div><span class="count">UP TO 50 PICKS EACH</span></div><div class="tickets">${Array.from({length:10},(_,i)=>`<article class="ticket"><span class="ticket-id">TICKET #${i+1}</span><h4>— <small>COMBINED ODDS</small></h4><div class="ticket-meta"><span>0 selections</span><span>Awaiting verified data</span></div><button disabled>VIEW TICKET</button></article>`).join("")}</div></section>
<section class="architecture"><div class="section-head"><div><p class="label">DECISION PIPELINE</p><h3>Evidence before selection</h3></div></div><div class="flow"><span>SportyBet</span><b>→</b><span>Normalize</span><b>→</b><span>7 agents</span><b>→</b><span>Challenge</span><b>→</b><span>Head Analyst</span><b>→</b><span>Tickets</span><b>→</b><span>Learning</span></div></section>
</main><footer>SportyBet AI Agent · v0.4 · No fabricated odds, match IDs or booking codes.</footer>`;
  document.querySelector("#refresh-feed")?.addEventListener("click",loadFeed);
}

async function loadFeed(){
  state.loading=true;
  state.error="";
  render();
  try{
    state.feed=await fetchSportyBetFootballSnapshot();
  }catch(error){
    state.feed=normalizeSportyBetFeed([]);
    state.error=error instanceof Error?error.message:"SportyBet feed could not be loaded";
  }finally{
    state.loading=false;
    render();
  }
}

render();
