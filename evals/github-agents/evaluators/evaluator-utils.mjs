import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evaluatorDir = path.dirname(fileURLToPath(import.meta.url));

export function repoRoot() {
  return path.resolve(evaluatorDir, "..", "..", "..");
}

export async function readPayload() {
  const rawPayload = await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });

  try {
    return rawPayload.trim() ? JSON.parse(rawPayload) : {};
  } catch (error) {
    return {
      __parseError: error instanceof Error ? error.message : String(error),
      __rawPayload: rawPayload
    };
  }
}

export function assertion(text, passed, evidence) {
  return { text, passed: Boolean(passed), ...(evidence ? { evidence } : {}) };
}

export function emitResult(assertions, details = {}) {
  const passed = assertions.filter((item) => item.passed).length;
  const total = assertions.length || 1;
  console.log(JSON.stringify({
    score: passed / total,
    assertions,
    details
  }));
}

export function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeText).join("\n");
  }

  if (typeof value === "object") {
    if (typeof value.content === "string") {
      return value.content;
    }

    return Object.values(value).map(normalizeText).join("\n");
  }

  return String(value);
}

export function inputText(payload) {
  return normalizeText(payload.input ?? payload.input_text ?? "");
}

export function expectedText(payload) {
  return normalizeText(payload.expected_output ?? payload.expected_output_text ?? "");
}

export function outputText(payload) {
  return normalizeText(payload.output_text ?? payload.output ?? "");
}

export function lowerIncludes(text, phrase) {
  return normalizeText(text).toLowerCase().includes(normalizeText(phrase).toLowerCase());
}

export function isDryRunOutput(payload) {
  const text = outputText(payload);
  return lowerIncludes(text, "mock response") || lowerIncludes(text, "dry-run mock");
}

export function agentProfilePath(agentName) {
  return path.join(repoRoot(), ".github", "agents", `${agentName}.md`);
}

export function readAgentProfile(agentName) {
  const filePath = agentProfilePath(agentName);
  return existsSync(filePath) ? readFileSync(filePath, "utf8").replace(/\r\n/g, "\n") : null;
}

export function readRepoText(relativePath) {
  const filePath = path.join(repoRoot(), relativePath);
  return existsSync(filePath) ? readFileSync(filePath, "utf8").replace(/\r\n/g, "\n") : "";
}

export function readAllAgentProfiles() {
  const dir = path.join(repoRoot(), ".github", "agents");
  if (!existsSync(dir)) {
    return "";
  }

  return readdirSync(dir)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => readFileSync(path.join(dir, fileName), "utf8"))
    .join("\n");
}

export function relevantRepoContractText() {
  return [
    readAllAgentProfiles(),
    readRepoText("dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs"),
    readRepoText("dotnet/src/Modernization/Workflow/GitHubCopilotModernizationAgentRegistry.cs"),
    readRepoText("evals/github-agents/khepri-github-agents.eval.yaml")
  ].join("\n");
}

export function extractMessages(input) {
  return Array.isArray(input) ? input : [];
}

export function extractActualTools(payload) {
  const candidates = [];
  collectToolNames(payload.trace, candidates);
  collectToolNames(payload.output, candidates);

  const text = outputText(payload);
  for (const match of text.matchAll(/\b(?:agent|tool)\s*[:=]\s*["']?([a-z0-9*:/._-]+)["']?/gi)) {
    candidates.push(match[1]);
  }

  return candidates
    .map((tool) => normalizeToolName(tool))
    .filter(Boolean);
}

function collectToolNames(value, target) {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectToolNames(item, target);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const key of ["tool", "tool_name", "name", "agent", "executorId", "executor_id"]) {
    if (typeof value[key] === "string") {
      target.push(value[key]);
    }
  }

  for (const nested of Object.values(value)) {
    collectToolNames(nested, target);
  }
}

export function normalizeToolName(tool) {
  const raw = normalizeText(tool).trim();
  if (!raw) {
    return "";
  }

  return raw.startsWith("agent:") ? raw : `agent:${raw}`;
}
