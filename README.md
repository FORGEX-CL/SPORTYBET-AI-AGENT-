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
- Six specialist analysis passes plus the Head Analyst decision layer.
- Predictive-evidence gate: market existence alone cannot approve a selection.
- Feed-level report aggregation and candidate scoring.
- Maximum 10 candidate tickets and 50 selections per ticket.
- Ticket construction is blocked unless candidates have sufficient predictive evidence and data quality.
- Fresh-feed ticket revalidation and odds-change detection.
- Prediction settlement, error classification and learning summary.
- Parser, feed, feed-analysis and event-detail regression fixtures via `npm run test:core`.

## Integrity

Live data must come from verified SportyBet data. Never invent event IDs, market IDs, selection IDs, odds, results or booking codes. A missing, stale or unparseable source remains unavailable.

The Head Analyst requires multiple predictive-agent signals and sufficient data quality. A market appearing on SportyBet is not itself evidence that the selection should be recommended.

Event-detail enrichment is best-effort and fail-closed per event: if a detail page cannot be fetched or parsed, the original verified event remains, and the failure is surfaced to the dashboard.

The current implementation is source-backed for football ingestion. It does not claim that the public page exposes every internal SportyBet identifier needed for external booking-code generation.

## Pipeline

SportyBet → public source → parser → normalized feed → event-detail enrichment → market analysis → specialist agents → internal challenge state → Head Analyst → candidate tickets → fresh-data revalidation → results → learning.

## Development

npm install
npm run test:core
npm run build
npm run dev
