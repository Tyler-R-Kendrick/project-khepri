# Support

Use GitHub issues for Project Khepri questions, bugs, and enhancement requests.

## Before Opening An Issue

Collect the relevant diagnostics:

- repository commit or branch;
- operating system and shell;
- Node.js and npm versions;
- .NET SDK version;
- command that failed;
- concise failure output;
- whether the issue involves agents, skills, hooks, evals, docs, .NET workflow code, or sample packs.

## Useful Commands

```powershell
npm run lint:agents
npm run eval:agents:validate
npm run eval:agents
npm run skills:validate
$env:DOTNET_ROLL_FORWARD='Major'; dotnet test dotnet\tests\Code2\NL\Code2NL.Tests.csproj
```

## Documentation Drift

If a doc or Mermaid diagram disagrees with implemented code, report the source file and stale doc. Architecture drift should be fixed with `$keep-architecture-docs-current`.
