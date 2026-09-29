import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt=promisify(nodeScrypt);

export const COOKIE="sportybet_ai_session";
export const SESSION_TTL_SECONDS=8*60*60;
const CLOUD_URL=String(process.env.SUPABASE_URL??"").replace(/\/$/,"");
const CLOUD_SECRET=String(process.env.SUPABASE_SECRET_KEY??"");
const CLOUD_AUTH_KEY=String(process.env.SUPABASE_PUBLISHABLE_KEY??process.env.SUPABASE_ANON_KEY??"");
const RESERVED=new Set(["admin","administrator","root","system","support","owner","sportybet","sportybetai","sportybet_ai","superadmin"]);

export function normalizeUsername(value){return String(value??"").trim().toLowerCase();}
export function validUsername(username){return /^[a-z0-9_]{3,24}$/.test(username)&&!RESERVED.has(username);}
export function isCloudAuthConfigured(){return Boolean(CLOUD_URL&&CLOUD_SECRET&&CLOUD_AUTH_KEY);}
export function syntheticEmail(username){return normalizeUsername(username)+"@accounts.sportybet-ai-agent.invalid";}

function parseAuthUsers(){
  const raw=String(process.env.AUTH_USERS_JSON??"");
  if(!raw) return [];
  let parsed; try{parsed=JSON.parse(raw);}catch{throw new Error("AUTH_USERS_JSON is not valid JSON");}
  if(!Array.isArray(parsed))throw new Error("AUTH_USERS_JSON must be an array");
  return parsed.map(item=>({username:normalizeUsername(item?.username),role:item?.role==="admin"?"admin":"user",passwordHash:String(item?.passwordHash??"")})).filter(x=>x.username&&x.passwordHash);
}
export { parseAuthUsers };

