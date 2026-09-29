import { createSessionToken, findUser, normalizeUsername, sessionCookie, verifyPassword } from "./_auth.js";
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body??{};
    const username=normalizeUsername(body.username);
    const password=String(body.password??"");
    if(!username||!password){res.status(400).json({error:"Username and password are required"});return;}
    const user=findUser(username);
    const valid=user?await verifyPassword(password,user.passwordHash):false;
    if(!valid){res.status(401).json({authenticated:false,error:"Invalid username or password"});return;}
    res.setHeader("Set-Cookie",sessionCookie(createSessionToken(user.username)));
    res.status(200).json({authenticated:true,username:user.username});
  }catch(error){
    const message=error instanceof Error?error.message:"Authentication service unavailable";
    res.status(message.includes("not configured")?503:500).json({authenticated:false,error:message});
  }
}