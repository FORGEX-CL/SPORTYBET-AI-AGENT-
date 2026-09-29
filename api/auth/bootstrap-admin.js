import { cloudCreateFirstAdmin, isCloudAuthConfigured, normalizeUsername, validUsername } from "./_auth.js";

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.status(405).json({created:false,error:"Method not allowed"});return;}
  if(!isCloudAuthConfigured()){res.status(503).json({created:false,error:"Cloud authentication is not configured yet"});return;}
  const bootstrapSecret=String(process.env.ADMIN_BOOTSTRAP_SECRET??"");
  if(bootstrapSecret.length<32){res.status(503).json({created:false,error:"Admin bootstrap is not configured"});return;}
  const supplied=String(req.headers["x-admin-bootstrap-secret"]??"");
  if(supplied!==bootstrapSecret){res.status(403).json({created:false,error:"Invalid admin bootstrap secret"});return;}
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body??{};
    const username=normalizeUsername(body.username),password=String(body.password??"");
    if(!validUsername(username)){res.status(400).json({created:false,error:"Username must be 3–24 characters using letters, numbers or underscore."});return;}
    if(password.length<10||password.length>128){res.status(400).json({created:false,error:"Password must be 10–128 characters."});return;}
    const created=await cloudCreateFirstAdmin(username,password);
    res.status(201).json({created:true,username:created.username,role:"admin",message:"Admin account created. Remove ADMIN_BOOTSTRAP_SECRET from deployment after setup."});
  }catch(error){
    const message=error instanceof Error?error.message:"Admin bootstrap failed";
    const code=/already exists|bootstrap is closed/i.test(message)?409:500;
    res.status(code).json({created:false,error:message});
  }
}
