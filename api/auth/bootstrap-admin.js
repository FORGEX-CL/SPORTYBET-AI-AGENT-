import { cloudCreateFirstAdmin, getClientIp, isCloudAuthConfigured, normalizeUsername, safeEqualText, validUsername } from "./_auth.js";

const attempts=new Map();
function blocked(ip){
  const now=Date.now(),key=String(ip??"unknown"),item=attempts.get(key);
  if(!item||now-item.started>15*60_000){attempts.set(key,{started:now,count:0});return false;}
  return item.count>=5;
}
function recordFailure(ip){
  const now=Date.now(),key=String(ip??"unknown"),item=attempts.get(key);
  if(!item||now-item.started>15*60_000){attempts.set(key,{started:now,count:1});return;}
  item.count+=1;
}

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.status(405).json({created:false,error:"Method not allowed"});return;}
  if(!isCloudAuthConfigured()){res.status(503).json({created:false,error:"Cloud authentication is not configured yet"});return;}
  const bootstrapSecret=String(process.env.ADMIN_BOOTSTRAP_SECRET??"");
  if(bootstrapSecret.length<32){res.status(503).json({created:false,error:"Admin bootstrap is not configured"});return;}
  const ip=getClientIp(req);
  if(blocked(ip)){res.status(429).json({created:false,error:"Too many bootstrap attempts. Try again later."});return;}
  const supplied=String(req.headers["x-admin-bootstrap-secret"]??"");
  if(!safeEqualText(supplied,bootstrapSecret)){recordFailure(ip);res.status(403).json({created:false,error:"Invalid admin bootstrap secret"});return;}
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body??{};
    const username=normalizeUsername(body.username),password=String(body.password??"");
    if(!validUsername(username)){res.status(400).json({created:false,error:"Username must be 3–24 characters using letters, numbers or underscore."});return;}
    if(password.length<10||password.length>128){res.status(400).json({created:false,error:"Password must be 10–128 characters."});return;}
    const created=await cloudCreateFirstAdmin(username,password);
    attempts.delete(ip);
    res.status(201).json({created:true,username:created.username,role:"admin",message:"Admin account created. Remove ADMIN_BOOTSTRAP_SECRET from deployment after setup."});
  }catch(error){
    const message=error instanceof Error?error.message:"Admin bootstrap failed";
    const code=/already exists|bootstrap is closed/i.test(message)?409:500;
    res.status(code).json({created:false,error:message});
  }
}
