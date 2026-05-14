---
name: khepri-modernization-workflow
description: Use when coordinating, inspecting, running, or verifying the Project Khepri modernization workflow, Microsoft Agent Framework workflow, GHCP SDK custom-agent registry, increment squad workflow, AgentEvals gates, or app/data/infra/security modernization sequence.
---

# Khepri Modernization Workflow

## Overview

Use this skill as the entrypoint for the Project Khepri modernization workflow. It does not redefine the workflow; it tells the agent to call and validate the existing .NET implementation.

## Source Of Truth

- `dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs` defines the workflow contract, stages, required agents, AgentEvals gates, legacy scenario matrix, sample packs, `ModernizationWorkflow.CreateContract`, `BuildMicrosoftAgentFrameworkWorkflow`, and `BuildIncrementSquadWorkflow`.
- `dotnet/src/Modernization/Workflow/GitHubCopilotModernizationAgentRegistry.cs` defines the GitHub Copilot SDK session config and custom agent registrations.
- `.github/agents/khepri-orchestrator.md` is the user-facing orchestration profile that should invoke this skill before coordinating the workflow.

## Invocation

1. Read this skill when a task asks to run, inspect, enforce, or update the Khepri modernization workflow.
2. Use `ModernizationWorkflow.CreateContract()` for stage order, required evidence, required agents, and AgentEvals gates.
3. Use `ModernizationWorkflow.CreateAgentCallPlan()` to inspect the enforced stage-by-stage registered agent and subagent calls.
4. Use `GitHubCopilotModernizationAgentRegistry.CreateSessionConfig(...)` when configuring a GHCP SDK session.
5. Use `ModernizationWorkflow.BuildMicrosoftAgentFrameworkWorkflow(...)` for the full sequential workflow.
6. Use `ModernizationWorkflow.BuildIncrementSquadWorkflow(...)` for per-increment app/data/infra/security squad generation.
7. Do not copy the workflow stages into new prompt-only logic. Change the .NET source of truth when the workflow contract changes.

## Validation

Run the focused workflow tests after changing this skill, the registry, or workflow code:

```powershell
$env:DOTNET_ROLL_FORWARD='Major'; dotnet test dotnet\tests\Code2\NL\Code2NL.Tests.csproj --filter "ModernizationWorkflowTests"
```

Run the AgentV-backed repo gates after agent or skill behavior changes:

```powershell
npm run eval:agents:validate
npm run eval:agents
```

Run skill validation after editing this skill:

```powershell
skills-ref validate .github/skills/khepri-modernization-workflow
```
