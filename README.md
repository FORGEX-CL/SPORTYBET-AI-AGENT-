# SportyBet AI Agent

Autonomous multi-agent sports analysis dashboard focused on SportyBet.

## Current build

- SportyBet source boundary and normalized event/market/selection models.
- Verified-source football parsing and multi-market parsing.
- Feed validation and freshness gates.
- Seven-agent runtime, specialist reports, debate state and Head Analyst filtering.
- Cross-market candidate scoring and ticket construction.
- Maximum 10 candidate tickets and 50 selections per ticket.
- Fresh-feed ticket revalidation and odds-change detection.
- Prediction settlement, error classification and learning summary.
- Core executable fixture suite via `npm run test:core`.

## Integrity

Live data must come from verified SportyBet data. Never invent event IDs, market IDs, selection IDs, odds, results or booking codes. A missing or stale source field remains unavailable.

## Pipeline

SportyBet → parser → normalized feed → markets → specialist agents → debate → Head Analyst → candidate tickets → fresh-data revalidation → results → learning.

## Development

npm install
npm run test:core
npm run build
npm run dev
