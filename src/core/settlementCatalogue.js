const SUPPORTED=[
  "1x2","match winner","double chance","draw no bet","handicap","asian handicap",
  "over/under","total goals","total points","both teams to score","gg/ng","gg/ng 2+",
  "exact goals","goal range","goal bounds","winning margin","odd/even","correct score",
  "half time/full time","halftime/fulltime"
];

const COMPLEX=[
  "early goals","1up","last goal","1st goal","first goal","teams to score","multigoal",
  "multiscore","smart combo","betbuilder","player props","player","clean sheet"
];

export function settlementSupport(marketName=""){
  const n=String(marketName).toLowerCase();
  if(SUPPORTED.some(x=>n===x||n.includes(x)))return{status:"supported",risk:0,reason:"Settlement engine has deterministic support for this market family."};
  if(COMPLEX.some(x=>n.includes(x)))return{status:"complex",risk:.25,reason:"This market family requires additional settlement rules before automated learning can be trusted."};
  return{status:"unsupported",risk:.30,reason:"No deterministic settlement rule is currently implemented for this market family."};
}
