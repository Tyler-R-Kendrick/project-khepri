# Spec-Driven Development Workflow

Spec Kit operationalizes Spec-Driven Development: specifications are the primary artifact, implementation plans translate requirements into technical decisions, and code serves the spec rather than replacing it.

## Phase Guide

| Phase | Question | Primary Command |
| --- | --- | --- |
| Constitution | What principles govern decisions? | `$speckit-constitution` |
| Specify | What should be built and why? | `$speckit-specify` |
| Clarify | What must be answered before planning? | `$speckit-clarify` |
| Plan | How will the system be built? | `$speckit-plan` |
| Tasks | What can be executed, in what order? | `$speckit-tasks` |
| Analyze | Are spec, plan, and tasks aligned? | `$speckit-analyze` |
| Implement | How do we complete tasks with evidence? | `$speckit-implement` |

## Decision Rules

- Use Spec Kit when the user asks for a feature, product behavior, architecture plan, implementation plan, or task breakdown that should stay traceable.
- Keep implementation details out of `$speckit-specify`; put stack and architecture choices in `$speckit-plan`.
- Run `$speckit-clarify` before planning when unresolved ambiguity could change scope, UX, data shape, privacy, security, or acceptance criteria.
- Run `$speckit-analyze` before `$speckit-implement` for broad, risky, or multi-artifact features.
- Do not use `$speckit-implement` until tasks exist and any checklists have an acceptable status.

## Greenfield and Brownfield

Spec Kit works for new projects and existing systems. In brownfield work, protect current behavior by tying specs to source evidence, tests, or observed runtime behavior. For Project Khepri modernization work, hand source inventory and missing IR questions to `khepri-spec` before turning a modernization goal into a Spec Kit feature.

## Multi-Agent Use

Research-heavy planning can produce parallel questions for specialized agents, but keep phase ownership clear:

- Spec Kit commands define lifecycle artifacts.
- Khepri agents provide repo-specific expertise and verification.
- The user approves major scope changes, integration switches, destructive init/switch flags, and adoption of community extensions or presets.

## Recovery

If a command cannot find the active feature, inspect `.specify/feature.json`, the current branch, and `SPECIFY_FEATURE`. If an integration command fails after modifying files, use `specify integration list` and the manifest files under `.specify/integrations/` to understand what was installed.
