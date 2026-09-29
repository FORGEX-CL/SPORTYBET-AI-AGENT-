const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
export const SPORT_RULES=Object.freeze({
 football:{minEvidence:2,preferred:["1X2","Double Chance","Over/Under","Over/Under - Early Goals","Handicap","Asian Handicap"],avoid:["Correct Score"],note:"Use team form, home/away and goal evidence before market selection."},
 tennis:{minEvidence:2,preferred:["Winner","1st set - winner","Set handicap","Game handicap","Total games","Player total games","to win a set"],avoid:["Correct Score"],note:"Separate match, set and game-level evidence; do not treat set/game lines as interchangeable."},
 basketball:{minEvidence:2,preferred:["Match Winner","Point Handicap","Total Points"],avoid:[],note:"Use pace, scoring and period context when available."},
 volleyball:{minEvidence:2,preferred:["Match Winner","Set Handicap","Total Sets"],avoid:[],note:"Separate match and set-level evidence."},
 handball:{minEvidence:2,preferred:["Match Winner","Goal Handicap","Total Goals"],avoid:[],note:"Use scoring rate and team-strength evidence."},
 baseball:{minEvidence:2,preferred:["Moneyline","Run Handicap","Total Runs"],avoid:[],note:"Use pitcher/team and run-environment evidence when available."},
 ice_hockey:{minEvidence:2,preferred:["Match Winner","Puck Handicap","Total Goals"],avoid:[],note:"Use scoring and period evidence when available."}
});
export function getSportRule(sport=""){return SPORT_RULES[String(sport).toLowerCase()]??{minEvidence:2,preferred:[],avoid:[],note:"No sport-specific rule is configured."};}
export function evaluateSportEvidence(sport,{evidenceCount=0,dataQuality=0,marketName=""}={}){
 const rule=getSportRule(sport), preferred=rule.preferred.some(x=>x.toLowerCase()===String(marketName).toLowerCase());
 const evidenceScore=clamp(evidenceCount/rule.minEvidence), quality=clamp(dataQuality);
 return {sufficient:evidenceCount>=rule.minEvidence&&quality>0,score:(evidenceScore*.6)+(quality*.4),preferredMarket:preferred,note:rule.note};
}
