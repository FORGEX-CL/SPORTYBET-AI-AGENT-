import { hashPassword, normalizeUsername } from "../api/auth/_auth.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
const rl=createInterface({input,output});
try{
  const username=normalizeUsername(await rl.question("Unique username: "));
  const password=await rl.question("Password (10+ characters): ");
  const confirm=await rl.question("Confirm password: ");
  if(password!==confirm)throw new Error("Passwords do not match");
  const passwordHash=await hashPassword(password);
  console.log(JSON.stringify({username,passwordHash}));
}finally{rl.close();}