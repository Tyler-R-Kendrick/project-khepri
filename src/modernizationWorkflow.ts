import type { FlexibleChatCompletionMessage, GraphTrajectory } from 'agentevals';

export type ModernizationDomain = 'app' | 'infra' | 'data';

export type WorkflowState =
  | 'legacy-discovery'
  | 'target-discovery'
  | 'modernization-planning'
  | 'plan-persistence'
  | 'specialist-squad-tdd'
  | 'incremental-development'
  | 'phase-retro'
  | 'complete';

export type ModernizationRequest = {
  repository: {
    name: string;
    root: string;
    trackers: Array<{ kind: string; project: string }>;
  };
  legacySystem: {
    summary: string;
    entrypoints: string[];
    regressionSuites: string[];
  };
  targetState: Record<ModernizationDomain, string[]>;
  ambiguities?: Array<{
    id: string;
    domain: ModernizationDomain;
    question: string;
  }>;
};

export type ModernizationEvent = {
  type:
    | 'state.entered'
    | 'tool.used'
    | 'agent.handoff'
    | 'skill.used'
    | 'requirements.extracted'
    | 'spec.created'
    | 'test_plan.created'
    | 'modernization_plan.created'
    | 'plan.persisted'
    | 'squad.created'
    | 'human.elicitation.required'
    | 'approval.required'
    | 'tdd.red'
    | 'tdd.green'
    | 'retro.completed';
  state?: WorkflowState;
  domain?: ModernizationDomain;
  tool?: string;
  args?: Record<string, unknown>;
  timestamp?: string;
};

export type ModernizationPhase = {
  id: string;
  increment: number;
  title: string;
  dependsOn: string[];
  squadId: string;
  specId: string;
  testPlanId: string;
  modernizer: `${ModernizationDomain}-modernizer`;
  validationGate: string;
};

export type ModernizationResult = {
  status: 'complete' | 'blocked_for_human';
  events: ModernizationEvent[];
  plan: {
    id: string;
    domains: Record<ModernizationDomain, ModernizationPhase[]>;
  };
};

export type ModernizationWorkflowOptions = {
  now: () => string;
  nextId: (prefix: string, index: number) => string;
};

export type GithubCopilotModernizerAgent = {
  name: `${ModernizationDomain}-modernizer`;
  domain: ModernizationDomain;
  role: string;
  responsibilities: string[];
  skills: string[];
  tools: string[];
  modernizationPatterns: string[];
};

export type ModernizationSkillDefinition = {
  name: 'github-copilot-modernization-workflow';
  requiredWorkflowStates: WorkflowState[];
  content: string;
};

const domains = ['app', 'infra', 'data'] as const;
const workflowStates: WorkflowState[] = [
  'legacy-discovery',
  'target-discovery',
  'modernization-planning',
  'plan-persistence',
  'specialist-squad-tdd',
  'incremental-development',
  'phase-retro',
];

const phaseTitles: Record<ModernizationDomain, string[]> = {
  app: [
    'Characterize user behavior and carve app seams',
    'Introduce target app shell behind compatibility routes',
    'Migrate user-facing flows with legacy regression coverage',
  ],
  infra: [
    'Characterize build, release, runtime, and observability gates',
    'Introduce parallel target delivery path',
    'Shift traffic and retire legacy infrastructure path',
  ],
  data: [
    'Characterize schemas, ownership, retention, and data contracts',
    'Run expand-contract migration with reversible backfills',
    'Cut reads and writes to target stores with reconciliation checks',
  ],
};

