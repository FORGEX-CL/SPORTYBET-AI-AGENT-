import { cloudCreateUser, isCloudAuthConfigured, normalizeUsername, validUsername, hashPassword } from "./_auth.js";
const attempts=new Map();
function rateLimited(ip){
  const now=Date.now(),key=String(ip??"unknown"),item=attempts.get(key);
  if(!item||now-item.started>10*60_000){attempts.set(key,{started:now,count:1});return false;}
  item.count+=1;return item.count>5;
}
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  if(!isCloudAuthConfigured()){res.status(503).json({created:false,error:"Cloud signup is not configured yet"});return;}
  if(rateLimited(req.headers["x-forwarded-for"])){res.status(429).json({created:false,error:"Too many signup attempts. Try again later."});return;}
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body??{};
    const username=normalizeUsername(body.username),password=String(body.password??"");
    if(!validUsername(username)){res.status(400).json({created:false,error:"Username must be 3–24 characters using letters, numbers or underscore."});return;}
    if(password.length<10){res.status(400).json({created:false,error:"Password must be at least 10 characters."});return;}
    if(password.length>128){res.status(400).json({created:false,error:"Password is too long."});return;}
    const created=await cloudCreateUser(username,password);
    res.status(201).json({created:true,username:created.username,role:"user",message:"Account created in the cloud. You can now log in."});
  }catch(error){
    const message=error instanceof Error?error.message:"Cloud signup failed";
    const code=/taken|already exists/i.test(message)?409:500;
    res.status(code).json({created:false,error:message});
  }
}