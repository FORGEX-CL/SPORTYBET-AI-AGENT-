import { getSession } from "./_auth.js";
export default function handler(req,res){res.setHeader("Cache-Control","no-store");const session=getSession(req);if(!session){res.status(200).json({authenticated:false});return;}res.status(200).json({authenticated:true,username:session.username,expiresAt:session.expiresAt});}
