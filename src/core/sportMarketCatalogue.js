export const SPORT_MARKET_FAMILIES=Object.freeze({
football:["1X2","Double Chance","Double Chance - 1UP","Draw No Bet","Over/Under","Over/Under - Early Goals","Both Teams To Score","Teams to Score","Handicap","Asian Handicap","1st Goal","Winning Margin","Exact Goals","Goal Range","Correct Score","Smart Combo","Odd/Even"],
tennis:["Match Winner","Set Winner","Game Handicap","Set Handicap","Total Games","Player Total Games","Correct Score"],
basketball:["Match Winner","Point Handicap","Total Points","Team Total Points","Quarter Winner","Quarter Total Points","Half Winner","Half Total Points"],
volleyball:["Match Winner","Set Handicap","Total Sets","Set Winner","Total Points"],
handball:["Match Winner","Goal Handicap","Total Goals","Team Total Goals","Half Winner","Half Total Goals"],
baseball:["Moneyline","Run Handicap","Total Runs","Team Total Runs","Inning Winner"],
ice_hockey:["Match Winner","Puck Handicap","Total Goals","Period Winner","Period Total Goals"]
});
export function marketFamiliesForSport(sport=""){return SPORT_MARKET_FAMILIES[String(sport).toLowerCase()]??[];}
export function classifySportMarket(sport,name=""){const n=name.toLowerCase();if(n.includes("winner")||n==="1x2")return"winner";if(n.includes("handicap"))return"handicap";if(n.includes("total")||n.includes("over/under"))return"totals";if(n.includes("correct score"))return"score";if(n.includes("combo"))return"combo";if(n.includes("goal"))return"goals";return"other";}
