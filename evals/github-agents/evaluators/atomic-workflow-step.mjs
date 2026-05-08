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
const scenarioText = [inputText(payload), expectedText(payload)].join("\n");
const inferred = inferScenario(payload);
const config = { ...inferred, ...(payload.config ?? {}) };
const stageId = config.stage_id;
const dryRun = isDryRunOutput(payload);
const outputSurface = dryRun ? scenarioText : outputText(payload);
const workflowSource = readRepoText("dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs");
const expectations = stageExpectations(stageId);

const assertions = [
  assertion("grader input is valid JSON", !payload.__parseError, payload.__parseError),
  assertion("stage id is recognized", Boolean(expectations), String(stageId ?? "")),
  assertion("scenario explicitly asks for an atomic workflow step", lowerIncludes(scenarioText, "atomic"), "atomic"),
  assertion("workflow exposes AtomicModernizationStepContract", lowerIncludes(workflowSource, "AtomicModernizationStepContract"), "AtomicModernizationStepContract"),
  assertion("workflow exposes CreateAtomicStepContracts", lowerIncludes(workflowSource, "CreateAtomicStepContracts"), "CreateAtomicStepContracts"),
  assertion("atomic contracts define required inputs", lowerIncludes(workflowSource, "RequiredInputs"), "RequiredInputs"),
  assertion("atomic contracts define required outputs", lowerIncludes(workflowSource, "RequiredOutputs"), "RequiredOutputs"),
  assertion("atomic contracts define independent verification", lowerIncludes(workflowSource, "IndependentVerification"), "IndependentVerification")
];

if (expectations) {
  assertions.push(assertion(`workflow contains stage ${stageId}`, lowerIncludes(workflowSource, stageId), stageId));
  assertions.push(assertion(`${stageId} defines a smallest unit`, lowerIncludes(workflowSource, "Smallest unit"), "Smallest unit"));

  for (const agentName of expectations.agents) {
    assertions.push(assertion(`required agent profile exists: ${agentName}`, Boolean(readAgentProfile(agentName)), agentName));
    assertions.push(assertion(`${stageId} routes ${agentName}`, lowerIncludes(workflowSource, agentName), agentName));
  }

  for (const phrase of expectations.inputs) {
    assertions.push(assertion(`${stageId} required input/evidence: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  for (const phrase of expectations.outputs) {
    assertions.push(assertion(`${stageId} required output: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  for (const phrase of expectations.verification) {
    assertions.push(assertion(`${stageId} independent verification: ${phrase}`, lowerIncludes(workflowSource, phrase), phrase));
  }

  if (expectations.legacyKinds) {
    for (const kind of ["LegacySystemKind.Cobol", "LegacySystemKind.DotNetFramework", "LegacySystemKind.JavaMonolith"]) {
      assertions.push(assertion(`${stageId} supports ${kind}`, lowerIncludes(workflowSource, kind), kind));
    }
  }

  if (!dryRun) {
    for (const phrase of expectations.outputs) {
      assertions.push(assertion(`live output preserves ${phrase}`, lowerIncludes(outputSurface, phrase), phrase));
    }
  }
}

emitResult(assertions, {
  stageId,
  mode: dryRun ? "dry-run-contract" : "live-output"
});

function inferScenario(currentPayload) {
  const text = inputText(currentPayload);
  const match = text.match(/\b(legacy-requirements-specs-tests|target-requirements-specs-test-plans|incremental-modernization-plan|increment-area-squads|current-stage-plan-refinement|tdd-modernization-execution)\b/i);
  return match ? { stage_id: match[1] } : {};
}

function stageExpectations(stageId) {
  switch (stageId) {
    case "legacy-requirements-specs-tests":
      return {
        legacyKinds: true,
        agents: ["khepri-spec", "khepri-knowledge", "khepri-test"],
        inputs: ["legacy source location", "runtime or emulator command", "business behavior question"],
        outputs: ["source-backed requirements", "spec fragments", "legacy regression seed tests", "unsupported assumptions list"],
        verification: ["source-backed behavior inventory", "generated regression seed tests", "unsupported assumptions list"]
      };
    case "target-requirements-specs-test-plans":
      return {
        legacyKinds: true,
        agents: ["khepri-spec", "khepri-knowledge", "khepri-planner"],
        inputs: ["approved legacy behavior slice", "target standards or reference system", "nonfunctional constraints"],
        outputs: ["target requirements", "target specs", "test-PLANS", "acceptance criteria"],
        verification: ["target source evidence", "acceptance criteria", "test-PLANS"]
      };
    case "incremental-modernization-plan":
      return {
        legacyKinds: true,
        agents: ["khepri-planner", "app-modernization", "data-modernization", "infra-modernization", "security-modernization"],
        inputs: ["legacy specs", "target specs", "test plans", "area modernization advice"],
        outputs: ["increment map", "app/data/infra/security risk sequencing", "approval checkpoints"],
        verification: ["planner evidence trace", "area risks", "approval checkpoints"]
      };
    case "increment-area-squads":
      return {
        legacyKinds: true,
        agents: ["khepri-squad-generator", "app-modernization", "data-modernization", "infra-modernization", "security-modernization", "khepri-code", "khepri-test"],
        inputs: ["increment scope", "legacy regression gates", "target test plans"],
        outputs: ["SDK-first squad config", "app squad plan", "data squad plan", "infra squad plan", "security squad plan", "AgentV scenarios", "evaluators", "test data", "squad member rubric", "tool_trajectory and llm_judge eval gates"],
        verification: ["tool_trajectory", "llm_judge", "live-evals", "rubric adherence", "multiple improvement loops", "AgentEvals pass before implementation"]
      };
    case "current-stage-plan-refinement":
      return {
        legacyKinds: true,
        agents: ["khepri-planner", "app-modernization", "data-modernization", "infra-modernization", "security-modernization"],
        inputs: ["squad outputs", "increment constraints", "legacy parity gates"],
        outputs: ["stage-ready plan", "dependencies", "rollback plan", "regression gates"],
        verification: ["dependency check", "rollback plan review", "regression gates"]
      };
    case "tdd-modernization-execution":
      return {
        legacyKinds: true,
        agents: ["khepri-code", "khepri-test", "khepri-modernization-assessor"],
        inputs: ["stage-ready plan", "legacy regression fixture", "target test plan"],
        outputs: ["minimal implementation", "red/green/refactor evidence", "AgentEvals rerun", "assessor acceptance evidence"],
        verification: ["legacy regression checks", "verify red", "verify green", "AgentEvals rerun", "assessor acceptance"]
      };
    default:
      return null;
  }
}
