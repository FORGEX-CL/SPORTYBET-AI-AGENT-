import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt=promisify(nodeScrypt);
const COOKIE="sportybet_session";
const SESSION_TTL_SECONDS=60*60*8;
const SCRYPT_OPTIONS=Object.freeze({N:16384,r:8,p:1});
const HASH_BYTES=64;

function b64(value){return Buffer.from(value).toString("base64url");}
function unb64(value){return Buffer.from(value,"base64url").toString("utf8");}
function secret(){const value=process.env.SPORTYBET_AUTH_SECRET;if(!value||value.length<32)throw new Error("SPORTYBET_AUTH_SECRET is not configured");return value;}
export function normalizeUsername(username=""){return String(username).trim().toLowerCase();}
export function parseAuthUsers(raw=process.env.AUTH_USERS_JSON){if(!raw)return[];let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error("AUTH_USERS_JSON must be valid JSON");}if(!Array.isArray(parsed))throw new Error("AUTH_USERS_JSON must be an array");return parsed.map(user=>({username:normalizeUsername(user?.username),passwordHash:String(user?.passwordHash??""),role:user?.role==="admin"?"admin":"user"})).filter(user=>user.username&&user.passwordHash);}
function parseHash(encoded){const parts=String(encoded).split("$");if(parts.length!==6||parts[0]!=="scrypt")throw new Error("Unsupported password hash format");const N=Number(parts[1]),r=Number(parts[2]),p=Number(parts[3]),salt=Buffer.from(parts[4],"hex"),digest=Buffer.from(parts[5],"hex");if(!Number.isInteger(N)||!Number.isInteger(r)||!Number.isInteger(p)||!salt.length||digest.length!==HASH_BYTES)throw new Error("Invalid password hash");return{N,r,p,salt,digest};}
export async function hashPassword(password,{salt=randomBytes(16)}={}){const value=String(password);if(value.length<10)throw new Error("Password must be at least 10 characters");const digest=await scrypt(value,salt,HASH_BYTES,SCRYPT_OPTIONS);return "scrypt$"+SCRYPT_OPTIONS.N+"$"+SCRYPT_OPTIONS.r+"$"+SCRYPT_OPTIONS.p+"$"+salt.toString("hex")+"$"+Buffer.from(digest).toString("hex");}
export async function verifyPassword(password,passwordHash){try{const {N,r,p,salt,digest}=parseHash(passwordHash);const derived=Buffer.from(await scrypt(String(password),salt,HASH_BYTES,{N,r,p}));return derived.length===digest.length&&timingSafeEqual(derived,digest);}catch{return false;}}
function sign(payload){return createHmac("sha256",secret()).update(payload).digest("base64url");}
export function createSessionToken(username,now=Math.floor(Date.now()/1000),role="user"){const safeRole=role==="admin"?"admin":"user";const payload=b64(JSON.stringify({u:normalizeUsername(username),r:safeRole,iat:now,exp:now+SESSION_TTL_SECONDS}));return payload+"."+sign(payload);}
export function verifySessionToken(token,now=Math.floor(Date.now()/1000)){try{const [payload,signature]=String(token??"").split(".");if(!payload||!signature)return null;const expected=sign(payload);const left=Buffer.from(signature);const right=Buffer.from(expected);if(left.length!==right.length||!timingSafeEqual(left,right))return null;const data=JSON.parse(unb64(payload));if(!data?.u||Number(data.exp)<=now)return null;return{username:normalizeUsername(data.u),role:data.r==="admin"?"admin":"user",issuedAt:Number(data.iat)||0,expiresAt:Number(data.exp)};}catch{return null;}}
export function getCookie(req,name=COOKIE){const raw=String(req?.headers?.cookie??"");for(const part of raw.split(";")){const [key,...rest]=part.trim().split("=");if(key===name)return decodeURIComponent(rest.join("="));}return null;}
export function sessionCookie(token){return COOKIE+"="+encodeURIComponent(token)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+SESSION_TTL_SECONDS;}
export function clearSessionCookie(){return COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";}
export function getSession(req){return verifySessionToken(getCookie(req));}
export function requireAuth(req,res){const session=getSession(req);if(!session){res.status(401).json({authenticated:false,error:"Authentication required"});return null;}return session;}
export function findUser(username){const normalized=normalizeUsername(username);return parseAuthUsers().find(user=>user.username===normalized)??null;}
export { COOKIE, SESSION_TTL_SECONDS };
export function requireAdmin(req,res){const session=requireAuth(req,res);if(!session)return null;if(session.role!=="admin"){res.status(403).json({authenticated:true,error:"Administrator access required"});return null;}return session;}