export function createModernizationWorkflow(options: ModernizationWorkflowOptions) {
  return {
    async run(request: ModernizationRequest): Promise<ModernizationResult> {
      const events: ModernizationEvent[] = [];
      const plan = createEmptyPlan(options.nextId('modernization-plan', 0));

      const addEvent = (event: ModernizationEvent) => {
        events.push({ timestamp: options.now(), ...event });
      };

      const enter = (state: WorkflowState) => addEvent({ type: 'state.entered', state });

      const useTool = (
        state: WorkflowState,
        tool: string,
        args: Record<string, unknown>,
        domain?: ModernizationDomain,
      ) => addEvent({ type: 'tool.used', state, tool, args, domain });

      const evaluateAgenticBehavior = (
        state: WorkflowState,
        behavior: string,
        domain?: ModernizationDomain,
      ) =>
        useTool(
          state,
          'agent_evals.evaluate_agentic_behavior',
          {
            behavior,
            coverage: '100%',
            evaluators: ['tool_trajectory', 'llm_judge', 'rubric'],
          },
          domain,
        );

      enter('legacy-discovery');
      useTool('legacy-discovery', 'microsoft_agent_framework.start_stateful_workflow', {
        workflow: 'github-copilot-modernization',
        execution: 'deterministic',
        stateStore: 'AgentState',
      });
      useTool('legacy-discovery', 'github_copilot.rubber_duck', {
        mode: 'experimental',
        purpose: 'challenge assumptions before modernization planning',
      });
      useTool('legacy-discovery', 'legacy_system.extract_requirements_specs_tests', {
        repository: request.repository.name,
        entrypoints: request.legacySystem.entrypoints,
        regressionSuites: request.legacySystem.regressionSuites,
      });
      addEvent({ type: 'requirements.extracted', state: 'legacy-discovery' });
      addEvent({ type: 'spec.created', state: 'legacy-discovery' });
      addEvent({ type: 'test_plan.created', state: 'legacy-discovery' });
      evaluateAgenticBehavior(
        'legacy-discovery',
        'legacy requirements, specs, and executable regression tests were extracted from registered legacy systems',
      );

      enter('target-discovery');
      useTool('target-discovery', 'target_system.extract_requirements_specs_test_plans', {
        repository: request.repository.name,
        targetState: request.targetState,
      });
      addEvent({ type: 'requirements.extracted', state: 'target-discovery' });
      addEvent({ type: 'spec.created', state: 'target-discovery' });
      addEvent({ type: 'test_plan.created', state: 'target-discovery' });
      evaluateAgenticBehavior(
        'target-discovery',
        'target desired-state requirements, specs, and test plans were extracted before planning',
      );

      if (request.ambiguities?.length) {
        for (const ambiguity of request.ambiguities) {
          addEvent({
            type: 'human.elicitation.required',
            state: 'target-discovery',
            domain: ambiguity.domain,
            args: {
              ambiguityId: ambiguity.id,
              question: ambiguity.question,
            },
          });
          useTool('target-discovery', 'human.elicitation.request', {
            ambiguityId: ambiguity.id,
            question: ambiguity.question,
          }, ambiguity.domain);
          addEvent({
            type: 'approval.required',
            state: 'target-discovery',
            domain: ambiguity.domain,
            args: {
              artifact: 'target-state-spec',
              requires: ['human approval', 'revision before planning', 'explicit acceptance'],
            },
          });
        }

        return {
          status: 'blocked_for_human',
          events,
          plan,
        };
      }

      enter('modernization-planning');
      useTool('modernization-planning', 'agent_skill.use', {
        skill: 'github-copilot-modernization-workflow',
      });
      addEvent({
        type: 'skill.used',
        state: 'modernization-planning',
        args: { skill: 'github-copilot-modernization-workflow' },
      });

      for (const domain of domains) {
        useTool('modernization-planning', 'github_copilot.handoff', {
          to: `${domain}-modernizer`,
          reason: `${domain} modernization planning`,
        }, domain);
        addEvent({
          type: 'agent.handoff',
          state: 'modernization-planning',
          domain,
          args: { to: `${domain}-modernizer` },
        });
      }

      useTool('modernization-planning', 'modernization_plan.create_incremental', {
        domains: [...domains],
        strategy: 'small reversible phases with validation gates',
      });
      for (const domain of domains) {
        plan.domains[domain] = createDomainPhases(domain);
        for (const phase of plan.domains[domain]) {
          addEvent({
            type: 'spec.created',
            state: 'modernization-planning',
            domain,
            args: {
              planId: phase.id,
              specId: phase.specId,
              drivenBy: 'incremental modernization plan',
            },
          });
          addEvent({
            type: 'test_plan.created',
            state: 'modernization-planning',
            domain,
            args: {
              specId: phase.specId,
              testPlanId: phase.testPlanId,
              drivenBy: 'approved specification',
            },
          });
        }
      }
      addEvent({
        type: 'modernization_plan.created',
        state: 'modernization-planning',
        args: { planId: plan.id, incremental: true },
      });
      evaluateAgenticBehavior(
        'modernization-planning',
        'registered modernization agents informed a high-level incremental plan from approved specs',
      );

      enter('plan-persistence');
      const tracker = request.repository.trackers[0]?.kind ?? 'registered-project-tracker';
      useTool('plan-persistence', 'project_tracker.persist_plan', {
        tracker,
        project: request.repository.trackers[0]?.project,
        planId: plan.id,
      });
      addEvent({
        type: 'plan.persisted',
        state: 'plan-persistence',
        args: { tracker, planId: plan.id },
      });
      evaluateAgenticBehavior(
        'plan-persistence',
        'incremental modernization plan was persisted to the registered project tracker',
      );

      enter('specialist-squad-tdd');
      for (const domain of domains) {
        for (const phase of plan.domains[domain]) {
          addEvent({
            type: 'tdd.red',
            state: 'specialist-squad-tdd',
            domain,
            args: { source: 'spec', target: 'phase-squad', phaseId: phase.id },
          });
          useTool('specialist-squad-tdd', 'tdd.red', {
            source: 'spec',
            target: 'phase-squad',
            phaseId: phase.id,
          }, domain);
          useTool('specialist-squad-tdd', 'squad_sdk.define_phase_squad', {
            domain,
            phase: phase.increment,
            squadId: phase.squadId,
            codeSdkDefinition: true,
          }, domain);
          addEvent({
            type: 'squad.created',
            state: 'specialist-squad-tdd',
            domain,
            args: { squadId: phase.squadId, phaseId: phase.id },
          });
          useTool('specialist-squad-tdd', 'agent_evals.evaluate_squad', {
            evaluator: 'trajectory_match',
            coverage: '100%',
            evaluators: ['tool_trajectory', 'llm_judge', 'rubric'],
            squadId: phase.squadId,
            expected: ['handoff', 'skill.use', 'spec-driven-tests'],
          }, domain);
          addEvent({
            type: 'tdd.green',
            state: 'specialist-squad-tdd',
            domain,
            args: { source: 'agent-evals', target: 'phase-squad', phaseId: phase.id },
          });
        }
      }
      evaluateAgenticBehavior(
        'specialist-squad-tdd',
        'phase-dedicated app, infra, and data squads were generated through AgentEvals-backed TDD',
      );

      enter('incremental-development');
      for (const domain of domains) {
        for (const phase of plan.domains[domain]) {
          useTool('incremental-development', 'tdd.red', {
            source: 'spec',
            phaseId: phase.id,
          }, domain);
          addEvent({
            type: 'tdd.red',
            state: 'incremental-development',
            domain,
            args: { source: 'spec', phaseId: phase.id },
          });
          for (const suite of request.legacySystem.regressionSuites) {
            useTool('incremental-development', 'legacy_tests.run_regression', {
              suite,
              phaseId: phase.id,
            }, domain);
          }
          useTool('incremental-development', 'tdd.green', {
            regression: 'legacy',
            phaseId: phase.id,
          }, domain);
          addEvent({
            type: 'tdd.green',
            state: 'incremental-development',
            domain,
            args: { regression: 'legacy', phaseId: phase.id },
          });
        }
      }
      evaluateAgenticBehavior(
        'incremental-development',
        'generated squads executed the current modernization stage through red-green legacy regression checks',
      );

      enter('phase-retro');
      addEvent({
        type: 'retro.completed',
        state: 'phase-retro',
        args: {
          repeatsUntil: 'modernization complete',
          promotesPatternsToSkills: true,
        },
      });
      evaluateAgenticBehavior(
        'phase-retro',
        'phase retrospective captured reusable modernization patterns and follow-up eval gaps',
      );
      enter('complete');

      return {
        status: 'complete',
        events,
        plan,
      };
    },
  };
}

