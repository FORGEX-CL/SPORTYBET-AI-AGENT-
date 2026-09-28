# SportyBet AI Agent

Autonomous multi-agent sports analysis platform focused on SportyBet.

## Product direction

- 7 specialized AI roles: statistics, football, multi-sport, SportyBet market intelligence, odds/value, risk/contrarian, and head analyst.
- SportyBet is the intended primary source for event, market, selection and odds data.
- The system will generate up to 10 candidate tickets.
- Each ticket can contain up to 50 selections, subject to SportyBet's current rules.
- Each selection will retain the SportyBet event/match identifier, market, selection and observed odds.
- Combined odds are calculated from the current captured selections and must be revalidated when data changes.
- Every selection and ticket is stored for post-match evaluation.
- Agent performance is measured over time so mistakes become structured feedback.
- The platform does not fabricate booking codes. If SportyBet exposes a legitimate supported mechanism for booking-code creation, it can be integrated; otherwise the UI provides the exact selections needed to recreate the betslip on SportyBet.

## Data-source rule

Do not replace SportyBet market/odds data with invented live data. The ingestion layer must be verified against SportyBet before production use.

## Run locally

```bash
npm install
npm run dev
```

## Current status

Phase 1: dashboard and system architecture scaffold.
Next: verified SportyBet ingestion adapter, normalized event/market schema, agent orchestration, ticket engine, and result-learning pipeline.