export async function hashPassword(password){
  if(!password||String(password).length<10)throw new Error("Password must be at least 10 characters");
  const salt=randomBytes(16).toString("base64url");
  const key=await scrypt(String(password),Buffer.from(salt,"base64url"),64,{N:16384,r:8,p:1});
  return "scrypt$16384$8$1$"+salt+"$"+Buffer.from(key).toString("base64url");
}
export async function verifyPassword(password,encoded){
  try{
    const [prefix,n,r,p,salt,digest]=String(encoded??"").split("$");
    if(prefix!=="scrypt"||!salt||!digest)return false;
    const key=await scrypt(String(password??""),Buffer.from(salt,"base64url"),64,{N:Number(n),r:Number(r),p:Number(p)});
    const a=Buffer.from(digest,"base64url"),b=Buffer.from(key);
    return a.length===b.length&&timingSafeEqual(a,b);
  }catch{return false;}
}
function b64(value){return Buffer.from(value).toString("base64url");}
function unb64(value){return Buffer.from(value,"base64url").toString("utf8");}
function secret(){const value=String(process.env.SPORTYBET_AUTH_SECRET??"");if(value.length<32)throw new Error("SPORTYBET_AUTH_SECRET is not configured");return value;}
function sign(payload){return createHash("sha256").update(secret()+"."+payload).digest("base64url");}
export function createSessionToken(username,now=Math.floor(Date.now()/1000),role="user"){
  const payload=b64(JSON.stringify({u:normalizeUsername(username),r:role==="admin"?"admin":"user",iat:now,exp:now+SESSION_TTL_SECONDS}));
  return payload+"."+sign(payload);
}
export function verifySessionToken(token,now=Math.floor(Date.now()/1000)){
  try{
    const [payload,signature]=String(token??"").split(".");
    if(!payload||!signature)return null;
    const expected=sign(payload),a=Buffer.from(signature),b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b))return null;
    const data=JSON.parse(unb64(payload));
    if(!data?.u||Number(data.exp)<=now)return null;
    return{username:normalizeUsername(data.u),role:data.r==="admin"?"admin":"user",issuedAt:Number(data.iat)||0,expiresAt:Number(data.exp)};
  }catch{return null;}
}
export function getCookie(req,name=COOKIE){
  const raw=String(req?.headers?.cookie??"");
  for(const part of raw.split(";")){const [key,...rest]=part.trim().split("=");if(key===name)return decodeURIComponent(rest.join("="));}
  return null;
}
export function sessionCookie(token){return COOKIE+"="+encodeURIComponent(token)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+SESSION_TTL_SECONDS;}
export function clearSessionCookie(){return COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";}
export function getSession(req){return verifySessionToken(getCookie(req));}
export function requireAuth(req,res){const session=getSession(req);if(!session){res.status(401).json({authenticated:false,error:"Authentication required"});return null;}return session;}
export function requireAdmin(req,res){const session=requireAuth(req,res);if(!session)return null;if(session.role!=="admin"){res.status(403).json({authenticated:true,error:"Administrator access required"});return null;}return session;}
export function findUser(username){const normalized=normalizeUsername(username);return parseAuthUsers().find(user=>user.username===normalized)??null;}

async function cloudFetch(path,options={}){
  if(!isCloudAuthConfigured())throw new Error("Cloud authentication is not configured");
  const response=await fetch(CLOUD_URL+path,{...options,headers:{"apikey":CLOUD_SECRET,"Authorization":"Bearer "+CLOUD_SECRET,"Content-Type":"application/json",...(options.headers??{})}});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.msg||payload?.message||payload?.error_description||payload?.error||("Cloud authentication request failed: "+response.status));
  return payload;
}
export async function cloudFindUser(username){
  const u=normalizeUsername(username);
  if(!validUsername(u))return null;
  const rows=await cloudFetch("/rest/v1/app_users?select=id,username,role,active&username=eq."+encodeURIComponent(u)+"&limit=1",{method:"GET"});
  return Array.isArray(rows)?(rows[0]??null):null;
}
export async function cloudUsernameAvailable(username){return !(await cloudFindUser(username));}
export async function cloudCreateUser(username,password,role="user"){
  const u=normalizeUsername(username);
  if(!validUsername(u))throw new Error("Username must be 3–24 characters using letters, numbers or underscore.");
  const normalizedRole=role==="admin"?"admin":"user";
  if(await cloudFindUser(u))throw new Error("Username is already taken.");
  const created=await cloudFetch("/auth/v1/admin/users",{method:"POST",body:JSON.stringify({email:syntheticEmail(u),password,email_confirm:true,user_metadata:{username:u,role:normalizedRole}})});
  const userId=created?.id??created?.user?.id;
  if(!userId)throw new Error("Cloud account creation did not return a user ID.");
  try{
    await cloudFetch("/rest/v1/app_users",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({id:userId,username:u,role:normalizedRole,active:true})});
  }catch(error){
    try{await cloudFetch("/auth/v1/admin/users/"+encodeURIComponent(userId),{method:"DELETE"});}catch{}
    throw error;
  }
  return{userId,username:u,role:normalizedRole};
}
export async function cloudHasAdmin(){
  const rows=await cloudFetch("/rest/v1/app_users?select=id&role=eq.admin&limit=1",{method:"GET"});
  return Array.isArray(rows)&&rows.length>0;
}
export async function cloudCreateFirstAdmin(username,password){
  if(await cloudHasAdmin())throw new Error("An admin account already exists. First-admin bootstrap is closed.");
  return cloudCreateUser(username,password,"admin");
}
export async function cloudLogin(username,password){
  const profile=await cloudFindUser(username);
  if(!profile||!profile.active)return null;
  const token=await cloudFetch("/auth/v1/token?grant_type=password",{method:"POST",headers:{"apikey":CLOUD_AUTH_KEY,"Authorization":"Bearer "+CLOUD_AUTH_KEY},body:JSON.stringify({email:syntheticEmail(profile.username),password})});
  if(!token?.user?.id)return null;
  try{await cloudFetch("/rest/v1/app_users?username=eq."+encodeURIComponent(profile.username),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({last_login_at:new Date().toISOString()})});}catch{}
  return profile;
}
export async function cloudListUsers(){
  const rows=await cloudFetch("/rest/v1/app_users?select=username,role,active,created_at,last_login_at&order=created_at.asc",{method:"GET"});
  return Array.isArray(rows)?rows:[];
}
export { CLOUD_URL };
