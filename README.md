# SportyBet AI Agent

Autonomous multi-agent sports analysis dashboard focused on SportyBet.

## Current build

- SportyBet source boundary for verified Nigeria HTTPS pages, including the official lite host.
- Public SportyBet football event-row parser aligned to the current `time + ID → teams → 1X2 odds` layout.
- SportyBet event-detail URL construction from verified event IDs.
- Event-detail market parsing for observed football markets including Exact Goals, Goal Range, Teams to Score, Smart Combo, Correct Score and Precanned BetBuilder.
- Sport-specific market catalogue and evidence rules.
- Feed validation and freshness gates; empty feeds are never considered live.
- Verified web-source snapshot loader with source URL and capture metadata.
- Dashboard refresh control that requests a verified SportyBet snapshot and then attempts event-detail enrichment for up to 20 football events.
- Six specialist analysis passes plus a Head Analyst decision layer.
- Predictive-evidence gate: market existence alone cannot approve a selection.
- Risk/Contrarian challenge round with severity and Head Analyst veto for high-severity challenges.
- Feed-level report aggregation and candidate scoring.
- Maximum 10 candidate tickets and 50 selections per ticket.
- Diversified ticket portfolio profiles with different selection counts and context mix.
- Functional ticket detail viewer exposing exact event IDs, market IDs, selections and current odds from the verified feed.
- Ticket construction is blocked unless candidates have sufficient predictive evidence and data quality.
- Prediction records retain agent attribution, challenge context, sport, market, odds range and confidence band.
- Persistent browser learning ledger with deduplication across feed refreshes.
- Agent performance summaries by sport, sport-market context, odds range and confidence band, plus Risk challenge vindication/false-positive counts.
- Conservative historical feedback: only contexts with at least five settled outcomes can adjust a future specialist confidence, with small sample sizes shrunk toward neutral.
- Fresh-feed ticket revalidation and odds-change detection.
- Official SportyBet Results ingestion for football settlement, including event IDs and final scores.
- Prediction settlement, error classification and learning summary.
- Parser, feed, analysis, debate and learning regression fixtures via `npm run test:core`.

## Integrity

Live data must come from verified SportyBet data. Never invent event IDs, market IDs, selection IDs, odds, results or booking codes. A missing, stale or unparseable source remains unavailable.

The Head Analyst requires multiple predictive-agent signals and sufficient data quality. A market appearing on SportyBet is not itself evidence that the selection should be recommended.

Risk is intentionally separated from predictive support. Its job is to challenge selections, not increase their predictive agreement.

Event-detail enrichment is best-effort and fail-closed per event: if a detail page cannot be fetched or parsed, the original verified event remains, and the failure is surfaced to the dashboard.

The learning ledger stores predictions locally in the browser. It is updated only from explicit settlement results supplied to the settlement layer; it does not manufacture wins, losses or historical performance.

The current implementation is source-backed for football ingestion. It does not claim that the public page exposes every internal SportyBet identifier needed for external booking-code generation.

## Pipeline

SportyBet → public source → parser → normalized feed → event-detail enrichment → market analysis → specialist agents → Risk challenge → Head Analyst → candidate tickets → fresh-data revalidation → official SportyBet Results → result settlement → agent learning memory.

## Development

npm install
npm run test:core
npm run build
npm run dev
