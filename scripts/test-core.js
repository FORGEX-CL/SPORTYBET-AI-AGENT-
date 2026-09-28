import "../src/data/sportybetParser.fixture.js";
import "../src/data/sportybetWebSource.fixture.js";
import "../src/core/feedPipeline.fixture.js";
import "../src/core/feedAnalysis.fixture.js";
import { runCoreFixtures } from "../src/core/testSuite.js";
const result=runCoreFixtures();
console.log(JSON.stringify(result,null,2));
