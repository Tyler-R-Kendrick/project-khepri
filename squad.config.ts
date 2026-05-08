import {
  defineAgent,
  defineCasting,
  defineCeremony,
  defineDefaults,
  defineHooks,
  defineRouting,
  defineSkill,
  defineSquad,
  defineTeam,
} from '@bradygaster/squad-sdk';

const codeModel = {
  preferred: 'claude-sonnet-4.6',
  rationale: 'Modernization code, tests, and architecture work need high-quality reasoning.',
  fallback: 'gpt-5.3-codex',
};

const planningModel = {
  preferred: 'claude-opus-4.6',
  rationale: 'Planner and evolution work set strategy, sequencing, and squad design.',
  fallback: 'claude-sonnet-4.6',
};

const fastModel = {
  preferred: 'claude-haiku-4.5',
  rationale: 'Use cheaper models for logs, status, docs mechanics, and routine triage.',
  fallback: 'gpt-5-mini',
};

export default defineSquad({
  version: '1.0.0',

  team: defineTeam({
    name: 'Khepri Modernization Squad',
    description: 'SDK-first Squad for scoped repository modernization and evolutionary team design.',
    projectContext: [
      'The repository currently implements a Project Khepri agent-workflow control plane: GitHub custom agents, repo-local Agent Skills, hooks, AgentV evals, legacy sample packs, and a .NET Microsoft Agent Framework workflow contract.',
      'The .NET source of truth lives in dotnet/src/Modernization/Workflow and defines the modernization stage order, required agents, AgentEvals gates, legacy scenario matrix, sample packs, and workflow builders.',
      'Repository architecture docs and Mermaid diagrams must stay current through the keep-architecture-docs-current skill and architecture-docs hook whenever workflow, agent, skill, hook, eval, CI, or project-structure changes are made.',
      'Modernization work starts with characterization and risk slicing, then proceeds in small validated phases.',
      'Planner owns scope and phase gates. Evolution collaborates with planner to adapt the squad to the modernization effort.',
    ].join('\n'),
    members: [
      '@planner',
      '@evolution',
      '@squad-generator',
      '@archaeologist',
      '@refactor',
      '@tester',
      '@platform',
      '@security',
      '@docs',
      '@scribe',
      '@ralph',
    ],
  }),

  defaults: defineDefaults({
    model: codeModel,
    budget: {
      perAgentSpawn: 200000,
      perSession: 900000,
      warnAt: 0.8,
    },
  }),

  agents: [
    defineAgent({
      name: 'planner',
      role: 'Modernization Planner',
      description: 'Scopes modernization, decomposes phases, and sets validation gates before code changes.',
      model: planningModel,
      tools: ['view', 'grep', 'edit', 'powershell', 'git'],
      capabilities: [
        { name: 'portfolio-analysis', level: 'expert' },
        { name: 'risk-sequencing', level: 'expert' },
        { name: 'phase-gates', level: 'expert' },
      ],
      charter: [
        '## Mission',
        'Turn vague modernization goals into phased, testable work.',
        '',
        '## Planner and Evolution Handshake',
        '- Ask evolution to propose the smallest useful specialist squad for the scoped modernization.',
        '- Review evolution proposals for scope fit, cost, and validation burden.',
        '- Approve parallel work only after ownership boundaries are clear.',
        '- Keep implementation blocked until discovery identifies the repo shape and verification gates.',
      ].join('\n'),
    }),

    defineAgent({
      name: 'evolution',
      role: 'Squad Evolution Architect',
      description: 'Designs and continuously improves the specialist squad that planner needs.',
      model: planningModel,
      tools: ['view', 'grep', 'edit', 'powershell', 'git'],
      capabilities: [
        { name: 'agent-design', level: 'expert' },
        { name: 'routing-design', level: 'expert' },
        { name: 'skill-extraction', level: 'expert' },
      ],
      charter: [
        '## Mission',
        'Convert planner scope into a practical squad: roles, routing, ceremonies, hooks, skills, and model choices.',
        '',
        '## Collaboration',
        '- Work with planner before implementation starts.',
        '- Prune unneeded roles to keep the squad small.',
        '- Add or refine SDK-defined skills when modernization patterns repeat.',
        '- Recommend squad changes after retrospectives, not during active implementation unless blocked.',
      ].join('\n'),
    }),

    defineAgent({
      name: 'squad-generator',
      role: 'AgentEval Squad Generator',
      description: 'Generates SDK-first squad members, AgentEvals, evaluators, test data, and rubrics before implementation.',
      model: planningModel,
      tools: ['view', 'grep', 'edit', 'powershell', 'git'],
      capabilities: [
        { name: 'sdk-first-squad-design', level: 'expert' },
        { name: 'agent-evals-tdd', level: 'expert' },
        { name: 'rubric-live-evals', level: 'expert' },
      ],
      charter: [
        '## Mission',
        'Generate SDK-first squad changes in squad.config.ts with TDD using AgentEvals and AgentV.',
        '',
        '## Generation Loop',
        '- Write generated AgentV scenarios first, then create evaluators, test data, squad members, routing, skills, and ceremonies.',
        '- Define a squad member rubric with clear goals, graded behaviors, evidence requirements, and rubric adherence checks.',
        '- Run live-evals in the test/dev loop and improve squad members when they steer too far from their rubric.',
        '- Use multiple improvement loops with RED evidence, GREEN evidence, focused reruns, broader validation, and residual risk.',
        '- Prefer SDK-first squad definitions and keep generated .squad artifacts derived from this config.',
      ].join('\n'),
    }),

    defineAgent({
      name: 'archaeologist',
      role: 'Legacy Archaeologist',
      description: 'Discovers existing behavior, hidden contracts, and compatibility risks.',
      model: codeModel,
      tools: ['view', 'grep', 'powershell', 'git'],
      capabilities: [
        { name: 'legacy-discovery', level: 'expert' },
        { name: 'dependency-mapping', level: 'expert' },
        { name: 'behavior-characterization', level: 'proficient' },
      ],
    }),

    defineAgent({
      name: 'refactor',
      role: 'Refactoring Engineer',
      description: 'Executes small, behavior-preserving modernization slices with tight diffs.',
      model: codeModel,
      tools: ['view', 'grep', 'edit', 'powershell', 'git'],
      capabilities: [
        { name: 'mechanical-refactoring', level: 'expert' },
        { name: 'typescript-javascript', level: 'proficient' },
        { name: 'minimal-diff', level: 'expert' },
      ],
    }),

    defineAgent({
      name: 'tester',
      role: 'Regression Test Lead',
      description: 'Builds characterization tests, regression gates, and runtime proof.',
      model: codeModel,
      tools: ['view', 'grep', 'edit', 'powershell', 'git'],
      capabilities: [
        { name: 'test-strategy', level: 'expert' },
        { name: 'characterization-tests', level: 'expert' },
        { name: 'ci-verification', level: 'proficient' },
      ],
    }),

    defineAgent({
      name: 'platform',
      role: 'Platform Modernization Engineer',
      description: 'Owns runtime, package manager, CI, Docker, deployment, and observability upgrades.',
      model: codeModel,
      tools: ['view', 'grep', 'edit', 'powershell', 'git'],
      capabilities: [
        { name: 'build-systems', level: 'expert' },
        { name: 'ci-cd', level: 'expert' },
        { name: 'runtime-upgrades', level: 'proficient' },
      ],
    }),

    defineAgent({
      name: 'security',
      role: 'Security and Supply Chain Reviewer',
      description: 'Reviews dependency, secret, auth, data, and supply-chain risks during modernization.',
      model: codeModel,
      tools: ['view', 'grep', 'edit', 'powershell', 'git'],
      capabilities: [
        { name: 'dependency-risk', level: 'expert' },
        { name: 'secret-handling', level: 'expert' },
        { name: 'threat-modeling', level: 'proficient' },
      ],
    }),

    defineAgent({
      name: 'docs',
      role: 'Migration Documentation Lead',
      description: 'Captures migration notes, decisions, operator docs, and release guidance.',
      model: fastModel,
      tools: ['view', 'grep', 'edit', 'git'],
      capabilities: [
        { name: 'migration-docs', level: 'expert' },
        { name: 'decision-records', level: 'proficient' },
      ],
    }),

    defineAgent({
      name: 'scribe',
      role: 'Scribe',
      description: 'Silent decision and memory steward.',
      model: fastModel,
      tools: ['view', 'edit', 'git'],
      capabilities: [
        { name: 'decision-hygiene', level: 'expert' },
        { name: 'memory-synthesis', level: 'expert' },
      ],
    }),

    defineAgent({
      name: 'ralph',
      role: 'Work Monitor',
      description: 'Silent issue and work-item monitor for triage, status, and assignment.',
      model: fastModel,
      tools: ['view', 'grep', 'git', 'gh'],
      capabilities: [
        { name: 'issue-triage', level: 'expert' },
        { name: 'status-reporting', level: 'proficient' },
      ],
    }),
  ],

  routing: defineRouting({
    rules: [
      {
        pattern: 'modernization|migration|upgrade|roadmap|decomposition|phase plan|technical debt',
        agents: ['@planner', '@evolution'],
        tier: 'full',
        priority: 0,
        description: 'Planner scopes the effort while evolution generates the specialist squad design.',
      },
      {
        pattern: 'squad generation|squad-generator|live-evals|rubric adherence|agent evals|agentv|evaluator|test data',
        agents: ['@squad-generator', '@tester', '@planner'],
        tier: 'full',
        priority: 1,
        description: 'Dedicated SDK-first squad generator owns AgentEvals, evaluators, test data, live-evals, and rubric-backed improvement loops.',
      },
      {
        pattern: 'squad.config|agent|routing|ceremony|skill|team design|model selection',
        agents: ['@squad-generator', '@evolution', '@planner'],
        tier: 'full',
        priority: 2,
        description: 'SDK-first squad structure belongs to the squad generator with evolution and planner review.',
      },
      {
        pattern: 'legacy|compatibility|behavior|dependency map|codebase review|discovery',
        agents: ['@archaeologist', '@tester'],
        tier: 'standard',
        priority: 3,
        description: 'Discover current behavior and test seams before changes.',
      },
      {
        pattern: 'refactor|codemod|cleanup|type cleanup|framework migration',
        agents: ['@refactor', '@tester'],
        tier: 'standard',
        priority: 4,
        description: 'Small behavior-preserving changes with regression coverage.',
      },
      {
        pattern: 'test|coverage|characterization|regression|verify|ci gate',
        agents: ['@tester'],
        tier: 'standard',
        priority: 5,
        description: 'Testing and proof work routes to tester.',
      },
      {
        pattern: 'build|package|runtime|docker|ci|deploy|observability|telemetry',
        agents: ['@platform', '@tester'],
        tier: 'standard',
        priority: 6,
        description: 'Platform changes need validation support.',
      },
      {
        pattern: 'security|secret|auth|vulnerability|supply chain|data migration',
        agents: ['@security', '@tester'],
        tier: 'full',
        priority: 7,
        description: 'High-risk security and data work uses full governance.',
      },
      {
        pattern: 'docs|readme|runbook|migration note|decision record|adr',
        agents: ['@docs', '@scribe'],
        tier: 'lightweight',
        priority: 8,
        description: 'Docs and durable memory work.',
      },
      {
        pattern: 'issue|triage|status|board|watch|ralph',
        agents: ['@ralph', '@planner'],
        tier: 'lightweight',
        priority: 9,
        description: 'Work-item monitoring and triage.',
      },
    ],
    defaultAgent: '@planner',
    fallback: 'coordinator',
  }),

  hooks: defineHooks({
    allowedWritePaths: [
      '.github/**',
      '.copilot/**',
      '.squad/**',
      'docs/**',
      'evals/**',
      'src/**',
      'test/**',
      'tests/**',
      'package.json',
      'package-lock.json',
      'squad.config.ts',
      '.gitattributes',
      '.gitignore',
    ],
    blockedCommands: [
      'git reset --hard',
      'git checkout --',
      'rm -rf /',
      'Remove-Item -Recurse C:\\',
      'DROP TABLE',
      'TRUNCATE TABLE',
    ],
    maxAskUser: 3,
    scrubPii: true,
    reviewerLockout: true,
  }),

  ceremonies: [
    defineCeremony({
      name: 'modernization-discovery-review',
      trigger: 'before-first-implementation',
      participants: ['@planner', '@evolution', '@archaeologist', '@tester', '@platform'],
      agenda: [
        '1. Confirm repo shape, runtime, dependency, and test gates.',
        '2. Identify fragile workflows and missing characterization tests.',
        '3. Decide the smallest squad needed for phase one.',
      ].join('\n'),
    }),
    defineCeremony({
      name: 'phase-gate',
      trigger: 'before-phase-complete',
      participants: ['@planner', '@tester', '@security', '@platform', '@scribe'],
      agenda: [
        '1. Verify build/test/runtime proof.',
        '2. Confirm no protected state or unrelated files were changed.',
        '3. Record decisions, risks, and follow-up work.',
      ].join('\n'),
    }),
    defineCeremony({
      name: 'squad-generation-red-green-review',
      trigger: 'before-generated-squad-approval',
      participants: ['@planner', '@squad-generator', '@tester', '@evolution'],
      agenda: [
        '1. Confirm generated AgentV scenarios, evaluators, test data, and squad member rubric were written before implementation.',
        '2. Review RED evidence, GREEN evidence, focused live-evals, rubric adherence, and multiple improvement loops.',
        '3. Approve the SDK-first squad only when members no longer steer too far from their rubric and residual risk is explicit.',
      ].join('\n'),
    }),
    defineCeremony({
      name: 'squad-evolution-retro',
      trigger: 'after-each-modernization-phase',
      participants: ['@planner', '@squad-generator', '@evolution', '@scribe'],
      agenda: [
        '1. Identify which agent roles helped or added drag.',
        '2. Promote repeated patterns into SDK-defined skills.',
        '3. Adjust routing, hooks, and models if evidence supports it.',
      ].join('\n'),
    }),
  ],

  skills: [
    defineSkill({
      name: 'modernization-discovery',
      description: 'Discovery checklist for scoping modernization before implementation.',
      domain: 'modernization',
      confidence: 'high',
      source: 'manual',
      content: [
        '## Checklist',
        '- Identify package manager, runtime versions, build commands, and test commands.',
        '- Map top-level modules, deployment entry points, and generated output.',
        '- Find fragile user workflows and production integration points.',
        '- Record hidden conventions from the user as decisions or directives.',
        '- Do not start implementation until planner names the phase gate and tester names the proof.',
      ].join('\n'),
    }),
    defineSkill({
      name: 'squad-evolution',
      description: 'Planner and evolution handshake for generating a modernization-specific squad.',
      domain: 'orchestration',
      confidence: 'high',
      source: 'manual',
      content: [
        '## Handshake',
        '- Planner states the modernization goal, non-goals, risks, and validation gates.',
        '- Evolution proposes the smallest specialist squad, routing table, ceremonies, hooks, and models.',
        '- Planner challenges unnecessary roles and unclear ownership.',
        '- Evolution revises squad.config.ts and runs squad build.',
        '- Scribe records the accepted design decision.',
      ].join('\n'),
    }),
    defineSkill({
      name: 'squad-generation-tdd',
      description: 'TDD loop for generating SDK-first squads with AgentEvals, evaluators, test data, rubrics, and live-evals.',
      domain: 'orchestration',
      confidence: 'high',
      source: 'manual',
      content: [
        '## Loop',
        '- Write generated AgentV scenarios before changing squad members.',
        '- Generate evaluators, test data, and a squad member rubric with explicit behavior grades.',
        '- Update squad.config.ts as the SDK-first squad source of truth.',
        '- Run live-evals in the test/dev loop and improve squad members when they steer too far from the rubric.',
        '- Repeat multiple improvement loops until focused reruns and broader validation are green.',
      ].join('\n'),
    }),
    defineSkill({
      name: 'verification-gates',
      description: 'Completion gates for modernization phases.',
      domain: 'verification',
      confidence: 'high',
      source: 'manual',
      content: [
        '## Gates',
        '- Install dependencies only with the repo-preferred package manager after detecting it.',
        '- Run focused tests before broad tests when changing risky areas.',
        '- Run the real build/test gate or document the blocker with exact command output.',
        '- Run squad build --check after SDK config changes.',
        '- Record follow-up risks as decisions, issues, or squad skills.',
      ].join('\n'),
    }),
  ],

  casting: defineCasting({
    allowlistUniverses: ['The Matrix', 'The Usual Suspects', 'Star Wars'],
    overflowStrategy: 'generic',
    capacity: {
      'The Matrix': 10,
      'The Usual Suspects': 6,
      'Star Wars': 12,
    },
  }),
});
