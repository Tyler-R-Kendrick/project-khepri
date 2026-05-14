# Project Khepri Docs

This directory documents the currently implemented Project Khepri modernization workflow control plane.

## Current-State Sources

Use these implementation files as the source of truth before changing docs:

| Area | Source |
| --- | --- |
| Workflow stages and evidence gates | `dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs` |
| GitHub Copilot session and custom-agent registry | `dotnet/src/Modernization/Workflow/GitHubCopilotModernizationAgentRegistry.cs` |
| Agent profiles and handoffs | `.github/agents` |
| Repo-local skills | `.github/skills` |
| Prompt hooks | `.github/hooks` |
| AgentV scenarios and code-graders | `evals/github-agents` |
| Legacy sample packs | `evals/legacy-samples` |
| Squad configuration | `squad.config.ts` and `.squad` |
| Local workflow WebUI | `webui` |

## Doc Index

- `README.md`: project overview, current architecture diagrams, implemented surfaces, verification commands, and roadmap ideas.
- `docs/architecture/README.md`: current implementation architecture and Mermaid diagrams.
- `docs/agents/README.md`: custom-agent contract, .NET registry, skills, hooks, handoffs, and verification.
- `docs/architecture/decisions/README.md`: active architecture decisions and durable rationale.
- `CONTRIBUTING.md`: local setup, contribution flow, validation, and PR expectations.
- `webui/`: local-first PWA and node host for prompt kickoff, Copilot SDK ambient auth, offline fallback, and graph visualization.
- `SECURITY.md`: security reporting and secret-handling expectations.
- `SUPPORT.md`: support and diagnostic guidance.
- `CODE_OF_CONDUCT.md`: community behavior expectations.

## Documentation Currency

For architecture-affecting changes, invoke `$keep-architecture-docs-current` from `.github/skills/keep-architecture-docs-current/SKILL.md`. The `.github/hooks/architecture-docs.json` prompt hook also reminds agents to use that skill when a prompt indicates workflow, agent, skill, hook, MCP, eval, CI, or repository-structure changes.

Every current-state diagram should match implemented code, not aspirational plans. Roadmap-only ideas belong in an explicit future or roadmap section.

## Verification

Run the agent and skill checks from the repository root:

```powershell
npm run lint:agents
npm run eval:agents:validate
npm run eval:agents
npm run skills:validate
```

Run the .NET workflow tests with:

```powershell
$env:DOTNET_ROLL_FORWARD='Major'; dotnet test dotnet\tests\Code2\NL\Code2NL.Tests.csproj
```
