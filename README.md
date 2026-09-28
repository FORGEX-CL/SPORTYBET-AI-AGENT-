# SportyBet AI Agent

Autonomous multi-agent sports analysis dashboard focused on SportyBet.

## Current build

- SportyBet source boundary for verified Nigeria HTTPS pages, including the official lite host.
- Public SportyBet football event-row parser aligned to the current `time + ID → teams → 1X2 odds` layout.
- SportyBet market-block parsing for observed football and selected multi-sport market families.
- Sport-specific market catalogue and evidence rules.
- Feed validation and freshness gates; empty feeds are never considered live.
- Verified web-source snapshot loader with source URL and capture metadata.
- Dashboard refresh control for requesting a verified SportyBet snapshot.
- Seven-agent runtime, specialist reports, debate state and Head Analyst filtering.
- Cross-market candidate scoring and ticket construction.
- Maximum 10 candidate tickets and 50 selections per ticket.
- Fresh-feed ticket revalidation and odds-change detection.
- Prediction settlement, error classification and learning summary.
- Parser and feed-pipeline regression fixtures via `npm run test:core`.

## Integrity

Live data must come from verified SportyBet data. Never invent event IDs, market IDs, selection IDs, odds, results or booking codes. A missing, stale or unparseable source remains unavailable.

The browser refresh path is deliberately fail-closed: if SportyBet returns a page that cannot be parsed, the dashboard keeps the feed unavailable instead of displaying fabricated data.

## Pipeline

SportyBet → public source → parser → normalized feed → market analysis → specialist agents → debate → Head Analyst → candidate tickets → fresh-data revalidation → results → learning.

## Development

npm install
npm run test:core
npm run build
npm run dev