export function toAgentEvalMessages(events: ModernizationEvent[]): FlexibleChatCompletionMessage[] {
  const toolCalls = events
    .filter((event) => event.type === 'tool.used' && event.tool)
    .map((event, index) => ({
      id: `call-${index + 1}`,
      type: 'function',
      function: {
        name: event.tool,
        arguments: JSON.stringify(event.args ?? {}),
      },
    }));

  if (toolCalls.length === 0) {
    return [];
  }

  return [
    {
      role: 'assistant',
      content: '',
      tool_calls: toolCalls,
    },
  ];
}

export function toGraphTrajectory(result: ModernizationResult): GraphTrajectory {
  const steps = result.events
    .filter((event): event is ModernizationEvent & { state: WorkflowState } => {
      return event.type === 'state.entered' && Boolean(event.state);
    })
    .map((event) => event.state);

  return {
    results: [{ status: result.status }],
    steps: [steps],
  };
}

export function buildGithubCopilotModernizerAgents(): GithubCopilotModernizerAgent[] {
  return [
    {
      name: 'app-modernizer',
      domain: 'app',
      role: 'Application Modernization Agent',
      responsibilities: [
        'extract legacy app behavior',
        'create phase-dedicated squads',
        'drive app specs into tests',
        'preserve user-facing regression coverage',
      ],
      skills: ['github-copilot-modernization-workflow', 'modernization-discovery', 'test-discipline'],
      tools: ['microsoft-agent-framework', 'github-copilot-sdk', 'squad-sdk', 'agent-evals'],
      modernizationPatterns: [
        'strangler fig',
        'branch by abstraction',
        'parallel run',
        'contract-first API boundary',
        'characterization tests',
      ],
    },
    {
      name: 'infra-modernizer',
      domain: 'infra',
      role: 'Infrastructure Modernization Agent',
      responsibilities: [
        'extract delivery and runtime constraints',
        'create phase-dedicated squads',
        'turn platform specs into verification gates',
        'keep rollout and rollback paths explicit',
      ],
      skills: ['github-copilot-modernization-workflow', 'verification-gates', 'squad-evolution'],
      tools: ['microsoft-agent-framework', 'github-copilot-sdk', 'squad-sdk', 'agent-evals'],
      modernizationPatterns: [
        'blue-green migration',
        'canary rollout',
        'infrastructure as code',
        'observability-first cutover',
        'progressive delivery',
      ],
    },
    {
      name: 'data-modernizer',
      domain: 'data',
      role: 'Data Modernization Agent',
      responsibilities: [
        'extract data contracts and quality rules',
        'create phase-dedicated squads',
        'gate ambiguous specs on human approval',
        'drive migration specs into reconciliation tests',
      ],
      skills: ['github-copilot-modernization-workflow', 'modernization-discovery', 'verification-gates'],
      tools: ['microsoft-agent-framework', 'github-copilot-sdk', 'squad-sdk', 'agent-evals'],
      modernizationPatterns: [
        'expand-contract migration',
        'dual write with reconciliation',
        'backfill with checksums',
        'schema versioning',
        'data quality gates',
      ],
    },
  ];
}

