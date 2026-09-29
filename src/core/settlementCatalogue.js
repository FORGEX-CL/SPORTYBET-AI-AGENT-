const COMPLEX=[
  "early goals","1up","last goal","1st goal","first goal","teams to score","multigoal",
  "multiscore","smart combo","betbuilder","player props","player","clean sheet",
  "&"
];

export function settlementSupport(marketName="",selectionName=""){
  const n=String(marketName).toLowerCase().trim();
  const s=String(selectionName).toLowerCase();
  if(n.includes("asian handicap")&&/[+-]?\d+\.\d*(?:25|75)\b/.test(s)){
    return{status:"complex",risk:.30,reason:"Quarter-line Asian Handicap requires half-win/half-loss settlement logic that is not yet enabled."};
  }
  if(n==="1x2"||n==="match winner")return{status:"supported",risk:0,reason:"Settlement engine has deterministic support for this market family."};
  if(n==="double chance"||n==="draw no bet")return{status:"supported",risk:0,reason:"Settlement engine has deterministic support for this market family."};
  if(n==="handicap"||n.startsWith("handicap "))return{status:"supported",risk:0,reason:"Three-way Handicap settlement is deterministic for the supported published selection structure."};
  if(n==="asian handicap"||n.startsWith("asian handicap "))return{status:"supported",risk:0,reason:"Asian Handicap settlement is deterministic for whole and half lines; quarter lines are gated separately."};
  if(n==="over/under"||n==="total goals"||n==="total points")return{status:"supported",risk:0,reason:"Totals settlement is deterministic for the supported published lines."};
  if(n==="both teams to score"||n==="gg/ng"||n==="gg/ng 2+")return{status:"supported",risk:0,reason:"Goal-scoring settlement is deterministic for this market family."};
  if(n==="exact goals"||n==="goal range"||n==="goal bounds"||n==="winning margin"||n==="odd/even"||n==="correct score"||n==="half time/full time"||n==="halftime/fulltime"){
    return{status:"supported",risk:0,reason:"Settlement engine has deterministic support for this market family."};
  }
  if(COMPLEX.some(x=>n.includes(x)))return{status:"complex",risk:.25,reason:"This market family requires additional settlement rules before automated learning can be trusted."};
  return{status:"unsupported",risk:.30,reason:"No deterministic settlement rule is currently implemented for this market family."};
}
