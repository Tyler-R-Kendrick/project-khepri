---
name: "squad-generation-tdd"
description: "TDD loop for generating SDK-first squads with AgentEvals, evaluators, test data, rubrics, and live-evals."
domain: "orchestration"
confidence: "high"
source: "manual"
---

## Loop
- Write generated AgentV scenarios before changing squad members.
- Generate evaluators, test data, and a squad member rubric with explicit behavior grades.
- Update squad.config.ts as the SDK-first squad source of truth.
- Run live-evals in the test/dev loop and improve squad members when they steer too far from the rubric.
- Repeat multiple improvement loops until focused reruns and broader validation are green.
