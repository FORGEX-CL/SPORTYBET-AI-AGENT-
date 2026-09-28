import "./styles.css";

const agents = [
  ["01","Statistics","Form, historical performance and sport-specific statistics"],
  ["02","Football Specialist","Football-specific match and market analysis"],
  ["03","Multi-Sport Specialist","Basketball, tennis, table tennis and other sports"],
  ["04","SportyBet Market Intelligence","Maps SportyBet's available market catalogue"],
  ["05","Odds & Value","Compares current odds with modelled probability"],
  ["06","Risk / Contrarian","Challenges selections and searches for failure cases"],
  ["07","Head Analyst","Runs the final debate and constructs candidate tickets"]
];

const tickets = [
  { id: 1, selections: 0, odds: "—", status: "Waiting for live SportyBet data" },
  { id: 2, selections: 0, odds: "—", status: "Waiting for live SportyBet data" },
  { id: 3, selections: 0, odds: "—", status: "Waiting for live SportyBet data" }
];

document.querySelector("#app").innerHTML = `
  <header class="topbar">
    <div>
      <div class="eyebrow">AUTONOMOUS SPORTS ANALYSIS</div>
      <h1>SPORTYBET <span>AI AGENT</span></h1>
    </div>
    <div class="source"><i></i> SportyBet data layer</div>
  </header>

  <main>
    <section class="hero">
      <div>
        <p class="label">AI BOARD</p>
        <h2>Seven specialists. One analysis room.</h2>
        <p class="muted">The system is designed to scan SportyBet markets, debate selections, construct up to 10 candidate tickets, and learn from settled results.</p>
      </div>
      <div class="scan-card">
        <div class="scan-title">DATA STATUS</div>
        <strong>Not connected yet</strong>
        <span>Live ingestion is intentionally isolated until the SportyBet data interface is verified.</span>
      </div>
    </section>

    <section>
      <div class="section-head"><div><p class="label">AGENT BOARD</p><h3>Specialists</h3></div><span class="count">7 AGENTS</span></div>
      <div class="agents">
        ${agents.map(([n,name,desc]) => `
          <article class="agent">
            <div class="agent-num">${n}</div>
            <div><h4>${name}</h4><p>${desc}</p></div>
            <div class="agent-state">IDLE</div>
          </article>`).join("")}
      </div>
    </section>

    <section>
      <div class="section-head"><div><p class="label">TICKET ENGINE</p><h3>Top ticket candidates</h3></div><span class="count">MAX 50 SELECTIONS / TICKET</span></div>
      <div class="tickets">
        ${tickets.map(t => `
          <article class="ticket">
            <div><span class="ticket-id">TICKET #${t.id}</span><h4>${t.odds} <small>COMBINED ODDS</small></h4></div>
            <div class="ticket-meta"><span>${t.selections} selections</span><span>${t.status}</span></div>
            <button disabled>VIEW TICKET</button>
          </article>`).join("")}
      </div>
    </section>

    <section class="architecture">
      <div class="section-head"><div><p class="label">PIPELINE</p><h3>How the system will work</h3></div></div>
      <div class="flow">
        <span>SportyBet</span><b>→</b><span>Market Intelligence</span><b>→</b><span>6 specialist analyses</span><b>→</b><span>Head Analyst</span><b>→</b><span>Top 10 tickets</span><b>→</b><span>Result learning</span>
      </div>
    </section>
  </main>

  <footer>SportyBet AI Agent · v0.1 · No fabricated odds, match IDs or booking codes.</footer>
`;