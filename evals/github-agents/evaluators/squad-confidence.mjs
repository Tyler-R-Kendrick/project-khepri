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
  relevantRepoContractText
} from "./evaluator-utils.mjs";

const payload = await readPayload();
const inferred = inferScenario(payload);
const config = { ...inferred, ...(payload.config ?? {}) };
const requiredSquads = config.required_squads ?? [];
const requiredEvidence = config.required_evidence ?? [];
const requiredEvaluators = config.required_evaluators ?? [];
const requiredPatterns = config.required_patterns ?? [];
const dryRun = isDryRunOutput(payload);
const repoContractText = relevantRepoContractText();
const scenarioText = [inputText(payload), expectedText(payload)].join("\n");
const outputSurface = dryRun ? scenarioText : outputText(payload);
const combinedContract = [scenarioText, repoContractText, outputSurface].join("\n");

const squadAgents = {
  app: "app-modernization",
  data: "data-modernization",
  infra: "infra-modernization"
};

const assertions = [
  assertion("grader input is valid JSON", !payload.__parseError, payload.__parseError),
  assertion("squad eval covers at least three modernization areas", requiredSquads.length >= 3, requiredSquads.join(", ")),
  assertion("scenario asks for conservative risk or confidence gates", lowerIncludes(scenarioText, "risk") || lowerIncludes(scenarioText, "gate") || lowerIncludes(scenarioText, "prove"))
];

for (const squad of requiredSquads) {
  const agentName = squadAgents[squad] ?? `${squad}-modernization`;
  const profile = readAgentProfile(agentName);
  assertions.push(assertion(`${squad} squad maps to ${agentName}`, Boolean(profile), agentName));
  assertions.push(assertion(`${squad} squad has regression guidance`, lowerIncludes(profile ?? "", "regression"), agentName));
  assertions.push(assertion(`${squad} squad has risk guidance`, lowerIncludes(profile ?? "", "risk"), agentName));
  assertions.push(assertion(`${squad} squad has handoffs`, lowerIncludes(profile ?? "", "handoffs"), agentName));
}

for (const evaluatorType of requiredEvaluators) {
  assertions.push(assertion(`required evaluator is represented: ${evaluatorType}`, lowerIncludes(combinedContract, evaluatorType), evaluatorType));
}

for (const evidence of requiredEvidence) {
  assertions.push(assertion(`required evidence is represented: ${evidence}`, lowerIncludes(combinedContract, evidence), evidence));
}

for (const pattern of requiredPatterns) {
  assertions.push(assertion(`required modernization pattern is represented: ${pattern}`, lowerIncludes(combinedContract, pattern), pattern));
}

if (!dryRun) {
  for (const squad of requiredSquads) {
    assertions.push(assertion(`live output names ${squad} squad`, lowerIncludes(outputSurface, squad), squad));
  }
}

emitResult(assertions, {
  scenario: config.scenario,
  mode: dryRun ? "dry-run-contract" : "live-output",
  requiredSquads,
  requiredEvidence,
  requiredEvaluators,
  requiredPatterns
});

function inferScenario(currentPayload) {
  const text = inputText(currentPayload).toLowerCase();
  if (text.includes("generate the squads now")) {
    return {
      scenario: "current-increment-squad-generation",
      required_squads: ["app", "data", "infra"],
      required_evaluators: ["tool_trajectory", "llm_judge"],
      required_evidence: ["TDD", "legacy regression", "rollback", "AgentEvals"]
    };
  }

  if (text.includes("strangler-wrap") && text.includes("dual-write")) {
    return {
      scenario: "area-pattern-risk-review",
      required_squads: ["app", "data", "infra"],
      required_patterns: ["strangler", "dual-write", "containerization"],
      required_evidence: ["when to use", "when to avoid", "regression", "rollback"]
    };
  }

  return {};
}
