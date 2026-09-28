export const SPORTYBET_SOURCE="https://www.sportybet.com/";
export function createSportyBetAdapter({fetcher=fetch}={}){return{source:SPORTYBET_SOURCE,async get(url){if(!url.startsWith(SPORTYBET_SOURCE))throw new Error("Only SportyBet URLs are allowed");const r=await fetcher(url);if(!r.ok)throw new Error(`SportyBet request failed: ${r.status}`);return r;}};}
// Deliberately no guessed API endpoint. The parser will be added only after the live SportyBet transport/schema is verified.
