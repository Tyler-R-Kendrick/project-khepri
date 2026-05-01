---
name: "verification-gates"
description: "Completion gates for modernization phases."
domain: "verification"
confidence: "high"
source: "manual"
---

## Gates
- Install dependencies only with the repo-preferred package manager after detecting it.
- Run focused tests before broad tests when changing risky areas.
- Run the real build/test gate or document the blocker with exact command output.
- Run squad build --check after SDK config changes.
- Record follow-up risks as decisions, issues, or squad skills.
