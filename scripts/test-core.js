import { runCoreFixtures } from "../src/core/testSuite.js";
const result=runCoreFixtures();
console.log(JSON.stringify(result,null,2));
