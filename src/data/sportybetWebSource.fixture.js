import { buildSportyBetEventDetailUrl } from "./sportybetWebSource.js";
const url=buildSportyBetEventDetailUrl("12345678");
if(!url.includes("eventId=sr%3Amatch%3A12345678"))throw new Error("SportyBet detail URL fixture failed");
console.log("SportyBet web-source fixture passed");
