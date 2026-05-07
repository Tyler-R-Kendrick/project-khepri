import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertion,
  emitResult,
  inputText,
  lowerIncludes,
  readAgentProfile,
  readPayload,
  readRepoText,
  repoRoot
} from "./evaluator-utils.mjs";

const payload = await readPayload();
const inferred = inferCheck(payload);
const config = { ...inferred, ...(payload.config ?? {}) };
const check = config.check ?? "sample-packs";
const root = repoRoot();
const workflowSource = readRepoText("dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs");

const samplePacks = [
  {
    scenarioId: "cobol-claims-batch-and-cics",
    kind: "Cobol",
    root: "evals/legacy-samples/cobol-claims",
    files: [
      "copybooks/CUSTOMER.CPY",
      "programs/ELIGBLTY.CBL",
      "jcl/nightly-eligibility.jcl",
      "fixtures/eligibility-records.fixed",
      "expected/eligibility-report.txt",
      "scenario.json"
    ],
    terms: ["EBCDIC", "packed decimal", "restart checkpoint", "copybook fixture tests", "batch replay", "report parity"]
  },
  {
    scenarioId: "dotnet-framework-claims-portal",
    kind: "DotNetFramework",
    root: "evals/legacy-samples/dotnet-framework-claims-portal",
    files: [
      "src/ClaimsController.cs",
      "src/ClaimsService.svc",
      "src/ClaimSweepService.cs",
      "config/web.config",
      "fixtures/http-golden-master.json",
      "scenario.json"
    ],
    terms: ["COM interop", "32-bit", "machine.config", "golden-master HTTP contracts", "service facade contract tests", "config parity"]
  },
  {
    scenarioId: "java-payment-monolith",
    kind: "JavaMonolith",
    root: "evals/legacy-samples/java-payment-monolith",
    files: [
      "src/PaymentServlet.java",
      "src/PaymentMDB.java",
      "src/PaymentDao.java",
      "config/web.xml",
      "fixtures/jms-replay.jsonl",
      "scenario.json"
    ],
    terms: ["JMS replay", "transaction boundary", "classloader resource", "message replay", "API contract tests", "persistence parity"]
  }
];

const assertions = [
  assertion("grader input is valid JSON", !payload.__parseError, payload.__parseError),
  assertion("legacy sample pack check is recognized", ["sample-packs", "agent-guidance"].includes(check), check)
];

if (check === "sample-packs") {
  assertions.push(...checkSamplePacks());
} else {
  assertions.push(...checkAgentGuidance());
}

emitResult(assertions, { check, samplePacks: samplePacks.map((pack) => pack.scenarioId) });

function checkSamplePacks() {
  const currentAssertions = [
    assertion("workflow exposes LegacySamplePack metadata", lowerIncludes(workflowSource, "LegacySamplePack"), "LegacySamplePack"),
    assertion("workflow exposes CreateLegacySamplePacks", lowerIncludes(workflowSource, "CreateLegacySamplePacks"), "CreateLegacySamplePacks")
  ];

  for (const pack of samplePacks) {
    const packRoot = path.join(root, ...pack.root.split("/"));
    currentAssertions.push(assertion(`${pack.scenarioId} root exists`, existsSync(packRoot), pack.root));
    currentAssertions.push(assertion(`workflow references ${pack.scenarioId}`, lowerIncludes(workflowSource, pack.scenarioId), pack.scenarioId));
    currentAssertions.push(assertion(`workflow references ${pack.kind}`, lowerIncludes(workflowSource, pack.kind), pack.kind));

    const packTextParts = [];
    for (const relative of pack.files) {
      const filePath = path.join(packRoot, ...relative.split("/"));
      currentAssertions.push(assertion(`${pack.scenarioId} sample file exists: ${relative}`, existsSync(filePath), relative));
      if (existsSync(filePath)) {
        packTextParts.push(readFileSync(filePath, "utf8"));
      }

      currentAssertions.push(assertion(`workflow references ${relative}`, lowerIncludes(workflowSource, relative), relative));
    }

    const packText = packTextParts.join("\n");
    currentAssertions.push(assertion(`${pack.scenarioId} declares a replay command`, lowerIncludes(packText, "replayCommand") || lowerIncludes(packText, "Replay command"), "replay command"));
    for (const term of pack.terms) {
      currentAssertions.push(assertion(`${pack.scenarioId} preserves fixture term: ${term}`, lowerIncludes(packText, term) || lowerIncludes(workflowSource, term), term));
    }
  }

  return currentAssertions;
}

function checkAgentGuidance() {
  const agents = [
    "khepri-spec",
    "khepri-planner",
    "khepri-test",
    "khepri-modernization-assessor",
    "app-modernization",
    "data-modernization",
    "infra-modernization"
  ];
  const terms = [
    "evals/legacy-samples",
    "sample pack",
    "replay command",
    "edge-case fixture",
    "regression evidence",
    "generated squad"
  ];
  const currentAssertions = [];

  for (const agentName of agents) {
    const profile = readAgentProfile(agentName);
    currentAssertions.push(assertion(`${agentName} profile exists`, Boolean(profile), agentName));
    for (const term of terms) {
      currentAssertions.push(assertion(`${agentName} includes legacy sample guidance: ${term}`, lowerIncludes(profile ?? "", term), term));
    }
  }

  return currentAssertions;
}

function inferCheck(currentPayload) {
  const text = inputText(currentPayload).toLowerCase();
  if (text.includes("custom agents") || text.includes("agent guidance") || text.includes("sample pack usage")) {
    return { check: "agent-guidance" };
  }

  return { check: "sample-packs" };
}
