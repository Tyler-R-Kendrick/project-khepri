# Agent Skills Standard Notes

Use this when creating or revising skills that must follow agentskills.io.

## Required Structure

```text
skill-name/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

Only `SKILL.md` is required. Optional directories should exist only when they support real execution or progressive disclosure.

## SKILL.md Requirements

- YAML frontmatter first.
- Required `name`: 1-64 characters, lowercase letters/numbers/hyphens, no leading/trailing hyphen, no consecutive hyphens, and matches the folder.
- Required `description`: non-empty, 1024 characters or fewer, and specific enough for activation.
- Optional fields include `license`, `compatibility`, `metadata`, and experimental `allowed-tools`.
- Markdown body should contain actionable instructions, examples, and edge cases.

## Progressive Disclosure

Agents see skill metadata first, `SKILL.md` only after activation, and extra files only when loaded or executed. Keep `SKILL.md` focused and move detailed material to one-level reference files such as `references/cli.md`.

## Script Guidance

Scripts should be self-contained, non-interactive by default, and provide helpful errors. Document usage in `SKILL.md` and keep script paths relative to the skill root.

## Validation

Use both structural and behavioral checks:

```powershell
skills-ref validate .github/skills/spec-kit
scripts/check-spec-kit.ps1
```

For trigger quality, use realistic should-trigger and should-not-trigger prompts, then iterate the description without stuffing it with exact prompt text.
