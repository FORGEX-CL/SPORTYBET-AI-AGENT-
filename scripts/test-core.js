import "../src/data/sportybetParser.fixture.js";
import "../src/data/sportybetWebSource.fixture.js";
import "../src/core/feedPipeline.fixture.js";
import "../src/core/feedAnalysis.fixture.js";
import "../src/core/debate.fixture.js";
import "../src/core/headAnalyst.fixture.js";
import "../src/core/ticketPortfolio.fixture.js";
import "../src/core/ticketDelta.fixture.js";
import "../src/core/sourceSignalEngine.fixture.js";
import "../src/core/learning.fixture.js";
import "../src/core/learningLedger.fixture.js";
import "../src/data/sportybetResults.fixture.js";
import "../src/data/sportybetApi.fixture.js";
import "../src/data/sportybetHealth.fixture.js";
import "../src/core/learningFeedback.fixture.js";
import { runCoreFixtures } from "../src/core/testSuite.js";
const result=runCoreFixtures();
console.log(JSON.stringify(result,null,2));

import "../src/core/sportybetHistory.fixture.js";
import "../src/core/historicalModel.fixture.js";
import "../src/core/agentCalibration.fixture.js";
import "../src/core/riskEngine.fixture.js";

import "../src/core/platinumEnsemble.fixture.js";
import "../src/core/correlationEngine.fixture.js";

import "../src/core/settlementCatalogue.fixture.js";

import "../src/core/modelDrift.fixture.js";

import "../src/core/oddsHistory.fixture.js";
