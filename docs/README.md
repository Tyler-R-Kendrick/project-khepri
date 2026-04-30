# Project Khepri Docs

This directory documents the Project Khepri modernization workflow, architecture decisions, and repository-level agent system.

## Current Workflow

Project Khepri uses GitHub Copilot custom agents in `.github/agents` to formalize a static modernization flow:

1. `khepri-orchestrator` starts the workflow and launches `khepri-evolution`.
2. `khepri-evolution` runs alongside all other agent work as a continuous improvement companion.
3. Phase agents handle bounded modernization responsibilities:
   - `khepri-spec`
   - `khepri-knowledge`
   - `khepri-planner`
   - `khepri-scaffold`
   - `khepri-code`
   - `khepri-test`
   - `khepri-modernization-assessor`
4. The `learn` skill and hook capture user corrections into `STEERING.md`.
5. AgentEvals/AgentV and repository linting verify the custom-agent contracts.

## Doc Index

- `docs/agents/README.md`: custom agents, frontmatter handoffs, `khepri-evolution`, `learn`, Awesome Copilot MCP, and verification commands.
- `docs/architecture/decisions/README.md`: current architecture decision notes.
- `README.md`: project overview, modernization flow, tool inventory, and current verification commands.

## Verification

Run the agent contract checks from the repository root:

```powershell
npm run lint:agents
npm run eval:agents:validate
npm run eval:agents
npm run skills:validate
```

Run the current .NET smoke test with:

```powershell
$env:DOTNET_ROLL_FORWARD='Major'; dotnet test dotnet\tests\Code2\NL\Code2NL.Tests.csproj
```
