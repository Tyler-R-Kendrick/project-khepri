# Security Policy

## Reporting A Vulnerability

Please report security issues privately to the repository maintainers instead of opening a public issue. Include a concise description, affected files or workflows, reproduction steps, and impact.

If private reporting is unavailable, open a minimal public issue that says a security report is available and avoid sharing exploit details, credentials, or sensitive data.

## Supported Surface

The current repository supports the Project Khepri agent workflow control plane:

- GitHub custom agents and handoffs;
- repo-local Agent Skills;
- prompt hooks;
- AgentV evals and code-graders;
- .NET workflow contract and registry;
- legacy sample packs.

## Secret Handling

- Never commit credentials, tokens, API keys, private transcripts, or production data.
- Redact secrets in logs, steering entries, eval artifacts, and issue reports.
- Keep `STEERING.md` generalized and free of private user data.
- Review hook scripts carefully because they may process user prompts.

## Dependency And Workflow Changes

For dependency, CI, hook, MCP, or workflow changes:

1. Explain the security impact in the PR.
2. Prefer least-privilege tool access for agents.
3. Keep hook scripts deterministic and narrowly scoped.
4. Run the relevant validation commands from `CONTRIBUTING.md`.
