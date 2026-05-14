# Project Khepri Architecture

This document describes the architecture currently implemented in this repository.

## Current Implementation

Project Khepri is implemented as an agent-workflow control plane. The current codebase defines how modernization work is coordinated, evaluated, and documented; it does not yet ship a production modernization runtime.

```mermaid
flowchart TB
    subgraph gh["GitHub Copilot custom-agent layer"]
      agents[".github/agents"]
      skills[".github/skills"]
      hooks[".github/hooks"]
      instructions[".github/instructions"]
    end

    subgraph dotnet[".NET source of truth"]
      workflow["ModernizationWorkflow.cs"]
      registry["GitHubCopilotModernizationAgentRegistry.cs"]
      tests["ModernizationWorkflowTests.cs"]
    end

    subgraph evals["Evaluation and evidence"]
      agentv["evals/github-agents"]
      samples["evals/legacy-samples"]
      target[".agentv/targets.yaml"]
    end

    subgraph ops["Repo operations"]
      package["package.json scripts"]
      squad["squad.config.ts and .squad"]
      specify[".specify"]
      webui["webui local PWA and node host"]
      docs["README and docs"]
    end

    agents --> registry
    skills --> registry
    hooks --> docs
    instructions --> docs
    workflow --> registry
    workflow --> tests
    registry --> tests
    agentv --> agents
    agentv --> skills
    agentv --> hooks
    samples --> workflow
    package --> agentv
    squad --> agents
    specify --> skills
    webui --> agents
    webui --> package
```

## Local WebUI

`webui` implements a local-first, mobile-first PWA for starting Khepri runs and watching agent state. The SPA uses `@ai-sdk/react` chat state with a text-stream transport, renders AI response parts instead of raw message JSON, stores draft and run progress in `localStorage`, and registers a service worker for offline app-shell caching.

The node host in `webui/server/index.ts` owns `/api/chat` and `/api/health`. `/api/chat` creates a GitHub Copilot SDK session with `useLoggedInUser: true`, so local runs use ambient Copilot auth rather than checked-in secrets. When Copilot CLI/auth is unavailable, the endpoint streams a deterministic local fallback so the UI and graph remain usable offline.

## Workflow Contract

`ModernizationWorkflow.CreateContract()` defines six implemented stages:

| Order | Stage id | Required agents | Required evidence |
| --- | --- | --- | --- |
| 1 | `legacy-requirements-specs-tests` | `khepri-spec`, `khepri-knowledge`, `khepri-test` | Source evidence, legacy behavior inventory, legacy regression seed tests, legacy queryable knowledge base |
| 2 | `target-requirements-specs-test-plans` | `khepri-spec`, `khepri-knowledge`, `khepri-planner` | Target desired-state evidence, acceptance criteria, test-PLANS, target queryable knowledge base |
| 3 | `incremental-modernization-plan` | `khepri-planner`, `app-modernization`, `data-modernization`, `infra-modernization`, `security-modernization` | Increment map, area risks, security risks, approval checkpoints |
| 4 | `increment-area-squads` | `khepri-squad-generator`, area modernization agents, `khepri-code`, `khepri-test` | AgentEvals, `tool_trajectory`, `llm_judge`, SDK-first squad, generated AgentV scenarios, evaluators, test data, squad member rubric, live-evals |
| 5 | `current-stage-plan-refinement` | `khepri-knowledge`, `khepri-planner`, area modernization agents, `security-modernization` | Knowledge refinement, stage-ready plan, dependencies, rollback plan, regression gates |
| 6 | `tdd-modernization-execution` | `khepri-knowledge`, `khepri-code`, `khepri-test`, `khepri-modernization-assessor` | Legacy regression checks, red/green/refactor evidence, knowledge refinement, AgentEvals rerun, acceptance evidence |

```mermaid
flowchart LR
    legacy["legacy-requirements-specs-tests"]
    target["target-requirements-specs-test-plans"]
    knowledge["queryable knowledge base"]
    increment["incremental-modernization-plan"]
    squads["increment-area-squads"]
    refine["current-stage-plan-refinement"]
    execute["tdd-modernization-execution"]

    legacy --> target --> increment --> squads --> refine --> execute
    legacy --> knowledge
    target --> knowledge
    refine --> knowledge
    execute --> knowledge
    knowledge --> refine
    squads --> tool["tool_trajectory eval"]
    squads --> judge["llm_judge relevance eval"]
    squads --> live["rubric live_eval"]
    squads --> sdk["SDK-first squad.config.ts"]
    execute --> parity["parity and acceptance assessment"]
```

## Custom-Agent Runtime

`GitHubCopilotModernizationAgentRegistry.CreateSessionConfig(...)` builds a GitHub Copilot SDK session with:

- client name `project-khepri-modernization-workflow`;
- default agent `khepri-orchestrator`;
- model default `gpt-5.3-codex`;
- subagent streaming enabled;
- skill directories `.github/skills` and `.copilot/skills`;
- repo custom agents from the registry.

The orchestrator preloads `khepri-modernization-workflow` and `keep-architecture-docs-current`. The evolution agent also preloads `keep-architecture-docs-current` so workflow-surface changes include docs and Mermaid updates.

The knowledge agent is the implemented queryable knowledge-base owner. It discovers available knowledge-modeling capabilities in the active workflow, including configured tools, skills, MCP servers, wiki surfaces, databases, graph stores, and repository-local manifests. It records the selected capability and query smoke check so later planning, coding, and assessment agents can retrieve source-backed legacy facts, desired-state facts, and verification evidence.

The squad generator is the implemented SDK-first squad-generation owner. It updates `squad.config.ts`, writes AgentV scenarios before squad member changes, creates evaluators and test data, defines a squad member rubric, and runs live-evals in the test/dev loop. Generated squad members are improved through multiple focused loops when they steer too far from their rubric.

## Skills, Hooks, And Instructions

```mermaid
flowchart TB
    prompt["User prompt"] --> learnHook["learn hook"]
    prompt --> archHook["architecture-docs hook"]
    learnHook --> steering["STEERING.md"]
    archHook --> archSkill["keep-architecture-docs-current skill"]
    archSkill --> diagrams["Mermaid diagrams and docs"]
    instructions["architecture-docs.instructions.md"] --> archSkill
    agents["Khepri agents"] --> steering
    agents --> archSkill
```

The architecture-docs hook does not edit files directly. It emits an invocation instruction for `$keep-architecture-docs-current`, keeping judgment with the agent while making the requirement hard to miss.

## Legacy Sample Packs

The workflow source of truth references three implemented sample packs:

- `evals/legacy-samples/cobol-claims`: COBOL claims batch/CICS source-shaped artifacts, fixed-width fixtures, and report parity evidence.
- `evals/legacy-samples/dotnet-framework-claims-portal`: legacy .NET Framework/IIS route, service, sweep, config, and HTTP golden-master evidence.
- `evals/legacy-samples/java-payment-monolith`: Java servlet/JMS/DAO artifacts and JMS replay evidence.

These are deterministic fixtures for agent and workflow evals, not full legacy-system emulators.

## Validation Architecture

```mermaid
flowchart LR
    files["agents, skills, hooks, docs, workflow code"] --> lint["npm run lint:agents"]
    files --> validate["npm run eval:agents:validate"]
    files --> eval["npm run eval:agents"]
    files --> skills["npm run skills:validate"]
    files --> dotnet["dotnet test Code2NL.Tests.csproj"]
    files --> squad["npm run squad:check"]
```

Use focused validation first, then broader gates once the focused signal is green.
