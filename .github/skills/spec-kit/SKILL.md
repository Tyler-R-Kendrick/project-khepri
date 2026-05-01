---
name: spec-kit
description: "Use when setting up or operating GitHub Spec Kit / Specify CLI for Spec-Driven Development: specify init, Codex agent integrations, $speckit-* skills, slash commands, specs, plans, tasks, extensions, presets, or workflows. WHEN: \"use spec-kit\", \"run specify\", \"speckit workflow\", \"create a spec\", \"plan from spec\", \"generate tasks\"."
license: MIT
metadata:
  author: Project Khepri
  version: "1.0.0"
---

# Spec Kit

## Overview

Use GitHub Spec Kit when the work should be driven by durable specifications before code. Prefer the official Specify CLI for project setup and integration management, then use the installed `$speckit-*` skills or slash-command equivalents for the SDD lifecycle.

Compatibility: requires Python 3.11+, git, and uv or pipx for Specify CLI. Codex skills mode uses `.agents/skills` and `.specify/`.

## Triggers

USE FOR: GitHub Spec Kit, Specify CLI, Spec-Driven Development, SDD lifecycle, `$speckit-*` skills, `/speckit.*` slash commands, specs, plans, tasks, extensions, presets, workflows, and agent integrations.

WHEN: "use spec-kit", "install github spec-kit", "run specify init", "create a spec", "make a plan from a spec", "generate spec-kit tasks", "translate slash commands for Codex", "switch Spec Kit integrations".

## Rules

- Use the official CLI from `github/spec-kit`; do not substitute community forks unless the user explicitly asks.
- Keep product intent in `$speckit-specify`; put stack and architecture choices in `$speckit-plan`.
- In Codex, prefer `$speckit-*` skills over `/speckit.*` slash commands.
- Ask before destructive integration switches, forced overwrites, or community extension/preset adoption.
- Let upstream `speckit-*` command skills perform exact lifecycle steps; use this skill for routing, setup, and reference loading.

## Steps

1. Run `scripts/check-spec-kit.ps1` from this skill root to inspect the local Specify CLI and project integration state.
2. If the repo is not initialized, install the official CLI and initialize Codex skills mode:
   ```powershell
   uv tool install specify-cli --from git+https://github.com/github/spec-kit.git --force
   specify init --here --force --integration codex --integration-options="--skills" --script ps --ignore-agent-tools
   ```
3. Use `$speckit-constitution` before feature work if project principles are missing or stale.
4. Use `$speckit-specify`, `$speckit-plan`, `$speckit-tasks`, then `$speckit-implement` for the core lifecycle.
5. Use `$speckit-clarify`, `$speckit-checklist`, and `$speckit-analyze` as quality gates when ambiguity, completeness, or cross-artifact drift matters.

## Reference Loading

- Read `references/cli.md` when installing, upgrading, checking, initializing, or managing extensions, presets, workflows, and integrations with the Specify CLI.
- Read `references/slash-commands.md` when translating between `/speckit.*` slash commands and Codex `$speckit-*` skills.
- Read `references/agents-and-integrations.md` when choosing, switching, upgrading, or explaining agent integrations.
- Read `references/workflow.md` when deciding which SDD phase to run or how Spec Kit should interact with Project Khepri agents.
- Read `references/skill-standard.md` when creating or validating Agent Skills that should follow agentskills.io.
- Read `references/sources.md` when you need the official source links used to build this skill.

## Command Selection

| Need | Use |
| --- | --- |
| Bootstrap or inspect Spec Kit itself | `specify init`, `specify check`, `specify version`, `specify integration list` |
| Create a feature spec from product intent | `$speckit-specify` or `/speckit.specify` |
| Resolve ambiguity before planning | `$speckit-clarify` or `/speckit.clarify` |
| Create technical plan and design artifacts | `$speckit-plan` or `/speckit.plan` |
| Generate executable implementation tasks | `$speckit-tasks` or `/speckit.tasks` |
| Validate cross-artifact consistency | `$speckit-analyze`, `$speckit-checklist` |
| Execute tasks after specs and plans are ready | `$speckit-implement` or `/speckit.implement` |

## Agent Usage

Use this skill before asking a project agent to generate specs, plans, tasks, or implementation from a vague prompt. In Project Khepri, the Spec agent should load this skill for Spec Kit setup questions, for `$speckit-*` command routing, and whenever a user asks for a spec-driven feature workflow rather than a Khepri IR-only artifact.

Use the installed upstream `speckit-*` skills for the exact command behavior. This skill explains when and how to reach for them; it is not a replacement for their generated command bodies.

## Validation

Run these checks after changing this skill or Spec agent guidance:

```powershell
scripts/check-spec-kit.ps1
skills-ref validate .github/skills/spec-kit
npm.cmd run eval:agents:validate
@'
{"config":{"check":"spec-kit-skill"}}
'@ | node evals/github-agents/check-khepri-agents.mjs
@'
{"config":{"check":"spec-agent-speckit-skill-contract"}}
'@ | node evals/github-agents/check-khepri-agents.mjs
```
