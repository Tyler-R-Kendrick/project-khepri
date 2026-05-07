---
name: learn
description: Use this skill when the user corrects an agent, says prior behavior was wrong, asks the agent to remember a preference, or gives steering that should prevent repeat mistakes. Capture a succinct generalized correction in STEERING.md for all Project Khepri agents.
---

# Learn

Use this skill when the user correction should change future Project Khepri agent behavior.

## Steps

1. Identify the correction, preference, or repeated mistake from the user's message.
2. Convert it into a succinct generalization that future agents can apply.
3. Do not store secrets, credentials, private data, or a long transcript.
4. Update `STEERING.md` with the generalized guidance.
5. Preserve that future agents should read before work by checking `STEERING.md` before phase tasks.
6. Keep existing steering intact unless the user explicitly replaces it.
7. If the correction implies a reusable workflow, ask `khepri-evolution` to create or improve the relevant Agent Skill, hook, or AgentV eval.

## Format

Add entries under `Learned Corrections` using this shape:

```markdown
- YYYY-MM-DD: Generalized correction. Evidence: brief source phrase or context.
```

Prefer a short principle over a quote. For example, convert "you only inspected the files, I asked you to run the eval" into "When asked to verify agent behavior, run the AgentV eval gate instead of relying on file inspection alone."

## Edge Cases

- If the user is only giving task requirements, do not add steering.
- If the user is angry but gives no reusable correction, acknowledge the problem and ask what behavior should change.
- If the correction conflicts with existing steering, preserve both and flag the conflict for `khepri-evolution`.
- If automation captured an imperfect entry, revise `STEERING.md` manually before continuing.
