import {
  assertion,
  emitResult,
  expectedText,
  inputText,
  isDryRunOutput,
  lowerIncludes,
  outputText,
  readAgentProfile,
  readPayload,
  readRepoText
} from "./evaluator-utils.mjs";

const payload = await readPayload();
const inferred = inferScenario(payload);
const config = { ...inferred, ...(payload.config ?? {}) };
const scenarioText = [inputText(payload), expectedText(payload)].join("\n");
const workflowSource = readRepoText("dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs");
const dryRun = isDryRunOutput(payload);
const outputSurface = dryRun ? scenarioText : outputText(payload);
const expectations = scenarioExpectations(config.legacy_kind);
const stage = config.stage_id ?? inferStageId(scenarioText);
const stageAgents = requiredAgentsForStage(stage);

const assertions = [
  assertion("grader input is valid JSON", !payload.__parseError, payload.__parseError),
  assertion("legacy scenario kind is recognized", Boolean(expectations), String(config.legacy_kind ?? "")),
  assertion("workflow exposes the primary legacy scenario matrix", lowerIncludes(workflowSource, "CreatePrimaryLegacyScenarioMatrix"), "CreatePrimaryLegacyScenarioMatrix"),
  assertion("workflow exposes typed legacy system kinds", lowerIncludes(workflowSource, "LegacySystemKind"), "LegacySystemKind"),
  assertion("workflow exposes atomic step contracts", lowerIncludes(workflowSource, "CreateAtomicStepContracts"), "CreateAtomicStepContracts"),
  assertion(`workflow contains stage ${stage}`, lowerIncludes(workflowSource, stage), stage)
];

if (expectations) {
  assertions.push(assertion(`scenario prose names ${expectations.displayName}`, lowerIncludes(scenarioText, expectations.proseName), expectations.proseName));
  assertions.push(assertion(`workflow contains enum kind ${expectations.enumName}`, lowerIncludes(workflowSource, expectations.enumName), expectations.enumName));

  for (const phrase of expectations.legacySignals) {
    assertions.push(assertion(`${expectations.displayName} workflow captures legacy signal: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  for (const phrase of expectations.edgeCases) {
    assertions.push(assertion(`${expectations.displayName} workflow captures edge case: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  for (const phrase of expectations.modernizationTests) {
    assertions.push(assertion(`${expectations.displayName} workflow captures modernization test: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  assertions.push(assertion(`${expectations.displayName} defines regression fixtures`, lowerIncludes(workflowSource, "fixtures"), "fixtures"));
  assertions.push(assertion(`${expectations.displayName} maps every atomic step`, lowerIncludes(workflowSource, "AtomicStepIds") || lowerIncludes(workflowSource, "stepIds"), "AtomicStepIds/stepIds"));
}

for (const agentName of stageAgents) {
  assertions.push(assertion(`required agent profile exists: ${agentName}`, Boolean(readAgentProfile(agentName)), agentName));
  assertions.push(assertion(`workflow stage routes ${agentName}`, lowerIncludes(workflowSource, agentName), agentName));
}

if (stage === "target-requirements-specs-test-plans") {
  assertions.push(assertion("target stage preserves explicit test-PLANS", lowerIncludes(workflowSource, "test-PLANS"), "test-PLANS"));
  assertions.push(assertion("target stage does not collapse test plans into implementation", !lowerIncludes(scenarioText, "implement now"), "no implementation"));
}

if (!dryRun && expectations) {
  for (const phrase of [...expectations.edgeCases, ...expectations.modernizationTests]) {
    assertions.push(assertion(`live output preserves ${phrase}`, lowerIncludes(outputSurface, phrase), phrase));
  }
}

emitResult(assertions, {
  legacyKind: config.legacy_kind,
  stage,
  mode: dryRun ? "dry-run-contract" : "live-output"
});

function inferStageId(text) {
  const lower = text.toLowerCase();
  if (lower.includes("target desired-state") || lower.includes("test-plans")) {
    return "target-requirements-specs-test-plans";
  }

  return "legacy-requirements-specs-tests";
}

function inferScenario(currentPayload) {
  const text = inputText(currentPayload).toLowerCase();
  const stage_id = inferStageId(text);

  if (text.includes("cobol") || text.includes("cics/bms") || text.includes("copybooks")) {
    return { legacy_kind: "cobol", stage_id };
  }

  if (text.includes(".net framework") || text.includes("system.web") || text.includes("wcf")) {
    return { legacy_kind: "dotnet-framework", stage_id };
  }

  if (text.includes("java monolith") || text.includes("servlet/jsp") || text.includes("ejb")) {
    return { legacy_kind: "java-monolith", stage_id };
  }

  return { stage_id };
}

function requiredAgentsForStage(stageId) {
  if (stageId === "target-requirements-specs-test-plans") {
    return ["khepri-spec", "khepri-knowledge", "khepri-planner"];
  }

  return ["khepri-spec", "khepri-knowledge", "khepri-test"];
}

function scenarioExpectations(kind) {
  switch (kind) {
    case "cobol":
      return {
        displayName: "COBOL",
        proseName: "COBOL",
        enumName: "Cobol",
        legacySignals: ["CICS/BMS screens", "JCL batch jobs", "copybooks", "VSAM or DB2 data", "fixed-width reports"],
        edgeCases: ["EBCDIC encoding", "packed decimals", "batch restart windows"],
        modernizationTests: ["copybook fixture tests", "batch replay", "report parity", "packed decimal conversion tests", "restart/retry semantics"]
      };
    case "dotnet-framework":
      return {
        displayName: "legacy .NET Framework",
        proseName: ".NET Framework",
        enumName: "DotNetFramework",
        legacySignals: ["System.Web", "IIS", "WCF or ASMX endpoints", "Windows services", "ADO.NET SQL Server"],
        edgeCases: ["COM interop", "32-bit dependency", "machine.config"],
        modernizationTests: ["golden-master HTTP contracts", "service facade contract tests", "config parity", "WCF/ASMX facade tests", "Windows service scheduling parity"]
      };
    case "java-monolith":
      return {
        displayName: "legacy Java monolith",
        proseName: "Java",
        enumName: "JavaMonolith",
        legacySignals: ["Servlet/JSP", "EJB or JMS", "Ant or Maven", "application server descriptors", "JDBC or Hibernate"],
        edgeCases: ["transaction boundaries", "classloader resource lookup", "checked exception mapping"],
        modernizationTests: ["message replay", "API contract tests", "persistence parity", "transaction-boundary tests", "checked-exception mapping tests"]
      };
    default:
      return null;
  }
}
