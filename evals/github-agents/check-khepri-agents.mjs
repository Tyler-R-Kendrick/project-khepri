import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const checkerDir = path.dirname(fileURLToPath(import.meta.url));

const expectedAgents = {
  "khepri-orchestrator": {
    tools: ["read", "search", "agent", "github/*"],
    sections: ["Mission", "Operating Flow", "Subagent Delegation", "Guardrails", "Handoffs"],
    mentions: [
      "khepri-evolution",
      "khepri-spec",
      "khepri-knowledge",
      "app-modernization",
      "data-modernization",
      "infra-modernization",
      "security-modernization",
      "khepri-planner",
      "khepri-squad-generator",
      "khepri-scaffold",
      "khepri-code",
      "khepri-test",
      "khepri-modernization-assessor"
    ]
  },
  "khepri-spec": {
    tools: ["read", "search", "edit", "execute", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["intermediary representations", "IR", "legacy system", "missing specs"]
  },
  "khepri-knowledge": {
    tools: ["read", "search", "edit", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["KnowledgeGraphRag", "index", "business context", "test results"]
  },
  "khepri-planner": {
    tools: ["read", "search", "edit", "agent", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["approval", "regression suite", "scaffolding plan", "implementation plan"]
  },
  "khepri-squad-generator": {
    tools: ["read", "search", "edit", "execute", "agent", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: [
      "SDK-first squad",
      "squad.config.ts",
      "AgentEvals",
      "AgentV",
      "evaluators",
      "test data",
      "squad members",
      "rubric",
      "live-evals",
      "multiple improvement loops",
      "steer too far",
      "rubric adherence"
    ]
  },
  "khepri-scaffold": {
    tools: ["read", "search", "edit", "execute"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["project scaffolding", "minimal type signatures", "buildable"]
  },
  "khepri-code": {
    tools: ["read", "search", "edit", "execute", "agent"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["TDD", "tests first", "test feedback", "refactor"]
  },
  "khepri-test": {
    tools: ["read", "search", "execute"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["run tests", "test results", "failure", "reproducible"]
  },
  "khepri-modernization-assessor": {
    tools: ["read", "search", "execute", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["modernization", "risk", "parity", "acceptance"]
  },
  "app-modernization": {
    tools: ["read", "search", "agent", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["strangler", "branch by abstraction", "contract tests", "when to use"]
  },
  "data-modernization": {
    tools: ["read", "search", "agent", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["expand/contract", "dual-write", "CDC", "when to use"]
  },
  "infra-modernization": {
    tools: ["read", "search", "agent", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["infrastructure as code", "blue-green", "observability", "when to use"]
  },
  "security-modernization": {
    tools: ["read", "search", "agent", "github/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["threat modeling", "identity and access", "secrets", "vulnerability", "security regression", "when to use"]
  },
  "khepri-evolution": {
    tools: ["read", "search", "edit", "execute", "agent", "github/*", "awesome-copilot/*"],
    sections: ["Mission", "Inputs", "Outputs", "Guardrails", "Handoffs"],
    mentions: ["Agent Skills", "agentskills.io", "learn", "STEERING.md", "skill improvement", "awesome-copilot", "modernization outcomes", "run alongside", "all other agent work", "continuous improvement companion"]
  }
};

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

const docsFlowPhrases = [
  "legacy system",
  "intermediary representations",
  "index IR specs",
  "business context",
  "regression suite",
  "test plan",
  "run tests",
  "test results",
  "target system",
  "team patterns",
  "scaffolding plan",
  "minimal type signatures",
  "test feedback",
  "refactor code",
  "modernization assessment",
  "agent skills",
  "continuous evolution",
  "parallel improvement",
  "STEERING.md"
];

const skillNamePattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

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

function repoRoot() {
  return path.resolve(checkerDir, "..", "..");
}

function agentDirectory() {
  return path.join(repoRoot(), ".github", "agents");
}

function parseMarkdownWithFrontmatter(filePath) {
  const raw = readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      filePath,
      frontmatter: {},
      prompt: raw,
      parseError: "Missing YAML frontmatter fence"
    };
  }

  try {
    return {
      filePath,
      frontmatter: YAML.parse(match[1]) ?? {},
      prompt: match[2].trim(),
      parseError: null
    };
  } catch (error) {
    return {
      filePath,
      frontmatter: {},
      prompt: match[2].trim(),
      parseError: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseProfile(filePath) {
  return parseMarkdownWithFrontmatter(filePath);
}

function loadProfiles() {
  const dir = agentDirectory();
  if (!existsSync(dir)) {
    return { dir, profiles: new Map(), directoryExists: false };
  }

  const profiles = new Map();
  for (const fileName of readdirSync(dir)) {
    if (!fileName.endsWith(".md") || fileName.endsWith(".agent.md")) {
      continue;
    }

    const profile = parseProfile(path.join(dir, fileName));
    profiles.set(fileName.replace(/\.md$/, ""), profile);
  }

  return { dir, profiles, directoryExists: true };
}

function assertion(text, passed, evidence) {
  return { text, passed, ...(evidence ? { evidence } : {}) };
}

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

function hasPhrase(text, phrase) {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function readTextIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf8").replace(/\r\n/g, "\n") : null;
}

function readYamlIfExists(filePath) {
  const text = readTextIfExists(filePath);
  if (text === null) {
    return { exists: false, data: null, parseError: "missing" };
  }

  try {
    return { exists: true, data: YAML.parse(text) ?? {}, parseError: null };
  } catch (error) {
    return { exists: true, data: null, parseError: error instanceof Error ? error.message : String(error) };
  }
}

function loadLearnSkill() {
  const skillPath = path.join(repoRoot(), ".github", "skills", "learn", "SKILL.md");
  if (!existsSync(skillPath)) {
    return { skillPath, exists: false };
  }

  return {
    skillPath,
    exists: true,
    ...parseMarkdownWithFrontmatter(skillPath)
  };
}

function loadSpecKitSkill() {
  const skillPath = path.join(repoRoot(), ".github", "skills", "spec-kit", "SKILL.md");
  if (!existsSync(skillPath)) {
    return { skillPath, exists: false };
  }

  return {
    skillPath,
    exists: true,
    ...parseMarkdownWithFrontmatter(skillPath)
  };
}

function loadModernizationWorkflowSkill() {
  const skillPath = path.join(repoRoot(), ".github", "skills", "khepri-modernization-workflow", "SKILL.md");
  if (!existsSync(skillPath)) {
    return { skillPath, exists: false };
  }

  return {
    skillPath,
    exists: true,
    ...parseMarkdownWithFrontmatter(skillPath)
  };
}

function loadArchitectureDocsSkill() {
  const skillPath = path.join(repoRoot(), ".github", "skills", "keep-architecture-docs-current", "SKILL.md");
  if (!existsSync(skillPath)) {
    return { skillPath, exists: false };
  }

  return {
    skillPath,
    exists: true,
    ...parseMarkdownWithFrontmatter(skillPath)
  };
}

function loadLearnHook() {
  const hookPath = path.join(repoRoot(), ".github", "hooks", "learn.json");
  if (!existsSync(hookPath)) {
    return { hookPath, exists: false, config: null, parseError: "missing" };
  }

  try {
    return {
      hookPath,
      exists: true,
      config: JSON.parse(readFileSync(hookPath, "utf8")),
      parseError: null
    };
  } catch (error) {
    return {
      hookPath,
      exists: true,
      config: null,
      parseError: error instanceof Error ? error.message : String(error)
    };
  }
}

function loadArchitectureDocsHook() {
  const hookPath = path.join(repoRoot(), ".github", "hooks", "architecture-docs.json");
  if (!existsSync(hookPath)) {
    return { hookPath, exists: false, config: null, parseError: "missing" };
  }

  try {
    return {
      hookPath,
      exists: true,
      config: JSON.parse(readFileSync(hookPath, "utf8")),
      parseError: null
    };
  } catch (error) {
    return {
      hookPath,
      exists: true,
      config: null,
      parseError: error instanceof Error ? error.message : String(error)
    };
  }
}

function checkProfileSchema(state) {
  const assertions = [
    assertion(".github/agents directory exists", state.directoryExists, state.dir)
  ];

  for (const [agentName, expectation] of Object.entries(expectedAgents)) {
    const profile = state.profiles.get(agentName);
    assertions.push(assertion(`${agentName}.md exists`, Boolean(profile), profile?.filePath));
    if (!profile) {
      continue;
    }

    const { frontmatter, prompt, parseError } = profile;
    assertions.push(assertion(`${agentName} frontmatter parses as YAML`, !parseError, parseError ?? "ok"));
    assertions.push(assertion(`${agentName} frontmatter name matches filename`, frontmatter.name === agentName, String(frontmatter.name ?? "")));
    assertions.push(assertion(`${agentName} has a useful description`, typeof frontmatter.description === "string" && frontmatter.description.length >= 40, frontmatter.description));
    assertions.push(assertion(`${agentName} targets GitHub Copilot`, frontmatter.target === "github-copilot", String(frontmatter.target ?? "")));
    assertions.push(assertion(`${agentName} prompt is substantive`, prompt.length >= 500, `${prompt.length} characters`));
    assertions.push(assertion(`${agentName} uses STEERING.md`, hasPhrase(prompt, "STEERING.md"), "STEERING.md"));

    const tools = normalizeTools(frontmatter.tools);
    const unrecognized = tools.filter((tool) => !allowedTools.has(tool));
    assertions.push(assertion(`${agentName} uses supported tool aliases`, unrecognized.length === 0, unrecognized.join(", ") || "ok"));
    assertions.push(assertion(`${agentName} has expected tools`, sameSet(tools, expectation.tools), `actual: ${tools.join(", ")}`));
  }

  return assertions;
}

function sameSet(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }

  const actualSet = new Set(actual);
  return expected.every((item) => actualSet.has(item));
}

function sameArray(actual, expected) {
  return actual.length === expected.length && expected.every((item, index) => actual[index] === item);
}

function checkOrchestration(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-orchestrator");
  assertions.push(assertion("khepri-orchestrator profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  const tools = normalizeTools(profile.frontmatter.tools);
  assertions.push(assertion("orchestrator can invoke subagents", tools.includes("agent"), tools.join(", ")));

  const sequence = expectedAgents["khepri-orchestrator"].mentions;
  const handoffs = profile.frontmatter.handoffs;
  assertions.push(assertion("orchestrator declares frontmatter handoffs", Array.isArray(handoffs), JSON.stringify(handoffs ?? null)));
  if (Array.isArray(handoffs)) {
    const handoffAgents = handoffs.map((handoff) => handoff?.agent);
    assertions.push(assertion("orchestrator frontmatter handoffs match docs flow order", sameArray(handoffAgents, sequence), handoffAgents.join(", ")));
    for (const handoff of handoffs) {
      assertions.push(assertion(`orchestrator handoff ${handoff?.agent} uses official object syntax`, typeof handoff?.label === "string" && typeof handoff?.agent === "string" && typeof handoff?.prompt === "string" && typeof handoff?.send === "boolean", JSON.stringify(handoff)));
    }
  }

  let lastIndex = -1;
  for (const agentName of sequence) {
    const index = prompt.indexOf(agentName);
    assertions.push(assertion(`orchestrator mentions ${agentName}`, index >= 0, index >= 0 ? `index ${index}` : "missing"));
    assertions.push(assertion(`${agentName} appears in delegation order`, index > lastIndex, `previous ${lastIndex}, current ${index}`));
    lastIndex = index;
  }

  if (Array.isArray(handoffs)) {
    const firstHandoff = handoffs[0];
    assertions.push(assertion("orchestrator starts khepri-evolution first", firstHandoff?.agent === "khepri-evolution", JSON.stringify(firstHandoff)));
    assertions.push(assertion("orchestrator marks evolution as continuous", hasPhrase(firstHandoff?.prompt ?? "", "run alongside every active Project Khepri agent phase"), firstHandoff?.prompt));
  }

  for (const phrase of ["human approval", "parallel", "phase", "handoff", "evidence", "run alongside", "every active", "continuous improvement companion", "parallel improvement"]) {
    assertions.push(assertion(`orchestrator covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkBoundedContracts(state) {
  const assertions = [];

  for (const [agentName, expectation] of Object.entries(expectedAgents)) {
    const profile = state.profiles.get(agentName);
    assertions.push(assertion(`${agentName} profile exists`, Boolean(profile), profile?.filePath));
    if (!profile) {
      continue;
    }

    for (const section of expectation.sections) {
      assertions.push(assertion(`${agentName} defines ${section}`, hasMarkdownHeading(profile.prompt, section), section));
    }

    for (const phrase of expectation.mentions) {
      assertions.push(assertion(`${agentName} mentions ${phrase}`, hasPhrase(profile.prompt, phrase), phrase));
    }
  }

  return assertions;
}

function hasMarkdownHeading(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^#{2,3}\\s+${escaped}\\s*$`, "im").test(markdown);
}

function checkLeastPrivilegeTools(state) {
  const assertions = checkProfileSchema(state).filter((item) => item.text.includes("has expected tools"));
  const readOnlyAgents = ["khepri-test", "khepri-modernization-assessor"];

  for (const agentName of readOnlyAgents) {
    const profile = state.profiles.get(agentName);
    if (!profile) {
      continue;
    }

    const tools = normalizeTools(profile.frontmatter.tools);
    assertions.push(assertion(`${agentName} cannot edit files`, !tools.includes("edit"), tools.join(", ")));
  }

  const testTools = normalizeTools(state.profiles.get("khepri-test")?.frontmatter.tools);
  assertions.push(assertion("khepri-test can execute verification commands", testTools.includes("execute"), testTools.join(", ")));

  const orchestratorTools = normalizeTools(state.profiles.get("khepri-orchestrator")?.frontmatter.tools);
  assertions.push(assertion("khepri-orchestrator does not directly edit code", !orchestratorTools.includes("edit"), orchestratorTools.join(", ")));
  assertions.push(assertion("khepri-orchestrator does not directly execute commands", !orchestratorTools.includes("execute"), orchestratorTools.join(", ")));

  const evolutionTools = normalizeTools(state.profiles.get("khepri-evolution")?.frontmatter.tools);
  assertions.push(assertion("khepri-evolution can edit skills and hooks", evolutionTools.includes("edit"), evolutionTools.join(", ")));
  assertions.push(assertion("khepri-evolution can run validation commands", evolutionTools.includes("execute"), evolutionTools.join(", ")));

  return assertions;
}

function checkDocsBranchFlowCoverage(state) {
  const prompts = Array.from(state.profiles.values())
    .map((profile) => profile.prompt)
    .join("\n\n");

  const assertions = [];
  for (const phrase of docsFlowPhrases) {
    assertions.push(assertion(`custom agents cover docs flow phrase: ${phrase}`, hasPhrase(prompts, phrase), phrase));
  }

  const orchestrator = state.profiles.get("khepri-orchestrator");
  assertions.push(assertion("orchestrator has the implemented workflow as its operating sequence", Boolean(orchestrator) && (hasPhrase(orchestrator.prompt, "implemented workflow") || hasPhrase(orchestrator.prompt, "workflow contract")), "implemented workflow"));

  return assertions;
}

function checkEvolutionAgent(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-evolution");
  assertions.push(assertion("khepri-evolution profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  const tools = normalizeTools(profile.frontmatter.tools);
  for (const phrase of [
    "Agent Skills",
    "agentskills.io",
    ".github/skills",
    "SKILL.md",
    "name",
    "description",
    "1024 characters",
    "progressive disclosure",
    "learn",
    "STEERING.md",
    "skill improvement",
    "awesome-copilot",
    "agents",
    "skills",
    "MCPs",
    "tools",
    "hooks",
    "plugins",
    "instructions",
    "prompts",
    "workflows",
    "modernization outcomes",
    "run alongside",
    "all other agent work",
    "continuous improvement companion",
    "phase owner",
    "parallel improvement",
    "#search_instructions",
    "#load_instruction",
    "recommend",
    "approval"
  ]) {
    assertions.push(assertion(`khepri-evolution covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  const mcpServer = profile.frontmatter["mcp-servers"]?.["awesome-copilot"];
  assertions.push(assertion("khepri-evolution exposes awesome-copilot MCP tools", tools.includes("awesome-copilot/*"), tools.join(", ")));
  assertions.push(assertion("khepri-evolution configures awesome-copilot MCP", typeof mcpServer === "object" && mcpServer !== null, JSON.stringify(mcpServer ?? null)));
  assertions.push(assertion("awesome-copilot MCP uses local type", mcpServer?.type === awesomeCopilotMcp.type, String(mcpServer?.type ?? "")));
  assertions.push(assertion("awesome-copilot MCP uses docker command", mcpServer?.command === awesomeCopilotMcp.command, String(mcpServer?.command ?? "")));
  assertions.push(assertion("awesome-copilot MCP uses official image args", sameArray(mcpServer?.args ?? [], awesomeCopilotMcp.args), JSON.stringify(mcpServer?.args ?? [])));
  assertions.push(assertion("awesome-copilot MCP exposes all server tools", sameArray(mcpServer?.tools ?? [], awesomeCopilotMcp.tools), JSON.stringify(mcpServer?.tools ?? [])));

  return assertions;
}

function checkSpecAgentEvalContract(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-spec");
  assertions.push(assertion("khepri-spec profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  for (const phrase of [
    "AgentEvals",
    "AgentV",
    "EVAL.yaml",
    "agent implementation",
    "acceptance criteria",
    "test scenarios",
    "code-grader",
    "expected red signal",
    "before prompt or profile changes"
  ]) {
    assertions.push(assertion(`khepri-spec covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkEvolutionAgentAgentvTdd(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-evolution");
  assertions.push(assertion("khepri-evolution profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  for (const phrase of [
    "AgentEvals",
    "AgentV",
    "TDD",
    "write scenarios first",
    "baseline",
    "candidate",
    "compare",
    "review failures",
    "one targeted improvement",
    "no new regressions",
    "re-run and iterate"
  ]) {
    assertions.push(assertion(`khepri-evolution covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkEvolutionAgentIterationDiscipline(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-evolution");
  assertions.push(assertion("khepri-evolution profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  for (const phrase of [
    "improvement backlog",
    "iteration ledger",
    "hypothesis",
    "expected score movement",
    "baseline score",
    "candidate score",
    "changed files",
    "rollback plan",
    "stop condition",
    "residual risk",
    "next experiment"
  ]) {
    assertions.push(assertion(`khepri-evolution covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkEvolutionAgentTddEvidence(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-evolution");
  assertions.push(assertion("khepri-evolution profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  for (const phrase of [
    "RED evidence",
    "GREEN evidence",
    "RED command",
    "GREEN command",
    "exit status",
    "artifact path",
    "focused check",
    "broader validation",
    "failing for the expected reason",
    "do not weaken assertions",
    "update scenario before implementation"
  ]) {
    assertions.push(assertion(`khepri-evolution covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkEvolutionAgentTechstackSpecialization(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-evolution");
  assertions.push(assertion("khepri-evolution profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  for (const phrase of [
    "techstack-specific agents",
    "techstack-specific skills",
    "MCP servers",
    "legacy system",
    "target system",
    "simulation harness",
    "emulation harness",
    "runtime runbook",
    "installation commands",
    "test commands",
    "knowledge packets",
    "specialist creation brief",
    "iterate deep knowledge",
    "retire, merge, or narrow"
  ]) {
    assertions.push(assertion(`khepri-evolution covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkEvolutionAgentSpecialistArtifactCoverage(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-evolution");
  assertions.push(assertion("khepri-evolution profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  for (const phrase of [
    "agent profile checklist",
    "skill authoring checklist",
    "hook automation checklist",
    "MCP server contract",
    "tool access model",
    "least privilege tools",
    "handoff owner",
    "evaluation scenarios",
    "skill invocation examples",
    "maintenance owner",
    "deprecation signal",
    "security review"
  ]) {
    assertions.push(assertion(`khepri-evolution covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkTddAgentsAgentEvals(state) {
  const assertions = [];
  const code = state.profiles.get("khepri-code");
  const test = state.profiles.get("khepri-test");
  assertions.push(assertion("khepri-code profile exists", Boolean(code), code?.filePath));
  assertions.push(assertion("khepri-test profile exists", Boolean(test), test?.filePath));

  if (code) {
    for (const phrase of [
      "AgentEvals",
      "AgentV",
      "failing eval",
      "code-grader",
      "RED",
      "GREEN",
      "smallest prompt or profile change",
      "red/green evidence"
    ]) {
      assertions.push(assertion(`khepri-code covers ${phrase}`, hasPhrase(code.prompt, phrase), phrase));
    }
  }

  if (test) {
    for (const phrase of [
      "AgentEvals",
      "AgentV",
      "agentv validate",
      "agentv eval",
      "red/green evidence",
      "exit code",
      "focused rerun",
      "broader validation"
    ]) {
      assertions.push(assertion(`khepri-test covers ${phrase}`, hasPhrase(test.prompt, phrase), phrase));
    }
  }

  return assertions;
}

function checkSquadGeneratorAgent(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-squad-generator");
  assertions.push(assertion("khepri-squad-generator profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  const tools = normalizeTools(profile.frontmatter.tools);
  assertions.push(assertion("khepri-squad-generator can edit generated artifacts", tools.includes("edit"), tools.join(", ")));
  assertions.push(assertion("khepri-squad-generator can run eval and build commands", tools.includes("execute"), tools.join(", ")));
  assertions.push(assertion("khepri-squad-generator can request bounded subagent review", tools.includes("agent"), tools.join(", ")));

  for (const phrase of [
    "SDK-first squad",
    "squad.config.ts",
    "AgentEvals",
    "AgentV",
    "generated AgentV scenarios",
    "evaluators",
    "test data",
    "squad members",
    "squad member rubric",
    "rubric adherence",
    "live-evals",
    "test/dev loop",
    "multiple improvement loops",
    "steer too far",
    "improve squad members",
    "RED evidence",
    "GREEN evidence"
  ]) {
    assertions.push(assertion(`khepri-squad-generator covers ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkSquadGenerationRubricLiveEvalLoop(state) {
  const assertions = [];
  const generator = state.profiles.get("khepri-squad-generator");
  const planner = state.profiles.get("khepri-planner");
  const code = state.profiles.get("khepri-code");
  const test = state.profiles.get("khepri-test");
  const orchestrator = state.profiles.get("khepri-orchestrator");
  assertions.push(assertion("khepri-squad-generator profile exists", Boolean(generator), generator?.filePath));
  assertions.push(assertion("khepri-planner profile exists", Boolean(planner), planner?.filePath));
  assertions.push(assertion("khepri-code profile exists", Boolean(code), code?.filePath));
  assertions.push(assertion("khepri-test profile exists", Boolean(test), test?.filePath));
  assertions.push(assertion("khepri-orchestrator profile exists", Boolean(orchestrator), orchestrator?.filePath));

  const combinedText = [
    generator?.prompt ?? "",
    planner?.prompt ?? "",
    code?.prompt ?? "",
    test?.prompt ?? "",
    orchestrator?.prompt ?? ""
  ].join("\n");

  for (const phrase of [
    "squad generation loop",
    "TDD using AgentEvals",
    "write scenarios first",
    "generated AgentV scenarios",
    "evaluators",
    "test data",
    "squad members",
    "squad member rubric",
    "live-evals",
    "test/dev loop",
    "steer too far",
    "improve squad members",
    "multiple improvement loops",
    "focused rerun",
    "broader validation"
  ]) {
    assertions.push(assertion(`squad generation loop covers ${phrase}`, hasPhrase(combinedText, phrase), phrase));
  }

  return assertions;
}

function checkSdkSquadGeneratorConfig() {
  const root = repoRoot();
  const configPath = path.join(root, "squad.config.ts");
  const config = readTextIfExists(configPath) ?? "";
  const assertions = [
    assertion("squad.config.ts exists", existsSync(configPath), configPath)
  ];

  for (const phrase of [
    "defineSquad",
    "defineAgent",
    "squad-generator",
    "SDK-first squad",
    "AgentEvals",
    "evaluators",
    "test data",
    "squad member rubric",
    "live-evals",
    "multiple improvement loops",
    "rubric adherence"
  ]) {
    assertions.push(assertion(`SDK squad config covers ${phrase}`, hasPhrase(config, phrase), phrase));
  }

  return assertions;
}

function checkSecurityModernizationPatternAgent(state) {
  const assertions = [];
  const profile = state.profiles.get("security-modernization");
  assertions.push(assertion("security-modernization profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const combinedText = `${JSON.stringify(profile.frontmatter)}\n${profile.prompt}`;
  for (const phrase of [
    "threat modeling",
    "identity and access",
    "secrets rotation",
    "vulnerability remediation",
    "compliance",
    "security regression checks",
    "compensating controls",
    "rollback",
    "khepri-planner",
    "khepri-modernization-assessor",
    "evals/legacy-samples",
    "generated squad"
  ]) {
    assertions.push(assertion(`security-modernization covers ${phrase}`, hasPhrase(combinedText, phrase), phrase));
  }

  return assertions;
}

function checkKnowledgeAgentQueryableKbToolDiscovery(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-knowledge");
  assertions.push(assertion("khepri-knowledge profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  for (const phrase of [
    "queryable knowledge base",
    "available knowledge-modeling capabilities",
    "MCP servers",
    "tools",
    "skills",
    "wiki",
    "database",
    "graph",
    "without requiring the user to name",
    "select the best available capability",
    "fallback repository-owned knowledge manifest",
    "query smoke check",
    "record the selected capability"
  ]) {
    assertions.push(assertion(`khepri-knowledge discovers queryable KB tooling: ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkKnowledgeAgentLegacyKbModeling(state) {
  const assertions = [];
  const knowledge = state.profiles.get("khepri-knowledge");
  const spec = state.profiles.get("khepri-spec");
  const orchestrator = state.profiles.get("khepri-orchestrator");
  assertions.push(assertion("khepri-knowledge profile exists", Boolean(knowledge), knowledge?.filePath));
  assertions.push(assertion("khepri-spec profile exists", Boolean(spec), spec?.filePath));
  assertions.push(assertion("khepri-orchestrator profile exists", Boolean(orchestrator), orchestrator?.filePath));

  const combinedText = `${knowledge?.prompt ?? ""}\n${spec?.prompt ?? ""}\n${orchestrator?.prompt ?? ""}`;
  for (const phrase of [
    "legacy knowledge extraction",
    "legacy knowledge generation",
    "source-backed requirements",
    "intermediary representations",
    "regression seed tests",
    "queryable knowledge base",
    "legacy-requirements-specs-tests",
    "handoff to the knowledge agent"
  ]) {
    assertions.push(assertion(`legacy knowledge modeling covers ${phrase}`, hasPhrase(combinedText, phrase), phrase));
  }

  return assertions;
}

function checkKnowledgeAgentTargetKbModeling(state) {
  const assertions = [];
  const knowledge = state.profiles.get("khepri-knowledge");
  const spec = state.profiles.get("khepri-spec");
  const orchestrator = state.profiles.get("khepri-orchestrator");
  assertions.push(assertion("khepri-knowledge profile exists", Boolean(knowledge), knowledge?.filePath));
  assertions.push(assertion("khepri-spec profile exists", Boolean(spec), spec?.filePath));
  assertions.push(assertion("khepri-orchestrator profile exists", Boolean(orchestrator), orchestrator?.filePath));

  const combinedText = `${knowledge?.prompt ?? ""}\n${spec?.prompt ?? ""}\n${orchestrator?.prompt ?? ""}`;
  for (const phrase of [
    "desired-state knowledge extraction",
    "desired-state knowledge generation",
    "target requirements",
    "target specs",
    "test-PLANS",
    "acceptance criteria",
    "queryable knowledge base",
    "target-requirements-specs-test-plans",
    "handoff to the knowledge agent"
  ]) {
    assertions.push(assertion(`target knowledge modeling covers ${phrase}`, hasPhrase(combinedText, phrase), phrase));
  }

  return assertions;
}

function checkKnowledgeAgentRefinementLoop(state) {
  const assertions = [];
  const knowledge = state.profiles.get("khepri-knowledge");
  const test = state.profiles.get("khepri-test");
  const evolution = state.profiles.get("khepri-evolution");
  const orchestrator = state.profiles.get("khepri-orchestrator");
  assertions.push(assertion("khepri-knowledge profile exists", Boolean(knowledge), knowledge?.filePath));
  assertions.push(assertion("khepri-test profile exists", Boolean(test), test?.filePath));
  assertions.push(assertion("khepri-evolution profile exists", Boolean(evolution), evolution?.filePath));
  assertions.push(assertion("khepri-orchestrator profile exists", Boolean(orchestrator), orchestrator?.filePath));

  const combinedText = `${knowledge?.prompt ?? ""}\n${test?.prompt ?? ""}\n${evolution?.prompt ?? ""}\n${orchestrator?.prompt ?? ""}`;
  for (const phrase of [
    "intra modernization",
    "dev/test loops",
    "refine the knowledge base",
    "test feedback",
    "verification evidence",
    "steering behaviors",
    "STEERING.md",
    "learn",
    "queryable knowledge base",
    "red/green/refactor"
  ]) {
    assertions.push(assertion(`knowledge refinement loop covers ${phrase}`, hasPhrase(combinedText, phrase), phrase));
  }

  return assertions;
}

function checkRequestedToolingInstallation() {
  const root = repoRoot();
  const assertions = [];
  const requiredSkillPaths = [
    [".agents skill sensei exists", path.join(root, ".agents", "skills", "sensei", "SKILL.md")],
    [".agents skill editorconfig exists", path.join(root, ".agents", "skills", "editorconfig", "SKILL.md")],
    [".agents skill microsoft-skill-creator exists", path.join(root, ".agents", "skills", "microsoft-skill-creator", "SKILL.md")],
    [".agents skill create-architectural-decision-record exists", path.join(root, ".agents", "skills", "create-architectural-decision-record", "SKILL.md")],
    ["ADR generator agent artifact exists", path.join(root, ".agents", "agents", "adr-generator.agent.md")],
    ["form-builder APM skill exists", path.join(root, ".github", "skills", "form-builder", "SKILL.md")],
    ["APM compiled AGENTS.md exists", path.join(root, "AGENTS.md")]
  ];

  for (const [text, filePath] of requiredSkillPaths) {
    assertions.push(assertion(text, existsSync(filePath), filePath));
  }

  const apmConfigPath = path.join(root, "apm.yml");
  const apmConfig = readYamlIfExists(apmConfigPath);
  assertions.push(assertion("apm.yml exists", apmConfig.exists, apmConfigPath));
  assertions.push(assertion("apm.yml parses", apmConfig.exists && !apmConfig.parseError, apmConfig.parseError ?? "ok"));
  const apmDeps = apmConfig.data?.dependencies?.apm ?? [];
  assertions.push(assertion("apm.yml includes danielmeppiel/form-builder", Array.isArray(apmDeps) && apmDeps.includes("danielmeppiel/form-builder"), JSON.stringify(apmDeps)));

  const allagentsPath = path.join(root, ".allagents", "workspace.yaml");
  const allagents = readYamlIfExists(allagentsPath);
  assertions.push(assertion("allagents workspace exists", allagents.exists, allagentsPath));
  assertions.push(assertion("allagents workspace parses", allagents.exists && !allagents.parseError, allagents.parseError ?? "ok"));
  assertions.push(assertion("microsoftdocs/mcp plugin installed", (allagents.data?.plugins ?? []).includes("microsoftdocs/mcp"), JSON.stringify(allagents.data?.plugins ?? [])));
  assertions.push(assertion("microsoft-learn MCP configured", allagents.data?.mcpServers?.["microsoft-learn"]?.url === "https://learn.microsoft.com/api/mcp", JSON.stringify(allagents.data?.mcpServers?.["microsoft-learn"] ?? null)));
  assertions.push(assertion("microsoft-learn MCP uses http transport", allagents.data?.mcpServers?.["microsoft-learn"]?.type === "http", String(allagents.data?.mcpServers?.["microsoft-learn"]?.type ?? "")));

  return assertions;
}

function checkLearnSkillAndHook() {
  const assertions = [];
  const skill = loadLearnSkill();
  assertions.push(assertion("learn skill exists", skill.exists, skill.skillPath));
  if (skill.exists) {
    assertions.push(assertion("learn skill frontmatter parses", !skill.parseError, skill.parseError ?? "ok"));
    assertions.push(assertion("learn skill name matches folder", skill.frontmatter?.name === "learn", String(skill.frontmatter?.name ?? "")));
    assertions.push(assertion("learn skill description is spec sized", typeof skill.frontmatter?.description === "string" && skill.frontmatter.description.length >= 1 && skill.frontmatter.description.length <= 1024, String(skill.frontmatter?.description?.length ?? 0)));
    assertions.push(assertion("learn skill name follows agentskills.io naming", skillNamePattern.test(skill.frontmatter?.name ?? ""), String(skill.frontmatter?.name ?? "")));
    for (const phrase of ["user correction", "succinct generalization", "STEERING.md", "do not store secrets", "read before work"]) {
      assertions.push(assertion(`learn skill mentions ${phrase}`, hasPhrase(skill.prompt, phrase), phrase));
    }
  }

  const hook = loadLearnHook();
  assertions.push(assertion("learn hook exists", hook.exists, hook.hookPath));
  assertions.push(assertion("learn hook parses as JSON", hook.exists && !hook.parseError, hook.parseError ?? "ok"));
  const userPromptHooks = hook.config?.hooks?.userPromptSubmitted;
  assertions.push(assertion("learn hook uses userPromptSubmitted", Array.isArray(userPromptHooks) && userPromptHooks.length > 0, "userPromptSubmitted"));
  const hookEntry = Array.isArray(userPromptHooks) ? userPromptHooks[0] : null;
  assertions.push(assertion("learn hook is named learn", hookEntry?.name === "learn" || hookEntry?.comment?.includes("learn"), JSON.stringify(hookEntry ?? {})));
  assertions.push(assertion("learn hook calls learn script", JSON.stringify(hookEntry ?? {}).includes("learn.mjs"), JSON.stringify(hookEntry ?? {})));

  const scriptPath = path.join(repoRoot(), ".github", "hooks", "scripts", "learn.mjs");
  const script = readTextIfExists(scriptPath);
  assertions.push(assertion("learn hook script exists", Boolean(script), scriptPath));
  if (script) {
    for (const phrase of ["STEERING.md", "userPrompt", "correction", "succinct", "fs"]) {
      assertions.push(assertion(`learn hook script mentions ${phrase}`, hasPhrase(script, phrase), phrase));
    }

    const tmpRoot = mkdtempSync(path.join(tmpdir(), "khepri-learn-"));
    const steeringPath = path.join(tmpRoot, "STEERING.md");
    try {
      const result = spawnSync(process.execPath, [scriptPath], {
        input: JSON.stringify({
          timestamp: 1704614500000,
          cwd: repoRoot(),
          prompt: "Actually, when I say verify agents, always run the AgentV eval and not just inspect files."
        }),
        encoding: "utf8",
        env: {
          ...process.env,
          LEARN_STEERING_PATH: steeringPath
        }
      });
      const steeringOutput = readTextIfExists(steeringPath) ?? "";
      assertions.push(assertion("learn hook script exits successfully", result.status === 0, result.stderr || result.stdout));
      assertions.push(assertion("learn hook script writes STEERING.md", existsSync(steeringPath), steeringPath));
      assertions.push(assertion("learn hook script generalizes correction", hasPhrase(steeringOutput, "AgentV eval") && hasPhrase(steeringOutput, "inspect files"), steeringOutput));
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  }

  return assertions;
}

function checkArchitectureDocsSkillAndHook() {
  const assertions = [];
  const skill = loadArchitectureDocsSkill();
  assertions.push(assertion("architecture docs skill exists", skill.exists, skill.skillPath));
  if (skill.exists) {
    const frontmatter = skill.frontmatter ?? {};
    assertions.push(assertion("architecture docs skill frontmatter parses", !skill.parseError, skill.parseError ?? "ok"));
    assertions.push(assertion("architecture docs skill name matches folder", frontmatter.name === "keep-architecture-docs-current", String(frontmatter.name ?? "")));
    assertions.push(assertion("architecture docs skill name follows agentskills.io naming", skillNamePattern.test(frontmatter.name ?? ""), String(frontmatter.name ?? "")));
    assertions.push(assertion("architecture docs skill description is spec sized", typeof frontmatter.description === "string" && frontmatter.description.length >= 1 && frontmatter.description.length <= 1024, String(frontmatter.description?.length ?? 0)));
    for (const phrase of ["source of truth", "Mermaid", "README.md", "docs/architecture/README.md", "implemented behavior", "architecture-docs hook", "Validation"]) {
      assertions.push(assertion(`architecture docs skill mentions ${phrase}`, hasPhrase(skill.prompt, phrase), phrase));
    }
  }

  const hook = loadArchitectureDocsHook();
  assertions.push(assertion("architecture docs hook exists", hook.exists, hook.hookPath));
  assertions.push(assertion("architecture docs hook parses as JSON", hook.exists && !hook.parseError, hook.parseError ?? "ok"));
  const userPromptHooks = hook.config?.hooks?.userPromptSubmitted;
  assertions.push(assertion("architecture docs hook uses userPromptSubmitted", Array.isArray(userPromptHooks) && userPromptHooks.length > 0, "userPromptSubmitted"));
  const hookEntry = Array.isArray(userPromptHooks) ? userPromptHooks[0] : null;
  assertions.push(assertion("architecture docs hook is named for the skill", hookEntry?.name === "keep-architecture-docs-current" || hookEntry?.comment?.includes("architecture-docs"), JSON.stringify(hookEntry ?? {})));
  assertions.push(assertion("architecture docs hook calls architecture-docs script", JSON.stringify(hookEntry ?? {}).includes("architecture-docs.mjs"), JSON.stringify(hookEntry ?? {})));

  const scriptPath = path.join(repoRoot(), ".github", "hooks", "scripts", "architecture-docs.mjs");
  const script = readTextIfExists(scriptPath);
  assertions.push(assertion("architecture docs hook script exists", Boolean(script), scriptPath));
  if (script) {
    for (const phrase of ["keep-architecture-docs-current", "Mermaid diagrams", "architectureSignals", "userPrompt"]) {
      assertions.push(assertion(`architecture docs hook script mentions ${phrase}`, hasPhrase(script, phrase), phrase));
    }

    const result = spawnSync(process.execPath, [scriptPath], {
      input: JSON.stringify({
        cwd: repoRoot(),
        prompt: "Update the Microsoft Agent Framework architecture workflow and diagrams."
      }),
      encoding: "utf8"
    });
    assertions.push(assertion("architecture docs hook script exits successfully for architecture changes", result.status === 0, result.stderr || result.stdout));
    assertions.push(assertion("architecture docs hook script invokes skill", hasPhrase(result.stdout, "invoke-skill") && hasPhrase(result.stdout, "keep-architecture-docs-current"), result.stdout));
  }

  const instructionPath = path.join(repoRoot(), ".github", "instructions", "architecture-docs.instructions.md");
  const instruction = readTextIfExists(instructionPath);
  assertions.push(assertion("architecture docs instruction exists", Boolean(instruction), instructionPath));
  if (instruction) {
    for (const phrase of ["$keep-architecture-docs-current", "architecture-affecting changes", "Mermaid diagrams", "implemented behavior"]) {
      assertions.push(assertion(`architecture docs instruction mentions ${phrase}`, hasPhrase(instruction, phrase), phrase));
    }
  }

  const packageJson = readTextIfExists(path.join(repoRoot(), "package.json")) ?? "";
  assertions.push(assertion("skills validation includes architecture docs skill", hasPhrase(packageJson, "keep-architecture-docs-current"), "package.json"));

  const architectureReadme = readTextIfExists(path.join(repoRoot(), "docs", "architecture", "README.md")) ?? "";
  assertions.push(assertion("architecture overview documents current state", hasPhrase(architectureReadme, "Current Implementation") && hasPhrase(architectureReadme, "Mermaid"), "docs/architecture/README.md"));

  return assertions;
}

function checkSteeringConsumption(state) {
  const steeringPath = path.join(repoRoot(), "STEERING.md");
  const steering = readTextIfExists(steeringPath);
  const assertions = [
    assertion("STEERING.md exists", Boolean(steering), steeringPath)
  ];
  if (steering) {
    for (const phrase of ["Project Khepri Steering", "user corrections", "succinct", "generalized"]) {
      assertions.push(assertion(`STEERING.md mentions ${phrase}`, hasPhrase(steering, phrase), phrase));
    }
  }

  for (const [agentName, profile] of state.profiles.entries()) {
    assertions.push(assertion(`${agentName} reads STEERING.md`, hasPhrase(profile.prompt, "STEERING.md"), "STEERING.md"));
  }

  return assertions;
}

function checkAgentSkillsSpecCompliance() {
  const assertions = [];
  const skillsDir = path.join(repoRoot(), ".github", "skills");
  assertions.push(assertion(".github/skills directory exists", existsSync(skillsDir), skillsDir));
  const skill = loadLearnSkill();
  assertions.push(assertion("learn skill is in .github/skills", skill.skillPath.includes(`${path.sep}.github${path.sep}skills${path.sep}learn${path.sep}SKILL.md`), skill.skillPath));
  if (skill.exists) {
    const frontmatter = skill.frontmatter ?? {};
    assertions.push(assertion("skill has required name", typeof frontmatter.name === "string" && frontmatter.name.length > 0, String(frontmatter.name ?? "")));
    assertions.push(assertion("skill has required description", typeof frontmatter.description === "string" && frontmatter.description.length > 0, String(frontmatter.description ?? "")));
    assertions.push(assertion("skill name is lowercase hyphen style", skillNamePattern.test(frontmatter.name ?? ""), String(frontmatter.name ?? "")));
    assertions.push(assertion("skill description <= 1024 characters", typeof frontmatter.description === "string" && frontmatter.description.length <= 1024, String(frontmatter.description?.length ?? 0)));
    assertions.push(assertion("skill body stays concise", skill.prompt.split("\n").length <= 500, `${skill.prompt.split("\n").length} lines`));
  }

  return assertions;
}

function checkSpecKitSkill() {
  const assertions = [];
  const skill = loadSpecKitSkill();
  assertions.push(assertion("spec-kit skill exists", skill.exists, skill.skillPath));
  if (!skill.exists) {
    return assertions;
  }

  const frontmatter = skill.frontmatter ?? {};
  const description = String(frontmatter.description ?? "");
  assertions.push(assertion("spec-kit skill frontmatter parses", !skill.parseError, skill.parseError ?? "ok"));
  assertions.push(assertion("spec-kit skill name matches folder", frontmatter.name === "spec-kit", String(frontmatter.name ?? "")));
  assertions.push(assertion("spec-kit skill name follows agentskills.io naming", skillNamePattern.test(frontmatter.name ?? ""), String(frontmatter.name ?? "")));
  assertions.push(assertion("spec-kit skill description is spec sized", description.length >= 1 && description.length <= 1024, `${description.length} characters`));
  assertions.push(assertion("spec-kit skill description has explicit triggers", hasPhrase(description, "WHEN:"), description));
  for (const phrase of ["Spec Kit", "Specify CLI", "specify", "speckit", "Spec-Driven Development", "slash commands", "agent integrations"]) {
    assertions.push(assertion(`spec-kit description covers ${phrase}`, hasPhrase(description, phrase), phrase));
  }

  assertions.push(assertion("spec-kit skill body stays concise", skill.prompt.split("\n").length <= 500, `${skill.prompt.split("\n").length} lines`));
  for (const phrase of [
    "references/cli.md",
    "references/slash-commands.md",
    "references/agents-and-integrations.md",
    "references/workflow.md",
    "references/skill-standard.md",
    "scripts/check-spec-kit.ps1",
    "$speckit-specify",
    "$speckit-plan",
    "$speckit-tasks",
    "$speckit-implement"
  ]) {
    assertions.push(assertion(`spec-kit skill points to ${phrase}`, hasPhrase(skill.prompt, phrase), phrase));
  }

  const root = path.dirname(skill.skillPath);
  const expectedFiles = [
    "references/cli.md",
    "references/slash-commands.md",
    "references/agents-and-integrations.md",
    "references/workflow.md",
    "references/skill-standard.md",
    "references/sources.md",
    "scripts/check-spec-kit.ps1",
    "evals/evals.json"
  ];
  for (const relativePath of expectedFiles) {
    assertions.push(assertion(`spec-kit skill includes ${relativePath}`, existsSync(path.join(root, ...relativePath.split("/"))), relativePath));
  }

  return assertions;
}

function checkSpecAgentSpecKitSkillContract(state) {
  const assertions = [];
  const profile = state.profiles.get("khepri-spec");
  assertions.push(assertion("khepri-spec profile exists", Boolean(profile), profile?.filePath));
  if (!profile) {
    return assertions;
  }

  const prompt = profile.prompt;
  for (const phrase of [
    ".github/skills/spec-kit/SKILL.md",
    "spec-kit skill",
    "Spec Kit",
    "Specify CLI",
    "specify init",
    "Codex skills integration",
    "$speckit-constitution",
    "$speckit-specify",
    "$speckit-plan",
    "$speckit-tasks",
    "$speckit-implement",
    "slash commands",
    "agent integrations"
  ]) {
    assertions.push(assertion(`khepri-spec uses spec-kit skill guidance: ${phrase}`, hasPhrase(prompt, phrase), phrase));
  }

  return assertions;
}

function checkModernizationWorkflowSkill(state) {
  const assertions = [];
  const skill = loadModernizationWorkflowSkill();
  assertions.push(assertion("khepri modernization workflow skill exists", skill.exists, skill.skillPath));
  if (skill.exists) {
    const frontmatter = skill.frontmatter ?? {};
    const description = String(frontmatter.description ?? "");
    assertions.push(assertion("workflow skill frontmatter parses", !skill.parseError, skill.parseError ?? "ok"));
    assertions.push(assertion("workflow skill name matches folder", frontmatter.name === "khepri-modernization-workflow", String(frontmatter.name ?? "")));
    assertions.push(assertion("workflow skill name follows agentskills.io naming", skillNamePattern.test(frontmatter.name ?? ""), String(frontmatter.name ?? "")));
    assertions.push(assertion("workflow skill description is trigger-focused", description.startsWith("Use when"), description));
    assertions.push(assertion("workflow skill description is spec sized", description.length >= 1 && description.length <= 1024, `${description.length} characters`));
    assertions.push(assertion("workflow skill body stays concise", skill.prompt.split("\n").length <= 500, `${skill.prompt.split("\n").length} lines`));
    for (const phrase of [
      "dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs",
      "dotnet/src/Modernization/Workflow/GitHubCopilotModernizationAgentRegistry.cs",
      "ModernizationWorkflow.CreateContract",
      "ModernizationWorkflow.CreateAgentCallPlan",
      "BuildMicrosoftAgentFrameworkWorkflow",
      "BuildIncrementSquadWorkflow",
      "dotnet test dotnet\\tests\\Code2\\NL\\Code2NL.Tests.csproj",
      "npm run eval:agents"
    ]) {
      assertions.push(assertion(`workflow skill calls existing code: ${phrase}`, hasPhrase(skill.prompt, phrase), phrase));
    }
  }

  const registryPath = path.join(repoRoot(), "dotnet", "src", "Modernization", "Workflow", "GitHubCopilotModernizationAgentRegistry.cs");
  const registry = readTextIfExists(registryPath);
  assertions.push(assertion("GHCP registry exists", Boolean(registry), registryPath));
  if (registry) {
    for (const phrase of [
      ".github/skills",
      "WorkflowSkillName",
      "Skills =",
      "ModernizationWorkflow.WorkflowSkillName",
      "ModernizationWorkflow.OrchestratorAgentName"
    ]) {
      assertions.push(assertion(`GHCP registry exposes workflow skill: ${phrase}`, hasPhrase(registry, phrase), phrase));
    }
  }

  const orchestrator = state.profiles.get("khepri-orchestrator");
  assertions.push(assertion("khepri-orchestrator profile exists", Boolean(orchestrator), orchestrator?.filePath));
  if (orchestrator) {
    for (const phrase of [
      ".github/skills/khepri-modernization-workflow/SKILL.md",
      "khepri-modernization-workflow",
      "ModernizationWorkflow.CreateContract",
      "dotnet test dotnet\\tests\\Code2\\NL\\Code2NL.Tests.csproj"
    ]) {
      assertions.push(assertion(`orchestrator can invoke workflow skill: ${phrase}`, hasPhrase(orchestrator.prompt, phrase), phrase));
    }
  }

  return assertions;
}

function checkMafGhcpModernizationWorkflow(state) {
  const root = repoRoot();
  const workflowProjectPath = path.join(root, "dotnet", "src", "Modernization", "Workflow", "Khepri.Modernization.Workflow.csproj");
  const workflowPath = path.join(root, "dotnet", "src", "Modernization", "Workflow", "ModernizationWorkflow.cs");
  const registryPath = path.join(root, "dotnet", "src", "Modernization", "Workflow", "GitHubCopilotModernizationAgentRegistry.cs");
  const packagePropsPath = path.join(root, "dotnet", "Directory.Packages.props");
  const workflowProject = readTextIfExists(workflowProjectPath);
  const workflow = readTextIfExists(workflowPath);
  const registry = readTextIfExists(registryPath);
  const packageProps = readTextIfExists(packagePropsPath);
  const workflowText = `${workflow ?? ""}\n${registry ?? ""}`;
  const assertions = [];

  assertions.push(assertion("Microsoft Agent Framework workflow project exists", Boolean(workflowProject), workflowProjectPath));
  assertions.push(assertion("Modernization workflow implementation exists", Boolean(workflow), workflowPath));
  assertions.push(assertion("GitHub Copilot modernization agent registry exists", Boolean(registry), registryPath));
  assertions.push(assertion("Central package versions file exists", Boolean(packageProps), packagePropsPath));

  for (const packageName of [
    "GitHub.Copilot.SDK",
    "Microsoft.Agents.AI.GitHub.Copilot",
    "Microsoft.Agents.AI.Workflows"
  ]) {
    assertions.push(assertion(`workflow package references ${packageName}`, hasPhrase(`${workflowProject ?? ""}\n${packageProps ?? ""}`, packageName), packageName));
  }

  for (const phrase of [
    "GitHub.Copilot.SDK",
    "Microsoft.Agents.AI.GitHub.Copilot",
    "Microsoft.Agents.AI.Workflows",
    "CopilotClient",
    "CustomAgentConfig",
    "SessionConfig",
    "CustomAgents",
    "AIAgent",
    "ModernizationStageAgentCall",
    "CreateAgentCallPlan",
    "CreateAgentExecutionOrder",
    "StageAgentEvals",
    "RequiredAgentEvals",
    "AgentWorkflowBuilder.BuildSequential",
    "AgentWorkflowBuilder.BuildConcurrent"
  ]) {
    assertions.push(assertion(`workflow uses MAF/GHCP API: ${phrase}`, hasPhrase(workflowText, phrase), phrase));
  }

  for (const stage of [
    "legacy-requirements-specs-tests",
    "target-requirements-specs-test-plans",
    "incremental-modernization-plan",
    "increment-area-squads",
    "current-stage-plan-refinement",
    "tdd-modernization-execution"
  ]) {
    assertions.push(assertion(`workflow enforces stage ${stage}`, hasPhrase(workflowText, stage), stage));
  }

  for (const phrase of [
    "AgentEvals",
    "agentevals.io",
    "tool_trajectory",
    "llm_judge",
    "rubric",
    "evidence-completeness",
    "tool-calling",
    "relevance",
    "legacy regression",
    "red/green/refactor"
  ]) {
    assertions.push(assertion(`workflow requires modernization TDD evidence: ${phrase}`, hasPhrase(workflowText, phrase), phrase));
  }

  for (const agentName of [
    "khepri-orchestrator",
    "khepri-spec",
    "khepri-knowledge",
    "khepri-planner",
    "khepri-scaffold",
    "khepri-code",
    "khepri-test",
    "khepri-modernization-assessor",
    "khepri-evolution",
    "app-modernization",
    "data-modernization",
    "infra-modernization",
    "security-modernization"
  ]) {
    assertions.push(assertion(`workflow registers/calls ${agentName}`, hasPhrase(workflowText, agentName), agentName));
  }

  for (const [agentName, phrases] of Object.entries({
    "app-modernization": ["strangler", "branch by abstraction", "contract tests", "when to use"],
    "data-modernization": ["expand/contract", "dual-write", "CDC", "when to use"],
    "infra-modernization": ["infrastructure as code", "blue-green", "observability", "when to use"],
    "security-modernization": ["threat modeling", "identity and access", "vulnerability remediation", "security regression", "when to use"]
  })) {
    const profile = state.profiles.get(agentName);
    assertions.push(assertion(`${agentName}.md exists`, Boolean(profile), profile?.filePath));
    if (!profile) {
      continue;
    }

    assertions.push(assertion(`${agentName} targets GitHub Copilot`, profile.frontmatter.target === "github-copilot", String(profile.frontmatter.target ?? "")));
    assertions.push(assertion(`${agentName} uses STEERING.md`, hasPhrase(profile.prompt, "STEERING.md"), "STEERING.md"));
    for (const phrase of phrases) {
      assertions.push(assertion(`${agentName} captures modernization pattern: ${phrase}`, hasPhrase(profile.prompt, phrase), phrase));
    }
  }

  return assertions;
}

function checkAgentFrontmatterLint() {
  const linterPath = path.join(repoRoot(), "scripts", "lint-agent-frontmatter.mjs");
  const result = spawnSync(process.execPath, [linterPath, "--json"], {
    cwd: repoRoot(),
    encoding: "utf8"
  });

  const assertions = [
    assertion("agent frontmatter linter exists", existsSync(linterPath), linterPath),
    assertion("agent frontmatter linter exits cleanly", result.status === 0, result.stderr || result.stdout)
  ];

  try {
    const report = JSON.parse(result.stdout || "{}");
    assertions.push(assertion("agent frontmatter linter emits JSON", typeof report === "object" && report !== null, result.stdout));
    assertions.push(assertion("agent frontmatter linter reports success", report.ok === true, `${report.failed ?? "unknown"} failures`));
    assertions.push(assertion("agent frontmatter linter covers many rules", Number(report.total) >= 150, `${report.total ?? 0} rules`));
    for (const item of report.assertions ?? []) {
      assertions.push(assertion(`lint: ${item.agent} ${item.rule}`, Boolean(item.passed), item.evidence));
    }
  } catch (error) {
    assertions.push(assertion("agent frontmatter linter emits parseable JSON", false, error instanceof Error ? error.message : String(error)));
  }

  return assertions;
}

function runCheck(checkName, state) {
  switch (checkName) {
    case "profile-schema":
      return checkProfileSchema(state);
    case "orchestration-subagents":
      return checkOrchestration(state);
    case "bounded-agent-contracts":
      return checkBoundedContracts(state);
    case "least-privilege-tools":
      return checkLeastPrivilegeTools(state);
    case "docs-branch-flow-coverage":
      return checkDocsBranchFlowCoverage(state);
    case "evolution-agent":
      return checkEvolutionAgent(state);
    case "spec-agent-agent-eval-contract":
      return checkSpecAgentEvalContract(state);
    case "evolution-agent-agentv-tdd":
      return checkEvolutionAgentAgentvTdd(state);
    case "evolution-agent-iteration-discipline":
      return checkEvolutionAgentIterationDiscipline(state);
    case "evolution-agent-tdd-evidence":
      return checkEvolutionAgentTddEvidence(state);
    case "evolution-agent-techstack-specialization":
      return checkEvolutionAgentTechstackSpecialization(state);
    case "evolution-agent-specialist-artifact-coverage":
      return checkEvolutionAgentSpecialistArtifactCoverage(state);
    case "tdd-agents-agent-evals":
      return checkTddAgentsAgentEvals(state);
    case "security-modernization-pattern-agent":
      return checkSecurityModernizationPatternAgent(state);
    case "squad-generator-agent":
      return checkSquadGeneratorAgent(state);
    case "squad-generation-rubric-live-eval-loop":
      return checkSquadGenerationRubricLiveEvalLoop(state);
    case "sdk-squad-generator-config":
      return checkSdkSquadGeneratorConfig();
    case "knowledge-agent-queryable-kb-tool-discovery":
      return checkKnowledgeAgentQueryableKbToolDiscovery(state);
    case "knowledge-agent-legacy-kb-modeling":
      return checkKnowledgeAgentLegacyKbModeling(state);
    case "knowledge-agent-target-kb-modeling":
      return checkKnowledgeAgentTargetKbModeling(state);
    case "knowledge-agent-refinement-loop":
      return checkKnowledgeAgentRefinementLoop(state);
    case "requested-tooling-installation":
      return checkRequestedToolingInstallation();
    case "learn-skill-hook":
      return checkLearnSkillAndHook();
    case "architecture-docs-skill-hook":
      return checkArchitectureDocsSkillAndHook();
    case "steering-consumption":
      return checkSteeringConsumption(state);
    case "agent-skills-spec-compliance":
      return checkAgentSkillsSpecCompliance();
    case "spec-kit-skill":
      return checkSpecKitSkill();
    case "spec-agent-speckit-skill-contract":
      return checkSpecAgentSpecKitSkillContract(state);
    case "modernization-workflow-skill":
      return checkModernizationWorkflowSkill(state);
    case "maf-ghcp-modernization-workflow":
      return checkMafGhcpModernizationWorkflow(state);
    case "agent-frontmatter-lint":
      return checkAgentFrontmatterLint();
    default:
      return [assertion(`Unknown check: ${checkName}`, false, checkName)];
  }
}

function resultFor(assertions, details) {
  const passed = assertions.filter((item) => item.passed).length;
  const total = assertions.length || 1;

  return {
    score: passed / total,
    assertions,
    details
  };
}

const rawPayload = await readStdin();
let payload = {};
try {
  payload = rawPayload.trim() ? JSON.parse(rawPayload) : {};
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify(resultFor([assertion("grader input is valid JSON", false, message)], { rawPayload })));
  process.exit(0);
}

const state = loadProfiles();
const checkName = payload.config?.check ?? inferCheckName(payload) ?? "profile-schema";
const assertions = runCheck(checkName, state);
const details = {
  check: checkName,
  directory: state.dir,
  discoveredAgents: Array.from(state.profiles.keys()).sort()
};

console.log(JSON.stringify(resultFor(assertions, details)));

function inferCheckName(payload) {
  const text = [
    payload.input_text,
    Array.isArray(payload.input)
      ? payload.input.map((message) => typeof message?.content === "string" ? message.content : "").join("\n")
      : "",
    payload.metadata ? JSON.stringify(payload.metadata) : ""
  ].join("\n").toLowerCase();

  const mappings = [
    ["frontmatter linter", "agent-frontmatter-lint"],
    ["explicit operating contracts", "bounded-agent-contracts"],
    ["tool access matches", "least-privilege-tools"],
    ["implemented modernization phases", "docs-branch-flow-coverage"],
    ["baseline/candidate agentv iteration", "evolution-agent-agentv-tdd"],
    ["repeatable iteration discipline", "evolution-agent-iteration-discipline"],
    ["evidence reporting requirements", "evolution-agent-tdd-evidence"],
    ["specialist creation", "evolution-agent-techstack-specialization"],
    ["required checklists before creating techstack-specific", "evolution-agent-specialist-artifact-coverage"],
    ["agent-eval scenario authoring responsibilities", "spec-agent-agent-eval-contract"],
    ["khepri-code.md and .github/agents/khepri-test.md", "tdd-agents-agent-evals"],
    ["khepri-squad-generator.md", "squad-generator-agent"],
    ["rubric-backed live-eval loop", "squad-generation-rubric-live-eval-loop"],
    ["sdk-first squad generator", "sdk-squad-generator-config"],
    ["queryable knowledge-base capability discovery", "knowledge-agent-queryable-kb-tool-discovery"],
    ["legacy knowledge extraction and generation", "knowledge-agent-legacy-kb-modeling"],
    ["desired-state knowledge extraction and generation", "knowledge-agent-target-kb-modeling"],
    ["intra-modernization knowledge refinement", "knowledge-agent-refinement-loop"],
    ["installed project tooling", "requested-tooling-installation"],
    [".github/skills/learn and .github/hooks/learn.json", "learn-skill-hook"],
    ["architecture documentation skill and hook", "architecture-docs-skill-hook"],
    ["inspect steering.md", "steering-consumption"],
    ["validate the learn skill folder", "agent-skills-spec-compliance"],
    ["validate .github/skills/spec-kit", "spec-kit-skill"],
    ["local spec-kit skill usage guidance", "spec-agent-speckit-skill-contract"],
    ["modernization workflow skill", "modernization-workflow-skill"],
    [".net modernization workflow", "maf-ghcp-modernization-workflow"],
    ["orchestrator profile for subagent delegation", "orchestration-subagents"],
    [".github/agents for project khepri custom agent profiles", "profile-schema"],
    ["project agent skills, hooks, steering", "evolution-agent"]
  ];

  return mappings.find(([phrase]) => text.includes(phrase))?.[1];
}
