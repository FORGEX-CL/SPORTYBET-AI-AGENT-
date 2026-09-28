# SportyBet AI Agent

Autonomous multi-agent sports analysis dashboard focused on SportyBet.

## Current build

The repository now contains:
- SportyBet source boundary and tolerant event parser.
- Normalized events, markets and selections.
- SportyBet market-family classification.
- Seven-agent runtime contracts.
- Specialist report contracts for statistics, football, multi-sport, market intelligence, odds/value and risk.
- Head Analyst decision and debate state.
- Selection scoring using confidence, value, risk, data quality and agreement.
- Candidate ticket construction with a maximum of 10 tickets and 50 selections per ticket.
- Prediction settlement and error classification.

## Integrity rules

Live event data, market data and odds must originate from verified SportyBet data. The system does not invent event IDs, odds, selections or booking codes. A missing or stale source record must be treated as unavailable.

The analysis layer separates **observed facts** from **model inputs**. An odds price alone is not treated as proof that a selection has value.

## Pipeline

SportyBet → parser → normalized markets → specialist agents → debate → Head Analyst → candidate tickets → revalidation → results → learning.

## Development

npm install
npm run dev
npm run build
