#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const agentsDir = path.join(repoRoot, ".github", "agents");

const officialFrontmatterFields = new Set([
  "name",
  "description",
  "target",
  "tools",
  "model",
  "disable-model-invocation",
  "user-invocable",
  "infer",
  "mcp-servers",
  "metadata",
  "argument-hint",
  "agents",
  "handoffs",
  "hooks"
]);

const allowedTools = new Set([
  "execute",
  "read",
  "edit",
  "search",
  "agent",
  "web",
  "todo",
  "github/*",
  "awesome-copilot/*",
  "playwright/*"
]);

const awesomeCopilotMcp = {
  type: "local",
  command: "docker",
  args: [
    "run",
    "-i",
    "--rm",
    "ghcr.io/microsoft/mcp-dotnet-samples/awesome-copilot:latest"
  ],
  tools: ["*"]
};

const expectedAgents = {
  "khepri-orchestrator": {
    tools: ["read", "search", "agent", "github/*"],
    handoffs: [
      {
        label: "Start Continuous Evolution",
        agent: "khepri-evolution",
        prompt: "Run alongside every active Project Khepri agent phase as a continuous improvement companion. Watch handoffs, evidence, failures, and user corrections; suggest or implement approved agent, skill, hook, MCP, eval, and STEERING.md improvements without blocking the phase owner.",
        send: false
      },
      {
        label: "Collect IR",
        agent: "khepri-spec",
        prompt: "Collect or generate the next intermediary representations for the scoped Project Khepri modernization phase. Include source evidence, missing specs, and downstream consumers.",
        send: false
      },
      {
        label: "Index Knowledge",
        agent: "khepri-knowledge",
        prompt: "Index the current IR, business context, standards, and verification results for the active Project Khepri modernization phase. Return concise retrieval guidance and gaps.",
        send: false
      },
      {
        label: "Plan Modernization",
        agent: "khepri-planner",
        prompt: "Create an approval-ready Project Khepri modernization plan for the current phase, including tests, scaffolding, implementation steps, risks, and verification evidence.",
        send: false
      },
      {
        label: "Scaffold Target",
        agent: "khepri-scaffold",
        prompt: "Execute the approved Project Khepri scaffolding or minimal type-signature plan without adding product behavior. Report changed files and build evidence.",
        send: false
      },
      {
        label: "Implement With TDD",
        agent: "khepri-code",
        prompt: "Implement the approved Project Khepri behavior using tests first, minimal changes, and verification-backed refactoring. Preserve legacy parity unless explicitly approved.",
        send: false
      },
      {
        label: "Run Verification",
        agent: "khepri-test",
        prompt: "Run the required Project Khepri verification commands for the current phase and return reproducible command, exit status, failure, and pass evidence.",
        send: false
      },
      {
        label: "Assess Modernization",
        agent: "khepri-modernization-assessor",
        prompt: "Assess Project Khepri modernization parity, risk, acceptance evidence, and unresolved gaps for the current phase before release or next handoff.",
        send: false
      }
    ]
  },
  "khepri-spec": {
    tools: ["read", "search", "edit", "execute", "github/*"],
    handoffs: [
      {
        label: "Index IR",
        agent: "khepri-knowledge",
        prompt: "Index the IR artifact list, source evidence, missing specs, and uncertainties produced by the spec phase.",
        send: false
      },
      {
        label: "Plan IR Generation",
        agent: "khepri-planner",
        prompt: "Plan any additional IR generation that needs user approval before new specs or generated artifacts are created.",
        send: false
      }
    ]
  },
  "khepri-knowledge": {
    tools: ["read", "search", "edit", "github/*"],
    handoffs: [
      {
        label: "Plan From Knowledge",
        agent: "khepri-planner",
        prompt: "Use the indexed knowledge packet to create the next Project Khepri modernization plan with explicit assumptions and evidence.",
        send: false
      },
      {
        label: "Return To Orchestrator",
        agent: "khepri-orchestrator",
        prompt: "Return the indexed knowledge summary, retrieval gaps, and recommended next workflow phase to the orchestrator.",
        send: false
      }
    ]
  },
  "khepri-planner": {
    tools: ["read", "search", "edit", "agent", "github/*"],
    handoffs: [
      {
        label: "Scaffold Approved Plan",
        agent: "khepri-scaffold",
        prompt: "Execute only the approved scaffolding or minimal type-signature portion of this Project Khepri plan and report build evidence.",
        send: false
      },
      {
        label: "Implement Approved Plan",
        agent: "khepri-code",
        prompt: "Implement the approved Project Khepri test and behavior plan using tests first and narrow changes.",
        send: false
      },
      {
        label: "Verify Plan",
        agent: "khepri-test",
        prompt: "Run the verification commands required by this Project Khepri plan and return reproducible results.",
        send: false
      },
      {
        label: "Coordinate Approval",
        agent: "khepri-orchestrator",
        prompt: "Coordinate user approval or phase sequencing for this Project Khepri plan before implementation begins.",
        send: false
      }
    ]
  },
  "khepri-scaffold": {
    tools: ["read", "search", "edit", "execute"],
    handoffs: [
      {
        label: "Implement Scaffold Tests",
        agent: "khepri-code",
        prompt: "Add or update tests and implementation around the scaffolded Project Khepri types without broadening the approved scope.",
        send: false
      },
      {
        label: "Verify Scaffold Build",
        agent: "khepri-test",
        prompt: "Run the scaffold build or compile verification commands and return reproducible evidence.",
        send: false
      }
    ]
  },
  "khepri-code": {
    tools: ["read", "search", "edit", "execute", "agent"],
    handoffs: [
      {
        label: "Run Tests",
        agent: "khepri-test",
        prompt: "Run the exact Project Khepri verification commands for these code changes and return pass or failure evidence.",
        send: false
      },
      {
        label: "Assess Ready Changes",
        agent: "khepri-modernization-assessor",
        prompt: "Assess whether the verified changes satisfy Project Khepri modernization parity, acceptance criteria, and risk expectations.",
        send: false
      },
      {
        label: "Replan Scope Change",
        agent: "khepri-planner",
        prompt: "Replan because test feedback or implementation evidence changed the approved Project Khepri scope.",
        send: false
      }
    ]
  },
  "khepri-test": {
    tools: ["read", "search", "execute"],
    handoffs: [
      {
        label: "Fix Failing Tests",
        agent: "khepri-code",
        prompt: "Use these reproducible test failures to make the smallest Project Khepri code or test change needed by the approved plan.",
        send: false
      },
      {
        label: "Index Test Results",
        agent: "khepri-knowledge",
        prompt: "Index these Project Khepri test results, failure patterns, and verification evidence for future planning and assessment.",
        send: false
      },
      {
        label: "Return Evidence",
        agent: "khepri-orchestrator",
        prompt: "Return the verification evidence, unresolved failures, and recommended next phase to the orchestrator.",
        send: false
      }
    ]
  },
  "khepri-modernization-assessor": {
    tools: ["read", "search", "execute", "github/*"],
    handoffs: [
      {
        label: "Coordinate Decision",
        agent: "khepri-orchestrator",
        prompt: "Coordinate the next Project Khepri workflow decision using the assessment of parity, risk, acceptance evidence, and gaps.",
        send: false
      },
      {
        label: "Plan Follow-Up",
        agent: "khepri-planner",
        prompt: "Plan follow-up Project Khepri work for assessment gaps that require user approval or scope changes.",
        send: false
      },
      {
        label: "Implement Follow-Up",
        agent: "khepri-code",
        prompt: "Implement assessment-driven follow-up changes only when the plan scope is approved and tests describe the expected behavior.",
        send: false
      },
      {
        label: "Index Assessment",
        agent: "khepri-knowledge",
        prompt: "Index this modernization assessment so future Project Khepri planning can retrieve parity, risk, and acceptance evidence.",
        send: false
      }
    ]
  },
  "khepri-evolution": {
    tools: ["read", "search", "edit", "execute", "agent", "github/*", "awesome-copilot/*"],
    mcpServers: {
      "awesome-copilot": awesomeCopilotMcp
    },
    handoffs: [
      {
        label: "Validate Agent System",
        agent: "khepri-test",
        prompt: "Run the Project Khepri agent, skill, hook, lint, and AgentV validation commands for these workflow changes.",
        send: false
      },
      {
        label: "Coordinate Workflow Update",
        agent: "khepri-orchestrator",
        prompt: "Coordinate any changed Project Khepri phase ownership, delegation order, or steering expectations with the orchestrator.",
        send: false
      },
      {
        label: "Plan Skill Design",
        agent: "khepri-planner",
        prompt: "Plan broad Project Khepri skill or hook design changes before creating new durable workflow surfaces.",
        send: false
      }
    ]
  }
};

