import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const architectureSignals = [
  /\barchitecture\b/i,
  /\bdiagram\b/i,
  /\bmermaid\b/i,
  /\bworkflow\b/i,
  /\bhandoff\b/i,
  /\bagent profile\b/i,
  /\bcustom agent\b/i,
  /\bagent skill\b/i,
  /\bhook\b/i,
  /\bmcp\b/i,
  /\beval(s|uation)?\b/i,
  /\bci\b/i,
  /\bdocs?\b/i,
  /\bdocumentation\b/i,
  /\brepository structure\b/i,
  /\bproject structure\b/i
];

const changeSignals = [
  /\badd\b/i,
  /\bupdate\b/i,
  /\bchange\b/i,
  /\bmodify\b/i,
  /\brefactor\b/i,
  /\bremove\b/i,
  /\bdelete\b/i,
  /\bimplement\b/i,
  /\benforce\b/i
];

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function extractPrompt(payload) {
  for (const key of ["prompt", "userPrompt", "user_prompt", "message", "text"]) {
    if (typeof payload?.[key] === "string") {
      return payload[key];
    }
  }

  if (typeof payload?.input?.prompt === "string") {
    return payload.input.prompt;
  }

  return "";
}

function hasArchitectureChangeSignal(prompt) {
  return architectureSignals.some((pattern) => pattern.test(prompt))
    && changeSignals.some((pattern) => pattern.test(prompt));
}

const raw = await readStdin();
let payload = {};
try {
  payload = raw.trim() ? JSON.parse(raw) : {};
} catch {
  payload = { prompt: raw };
}

const prompt = extractPrompt(payload);
const repoRoot = path.resolve(payload.cwd || process.cwd());
const skillPath = path.join(repoRoot, ".github", "skills", "keep-architecture-docs-current", "SKILL.md");

if (!prompt || !hasArchitectureChangeSignal(prompt)) {
  console.log(JSON.stringify({ status: "ignored", reason: "no architecture-change signal" }));
  process.exit(0);
}

if (!existsSync(skillPath)) {
  console.log(JSON.stringify({ status: "blocked", reason: "missing architecture documentation skill", skill: "keep-architecture-docs-current", skillPath }));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "invoke-skill",
  skill: "keep-architecture-docs-current",
  skillPath,
  instruction: "Invoke $keep-architecture-docs-current before completing architecture-affecting changes; update docs and Mermaid diagrams to match current implementation."
}));
