import { cloudUsernameAvailable, isCloudAuthConfigured, normalizeUsername, validUsername } from "./_auth.js";
const attempts=new Map();
function rateLimited(ip){
  const now=Date.now(),key=String(ip??"unknown"),item=attempts.get(key);
  if(!item||now-item.started>60_000){attempts.set(key,{started:now,count:1});return false;}
  item.count+=1;return item.count>30;
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"){res.status(405).json({error:"Method not allowed"});return;}
  if(!isCloudAuthConfigured()){res.status(503).json({available:false,error:"Cloud signup is not configured yet"});return;}
  if(rateLimited(req.headers["x-forwarded-for"])){res.status(429).json({available:false,error:"Too many username checks. Try again shortly."});return;}
  const username=normalizeUsername(req.query?.username);
  if(!validUsername(username)){res.status(200).json({available:false,username,error:"Username must be 3–24 characters using letters, numbers or underscore."});return;}
  try{
    const available=await cloudUsernameAvailable(username);
    res.status(200).json({available,username,message:available?"Username is available.":"Username is already taken."});
  }catch(error){res.status(503).json({available:false,error:error instanceof Error?error.message:"Cloud availability check failed"});}
}