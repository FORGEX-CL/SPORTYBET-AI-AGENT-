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
- Same-origin production API routes for SportyBet football ingestion and Results ingestion, avoiding direct browser-to-SportyBet requests.
- Production SportyBet source health endpoint.
- Server ingestion uses bounded five-request concurrency for event-detail enrichment and 15-second source-request timeouts.
- Dashboard refresh control that requests a verified SportyBet snapshot and then attempts event-detail enrichment for up to 20 football events.
- Sport-aware SportyBet ingestion now includes a Basketball source route and compact Football/Basketball dashboard switch. Basketball currently parses verified Points totals with canonical SportyBet detail IDs and feeds the same specialist/debate pipeline.
- SportyBet health is sport-aware and reports parsed events, market coverage, priced selections, canonical detail-ID coverage, and source-contract status.

- Six specialist analysis passes plus a Head Analyst decision layer (7-agent architecture).
- Predictive-evidence gate: market existence alone cannot approve a selection.
- Risk/Contrarian challenge round with severity and Head Analyst veto for high-severity challenges.
- Feed-level report aggregation and candidate scoring.
- Maximum 10 candidate tickets and 50 selections per ticket.
- Diversified ticket portfolio profiles with different selection counts and context mix.
- Functional ticket detail viewer exposing exact event IDs, market IDs, selections and current odds from the verified feed.
- Ticket-to-feed revalidation showing validated, odds-changed, unavailable, missing-event and stale-feed states, including recalculated combined odds when all selections remain available.
- One-tap manual ticket copy payload containing SportyBet event IDs, market names, selections, odds and the original combined odds; no booking code is fabricated.
- Ticket construction is blocked unless candidates have sufficient predictive evidence and data quality.
- Prediction records retain agent attribution, challenge context, sport, market, odds range and confidence band.
- Persistent browser learning ledger with deduplication across feed refreshes.
- Agent performance summaries by sport, sport-market context, odds range and confidence band, plus Risk challenge vindication/false-positive counts.
- Conservative learning: only contexts with at least five settled outcomes can adjust future specialist confidence; each agent now records its own forecast calibration using Brier score, log loss and calibration gap, with small samples shrunk toward neutral.
- Fresh-feed ticket revalidation and odds-change detection.
- Official SportyBet Results ingestion for football settlement, including event IDs and final scores.
- Prediction settlement, error classification and learning summary.
- Parser, feed, analysis, debate and learning regression fixtures via `npm run test:core`.
- Ticket-aware AI Agent Room with specialist-agent, Head Analyst and selection-level regression fixtures.
- Core Verification GitHub Action runs the fixture suite and production build on pushes to `main` and pull requests.

## Integrity

Live data must come from verified SportyBet data. Never invent event IDs, market IDs, selection IDs, odds, results or booking codes. A missing, stale or unparseable source remains unavailable.

The Head Analyst requires multiple predictive-agent signals and sufficient data quality. A market appearing on SportyBet is not itself evidence that the selection should be recommended.

Risk is intentionally separated from predictive support. Its job is to challenge selections, not increase their predictive agreement.

Event-detail enrichment is best-effort and fail-closed per event: if a detail page cannot be fetched or parsed, the original verified event remains, and the failure is surfaced to the dashboard.

The learning ledger stores predictions locally in the browser. It is updated only from explicit settlement results supplied to the settlement layer; it does not manufacture wins, losses or historical performance.

The current implementation is source-backed for football ingestion and now has a source-backed basketball feed boundary for analysis. Basketball result settlement remains fail-closed until deterministic settlement rules are implemented. It does not claim that the public page exposes every internal SportyBet identifier needed for external booking-code generation.

## Pipeline

SportyBet → public source → parser → normalized feed → event-detail enrichment → market analysis → specialist agents → Risk challenge → Head Analyst → candidate tickets → fresh-data revalidation → official SportyBet Results → result settlement → agent learning memory.

## Development

npm install
npm run test:core
npm run build
npm run dev

- Canonical event identity: the parser keeps SportyBet's `sr:match:*` detail-link ID as the primary event key and preserves the displayed SportyBet event ID separately.
- Current football market parsing includes observed combination, Multigoals, Multiscores, clean-sheet, Smart Combo, Correct Score, handicap, totals and player/BetBuilder families from SportyBet event pages.
- Transparent SportyBet market-consensus model (`sportybet-market-implied-v1`) for normalized probabilities, cross-market consistency and expected-value proxy.
- Specialist agents now consume verified SportyBet market signals by default rather than empty confidence placeholders.
- Football result settlement now covers 1X2, Double Chance, Draw No Bet, handicap, Asian handicap, totals, GG/NG, exact goals, goal ranges, goal bounds, winning margin, odd/even, correct score and half-time/full-time where the published result contains the required information.
- Void legs in accumulators are now handled as void/push outcomes; a void leg plus winning remaining legs can settle as a ticket win.
- SportyBet result history is persisted locally and reused as historical evidence for the Statistics and Football specialists.
- Historical evidence includes recent form, home/away splits, goals scored/conceded, clean-sheet rate, both-teams-to-score rate and over-2.5 rate when enough verified SportyBet results have been accumulated. The football probability engine now uses a smoothed Poisson score model (sportybet-historical-poisson-v2) and derives 1X2, BTTS and totals probabilities from the same score distribution.
- The first installation starts with no historical sample; the system does not invent missing form or statistics.
- Verified football event enrichment now supports up to 50 event detail pages per feed run.
## Agent intelligence hardening

