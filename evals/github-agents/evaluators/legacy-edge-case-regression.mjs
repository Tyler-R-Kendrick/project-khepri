import {
  assertion,
  emitResult,
  expectedText,
  inputText,
  isDryRunOutput,
  lowerIncludes,
  outputText,
  readPayload,
  readRepoText
} from "./evaluator-utils.mjs";

const payload = await readPayload();
const scenarioText = [inputText(payload), expectedText(payload)].join("\n");
const workflowSource = readRepoText("dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs");
const evalSource = readRepoText("evals/github-agents/khepri-github-agents.eval.yaml");
const dryRun = isDryRunOutput(payload);
const outputSurface = dryRun ? scenarioText : outputText(payload);

const matrix = [
  {
    kind: "COBOL",
    enumName: "Cobol",
    signals: ["CICS/BMS screens", "copybooks", "JCL batch jobs"],
    edgeCases: ["packed decimals", "batch restart windows", "EBCDIC encoding"],
    fixtures: ["copybook-fixtures", "batch-replay-fixtures", "fixed-width-report-golden-master"],
    tests: ["copybook fixture tests", "batch replay", "report parity"]
  },
  {
    kind: "legacy .NET Framework",
    enumName: "DotNetFramework",
    signals: ["System.Web", "IIS", "WCF or ASMX endpoints"],
    edgeCases: ["COM interop", "machine.config", "32-bit dependency"],
    fixtures: ["http-golden-master-fixtures", "service-facade-contract-fixtures", "configuration-parity-fixtures"],
    tests: ["golden-master HTTP contracts", "service facade contract tests", "config parity"]
  },
  {
    kind: "legacy Java monolith",
    enumName: "JavaMonolith",
    signals: ["Servlet/JSP", "EJB or JMS", "application server descriptors"],
    edgeCases: ["transaction boundaries", "classloader resource lookup", "checked exception mapping"],
    fixtures: ["message-replay-fixtures", "api-contract-fixtures", "persistence-parity-fixtures"],
    tests: ["message replay", "API contract tests", "persistence parity"]
  }
];

const stageIds = [
  "legacy-requirements-specs-tests",
  "target-requirements-specs-test-plans",
  "incremental-modernization-plan",
  "increment-area-squads",
  "current-stage-plan-refinement",
  "tdd-modernization-execution"
];

const assertions = [
  assertion("grader input is valid JSON", !payload.__parseError, payload.__parseError),
  assertion("workflow exposes legacy scenario matrix", lowerIncludes(workflowSource, "CreatePrimaryLegacyScenarioMatrix"), "CreatePrimaryLegacyScenarioMatrix"),
  assertion("workflow exposes atomic step contracts", lowerIncludes(workflowSource, "CreateAtomicStepContracts"), "CreateAtomicStepContracts"),
  assertion("eval suite includes cross-legacy regression matrix", lowerIncludes(evalSource, "cross-legacy-edge-case-regression-matrix"), "cross-legacy-edge-case-regression-matrix"),
  assertion("scenario asks for regression fixtures or parity evidence", lowerIncludes(scenarioText, "regression") || lowerIncludes(scenarioText, "parity"), "regression/parity")
];

for (const stageId of stageIds) {
  assertions.push(assertion(`atomic matrix includes stage ${stageId}`, lowerIncludes(workflowSource, stageId), stageId));
}

for (const item of matrix) {
  assertions.push(assertion(`${item.kind} enum is represented`, lowerIncludes(workflowSource, item.enumName), item.enumName));
  for (const phrase of item.signals) {
    assertions.push(assertion(`${item.kind} signal: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  for (const phrase of item.edgeCases) {
    assertions.push(assertion(`${item.kind} edge case: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  for (const phrase of item.fixtures) {
    assertions.push(assertion(`${item.kind} regression fixture: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  for (const phrase of item.tests) {
    assertions.push(assertion(`${item.kind} modernization test: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }
}

for (const phrase of ["legacy regression checks", "verify red", "verify green", "AgentEvals rerun"]) {
  assertions.push(assertion(`execution loop keeps ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
}

if (!dryRun) {
  for (const phrase of ["packed decimals", "COM interop", "transaction boundaries"]) {
    assertions.push(assertion(`live output preserves cross-legacy edge case ${phrase}`, lowerIncludes(outputSurface, phrase), phrase));
  }
}

emitResult(assertions, {
  mode: dryRun ? "dry-run-contract" : "live-output",
  legacyKinds: matrix.map((item) => item.kind),
  stageIds
});