export function buildModernizationSkill(): ModernizationSkillDefinition {
  return {
    name: 'github-copilot-modernization-workflow',
    requiredWorkflowStates: workflowStates,
    content: [
      '# GitHub Copilot Modernization Workflow',
      '',
      '## Stateful Async Workflow',
      'Run modernization through a deterministic Microsoft Agent Framework workflow. The workflow records every state transition, tool call, skill use, agent handoff, and Squad creation as auditable events.',
      '',
      '## Required States',
      ...workflowStates.map((state, index) => `${index + 1}. ${state}`),
      '',
      '## Modernizer Agents',
      '- app-modernizer owns application modernization patterns such as strangler fig, branch by abstraction, contract-first seams, and characterization tests.',
      '- infra-modernizer owns platform modernization patterns such as infrastructure as code, progressive delivery, canary rollout, rollback gates, and observability-first cutovers.',
      '- data-modernizer owns data modernization patterns such as expand-contract migration, dual writes, reconciliation checks, schema versioning, and data quality gates.',
      '',
      '## Deterministic Gates',
      '- Legacy discovery produces requirements, specs, and regression tests before target planning.',
      '- Target discovery produces requirements, specs, and test plans for the desired state.',
      '- Specs that resolve ambiguity require human elicitation, approval, and revision before planning can continue.',
      '- Modernization plans must be incremental and must drive spec development.',
      '- Approved specs drive test development before implementation.',
      '- Each incremental phase gets its own code/SDK-defined Squad.',
      '- Squad agents are tested with agent-evals before phase work starts.',
      '- Development uses TDD red/green loops and legacy tests as regression checks.',
      '- The workflow uses GitHub Copilot SDK ambient auth and experimental rubber duck mode to challenge assumptions before planning.',
    ].join('\n'),
  };
}

export async function loadRuntimePackages() {
  const [microsoftAgents, copilotSdk] = await Promise.all([
    import('@microsoft/agents-hosting'),
    import('@github/copilot-sdk'),
  ]);

  return {
    microsoftAgentFramework: {
      AgentApplicationBuilder: microsoftAgents.AgentApplicationBuilder,
      AgentState: microsoftAgents.AgentState,
    },
    copilotSdk: {
      CopilotClient: copilotSdk.CopilotClient,
      approveAll: copilotSdk.approveAll,
    },
  };
}

export function createCopilotRubberDuckSessionConfig() {
  return {
    useLoggedInUser: true,
    model: 'gpt-5',
    onPermissionRequest: 'approveAll',
    systemMessage: {
      mode: 'customize',
      sections: {
        guidelines: {
          action: 'append',
          content:
            'Use experimental rubber duck mode to challenge modernization assumptions before creating plans, specs, tests, or squads.',
        },
      },
      content:
        'Route modernization work through the github-copilot-modernization-workflow skill and require phase-dedicated Squads.',
    },
  };
}

function createEmptyPlan(id: string): ModernizationResult['plan'] {
  return {
    id,
    domains: {
      app: [],
      infra: [],
      data: [],
    },
  };
}

function createDomainPhases(domain: ModernizationDomain): ModernizationPhase[] {
  return phaseTitles[domain].map((title, index) => {
    const phaseNumber = index + 1;
    const id = `${domain}-phase-${phaseNumber}`;
    const specId = `${id}-spec`;
    return {
      id,
      increment: phaseNumber,
      title,
      dependsOn: index === 0 ? [] : [`${domain}-phase-${index}`],
      squadId: `squad-${domain}-phase-${phaseNumber}`,
      specId,
      testPlanId: `${specId}-test-plan`,
      modernizer: `${domain}-modernizer`,
      validationGate: `${domain}-phase-${phaseNumber}-red-green-regression-gate`,
    };
  });
}
