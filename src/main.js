import "./styles.css";
import { AGENT_ROLES } from "./core/agents.js";
import { analyzeSportyBetFeed } from "./core/feedAnalysis.js";
import { normalizeSportyBetFeed, requireFreshFeed } from "./core/feedPipeline.js";
import { loadLearningLedger, learningSummary, registerTickets, saveLearningLedger, settlePendingFromSportyBetResults, recordSportyBetResults, recordSportyBetOddsHistory } from "./core/learningLedger.js";
import { fetchSportyBetFootballApi, fetchSportyBetBasketballApi, fetchSportyBetMultiSportApi, fetchSportyBetResultsApi } from "./data/sportybetApi.js";
import { settleFootballSelection } from "./data/sportybetResultsParser.js";
import { buildHistoricalEvidenceByEvent } from "./core/sportybetHistory.js";
import { compareTicketToFeed } from "./core/ticketDelta.js";
import { recordSportyBetOddsSnapshot, buildOddsMovementBySelection } from "./core/oddsHistory.js";
import { buildAiReply } from "./core/aiAgentRoom.js";

// AI side-panel integration point
const emptyFeed=normalizeSportyBetFeed([]);
const initialLedger=loadLearningLedger();
const state={feed:emptyFeed,analysis:analyzeSportyBetFeed(emptyFeed,{agentPerformance:initialLedger.performance}),ledger:initialLedger,learning:learningSummary(initialLedger),agents:AGENT_ROLES.map(a=>({...a,status:"READY"})),loading:false,error:"",detailFailures:0,resultFailures:0,lastResultSync:null,selectedTicket:null,selectedSport:"all",sourceHealth:{status:"checking",parsedFootballEvents:0,eventsWithMarkets:0,pricedSelections:0,checkedAt:null,latencyMs:null}};

