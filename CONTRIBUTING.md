# Contributing To Project Khepri

Thank you for improving Project Khepri. Contributions should keep the agent workflow evidence-backed, narrow, and easy to review.

## Local Setup

Prerequisites:

- Node.js 20.12 or newer
- npm
- .NET SDK compatible with `global.json`

Install dependencies:

```powershell
npm install
```

## Contribution Flow

1. Start from an up-to-date branch.
2. Keep changes focused on one behavior, workflow surface, or documentation update.
3. For behavior changes, write or update tests first.
4. For agent, skill, hook, instruction, or eval changes, add or update the focused AgentV/code-grader scenario first.
5. For architecture-affecting changes, invoke `$keep-architecture-docs-current` and update affected docs plus Mermaid diagrams in the same change.
6. Run focused validation, then broader validation before opening a PR.

Architecture-affecting changes include workflow contracts, `.github/agents`, `.github/skills`, `.github/hooks`, MCP configuration, AgentV evals, CI, package scripts, repository structure, and durable process guidance.

## Validation

Run the core gates:

```powershell
npm run lint:agents
npm run eval:agents:validate
npm run eval:agents
npm run skills:validate
```

Run the .NET workflow tests when workflow code, registry code, workflow docs, or workflow skills change:

```powershell
$env:DOTNET_ROLL_FORWARD='Major'; dotnet test dotnet\tests\Code2\NL\Code2NL.Tests.csproj
```

Run the Squad check when `squad.config.ts` or generated `.squad` assets change:

```powershell
npm run squad:check
```

## Pull Request Expectations

Include:

- concise summary of the change;
- affected architecture surfaces;
- docs and Mermaid diagrams updated or a clear reason they were unaffected;
- validation commands and results;
- residual risk or follow-up work.

Do not include secrets, credentials, private transcripts, or generated dependency caches.
