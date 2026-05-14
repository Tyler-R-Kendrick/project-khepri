---
name: "github-copilot-modernization-workflow"
description: "Deterministic workflow for GitHub Copilot modernization agents."
domain: "modernization"
confidence: "high"
source: "manual"
---

## Stateful Async Workflow
Run modernization through Microsoft Agent Framework workflow state and record state transitions, handoffs, tools, skills, squads, tests, and approvals as events.

## States
1. legacy-discovery
2. target-discovery
3. modernization-planning
4. plan-persistence
5. specialist-squad-tdd
6. incremental-development
7. phase-retro

## Rules
- Use GitHub Copilot SDK ambient auth and experimental rubber duck mode before planning.
- Hand off app work to app-modernizer, infrastructure work to infra-modernizer, and data work to data-modernizer.
- Each incremental modernization phase gets a dedicated code/SDK-defined Squad.
- Modernization plans must be incremental and must drive spec development.
- Specs drive test development before implementation.
- Ambiguous specs require human elicitation, approval, and revision before planning continues.
- Use agent-evals to test expected handoffs, tool use, skill use, Squad creation, specs, and TDD loops.