const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const formatNaira=value=>{
  const amount=Number.isFinite(Number(value))?Number(value):0;
  return "N"+amount.toLocaleString("en-NG",{minimumFractionDigits:2,maximumFractionDigits:2});
};
function safeSaveLearning(){try{state.learning=learningSummary(state.ledger);saveLearningLedger(state.ledger);}catch{state.learning=learningSummary(state.ledger);}}
function renderAgentStatus(){const reportCount=state.analysis.reports.length;return state.agents.map(a=>{let status="READY";if(state.loading)status="SCANNING";else if(a.id==="head")status=state.feed.eventCount?(state.analysis.decision.noBet?"NO BET":"DECIDED"):"READY";else if(reportCount)status="ANALYZED";return{...a,status};});}
function renderSelectedTicket(ticket){if(!ticket)return"";const delta=compareTicketToFeed(ticket,state.feed);const badge=delta.status==="validated"?"VALIDATED":delta.status==="changed"?"CHANGES DETECTED":"FEED NOT FRESH";const badgeClass=delta.status==="validated"?"ok":delta.status==="changed"?"warn":"muted";const issueText=delta.status==="validated"?"All selections match the current verified feed.":delta.status==="changed"?`${delta.issues.length} selection change(s) detected.`:"Fresh SportyBet data is required before validation.";return`<section class="ticket-detail"><div class="section-head"><div><p class="label">TICKET DETAIL</p><h3>${escapeHtml(ticket.strategyLabel??"Candidate")} · ${ticket.selectionCount} selections</h3></div><div class="ticket-actions"><button class="refresh" id="copy-ticket">COPY TICKET</button><button class="refresh" id="ask-ticket-ai">ASK AI</button><button class="refresh" id="recheck-ticket">RECHECK</button><button class="refresh" id="close-ticket">CLOSE</button></div></div><div class="ticket-detail-meta"><span>Combined odds: <b>${Number(ticket.combinedOdds).toFixed(2)}</b></span><span>Portfolio score: <b>${Number(ticket.score).toFixed(3)}</b></span><span>${ticket.selectionProfile?.uniqueEvents??ticket.selectionCount} unique events</span><span class="ticket-status ${badgeClass}">${badge}</span></div><p class="ticket-revalidation">${escapeHtml(issueText)}${delta.currentCombinedOdds!=null?` Current combined odds: <b>${Number(delta.currentCombinedOdds).toFixed(2)}</b>.`:""}</p><div class="selection-list">${ticket.selections.map((s,i)=>{const row=delta.currentSelections?.find(x=>x.eventId===s.eventId&&x.marketId===s.marketId&&x.selectionId===s.selectionId);const issue=delta.issues?.find(x=>x.selection.eventId===s.eventId&&x.selection.marketId===s.marketId&&x.selection.selectionId===s.selectionId);const stateLabel=issue?(issue.reason==="odds_changed"?`ODDS ${Number(row?.currentOdds).toFixed(2)}`:"UNAVAILABLE"):"MATCH";return`<article class="selection-row ${issue?"changed":"same"}"><div class="selection-index">${String(i+1).padStart(2,"0")}</div><div><strong>${escapeHtml(s.selection)}</strong><span>${escapeHtml(s.eventId)} · SportyBet ID ${escapeHtml(s.sourceEventId??"n/a")} · ${escapeHtml(s.marketName??"")} · ${escapeHtml(s.marketId)}</span></div><div><div class="selection-odds">${Number(s.odds).toFixed(2)}</div><small class="selection-state">${stateLabel}</small></div></article>`}).join("")}</div><p class="ticket-source-note">Snapshot: ${escapeHtml(ticket.snapshot?.source??"SportyBet")} · ${escapeHtml(ticket.snapshot?.capturedAt??"timestamp unavailable")}. Recheck before using it. Booking codes are not generated by this application.</p></section>`;}
function ticketCopyText(ticket){return[`SPORTYBET AI AGENT · ${ticket.strategyLabel??"Candidate"}`,`Ticket ID: ${ticket.ticketId}`,`Combined odds at creation: ${Number(ticket.combinedOdds).toFixed(2)}`,`Source snapshot: ${ticket.snapshot?.capturedAt??"unknown"}`,"",...ticket.selections.map((s,i)=>`${i+1}. Event ${s.eventId} | SportyBet ID ${s.sourceEventId??"n/a"} | ${s.marketName??""} | ${s.selection} | Odds ${Number(s.odds).toFixed(2)}`),"","Revalidate against current SportyBet odds before recreating. No booking code is generated by this application."].join("\n");}
async function copyTicket(ticket){const text=ticketCopyText(ticket);try{await navigator.clipboard.writeText(text);state.error="Ticket copied to clipboard.";}catch{const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();state.error="Ticket copied to clipboard.";}render();}
function bindTicketButtons(){document.querySelectorAll("[data-ticket-index]").forEach(button=>button.addEventListener("click",()=>{const index=Number(button.getAttribute("data-ticket-index"));state.selectedTicket=state.analysis.tickets?.[index]??null;render();}));document.querySelector("#copy-ticket")?.addEventListener("click",()=>copyTicket(state.selectedTicket));document.querySelector("#ask-ticket-ai")?.addEventListener("click",()=>{document.querySelector("#ai-drawer")?.classList.add("open");const input=document.querySelector("#ai-input");if(input){input.value="Explain this ticket selection by selection";input.focus();}});document.querySelector("#close-ticket")?.addEventListener("click",()=>{state.selectedTicket=null;render();});document.querySelector("#recheck-ticket")?.addEventListener("click",()=>loadFeed({preserveTicketId:state.selectedTicket?.ticketId??null}));}

