import { cloudListUsers, isCloudAuthConfigured, parseAuthUsers, requireAdmin } from "../_auth.js";
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"){res.status(405).json({error:"Method not allowed"});return;}
  if(!requireAdmin(req,res))return;
  try{
    const users=isCloudAuthConfigured()
      ? await cloudListUsers()
      : parseAuthUsers().map(user=>({username:user.username,role:user.role,active:true}));
    res.status(200).json({authenticated:true,users,userCount:users.length,note:"Credentials and password hashes are never returned."});
  }catch(error){res.status(503).json({authenticated:true,error:error instanceof Error?error.message:"Cloud user registry unavailable"});}
}