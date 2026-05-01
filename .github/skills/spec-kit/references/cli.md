# Specify CLI Reference

Use the official GitHub Spec Kit CLI package, exposed as `specify`, for setup and maintenance. Install from the upstream repository when freshness matters:

```powershell
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git --force
```

## Core Commands

| Command | Purpose |
| --- | --- |
| `specify init [project]` | Create `.specify/`, templates, scripts, and one agent integration. Use `--here` or `.` for the current directory. |
| `specify check` | Verify required tools such as git and CLI-based agent tools. |
| `specify version` or `specify --version` | Show CLI and platform version. On Windows consoles, set `PYTHONIOENCODING=utf-8` if the banner fails to print. |

Useful init flags:

```powershell
specify init --here --force --integration codex --integration-options="--skills" --script ps
specify init my-project --integration copilot --branch-numbering timestamp
specify init --here --force --integration codex --ignore-agent-tools
```

Use `--ignore-agent-tools` when bootstrapping templates without requiring the selected coding assistant CLI to be installed. Use `--script ps` for PowerShell scripts in Windows-friendly repos.

## Integrations

| Command | Purpose |
| --- | --- |
| `specify integration list` | Show supported agents and current integration state. |
| `specify integration install <key>` | Add an integration to an initialized project. |
| `specify integration switch <key>` | Uninstall the current integration and install another. |
| `specify integration upgrade [key]` | Refresh files for the current integration after upgrading Spec Kit. |
| `specify integration uninstall [key]` | Remove tracked integration files, preserving locally modified files unless forced. |

Only one Spec Kit integration is active per project. Prefer `switch` over manual deletion because Spec Kit tracks generated files and hashes.

## Extensions, Presets, and Workflows

Extensions add new commands or quality gates:

```powershell
specify extension search [query]
specify extension add <name>
specify extension list
specify extension update [name]
```

Presets customize templates, commands, and terminology:

```powershell
specify preset search [query]
specify preset add <preset-id>
specify preset list
specify preset resolve <name>
```

Workflows chain phases with prompts, commands, shell steps, and gates:

```powershell
specify workflow run speckit -i spec="Build a kanban board"
specify workflow status
specify workflow resume <run-id>
```

Catalog resolution can come from environment variables, project config, user config, or built-in defaults. Keep project-level catalog changes under `.specify/` when the team should share them.

## Environment

`SPECIFY_FEATURE` can select a feature directory in non-Git or unusual branch contexts before running plan and later commands. Spec Kit also writes `.specify/feature.json` so downstream commands can locate the active feature directory.
