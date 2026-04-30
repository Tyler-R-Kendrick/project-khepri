import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const correctionSignals = [
  /\bcorrection\b/i,
  /\bshould have\b/i,
  /\bwhen i say\b/i,
  /\bfrom now on\b/i,
  /\bnot what i asked\b/i,
  /\byou previously\b/i,
  /\binstead of what you did\b/i,
  /^\/learn\b/i
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

function isCorrection(prompt) {
  return correctionSignals.some((pattern) => pattern.test(prompt));
}

function redactSensitiveText(value) {
  return value
    .replace(/\b(api[_-]?key|token|secret|password)\b\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_=-]{32,}\b/g, "[redacted-token]");
}

function generalize(prompt) {
  // Keep the learned steering succinct enough for every agent to read before work.
  let text = redactSensitiveText(prompt)
    .replace(/^[@/\w-]*\s*learn[:,]?\s*/i, "")
    .replace(/\b(actually|correction|remember|from now on|next time)\b[:,]?\s*/gi, "")
    .replace(/\b(you should|you need to|please)\b\s*/gi, "")
    .trim();

  const sentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();
  text = sentence || text;
  text = text.replace(/\s+/g, " ").trim();

  if (text.length > 240) {
    text = `${text.slice(0, 237).trim()}...`;
  }

  if (!text.endsWith(".")) {
    text += ".";
  }

  const result = text.charAt(0).toUpperCase() + text.slice(1);

  // Require at least one word with 3+ letters to avoid writing meaningless entries.
  if (!/[A-Za-z]{3,}/.test(result)) {
    return null;
  }

  return result;
}

function steeringTemplate() {
  return `# Project Khepri Steering

All Project Khepri custom agents must read this file before phase work and apply user corrections captured here. Keep entries succinct and generalized so the user does not need to repeat themselves.

## Learned Corrections

`;
}

function appendSteering(steeringPath, correction, timestamp) {
  const existing = existsSync(steeringPath) ? readFileSync(steeringPath, "utf8").replace(/\r\n/g, "\n") : steeringTemplate();
  if (existing.includes(correction)) {
    return { changed: false, reason: "duplicate" };
  }

  const date = new Date(timestamp || Date.now()).toISOString().slice(0, 10);
  const entry = `- ${date}: ${correction} Evidence: captured from user correction.\n`;
  const next = existing.endsWith("\n") ? `${existing}${entry}` : `${existing}\n${entry}`;
  writeFileSync(steeringPath, next, "utf8");
  return { changed: true, reason: "captured" };
}

const raw = await readStdin();
let payload = {};
try {
  payload = raw.trim() ? JSON.parse(raw) : {};
} catch {
  payload = { prompt: raw };
}

const prompt = extractPrompt(payload);
if (!prompt || !isCorrection(prompt)) {
  console.log(JSON.stringify({ status: "ignored", reason: "no correction signal" }));
  process.exit(0);
}

const steeringPath = process.env.LEARN_STEERING_PATH || path.resolve(payload.cwd || process.cwd(), "STEERING.md");
const correction = generalize(prompt);
if (!correction) {
  console.log(JSON.stringify({ status: "ignored", reason: "generalized text contained no meaningful content" }));
  process.exit(0);
}
const result = appendSteering(steeringPath, correction, payload.timestamp);

console.log(JSON.stringify({ status: result.changed ? "captured" : "ignored", reason: result.reason, steeringPath }));
