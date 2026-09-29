import { settlementSupport } from "./settlementCatalogue.js";

if(settlementSupport("1X2").status!=="supported")throw new Error("1X2 should be settlement-supported");
if(settlementSupport("Over/Under").status!=="supported")throw new Error("Totals should be settlement-supported");
if(settlementSupport("Over/Under - Early Goals").status==="supported")throw new Error("Early Goals should not be treated as deterministic yet");
if(settlementSupport("Mystery Market").status!=="unsupported")throw new Error("Unknown market should be unsupported");
console.log("settlementCatalogue fixture: ok");
