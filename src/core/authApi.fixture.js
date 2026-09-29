import { hashPassword, createSessionToken } from "../api/auth/_auth.js";

process.env.SPORTYBET_AUTH_SECRET="auth-api-fixture-secret-that-is-long-enough-123456";
const passwordHash=await hashPassword("correct-password-123");
process.env.AUTH_USERS_JSON=JSON.stringify([{username:"test-user",passwordHash}]);

const {default:login}=await import("../api/auth/login.js");
const {default:me}=await import("../api/auth/me.js");
const {default:logout}=await import("../api/auth/logout.js");

let loginBody=null,loginStatus=null,setCookie="";
const loginRes={setHeader(name,value){if(name==="Set-Cookie")setCookie=value;},status(code){loginStatus=code;return this;},json(data){loginBody=data;}};
await login({method:"POST",body:{username:"Test-User",password:"correct-password-123"}},loginRes);
if(loginStatus!==200||loginBody?.authenticated!==true||!setCookie.includes("sportybet_session="))throw new Error("Login endpoint fixture failed");

let meBody=null,meStatus=null;
const meRes={setHeader(){},status(code){meStatus=code;return this;},json(data){meBody=data;}};
await me({headers:{cookie:setCookie}},meRes);
if(meStatus!==200||meBody?.authenticated!==true||meBody?.username!=="test-user")throw new Error("Session endpoint fixture failed");

let badStatus=null;
const badRes={setHeader(){},status(code){badStatus=code;return this;},json(){}};
await login({method:"POST",body:{username:"test-user",password:"wrong-password"}},badRes);
if(badStatus!==401)throw new Error("Wrong password was accepted by login endpoint");

let logoutStatus=null,logoutCookie="";
const logoutRes={setHeader(name,value){if(name==="Set-Cookie")logoutCookie=value;},status(code){logoutStatus=code;return this;},json(){}};
await logout({method:"POST"},logoutRes);
if(logoutStatus!==200||!logoutCookie.includes("Max-Age=0"))throw new Error("Logout endpoint fixture failed");

console.log("Authentication API fixture passed");