function normalizeTools(value) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tool) => tool.trim())
      .filter(Boolean);
  }

  return [];
}

const allowedNamespacePrefixes = ["github/", "awesome-copilot/", "playwright/"];

function hasAllowedToolName(tool) {
  return allowedTools.has(tool) || allowedNamespacePrefixes.some((prefix) => tool.startsWith(prefix));
}

function sameArray(actual, expected) {
  return actual.length === expected.length && expected.every((item, index) => actual[index] === item);
}

function readAgentProfile(fileName) {
  const filePath = path.join(agentsDir, fileName);
  const raw = readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      fileName,
      filePath,
      frontmatter: {},
      prompt: raw,
      error: "Missing YAML frontmatter fence"
    };
  }

  try {
    return {
      fileName,
      filePath,
      frontmatter: YAML.parse(match[1]) ?? {},
      prompt: match[2],
      error: null
    };
  } catch (error) {
    return {
      fileName,
      filePath,
      frontmatter: {},
      prompt: match[2],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function assertion(agent, rule, passed, evidence = "") {
  return { agent, rule, passed, evidence };
}

function validateHandoff(agentName, handoff, index, knownAgents, expected) {
  const prefix = `handoffs[${index}]`;
  const assertions = [];
  assertions.push(assertion(agentName, `${prefix}.label is a non-empty string`, typeof handoff?.label === "string" && handoff.label.trim().length > 0, String(handoff?.label ?? "")));
  assertions.push(assertion(agentName, `${prefix}.agent is a known custom agent`, typeof handoff?.agent === "string" && knownAgents.has(handoff.agent), String(handoff?.agent ?? "")));
  assertions.push(assertion(agentName, `${prefix}.agent is not self`, handoff?.agent !== agentName, String(handoff?.agent ?? "")));
  assertions.push(assertion(agentName, `${prefix}.prompt is a non-empty string`, typeof handoff?.prompt === "string" && handoff.prompt.trim().length >= 20, String(handoff?.prompt ?? "")));
  assertions.push(assertion(agentName, `${prefix}.send is explicit boolean`, typeof handoff?.send === "boolean", String(handoff?.send ?? "")));

  const allowedKeys = new Set(["label", "agent", "prompt", "send", "model"]);
  const unknownKeys = Object.keys(handoff ?? {}).filter((key) => !allowedKeys.has(key));
  assertions.push(assertion(agentName, `${prefix} uses official handoff keys only`, unknownKeys.length === 0, unknownKeys.join(", ") || "ok"));

  if (expected) {
    assertions.push(assertion(agentName, `${prefix}.label matches workflow contract`, handoff?.label === expected.label, `${String(handoff?.label ?? "")} -> ${expected.label}`));
    assertions.push(assertion(agentName, `${prefix}.agent matches workflow contract`, handoff?.agent === expected.agent, `${String(handoff?.agent ?? "")} -> ${expected.agent}`));
    assertions.push(assertion(agentName, `${prefix}.prompt matches workflow contract`, handoff?.prompt === expected.prompt, "prompt contract"));
    assertions.push(assertion(agentName, `${prefix}.send matches workflow contract`, handoff?.send === expected.send, `${String(handoff?.send ?? "")} -> ${expected.send}`));
  }

  return assertions;
}

function lintProfiles() {
  const assertions = [];
  if (!existsSync(agentsDir)) {
    assertions.push(assertion("(directory)", ".github/agents directory exists", false, `directory not found: ${agentsDir}`));
    return assertions;
  }
  const files = readdirSync(agentsDir)
    .filter((fileName) => fileName.endsWith(".md") && !fileName.endsWith(".agent.md"))
    .sort();
  const agentNames = new Set(files.map((fileName) => fileName.replace(/\.md$/, "")));
  const expectedNames = new Set(Object.keys(expectedAgents));

  for (const expectedName of expectedNames) {
    assertions.push(assertion(expectedName, "expected agent profile exists", agentNames.has(expectedName), `${expectedName}.md`));
  }

  for (const agentName of agentNames) {
    assertions.push(assertion(agentName, "agent is declared in lint workflow contract", expectedNames.has(agentName), agentName));
  }

  for (const fileName of files) {
    const agentName = fileName.replace(/\.md$/, "");
    const profile = readAgentProfile(fileName);
    const expected = expectedAgents[agentName];
    assertions.push(assertion(agentName, "frontmatter parses as YAML", !profile.error, profile.error ?? "ok"));
    if (profile.error || !expected) {
      continue;
    }

    const { frontmatter } = profile;
    const frontmatterKeys = Object.keys(frontmatter);
    const unknownFrontmatterKeys = frontmatterKeys.filter((key) => !officialFrontmatterFields.has(key));
    assertions.push(assertion(agentName, "frontmatter uses official/custom-agent fields only", unknownFrontmatterKeys.length === 0, unknownFrontmatterKeys.join(", ") || "ok"));
    assertions.push(assertion(agentName, "name matches filename", frontmatter.name === agentName, String(frontmatter.name ?? "")));
    assertions.push(assertion(agentName, "description is substantive", typeof frontmatter.description === "string" && frontmatter.description.trim().length >= 40, String(frontmatter.description ?? "")));
    assertions.push(assertion(agentName, "target is github-copilot", frontmatter.target === "github-copilot", String(frontmatter.target ?? "")));

    const tools = normalizeTools(frontmatter.tools);
    assertions.push(assertion(agentName, "tools is a list or comma-separated string", Array.isArray(frontmatter.tools) || typeof frontmatter.tools === "string", JSON.stringify(frontmatter.tools ?? null)));
    assertions.push(assertion(agentName, "tools match least-privilege contract", sameArray(tools, expected.tools), `actual: ${tools.join(", ")} expected: ${expected.tools.join(", ")}`));
    const unsupportedTools = tools.filter((tool) => !hasAllowedToolName(tool));
    assertions.push(assertion(agentName, "tools use supported GitHub Copilot aliases", unsupportedTools.length === 0, unsupportedTools.join(", ") || "ok"));

    if (expected.mcpServers) {
      const mcpServers = frontmatter["mcp-servers"];
      assertions.push(assertion(agentName, "mcp-servers frontmatter is configured", typeof mcpServers === "object" && mcpServers !== null && !Array.isArray(mcpServers), JSON.stringify(mcpServers ?? null)));
      for (const [serverName, expectedServer] of Object.entries(expected.mcpServers)) {
        const actualServer = mcpServers?.[serverName];
        assertions.push(assertion(agentName, `${serverName} MCP server exists`, typeof actualServer === "object" && actualServer !== null, JSON.stringify(actualServer ?? null)));
        assertions.push(assertion(agentName, `${serverName} MCP server type matches cloud-agent config`, actualServer?.type === expectedServer.type, String(actualServer?.type ?? "")));
        assertions.push(assertion(agentName, `${serverName} MCP server command matches`, actualServer?.command === expectedServer.command, String(actualServer?.command ?? "")));
        assertions.push(assertion(agentName, `${serverName} MCP server args match`, sameArray(actualServer?.args ?? [], expectedServer.args), JSON.stringify(actualServer?.args ?? [])));
        assertions.push(assertion(agentName, `${serverName} MCP server tools expose all server tools`, sameArray(actualServer?.tools ?? [], expectedServer.tools), JSON.stringify(actualServer?.tools ?? [])));
        assertions.push(assertion(agentName, `${serverName} MCP tool is present in tools array`, tools.includes(`${serverName}/*`), tools.join(", ")));
      }
    } else {
      assertions.push(assertion(agentName, "mcp-servers omitted when not required", frontmatter["mcp-servers"] === undefined, JSON.stringify(frontmatter["mcp-servers"] ?? null)));
    }

    if (frontmatter.agents !== undefined) {
      assertions.push(assertion(agentName, "agents frontmatter requires agent tool", tools.includes("agent"), tools.join(", ")));
    }

    const handoffs = frontmatter.handoffs;
    assertions.push(assertion(agentName, "handoffs is an official frontmatter array", Array.isArray(handoffs), JSON.stringify(handoffs ?? null)));
    if (!Array.isArray(handoffs)) {
      continue;
    }

    assertions.push(assertion(agentName, "handoffs match workflow count", handoffs.length === expected.handoffs.length, `${handoffs.length} -> ${expected.handoffs.length}`));
    const targets = handoffs.map((handoff) => handoff?.agent).filter(Boolean);
    assertions.push(assertion(agentName, "handoffs do not contain duplicate targets", new Set(targets).size === targets.length, targets.join(", ")));

    handoffs.forEach((handoff, index) => {
      assertions.push(...validateHandoff(agentName, handoff, index, agentNames, expected.handoffs[index]));
    });
  }

  return assertions;
}

function asReport(assertions) {
  const failed = assertions.filter((item) => !item.passed);
  const agents = {};
  for (const item of assertions) {
    agents[item.agent] ??= { passed: 0, failed: 0 };
    agents[item.agent][item.passed ? "passed" : "failed"] += 1;
  }

  return {
    ok: failed.length === 0,
    total: assertions.length,
    failed: failed.length,
    agents,
    assertions
  };
}

const json = process.argv.includes("--json");
const report = asReport(lintProfiles());

if (json) {
  console.log(JSON.stringify(report));
} else if (report.ok) {
  console.log(`Agent frontmatter lint passed (${report.total} rules).`);
} else {
  console.error(`Agent frontmatter lint failed (${report.failed}/${report.total} rules).`);
  for (const failure of report.assertions.filter((item) => !item.passed)) {
    console.error(`- ${failure.agent}: ${failure.rule}${failure.evidence ? ` (${failure.evidence})` : ""}`);
  }
}

process.exit(report.ok ? 0 : 1);
