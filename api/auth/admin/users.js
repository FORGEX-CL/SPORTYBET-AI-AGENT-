import { requireAdmin, parseAuthUsers } from "../_auth.js";
export default function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"){res.status(405).json({error:"Method not allowed"});return;}
  if(!requireAdmin(req,res))return;
  const users=parseAuthUsers().map(user=>({username:user.username,role:user.role}));
  res.status(200).json({authenticated:true,users,userCount:users.length,note:"Credentials and password hashes are never returned."});
}
