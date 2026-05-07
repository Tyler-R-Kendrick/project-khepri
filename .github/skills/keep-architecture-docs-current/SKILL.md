---
name: keep-architecture-docs-current
description: Use when architecture-affecting code, agent profiles, workflow contracts, hooks, skills, MCP configuration, evals, CI, repository structure, or documentation changes could make Project Khepri docs or Mermaid diagrams stale.
---

# Keep Architecture Docs Current

## Overview

Keep architecture documentation, diagrams, and contribution guidance aligned with the implemented Project Khepri system. Treat stale architecture docs as an incomplete architecture change.

## Source Of Truth

Inspect the current implementation before editing prose:

- `dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs`
- `dotnet/src/Modernization/Workflow/GitHubCopilotModernizationAgentRegistry.cs`
- `.github/agents`, `.github/skills`, `.github/hooks`, `.github/instructions`
- `evals/github-agents`, `evals/legacy-samples`, `.agentv/targets.yaml`
- `package.json`, `.github/workflows`, `squad.config.ts`, `.squad`, `.specify`

## Workflow

1. Run `git status --short` and identify changed architecture surfaces.
2. Read the source files above that own the changed behavior.
3. Update all affected docs, especially `README.md`, `docs/README.md`, `docs/agents/README.md`, `docs/architecture/README.md`, `docs/architecture/decisions/README.md`, and repo practice files such as `CONTRIBUTING.md`.
4. Update every Mermaid diagram whose actors, stage order, evidence gates, skills, hooks, or validation paths changed.
5. Describe only implemented behavior as current state. Move plans, ideas, and not-yet-built tools into an explicit roadmap or future section.
6. Keep architecture decisions traceable: add or update ADR notes when a durable workflow, agent, skill, hook, eval, or validation gate changes.
7. Verify the architecture-docs hook remains wired through `.github/hooks/architecture-docs.json` and `.github/hooks/scripts/architecture-docs.mjs`.
8. Verify global agent instructions still invoke `$keep-architecture-docs-current` for architecture-affecting changes.

## Current-State Checklist

- Custom agents listed in docs match `.github/agents` and the .NET registry.
- Workflow stages, stage order, and AgentEvals gates match `ModernizationWorkflow.CreateContract()`.
- Diagrams show `khepri-evolution` as a companion plus the sequential modernization stages and app/data/infra squad gate.
- Skill, hook, instruction, eval, and steering docs reflect actual files in the repo.
- Validation commands match `package.json`, `.agentv/targets.yaml`, and the .NET test project.
- Conceptual IR/tool ideas are clearly marked as roadmap, not shipped implementation.

## Validation

Run focused checks after changing this skill or documentation enforcement:

```powershell
skills-ref validate .github/skills/keep-architecture-docs-current
node .github/hooks/scripts/architecture-docs.mjs
npm run eval:agents:validate
npm run eval:agents
```

Run broader checks when architecture source files, agent profiles, evals, or workflow code changed:

```powershell
npm run lint:agents
$env:DOTNET_ROLL_FORWARD='Major'; dotnet test dotnet\tests\Code2\NL\Code2NL.Tests.csproj
```
