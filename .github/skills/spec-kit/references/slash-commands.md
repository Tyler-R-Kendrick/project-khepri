# Slash Commands and Codex Skills

Spec Kit installs different command surfaces depending on the integration. For Codex skills mode, use `$speckit-<command>`. In slash-command agents, use `/speckit.<command>`.

| Lifecycle Step | Codex Skill | Slash Command | Purpose |
| --- | --- | --- | --- |
| Project principles | `$speckit-constitution` | `/speckit.constitution` | Create or update `.specify/memory/constitution.md`. |
| Feature spec | `$speckit-specify` | `/speckit.specify` | Convert product intent into `specs/<feature>/spec.md`. |
| Clarification | `$speckit-clarify` | `/speckit.clarify` | Ask structured questions before planning. |
| Technical plan | `$speckit-plan` | `/speckit.plan` | Generate `plan.md`, research, data model, contracts, and quickstart. |
| Tasks | `$speckit-tasks` | `/speckit.tasks` | Generate `tasks.md` from the plan and design artifacts. |
| Implementation | `$speckit-implement` | `/speckit.implement` | Execute tasks phase by phase with checklist gates. |
| Consistency | `$speckit-analyze` | `/speckit.analyze` | Review cross-artifact alignment after tasks and before implementation. |
| Checklists | `$speckit-checklist` | `/speckit.checklist` | Create quality checklists for specs and plans. |
| GitHub issues | `$speckit-taskstoissues` | `/speckit.taskstoissues` | Convert generated tasks into GitHub issues when tracking outside the repo. |

## Recommended Order

1. `$speckit-constitution` when the project lacks current governing principles.
2. `$speckit-specify <feature intent>` with what and why, not tech stack.
3. `$speckit-clarify` when important requirements are ambiguous.
4. `$speckit-plan <architecture and stack choices>`.
5. `$speckit-checklist` if requirement completeness needs an explicit gate.
6. `$speckit-tasks`.
7. `$speckit-analyze` before coding when the feature is broad or risky.
8. `$speckit-implement` only after checklists are acceptable.

## Common Translation Rule

If official docs or a user mention `/speckit.specify`, and this project uses Codex skills mode, invoke `$speckit-specify` instead. Preserve the same arguments and phase semantics.

## Expected Artifacts

- `.specify/memory/constitution.md`
- `specs/<feature>/spec.md`
- `specs/<feature>/plan.md`
- `specs/<feature>/research.md`
- `specs/<feature>/data-model.md`
- `specs/<feature>/contracts/`
- `specs/<feature>/quickstart.md`
- `specs/<feature>/tasks.md`
- `specs/<feature>/checklists/`
