import {
  assertion,
  emitResult,
  extractActualTools,
  inputText,
  isDryRunOutput,
  lowerIncludes,
  normalizeToolName,
  readAgentProfile,
  readPayload,
  relevantRepoContractText
} from "./evaluator-utils.mjs";

const payload = await readPayload();
const inferred = inferScenario(payload);
const config = { ...inferred, ...(payload.config ?? {}) };
const expectedTools = (config.expected_tools ?? []).map(normalizeToolName);
const actualTools = extractActualTools(payload);
const mode = config.trajectory_match_mode ?? "ordered";
const dryRun = isDryRunOutput(payload);
const repoContractText = relevantRepoContractText();

const assertions = [
  assertion("grader input is valid JSON", !payload.__parseError, payload.__parseError),
  assertion("custom evaluator declares AgentEvals tool_trajectory type", config.evaluator_type === "tool_trajectory", String(config.evaluator_type ?? "")),
  assertion("trajectory match mode is explicit", ["ordered", "unordered", "subset", "superset"].includes(mode), mode),
  assertion("expected trajectory has enough tool/subagent calls for the atomic step", expectedTools.length >= 3, `${expectedTools.length} expected tools`)
];

for (const expectedTool of expectedTools) {
  const agentName = expectedTool.replace(/^agent:/, "");
  assertions.push(assertion(`expected tool is an agent call: ${expectedTool}`, expectedTool.startsWith("agent:"), expectedTool));
  assertions.push(assertion(`agent profile exists for ${agentName}`, Boolean(readAgentProfile(agentName)), agentName));
  assertions.push(assertion(`repo contract mentions trajectory agent ${agentName}`, lowerIncludes(repoContractText, agentName), agentName));
}

if (actualTools.length > 0) {
  assertions.push(assertion("actual tool trace is available", true, actualTools.join(", ")));
  const matched = mode === "ordered"
    ? orderedMatch(actualTools, expectedTools)
    : unorderedMatch(actualTools, expectedTools);
  assertions.push(assertion(`actual tool trace satisfies ${mode} expectation`, matched, `actual=${actualTools.join(", ")} expected=${expectedTools.join(", ")}`));
} else {
  assertions.push(assertion("dry-run may omit runtime trace; repository trajectory contract is present", dryRun, "no runtime trace in payload"));
}

emitResult(assertions, {
  scenario: config.scenario,
  evaluatorType: config.evaluator_type,
  mode,
  dryRun,
  expectedTools,
  actualTools
});

function orderedMatch(actual, expected) {
  let cursor = 0;
  for (const tool of actual) {
    if (tool === expected[cursor]) {
      cursor++;
    }
    if (cursor === expected.length) {
      return true;
    }
  }

  return expected.length === 0;
}

function unorderedMatch(actual, expected) {
  const remaining = new Map();
  for (const tool of actual) {
    remaining.set(tool, (remaining.get(tool) ?? 0) + 1);
  }

  for (const tool of expected) {
    const count = remaining.get(tool) ?? 0;
    if (count <= 0) {
      return false;
    }
    remaining.set(tool, count - 1);
  }

  return true;
}

function inferScenario(currentPayload) {
  const text = inputText(currentPayload).toLowerCase();
  const base = {
    evaluator_type: "tool_trajectory"
  };

  if (text.includes("cobol screens") && text.includes("event-driven intake")) {
    return {
      ...base,
      scenario: "legacy-to-target-pivot",
      trajectory_match_mode: "ordered",
      expected_tools: ["agent:khepri-spec", "agent:khepri-knowledge", "agent:khepri-test", "agent:khepri-planner"]
    };
  }

  if (text.includes("generate the squads now")) {
    return {
      ...base,
      scenario: "current-increment-squad-generation",
      trajectory_match_mode: "unordered",
      expected_tools: ["agent:app-modernization", "agent:data-modernization", "agent:infra-modernization", "agent:khepri-planner", "agent:khepri-test"]
    };
  }

  if (text.includes("claim validation rules") && text.includes("invalid-member")) {
    return {
      ...base,
      scenario: "tdd-regression-red-green",
      trajectory_match_mode: "ordered",
      expected_tools: ["agent:khepri-test", "agent:khepri-code", "agent:khepri-test", "agent:khepri-modernization-assessor"]
    };
  }

  if (text.includes("system.web") && text.includes("wcf")) {
    return {
      ...base,
      scenario: "legacy-dotnet-extraction",
      trajectory_match_mode: "ordered",
      expected_tools: ["agent:khepri-spec", "agent:khepri-knowledge", "agent:khepri-test"]
    };
  }

  if (text.includes("servlet/jsp") && text.includes("ejb")) {
    return {
      ...base,
      scenario: "legacy-java-extraction",
      trajectory_match_mode: "ordered",
      expected_tools: ["agent:khepri-spec", "agent:khepri-knowledge", "agent:khepri-test"]
    };
  }

  if (text.includes("cics/bms") && text.includes("copybooks")) {
    return {
      ...base,
      scenario: "legacy-cobol-extraction",
      trajectory_match_mode: "ordered",
      expected_tools: ["agent:khepri-spec", "agent:khepri-knowledge", "agent:khepri-test"]
    };
  }

  if (text.includes("strangler-wrap") && text.includes("dual-write")) {
    return {
      ...base,
      scenario: "area-pattern-risk-review",
      trajectory_match_mode: "unordered",
      expected_tools: ["agent:app-modernization", "agent:data-modernization", "agent:infra-modernization", "agent:khepri-planner", "agent:khepri-modernization-assessor"]
    };
  }

  if (text.includes("increment 1 includes cobol") && text.includes("java payment monolith")) {
    return {
      ...base,
      scenario: "mixed-legacy-estate-increment",
      trajectory_match_mode: "ordered",
      expected_tools: ["agent:khepri-spec", "agent:khepri-knowledge", "agent:app-modernization", "agent:data-modernization", "agent:infra-modernization", "agent:khepri-planner", "agent:khepri-test"]
    };
  }

  return {};
}
