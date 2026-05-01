# Agents and Integrations

Spec Kit supports many AI coding assistants. The installed integration controls where command files, skills, recipes, and context files are placed.

## Codex Integration

Use the `codex` integration for this repo:

```powershell
specify init --here --force --integration codex --integration-options="--skills" --script ps
```

Codex skills mode installs skill directories under `.agents/skills/` and the user invokes them as `$speckit-<command>`. For example, `$speckit-plan` reads the active spec and writes design artifacts.

## Other Common Integration Patterns

| Integration Type | Typical Output |
| --- | --- |
| Skills-based agents | `speckit-<command>/SKILL.md` directories. |
| Markdown command agents | Markdown prompt files in the assistant command directory. |
| TOML command agents | TOML command files, such as Gemini-style commands. |
| YAML recipe agents | YAML recipes, such as Goose recipes. |
| Generic agents | User-selected command directory via `--integration-options`. |

Use `specify integration list` to see the exact keys supported by the installed CLI. The official docs describe Codex as a skills-based integration that writes to `.agents/skills` and invokes commands as `$speckit-<command>`.

## Switching and Upgrading

Do not manually delete generated integration files unless you have a recovery plan. Prefer:

```powershell
specify integration switch <key>
specify integration upgrade
```

Spec Kit tracks generated files and preserves modified files during uninstall/switch flows. Use `--force` only when the user accepts overwriting local modifications.

## Project Khepri Agent Coordination

- `khepri-spec` owns spec-driven artifact generation decisions and should load this skill when Spec Kit is involved.
- `khepri-planner` owns broader modernization plans that need user approval before implementation.
- `khepri-code` and `khepri-test` own TDD implementation and verification once Spec Kit tasks are ready.
- `khepri-evolution` owns durable skill, agent, hook, and eval improvements, including future updates to this skill.

Use Spec Kit command skills for the official SDD lifecycle. Use Khepri agents for repo-specific modernization roles, handoffs, AgentV evals, and steering.
