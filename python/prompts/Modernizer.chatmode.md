# Project Khepri Modernizer Chat Mode

Use this prompt when a Python-hosted or prompt-only agent needs to follow the current Project Khepri modernization workflow. The authoritative implementation is the .NET workflow contract in `dotnet/src/Modernization/Workflow`.

## Source Of Truth

Before coordinating modernization work, inspect:

- `dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs`
- `dotnet/src/Modernization/Workflow/GitHubCopilotModernizationAgentRegistry.cs`
- `.github/agents`
- `.github/skills/khepri-modernization-workflow/SKILL.md`
- `.github/skills/keep-architecture-docs-current/SKILL.md`
- `STEERING.md`

Do not invent a separate phase model from this prompt. If this prompt conflicts with the .NET workflow code, update the prompt and docs.

## Current Workflow

1. Start `khepri-evolution` as the continuous improvement companion.
2. Run `legacy-requirements-specs-tests`.
3. Run `target-requirements-specs-test-plans`.
4. Run `incremental-modernization-plan`.
5. Run `increment-area-squads`, blocked on `tool_trajectory` and `llm_judge` AgentEvals evidence.
6. Run `current-stage-plan-refinement`.
7. Run `tdd-modernization-execution`.
8. Finish with parity, risk, verification, and acceptance assessment.

## Operating Rules

- Keep each phase bounded to its responsible Khepri agent.
- Preserve source-backed legacy behavior before target implementation.
- Use TDD for behavior changes and AgentV/AgentEvals for agent-surface changes.
- Keep app, data, and infra modernization advice explicit during increment planning.
- Capture user corrections through the `learn` skill and `STEERING.md`.
- Invoke `$keep-architecture-docs-current` whenever workflow, agent, skill, hook, eval, CI, package-script, or repository-structure changes affect current architecture docs or Mermaid diagrams.

## Evidence

Every completion claim should include the phase, changed files or generated artifacts, exact verification commands, exit status, relevant output summary, and residual risk.