function stagedPlan(){
  const t=state.analysis.tickets??[];
  if(!t.length)return["Refresh the source feed and run analysis first."];
  return t.slice(0,3).map((x,i)=>"Stage "+(i+1)+": "+x.selectionCount+" selections · "+Number(x.combinedOdds).toFixed(2)+" combined odds");
}
function rolloverRows(){
  const stake=Math.max(0,Number(document.querySelector("#rollover-stake")?.value||1500));
  const odds=Math.max(1,Number(document.querySelector("#rollover-odds")?.value||5));
  const days=Math.min(30,Math.max(1,Math.floor(Number(document.querySelector("#rollover-days")?.value||5))));
  let amount=stake;
  return Array.from({length:days},(_,i)=>{const start=amount;const end=start*odds;amount=end;return{day:i+1,start,end};});
}
function renderRolloverRows(){
  const odds=Math.max(1,Number(document.querySelector("#rollover-odds")?.value||5));
  return rolloverRows().map(r=>`<div class="rollover-row"><span>DAY ${r.day}</span><span>${formatNaira(r.start)} × <b>${odds.toFixed(2)}</b></span><strong>${formatNaira(r.end)}</strong></div>`).join("");
}
function aiPanel(){
  return `<button class="ai-tab" id="open-ai" type="button" aria-label="Open SportyBet AI" title="Drag to move · Tap to open"><span class="ai-orbit" aria-hidden="true"><span class="ai-glyph">AI</span><i></i><i></i><i></i></span></button>
  <section class="ai-drawer ai-workspace" id="ai-drawer" aria-label="SportyBet AI workspace">
    <div class="ai-workspace-bar">
      <div class="ai-workspace-brand"><span class="ai-mini-orb">AI</span><div><b>SPORTYBET AI</b><small>AI Agent Workspace</small></div></div>
      <button id="close-ai" class="ai-close" type="button" aria-label="Close AI">×</button>
    </div>
    <div class="ai-chat" id="ai-chat">
      <div class="ai-welcome" id="ai-welcome">
        <div class="ai-welcome-orb">AI</div>
        <h2>What can I help with?</h2>
        <p>Ask about the current SportyBet feed, tickets, odds, agents, or analysis.</p>
        <div class="ai-prompt-grid">
          <button class="ai-prompt-card" data-q="Build a mixed-sport ticket from the strongest current SportyBet selections."><span>✦</span><strong>Build a ticket</strong><small>Find the strongest cross-sport selections</small></button>
          <button class="ai-prompt-card" id="show-plan"><span>⌁</span><strong>Make a plan</strong><small>Open a rollover plan in the center</small></button>
          <button class="ai-prompt-card" data-q="Explain the current ticket selection by selection."><span>◌</span><strong>Explain a ticket</strong><small>Show the reasoning behind each pick</small></button>
          <button class="ai-prompt-card" data-q="Show me where the agents disagree and why."><span>◈</span><strong>Agent debate</strong><small>See the strongest disagreements</small></button>
        </div>
        <div id="plan-card" class="plan-card">
          <div class="plan-card-head"><b>MAKE A PLAN</b><button id="close-plan" type="button" aria-label="Close plan">×</button></div>
          <div class="rollover-controls"><label>STARTING STAKE<input id="rollover-stake" type="number" value="1500" min="1" step="100"></label><label>DAYS<input id="rollover-days" type="number" value="5" min="1" max="30"></label><label>DAILY ODDS<input id="rollover-odds" type="number" value="5" min="1" step="0.01"></label></div>
          <div class="rollover-table" id="rollover-table">${renderRolloverRows()}</div>
          <small>Mathematical projection only; it does not guarantee betting results.</small>
        </div>
      </div>
    </div>
    <form id="ai-form" class="ai-form">
      <button class="ai-compose-add" type="button" aria-label="Open quick actions">+</button>
      <input id="ai-input" placeholder="Message SportyBet AI..." autocomplete="off">
      <button class="ai-compose-send" aria-label="Send message">↑</button>
    </form>
    <div class="ai-compose-hint">SportyBet source · Current dashboard context</div>
  </section>`
}
function bindAi(){
  const aiButton=document.querySelector("#open-ai");
  const aiDrawer=document.querySelector("#ai-drawer");
  aiButton?.addEventListener("click",()=>{
    if(aiButton.dataset.dragged==="true"){
      aiButton.dataset.dragged="false";
      return;
    }
    aiDrawer?.classList.add("open");document.body.classList.add("ai-open");
  });
  aiButton?.addEventListener("pointerdown",event=>{
    if(event.pointerType==="mouse"&&event.button!==0)return;
    const rect=aiButton.getBoundingClientRect();
    const startX=event.clientX;
    const startY=event.clientY;
    const offsetX=event.clientX-rect.left;
    const offsetY=event.clientY-rect.top;
    let moved=false;
    const move=moveEvent=>{
      const dx=moveEvent.clientX-startX;
      const dy=moveEvent.clientY-startY;
      if(!moved&&Math.hypot(dx,dy)<5)return;
      moved=true;
      const width=rect.width,height=rect.height;
      const maxLeft=Math.max(6,window.innerWidth-width-6);
      const maxTop=Math.max(6,window.innerHeight-height-6);
      const left=Math.min(maxLeft,Math.max(6,moveEvent.clientX-offsetX));
      const top=Math.min(maxTop,Math.max(6,moveEvent.clientY-offsetY));
      aiButton.style.left=`${left}px`;
      aiButton.style.top=`${top}px`;
      aiButton.style.right="auto";
      aiButton.style.bottom="auto";
      aiButton.dataset.dragged="true";
      try{localStorage.setItem("sportybet-ai-button-position",JSON.stringify({left,top}));}catch{}
    };
    const end=()=>{
      window.removeEventListener("pointermove",move);
      window.removeEventListener("pointerup",end);
      window.removeEventListener("pointercancel",end);
      aiButton.classList.remove("dragging");
    };
    window.addEventListener("pointermove",move,{passive:true});
    window.addEventListener("pointerup",end,{once:true});
    window.addEventListener("pointercancel",end,{once:true});
    aiButton.classList.add("dragging");
    event.preventDefault();
  });
  try{
    const saved=JSON.parse(localStorage.getItem("sportybet-ai-button-position")||"null");
    if(Number.isFinite(saved?.left)&&Number.isFinite(saved?.top)){
      const maxLeft=Math.max(6,window.innerWidth-aiButton.offsetWidth-6);
      const maxTop=Math.max(6,window.innerHeight-aiButton.offsetHeight-6);
      const left=Math.min(maxLeft,Math.max(6,saved.left));
      const top=Math.min(maxTop,Math.max(6,saved.top));
      aiButton.style.left=`${left}px`;
      aiButton.style.top=`${top}px`;
      aiButton.style.right="auto";
      aiButton.style.bottom="auto";
    }
  }catch{}
  document.querySelector("#close-ai")?.addEventListener("click",()=>{aiDrawer?.classList.remove("open");document.body.classList.remove("ai-open");});
  const welcome=document.querySelector("#ai-welcome");
  const openPrompt=q=>{if(welcome)welcome.classList.add("has-chat");const i=document.querySelector("#ai-input");if(i){i.value=q;i.focus()}};
  document.querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click",()=>openPrompt(b.dataset.q)));
  document.querySelector("#show-plan")?.addEventListener("click",()=>{if(welcome)welcome.classList.add("has-chat");document.querySelector("#plan-card")?.classList.add("visible")});
  document.querySelector("#close-plan")?.addEventListener("click",()=>document.querySelector("#plan-card")?.classList.remove("visible"));
  document.querySelectorAll("#rollover-stake,#rollover-days,#rollover-odds").forEach(i=>i.addEventListener("input",()=>{const t=document.querySelector("#rollover-table");if(t)t.innerHTML=renderRolloverRows()}));
  document.querySelector(".ai-compose-add")?.addEventListener("click",()=>{const i=document.querySelector("#ai-input");i?.focus()});
  document.querySelector("#ai-form")?.addEventListener("submit",e=>{e.preventDefault();const i=document.querySelector("#ai-input"),q=i.value.trim();if(!q)return;const welcomeNode=document.querySelector("#ai-welcome");if(welcomeNode)welcomeNode.classList.add("has-chat");const chat=document.querySelector("#ai-chat");chat.insertAdjacentHTML("beforeend",'<div class="ai-msg user-msg"><p>'+escapeHtml(q)+'</p></div><div class="ai-msg agent-msg"><b>SportyBet AI</b><p>'+escapeHtml(buildAiReply(state,q))+'</p></div>');i.value="";chat.scrollTop=chat.scrollHeight});
}
function render(){
  const fresh=requireFreshFeed(state.feed),agents=renderAgentStatus();
  const status=state.loading?"Syncing SportyBet…":state.feed.eventCount?"Verified normalized feed":"Awaiting verified SportyBet feed";
  const decisionText=state.feed.eventCount?(state.analysis.decision.noBet?"NO BET":"CANDIDATES READY"):"WAITING FOR VERIFIED DATA";
  const tickets=state.analysis.tickets??[],debateCount=state.analysis.debate?.length??0;
  document.querySelector("#app").innerHTML=`
<header class="topbar">
  <div class="brand">
    <div class="brand-mark" aria-label="SportyBet logo"><img src="https://s.sporty.net/global/main/modules/main/desktop/page503BR/images/SportyBet_Logo_Red_RGB.b5f14649ea.png" alt="SportyBet" /></div>
    <div class="brand-copy">
      <div class="eyebrow">SPORTS INTELLIGENCE</div>
      <h1>SPORTYBET <span>AI AGENT</span></h1>
    </div>
  </div>
  <div class="topbar-right"><div class="source"><i class="${fresh.fresh?"live":""}"></i> ${fresh.fresh?"VERIFIED SPORTYBET FEED":"SPORTYBET SOURCE REQUIRED"}</div><div class="account-chip"><span>${escapeHtml(authState.username??"USER")}</span><b>✓ VERIFIED</b>${authState.role==="admin"?`<em>ADMIN</em>`:""}<button id="logout" type="button">LOGOUT</button></div></div>
</header>
<main>
<section class="hero"><div><p class="label">AI BOARD</p><h2>SportyBet data. One clean analysis room.</h2><p class="muted">Live source data is normalized, enriched, challenged and passed through the agent pipeline before candidates are shown.</p></div><div class="scan-card"><div class="scan-title">DATA STATUS</div><strong>${status}</strong><span>${state.feed.eventCount} events · ${state.feed.marketCount} markets · ${fresh.fresh?"fresh":"no live feed loaded"}</span><button class="refresh" id="refresh-feed" ${state.loading?"disabled":""}>${state.loading?"SYNCING…":"REFRESH SPORTYBET"}</button><div class="sport-switch"><button class="active" type="button">AUTO · MULTI-SPORT</button><span class="sport-auto-note">Football · Basketball · Tennis · Volleyball · Table Tennis</span></div><div class="decision-line"><span>MARKET MODEL</span><b>${state.analysis.modelSummary?.pricedSelections??0} PRICED · ${state.analysis.modelSummary?.positiveValueSelections??0} POSITIVE VALUE</b></div><div class="decision-line"><span>ODDS MOVEMENT</span><b>${state.analysis.modelSummary?.movementTracked??0} TRACKED · ${state.analysis.modelSummary?.materialMovement??0} MATERIAL</b></div><div class="decision-line"><span>SOURCE HEALTH</span><b>${String(state.sourceHealth.status??"UNKNOWN").toUpperCase()}${(state.sourceHealth.parsedEvents??state.sourceHealth.parsedFootballEvents)?` · ${state.sourceHealth.parsedEvents??state.sourceHealth.parsedFootballEvents} EVENTS`:""}${state.sourceHealth.eventsWithMarkets?` · ${state.sourceHealth.eventsWithMarkets} WITH MARKETS`:""}${state.sourceHealth.pricedSelections?` · ${state.sourceHealth.pricedSelections} PRICED`:""}</b></div><div class="decision-line"><span>SPORT</span><b>${String(state.selectedSport).toUpperCase()}</b></div><div class="decision-line"><span>HEAD ANALYST</span><b>${decisionText}</b></div><div class="decision-line"><span>RISK CHALLENGES</span><b>${debateCount}</b></div><div class="decision-line"><span>RESULT SYNC</span><b>${state.lastResultSync??"NOT SYNCED"}</b></div><div class="decision-line"><span>LEARNING</span><b>${state.learning.settled}/${state.learning.totalPredictions} SETTLED</b></div><div class="decision-line"><span>HISTORY</span><b>${state.ledger.resultHistory?.length??0} SPORTYBET RESULTS</b></div><div class="decision-line"><span>FEEDBACK</span><b>${state.learning.agents?.length?`${state.learning.agents.filter(a=>a.settled>=5).length} AGENTS CALIBRATED`:"NO HISTORY"}</b></div>${state.detailFailures?`<em class="feed-error">${state.detailFailures} event detail page(s) could not be enriched; original verified event data retained.</em>`:""}${state.resultFailures?`<em class="feed-error">${state.resultFailures} result-source issue(s) occurred; unresolved predictions were left unsettled.</em>`:""}${state.error?`<em class="feed-error">${escapeHtml(state.error)}</em>`:""}</div></section>
<section><div class="section-head"><div><p class="label">AGENT BOARD</p><h3>Specialists</h3></div><span class="count">${state.analysis.reports.length} REPORTS · ${debateCount} CHALLENGES</span></div><div class="agents">${agents.map((a,i)=>`<article class="agent"><div class="agent-num">${String(i+1).padStart(2,"0")}</div><div><h4>${a.name}</h4><p>${a.focus}</p></div><div class="agent-state">${a.status}</div></article>`).join("")}</div></section>
<section><div class="section-head"><div><p class="label">TICKET ENGINE</p><h3>Top 10 candidates</h3></div><span class="count">UP TO 50 PICKS EACH</span></div><div class="tickets">${Array.from({length:10},(_,i)=>{const ticket=tickets[i];return`<article class="ticket"><span class="ticket-id">TICKET #${i+1}</span><h4>${ticket?Number(ticket.combinedOdds).toFixed(2):"—"} <small>COMBINED ODDS</small></h4><div class="ticket-meta"><span>${ticket?ticket.selectionCount:0} selections</span><span>${ticket?escapeHtml(ticket.strategyLabel??"Candidate"):"No approved candidate"}</span></div><button data-ticket-index="${i}" ${ticket?"":"disabled"}>${ticket?"VIEW TICKET":"UNAVAILABLE"}</button></article>`}).join("")}</div></section>
${renderSelectedTicket(state.selectedTicket)}
<section class="architecture"><div class="section-head"><div><p class="label">DECISION PIPELINE</p><h3>Evidence before selection</h3></div></div><div class="flow"><span>SportyBet</span><b>→</b><span>Normalize</span><b>→</b><span>Enrich</span><b>→</b><span>6 specialists</span><b>→</b><span>Risk challenge</span><b>→</b><span>Head Analyst</span><b>→</b><span>Tickets</span><b>→</b><span>Results</span><b>→</b><span>Learning</span></div></section>
</main>${aiPanel()}<footer>SportyBet AI Agent · v1.0 · Private account access · Uses SportyBet as the verified source. No fabricated odds, match IDs or booking codes.</footer>`;
  document.querySelector("#logout")?.addEventListener("click",logout);document.querySelector("#refresh-feed")?.addEventListener("click",loadFeed);bindTicketButtons();bindAi();bindSignup();
}

async function syncResults(){
  const pendingBeforeFetch=state.ledger.predictions.filter(p=>p.status!=="won"&&p.status!=="lost");
  if(!pendingBeforeFetch.length){
    state.lastResultSync="NO PENDING PREDICTIONS";
    return null;
  }
  const snapshot=await fetchSportyBetResultsApi();
  state.ledger=recordSportyBetResults(state.ledger,snapshot.results??[],snapshot.capturedAt??null);
  const pending=state.ledger.predictions.filter(p=>p.status!=="won"&&p.status!=="lost");const selectionResults=[];for(const prediction of pending){for(const selection of prediction.selections){const result=snapshot.results.find(r=>String(r.eventId)===String(selection.eventId));if(!result)continue;const settled=settleFootballSelection(result,{marketName:selection.marketName,selectionName:selection.selection});selectionResults.push({eventId:selection.eventId,marketId:selection.marketId,selectionId:selection.selectionId,result:settled,settlementSource:"SportyBet"});}}if(selectionResults.length)state.ledger=settlePendingFromSportyBetResults(state.ledger,selectionResults);state.learning=learningSummary(state.ledger);safeSaveLearning();state.lastResultSync=String(snapshot.resultCount)+" SportyBet results · "+String(state.ledger.resultHistory?.length??0)+" stored";return snapshot;}
async function loadFeed({preserveTicketId=null}={}){state.loading=true;state.error="";state.detailFailures=0;state.resultFailures=0;state.selectedTicket=preserveTicketId?state.selectedTicket:null;render();try{const snapshot=await fetchSportyBetMultiSportApi();
    const pricedSelections=(snapshot.events??[]).reduce((count,event)=>count+(event.markets??[]).reduce((n,market)=>n+(market.selections??[]).filter(selection=>Number.isFinite(Number(selection.odds))&&Number(selection.odds)>1).length,0),0);
    const eventsWithMarkets=(snapshot.events??[]).filter(event=>Array.isArray(event.markets)&&event.markets.length>0).length;
    state.sourceHealth={status:"ok",sport:"all",parsedEvents:snapshot.eventCount??snapshot.events?.length??0,parsedFootballEvents:(snapshot.events??[]).filter(e=>e.sport==="football").length,eventsWithMarkets,pricedSelections,checkedAt:snapshot.capturedAt??new Date().toISOString(),latencyMs:null};
    state.feed=normalizeSportyBetFeed(snapshot.events,{sourceUrl:snapshot.sourceUrl,capturedAt:snapshot.capturedAt});
    state.detailFailures=0;
    const oddsHistory=recordSportyBetOddsSnapshot(state.ledger.oddsHistory??{},state.feed.events,state.feed.capturedAt);state.ledger=recordSportyBetOddsHistory(state.ledger,oddsHistory);
    state.lastResultSync="MULTI-SPORT FEED · RESULT SETTLEMENT BY SPORT";
    const oddsMovementBySelection=buildOddsMovementBySelection(state.ledger.oddsHistory??{});const historicalEvidence=buildHistoricalEvidenceByEvent(state.feed.events,state.ledger.resultHistory??[]);const evidenceByEvent=Object.fromEntries(Object.entries(historicalEvidence).map(([eventId,historical])=>[eventId,{__historical:historical}]));state.analysis=analyzeSportyBetFeed(state.feed,{evidenceByEvent,agentPerformance:state.ledger.performance,oddsMovementBySelection});state.ledger=registerTickets(state.ledger,state.analysis.tickets??[]);if(preserveTicketId){const replacement=state.analysis.tickets?.find(t=>t.ticketId===preserveTicketId);state.selectedTicket=replacement??state.selectedTicket;}safeSaveLearning();}catch(error){state.feed=normalizeSportyBetFeed([]);state.analysis=analyzeSportyBetFeed(state.feed,{agentPerformance:state.ledger.performance});state.error=error instanceof Error?error.message:"SportyBet multi-sport feed could not be loaded";}finally{state.loading=false;render();}}
async function bootstrap(){
  // Render something immediately. Never leave the user staring at a blank page
  // while the authentication endpoint is being reached.
  try{
    renderLogin();
  }catch(error){
    const app=document.querySelector("#app");
    if(app){
      const message=error instanceof Error?error.message:"Unknown startup error";
      app.innerHTML="<main style=\"min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Arial,sans-serif;background:#f4f5f7\"><section style=\"max-width:520px;background:#fff;border:1px solid #ddd;border-top:4px solid #e30613;border-radius:8px;padding:24px\"><h2 style=\"margin:0 0 10px\">SPORTYBET AI AGENT</h2><p style=\"color:#666;line-height:1.5\">The application started, but the login screen could not be rendered.</p><small>"+escapeHtml(message)+"</small></section></main>";
    }
    return;
  }

  try{
    await checkSession();
    if(!authState.authenticated){
      renderLogin();
      return;
    }
    render();
    await loadFeed();
  }catch(error){
    authState={status:"error",authenticated:false,username:null,role:null,error:error instanceof Error?error.message:"Application startup failed"};
    renderLogin();
  }
}

let authState={status:"checking",authenticated:false,username:null,role:null,error:""};
function renderLogin(){
  document.querySelector("#app").innerHTML=`<div class="auth-shell">
    <div class="auth-card">
      <p class="label">PRIVATE ACCESS</p><h1>SPORTYBET <span>AI AGENT</span></h1>
      <p>Sign in with your cloud-verified account to use the AI.</p>
      <form id="login-form" class="auth-form">
        <label>USERNAME<input id="login-username" autocomplete="username" required></label>
        <label>PASSWORD<input id="login-password" type="password" autocomplete="current-password" required></label>
        <button type="submit">LOGIN</button>
      </form>
      <div id="login-error" class="auth-error">${escapeHtml(authState.error||"")}</div>
      <div class="signup-cta"><span>New user?</span><button id="open-signup" type="button">SIGN UP AI AGENT</button></div>
      <small>Passwords are entered only in the secure signup/login form. Do not send passwords in the AI chat.</small>
    </div>
  </div>${signupPanel()}`;
  bindSignup();
  document.querySelector("#login-form")?.addEventListener("submit",async e=>{
    e.preventDefault();authState.error="";
    const username=document.querySelector("#login-username").value.trim(),password=document.querySelector("#login-password").value;
    const button=e.currentTarget.querySelector("button");button.disabled=true;button.textContent="VERIFYING…";
    try{
      const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||"Login failed");
      authState={status:"authenticated",authenticated:true,username:payload.username,role:payload.role,error:""};
      render();await loadFeed();
    }catch(error){authState.error=error instanceof Error?error.message:"Login failed";document.querySelector("#login-error").textContent=authState.error;button.disabled=false;button.textContent="LOGIN";}
  });
}
async function checkSession(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetch("/api/auth/me",{headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal});
    const payload=await response.json().catch(()=>({}));
    authState=payload.authenticated
      ? {status:"authenticated",authenticated:true,username:payload.username,role:payload.role,error:""}
      : {status:"signed-out",authenticated:false,username:null,role:null,error:""};
  }catch(error){
    authState={
      status:"unavailable",
      authenticated:false,
      username:null,
      role:null,
      error:error?.name==="AbortError"?"Authentication check timed out.":"Authentication service unavailable"
    };
  }finally{
    clearTimeout(timer);
  }
}
async function logout(){
  try{await fetch("/api/auth/logout",{method:"POST"});}catch{}
  authState={status:"signed-out",authenticated:false,username:null,role:null,error:""};
  state.feed=emptyFeed;state.analysis=analyzeSportyBetFeed(emptyFeed,{agentPerformance:state.ledger.performance});state.selectedTicket=null;renderLogin();
}
function signupPanel(){
  return `<aside class="signup-drawer" id="signup-drawer">
    <div class="signup-head"><div><p class="label">SIGN UP AI AGENT</p><h3>Cloud enrollment</h3></div><button id="close-signup" class="ai-close" type="button">×</button></div>
    <div class="signup-chat" id="signup-chat"><div class="ai-msg agent-msg"><b>Sign-up Agent</b><p>Choose a username. I will check the cloud registry first. Your password stays inside this secure form.</p></div></div>
    <form id="signup-form" class="signup-form">
      <label>USERNAME<input id="signup-username" maxlength="24" autocomplete="username" placeholder="your_username" required></label>
      <button id="check-username" type="button" class="secondary">CHECK AVAILABILITY</button>
      <div id="username-status" class="signup-status"></div>
      <label>PASSWORD<input id="signup-password" type="password" minlength="10" maxlength="128" autocomplete="new-password" placeholder="At least 10 characters" required></label>
      <label>CONFIRM PASSWORD<input id="signup-confirm" type="password" minlength="10" maxlength="128" autocomplete="new-password" required></label>
      <button id="create-account" type="submit">CREATE CLOUD ACCOUNT</button>
      <small>New accounts are created as USER accounts. The AI never receives or displays your password.</small>
    </form>
  </aside>`;
}
function bindSignup(){
  document.querySelector("#open-signup")?.addEventListener("click",()=>document.querySelector("#signup-drawer")?.classList.add("open"));
  document.querySelector("#close-signup")?.addEventListener("click",()=>document.querySelector("#signup-drawer")?.classList.remove("open"));
  const usernameInput=document.querySelector("#signup-username"),status=document.querySelector("#username-status");
  document.querySelector("#check-username")?.addEventListener("click",async()=>{
    const username=usernameInput.value.trim().toLowerCase();status.textContent="Checking cloud…";
    try{
      const r=await fetch("/api/auth/availability?username="+encodeURIComponent(username),{cache:"no-store"});const p=await r.json().catch(()=>({}));
      status.textContent=p.available?"✓ Username available":(p.error||"✕ Username unavailable");status.className="signup-status "+(p.available?"available":"taken");usernameInput.dataset.available=p.available?"true":"false";
    }catch{status.textContent="Cloud availability check failed";status.className="signup-status taken";usernameInput.dataset.available="false";}
  });
  document.querySelector("#signup-form")?.addEventListener("submit",async e=>{
    e.preventDefault();const username=usernameInput.value.trim().toLowerCase(),password=document.querySelector("#signup-password").value,confirm=document.querySelector("#signup-confirm").value,create=e.currentTarget.querySelector("#create-account");
    if(password!==confirm){status.textContent="Passwords do not match";status.className="signup-status taken";return;}
    create.disabled=true;create.textContent="CREATING…";status.textContent="Provisioning cloud account…";status.className="signup-status";
    try{
      const r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});const p=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(p.error||"Cloud signup failed");
      status.textContent="✓ Account created. You can log in now.";status.className="signup-status available";
      document.querySelector("#login-username").value=username;document.querySelector("#signup-drawer").classList.remove("open");
      document.querySelector("#login-password").focus();
    }catch(error){status.textContent=error instanceof Error?error.message:"Cloud signup failed";status.className="signup-status taken";create.disabled=false;create.textContent="CREATE CLOUD ACCOUNT";}
  });
}

bootstrap();
