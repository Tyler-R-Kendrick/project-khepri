import {
  assertion,
  emitResult,
  expectedText,
  extractMessages,
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
const messages = extractMessages(payload.input);
const expectedAgents = config.expected_agents ?? [];
const requiredTerms = config.required_context_terms ?? [];
const requiredTurns = Number(config.required_turns ?? 2);
const scenarioText = [inputText(payload), expectedText(payload)].join("\n");
const liveOutput = outputText(payload);
const dryRun = isDryRunOutput(payload);
const outputSurface = dryRun ? scenarioText : liveOutput;
const repoContractText = relevantRepoContractText();

const assertions = [
  assertion("grader input is valid JSON", !payload.__parseError, payload.__parseError),
  assertion(`scenario '${config.scenario ?? "unknown"}' has at least ${requiredTurns} turns`, messages.length >= requiredTurns, `${messages.length} turns`),
  assertion("scenario includes at least two user turns", messages.filter((message) => message.role === "user").length >= 2),
  assertion("scenario includes an assistant continuity turn", messages.some((message) => message.role === "assistant")),
  assertion("scenario names modernization context", lowerIncludes(scenarioText, "legacy") || lowerIncludes(scenarioText, "target") || lowerIncludes(scenarioText, "modernization") || lowerIncludes(scenarioText, "stage") || lowerIncludes(scenarioText, "increment"), "legacy/target/stage/increment"),
  assertion("scenario requires source-backed evidence or proof", lowerIncludes(scenarioText, "evidence") || lowerIncludes(scenarioText, "source-backed") || lowerIncludes(scenarioText, "prove")),
  assertion("scenario requires tests or regression gates", lowerIncludes(scenarioText, "test") || lowerIncludes(scenarioText, "regression"))
];

for (const term of requiredTerms) {
  assertions.push(assertion(`scenario preserves context term: ${term}`, lowerIncludes(scenarioText, term), term));
  if (!dryRun) {
    assertions.push(assertion(`live output uses context term: ${term}`, lowerIncludes(outputSurface, term), term));
  }
}

for (const agentName of expectedAgents) {
  const profile = readAgentProfile(agentName);
  assertions.push(assertion(`expected agent profile exists: ${agentName}`, Boolean(profile), agentName));
  assertions.push(assertion(`repo contract can route ${agentName}`, lowerIncludes(repoContractText, agentName), agentName));
  if (!dryRun) {
    assertions.push(assertion(`live output calls or names ${agentName}`, lowerIncludes(outputSurface, agentName), agentName));
  }
}

emitResult(assertions, {
  scenario: config.scenario,
  mode: dryRun ? "dry-run-contract" : "live-output",
  expectedAgents,
  requiredTerms
});

function inferScenario(currentPayload) {
  const text = inputText(currentPayload).toLowerCase();
  if (text.includes("cobol screens") && text.includes("event-driven intake")) {
    return {
      scenario: "legacy-to-target-pivot",
      required_turns: 3,
      expected_agents: ["khepri-spec", "khepri-knowledge", "khepri-test", "khepri-planner"],
      required_context_terms: ["COBOL screens", "nightly batch jobs", "SQL reports", "event-driven intake", "reporting read model", "parity gate"]
    };
  }

  if (text.includes("claim validation rules") && text.includes("invalid-member")) {
    return {
      scenario: "tdd-regression-red-green",
      required_turns: 3,
      expected_agents: ["khepri-code", "khepri-test", "khepri-modernization-assessor"],
      required_context_terms: ["claim validation rules", "invalid-member", "late-submission", "failing regression test", "verify red", "verify green"]
    };
  }

  if (text.includes("increment 1 includes cobol") && text.includes("java payment monolith")) {
    return {
      scenario: "mixed-legacy-estate-increment",
      required_turns: 3,
      expected_agents: ["khepri-spec", "khepri-knowledge", "app-modernization", "data-modernization", "infra-modernization", "khepri-planner", "khepri-test"],
      required_context_terms: ["COBOL eligibility batch", ".NET Framework claims portal", "Java payment monolith", "packed decimals", "COM interop", "machine.config drift", "JMS replay", "transaction boundaries"]
    };
  }

  return {};
}
