import "./styles.css";
import { AGENT_ROLES } from "./core/agents.js";

const agents=[
["01","Statistics","Form, historical performance and sport-specific statistics"],
["02","Football Specialist","Football-specific match and market analysis"],
["03","Multi-Sport Specialist","Basketball, tennis, table tennis and other sports"],
["04","SportyBet Market Intelligence","Maps SportyBet's available market catalogue"],
["05","Odds & Value","Implied probability and market-value analysis"],
["06","Risk / Contrarian","Challenges selections and searches for failure cases"],
["07","Head Analyst","Final debate, filtering and candidate-ticket construction"]
];
const tickets=Array.from({length:10},(_,i)=>({id:i+1,selections:0,odds:"—",status:"Awaiting verified data"}));
document.querySelector("#app").innerHTML=`
<header class="topbar"><div><div class="eyebrow">AUTONOMOUS SPORTS ANALYSIS</div><h1>SPORTYBET <span>AI AGENT</span></h1></div><div class="source"><i></i> VERIFIED SOURCE REQUIRED</div></header>
<main>
<section class="hero"><div><p class="label">AI BOARD</p><h2>Seven specialists. One analysis room.</h2><p class="muted">The engine separates evidence, value, risk and debate before a ticket can become a candidate.</p></div><div class="scan-card"><div class="scan-title">DATA STATUS</div><strong>Awaiting verified SportyBet feed</strong><span>No fabricated events, odds, IDs or booking codes.</span></div></section>
<section><div class="section-head"><div><p class="label">AGENT BOARD</p><h3>Specialists</h3></div><span class="count">7 AGENTS</span></div><div class="agents">${agents.map(([n,name,desc])=>`<article class="agent"><div class="agent-num">${n}</div><div><h4>${name}</h4><p>${desc}</p></div><div class="agent-state">READY</div></article>`).join("")}</div></section>
<section><div class="section-head"><div><p class="label">TICKET ENGINE</p><h3>Top 10 candidates</h3></div><span class="count">UP TO 50 PICKS EACH</span></div><div class="tickets">${tickets.map(t=>`<article class="ticket"><span class="ticket-id">TICKET #${t.id}</span><h4>${t.odds} <small>COMBINED ODDS</small></h4><div class="ticket-meta"><span>${t.selections} selections</span><span>${t.status}</span></div><button disabled>VIEW TICKET</button></article>`).join("")}</div></section>
<section class="architecture"><div class="section-head"><div><p class="label">DECISION PIPELINE</p><h3>Evidence before selection</h3></div></div><div class="flow"><span>SportyBet</span><b>→</b><span>Normalize</span><b>→</b><span>7 agents</span><b>→</b><span>Challenge</span><b>→</b><span>Head Analyst</span><b>→</b><span>Tickets</span><b>→</b><span>Learning</span></div></section>
</main><footer>SportyBet AI Agent · v0.2 · No fabricated odds, match IDs or booking codes.</footer>`;
