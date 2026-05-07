# Project Khepri Architecture Decisions

This file records the current architecture decisions implemented in the repository. Add a separate ADR file when a future decision needs deeper alternatives and consequences.

## Active Decisions

### 1. .NET Owns The Workflow Contract

`dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs` is the source of truth for:

- registered Khepri agents;
- modernization stage order;
- required agents and evidence per stage;
- AgentEvals requirements for increment squads;
- atomic workflow step contracts;
- primary legacy scenario matrix;
- legacy sample pack references;
- Microsoft Agent Framework workflow builders.

Docs and prompts may summarize this contract, but they should not redefine it independently.

### 2. GitHub Custom Agents Are The User-Facing Workflow Surface

Repository agents live in `.github/agents`. Their YAML frontmatter declares name, description, target, tools, MCP servers, and handoffs. The .NET registry mirrors the required Khepri agents as `CustomAgentConfig` entries for GitHub Copilot SDK sessions.

This keeps the same workflow usable from repo-local custom-agent profiles and from the programmatic Microsoft Agent Framework workflow.

### 3. Khepri Uses Bounded Phase Agents

Modernization work is split into narrow roles:

- orchestration;
- continuous evolution;
- spec extraction/generation;
- knowledge indexing;
- planning;
- scaffolding;
- code/TDD;
- verification;
- assessment;
- app/data/infra modernization advice.

Least-privilege tools are intentional: the orchestrator coordinates without direct edit or execute access, while test and assessor agents avoid edit access.

### 4. Continuous Evolution Runs Alongside Phase Work

`khepri-evolution` is a companion, not the phase owner. It watches handoffs, evidence, failures, user corrections, and repeated workflow gaps, then creates or improves durable surfaces such as agents, Agent Skills, hooks, evals, instructions, steering, and MCP recommendations.

Evolution work must stay reviewable and should not block the active phase unless safety, correctness, steering, or approval issues require escalation.

### 5. AgentV And Code-Graders Protect Agent Contracts

The repository uses `evals/github-agents/khepri-github-agents.eval.yaml` and `evals/github-agents/check-khepri-agents.mjs` to validate agent profile schema, handoffs, least-privilege tools, steering, skills, hooks, workflow code, and documentation enforcement.

Agent prompt, profile, skill, hook, and eval changes should be backed by focused AgentV evidence before broader validation.

### 6. Legacy Sample Packs Provide Concrete Regression Evidence

`evals/legacy-samples` contains small source-shaped sample packs for COBOL claims, legacy .NET Framework claims portal, and Java payment monolith scenarios. They are deterministic fixtures for planning and evals. They are not full legacy-system emulators.

Generated modernization plans should cite these packs only when they map to the active legacy system.

### 7. User Corrections Become Steering

The `learn` skill and `.github/hooks/learn.json` hook capture reusable user corrections as concise generalized entries in `STEERING.md`. All Khepri custom agents read `STEERING.md` before phase work.

Do not store secrets, credentials, private data, or long transcripts in steering.

### 8. Architecture Docs Must Change With Architecture

The `keep-architecture-docs-current` Agent Skill, `.github/hooks/architecture-docs.json`, `.github/hooks/scripts/architecture-docs.mjs`, and `.github/instructions/architecture-docs.instructions.md` enforce the rule that architecture-affecting changes update docs and Mermaid diagrams in the same change.

Architecture-affecting changes include workflow contracts, agent profiles, Agent Skills, hooks, MCP configuration, AgentV evals, CI, package scripts, repository structure, and durable process guidance.

### 9. Squad And Spec Kit Are Integration Surfaces

`squad.config.ts`, `.squad`, `.specify`, and `.agents` provide local squad and Spec Kit assets that support planning, agent specialization, and workflow automation. They are integration surfaces around the Khepri control plane, not replacements for the .NET workflow contract.

### 10. Roadmap Ideas Stay Labeled As Roadmap

Conceptual intermediary-representation tools such as Code2/NL, Structurizr extraction, TOSCA/CUE models, BPMN, SBOM generation, production KnowledgeGraphRag, Planner4, policy-as-code, and runtime emulation remain roadmap items until implemented with tests and docs.
