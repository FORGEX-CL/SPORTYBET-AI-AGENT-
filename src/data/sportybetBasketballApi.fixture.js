const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{
  const html=`International - Eurocup, Women
23/09 Wednesday
Points
Over
Under
18:30 ID 50645
AEO Proteas Voulas  Elizur Ramla
150.5
1.96 1.73
<a href="/ng/lite/preMatch/detail?eventId=sr:match:73576406">AEO Proteas Voulas Elizur Ramla</a>`;
  return new Response(html,{status:200,headers:{"content-type":"text/html"}});
};
try{
  const {default:handler}=await import("../../api/sportybet-basketball.js");
  let payload=null,statusCode=null;
  const req={method:"GET"};
  const res={setHeader(){},status(code){statusCode=code;return this;},json(data){payload=data;}};
  await handler(req,res);
  if(statusCode!==200||payload?.source!=="SportyBet"||payload?.eventCount!==1||payload?.events?.[0]?.sport!=="basketball")throw new Error("SportyBet basketball API fixture failed");
}finally{globalThis.fetch=originalFetch;}
console.log("SportyBet basketball API fixture passed");