The analysis layer now separates SportyBet market-derived consensus from independent historical evidence. A football smoothed Poisson historical model (sportybet-historical-poisson-v2) is built only from stored, settled SportyBet results and is withheld when the available team sample is too small. The Odds Agent can blend that model with SportyBet market pricing, while preserving provenance. Model arbitration is calibration-weighted, and the Head Analyst retains per-agent forecast attribution for future learning.

The Head Analyst now requires at least one independent evidence source before approving a selection. Agent arbitration weights historical calibration, data quality and evidence provenance rather than treating all specialist confidence as equally reliable. Market-only confidence cannot approve a bet. Historical-model provenance, model confidence, data quality, challenge penalties, and SportyBet market consensus remain visible to the decision layer.

The Risk Agent now applies market-aware failure-mode analysis for early-goals, 1UP, Correct Score, player, combination/Bet Builder and live markets, plus overround, market-depth, cross-market disagreement and model/price divergence checks. The observed football catalogue is aligned with currently exposed SportyBet markets such as Home O/U, Away O/U, 1st Half O/U, Corners O/U, 1X2 - Never Down, GG/NG, and goal-streak markets. SportyBet remains the source of truth for event IDs, markets, selections, and odds.

## Verification

GitHub Actions runs `npm run test:core` and `npm run build` on pushes to `main` and on pull requests. Local execution has not been represented as passing unless the commands actually run successfully.

\n- Rolling model-drift detection compares recent versus baseline Brier/log-loss performance and downweights agents whose recent forecasting quality deteriorates.\n- Settlement coverage is a hard approval gate: complex or unsupported SportyBet markets can be displayed/analyzed, but they are not eligible for automatically learned tickets until deterministic settlement rules exist.\n- Three-way Handicap and Asian Handicap settlement are modeled separately; quarter-line Asian Handicap remains fail-closed until half-win/half-loss settlement is implemented.\n\n### Platinum intelligence layer

- Platinum ensemble (`sportybet-platinum-ensemble-v1`) combines SportyBet market consensus with independent model evidence, then stress-tests probability toward market consensus and neutral probability before calculating robust value.
- Win, push and loss probabilities are kept separate where the market supports a push state; expected value uses settlement-aware profit math instead of binary-only probability.
- Football historical Poisson score distributions are computed once per event and reused across that event's markets and selections, reducing repeated numerical work as market depth grows.
- Head Analyst arbitration is weighted by agent historical calibration, data quality and evidence provenance; each predictive agent retains its own forecast for later learning.
- Debate now runs as challenge → rebuttal → resolution, with unresolved high-severity risk blocking approval.
- Ticket construction applies pairwise dependency penalties and records portfolio correlation, preventing raw confidence from being the only ticket objective.
- Historical evidence has a temporal leakage guard: results after the analyzed event start time are excluded.
- CI verification runs the full fixture suite and production build on GitHub Actions.

- Bounded SportyBet odds-history snapshots retain recent price movement per event/market/selection and expose shortening, drift and volatility without treating movement as proof.
- Leakage-safe walk-forward backtesting replays the historical Poisson model against stored SportyBet results using only pre-kickoff information and reports Brier score, log loss, win rate and expected-value diagnostics.
- Recent agent drift is compared with baseline forecasting quality; degrading agents are downweighted and penalized by the Head Analyst.
- DNB and total markets use settlement-aware win/push/loss probability semantics where applicable.

## Private account access

- The dashboard is protected by a username/password login before any SportyBet data endpoint is available.
- Passwords are never stored in plaintext; the server verifies salted scrypt password hashes from the AUTH_USERS_JSON deployment secret.
- Sessions use signed, HttpOnly, Secure, SameSite cookies with an 8-hour lifetime.
- Usernames are normalized and must be unique within the configured AUTH_USERS_JSON registry.
- Never commit usernames/passwords, password hashes, session secrets, or .env files to GitHub. GitHub stores the application code; cloud deployment secrets or the future user database stores authentication data. Never share account credentials with another person.
- Provision an account by generating a hash with `npm run auth:hash`, then placing the generated username/hash pair in AUTH_USERS_JSON and setting SPORTYBET_AUTH_SECRET in the deployment environment.
- There is no public signup flow. Only an administrator can authorize an account.
- Accounts use `role: "admin"` for administrators and `role: "user"` for approved users; the session and admin APIs enforce that distinction.
- The login page intentionally has no password-recovery shortcut that would expose credentials; account provisioning remains an operator-controlled deployment step.

## Cloud Sign-up AI Agent

- The **SIGN UP AI** bar provides self-service account enrollment without requiring the administrator to be online.
- The agent checks username availability against the cloud registry and then provisions a new user account automatically.
- Passwords are submitted through the secure enrollment form, never through the AI chat, never returned by the API, and never stored in GitHub.
- Supabase Auth stores the credential securely; `public.app_users` stores only the unique username, role, active state and timestamps.
- New self-service accounts are always created with role `user`. Administrator accounts must be provisioned separately.
- Cloud provisioning requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and the existing `SPORTYBET_AUTH_SECRET` deployment secrets.
- The Supabase secret key is server-only and must never be exposed in browser code or committed to GitHub.
- Username availability and signup endpoints include basic rate limiting and reject reserved administrator/system usernames.
