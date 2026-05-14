import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createTrajectoryMatchEvaluator,
  type FlexibleChatCompletionMessage,
} from 'agentevals';
import { describe, expect, test } from 'vitest';
import {
  buildGithubCopilotModernizerAgents,
  buildModernizationSkill,
  createModernizationWorkflow,
  toAgentEvalMessages,
  toGraphTrajectory,
  type ModernizationRequest,
} from '../src/modernizationWorkflow';

const repoRoot = path.resolve(__dirname, '..');

function toolCall(name: string, args: Record<string, unknown>) {
  return {
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  };
}

function baseRequest(): ModernizationRequest {
  return {
    repository: {
      name: 'legacy-commerce',
      root: 'C:/work/legacy-commerce',
      trackers: [{ kind: 'github', project: 'example/legacy-commerce' }],
    },
    legacySystem: {
      summary: 'A legacy commerce monolith with brittle checkout behavior.',
      entrypoints: ['web-checkout', 'admin-orders'],
      regressionSuites: ['legacy-checkout-smoke', 'legacy-order-export'],
    },
    targetState: {
      app: ['React 19', 'Node 22', 'typed API boundaries'],
      infra: ['GitHub Actions', 'Azure Container Apps', 'OpenTelemetry'],
      data: ['PostgreSQL 16', 'expand-contract migrations', 'backfill validation'],
    },
  };
}

describe('GitHub Copilot modernization workflow', () => {
  test('uses agentevals to verify expected handoffs, tools, skills, squads, and TDD calls', async () => {
    const workflow = createModernizationWorkflow({
      now: () => '2026-05-07T15:00:00.000Z',
      nextId: (prefix, index) => `${prefix}-${index + 1}`,
    });

    const result = await workflow.run(baseRequest());
    expect(result.status).toBe('complete');

    const outputs = toAgentEvalMessages(result.events);
    const referenceOutputs = [
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          toolCall('microsoft_agent_framework.start_stateful_workflow', {
            workflow: 'github-copilot-modernization',
            execution: 'deterministic',
          }),
          toolCall('github_copilot.rubber_duck', {
            mode: 'experimental',
          }),
          toolCall('legacy_system.extract_requirements_specs_tests', {
            repository: 'legacy-commerce',
          }),
          toolCall('target_system.extract_requirements_specs_test_plans', {
            repository: 'legacy-commerce',
          }),
          toolCall('github_copilot.handoff', {
            to: 'app-modernizer',
            reason: 'app modernization planning',
          }),
          toolCall('github_copilot.handoff', {
            to: 'infra-modernizer',
            reason: 'infra modernization planning',
          }),
          toolCall('github_copilot.handoff', {
            to: 'data-modernizer',
            reason: 'data modernization planning',
          }),
          toolCall('agent_skill.use', {
            skill: 'github-copilot-modernization-workflow',
          }),
          toolCall('modernization_plan.create_incremental', {
            domains: ['app', 'infra', 'data'],
          }),
          toolCall('project_tracker.persist_plan', {
            tracker: 'github',
          }),
          toolCall('squad_sdk.define_phase_squad', {
            domain: 'app',
            phase: 1,
          }),
          toolCall('squad_sdk.define_phase_squad', {
            domain: 'infra',
            phase: 1,
          }),
          toolCall('squad_sdk.define_phase_squad', {
            domain: 'data',
            phase: 1,
          }),
          toolCall('agent_evals.evaluate_squad', {
            evaluator: 'trajectory_match',
          }),
          toolCall('tdd.red', {
            source: 'spec',
          }),
          toolCall('tdd.green', {
            regression: 'legacy',
          }),
          toolCall('legacy_tests.run_regression', {
            suite: 'legacy-checkout-smoke',
          }),
        ],
      },
    ] satisfies FlexibleChatCompletionMessage[];

    const evaluator = createTrajectoryMatchEvaluator({
      trajectoryMatchMode: 'superset',
      toolArgsMatchMode: 'superset',
    });
    const evalResult = await evaluator({ outputs, referenceOutputs });

    expect(evalResult.score, JSON.stringify(evalResult)).toBe(true);
  });

  test('keeps the state graph deterministic and wires incremental plans to specs, tests, and squads', async () => {
    const workflow = createModernizationWorkflow({
      now: () => '2026-05-07T15:00:00.000Z',
      nextId: (prefix, index) => `${prefix}-${index + 1}`,
    });

    const result = await workflow.run(baseRequest());
    expect(toGraphTrajectory(result)).toEqual({
      results: [{ status: 'complete' }],
      steps: [
        [
          'legacy-discovery',
          'target-discovery',
          'modernization-planning',
          'plan-persistence',
          'specialist-squad-tdd',
          'incremental-development',
          'phase-retro',
          'complete',
        ],
      ],
    });

    for (const domain of ['app', 'infra', 'data'] as const) {
      const phases = result.plan.domains[domain];
      expect(phases).toHaveLength(3);

      phases.forEach((phase, index) => {
        expect(phase.increment).toBe(index + 1);
        expect(phase.squadId).toBe(`squad-${domain}-phase-${index + 1}`);
        expect(phase.specId).toContain(phase.id);
        expect(phase.testPlanId).toContain(phase.specId);
        expect(phase.modernizer).toBe(`${domain}-modernizer`);
        if (index > 0) {
          expect(phase.dependsOn).toContain(phases[index - 1].id);
        }
      });
    }
  });

  test('requires human elicitation and approval before ambiguous specs can drive planning or tests', async () => {
    const workflow = createModernizationWorkflow({
      now: () => '2026-05-07T15:00:00.000Z',
      nextId: (prefix, index) => `${prefix}-${index + 1}`,
    });

    const result = await workflow.run({
      ...baseRequest(),
      ambiguities: [
        {
          id: 'data-retention-policy',
          domain: 'data',
          question: 'What retention window should be enforced before archival migration?',
        },
      ],
    });

    expect(result.status).toBe('blocked_for_human');
    expect(result.events.map((event) => event.type)).toContain('spec.created');
    expect(result.events.map((event) => event.type)).toContain('human.elicitation.required');
    expect(result.events.map((event) => event.type)).toContain('approval.required');
    expect(result.events.some((event) => event.type === 'modernization_plan.created')).toBe(false);
    expect(result.events.some((event) => event.type === 'tdd.green')).toBe(false);
  });

  test('defines the app, infra, and data modernizer agents as squad creators with modernization skill support', () => {
    const agents = buildGithubCopilotModernizerAgents();

    expect(agents.map((agent) => agent.name)).toEqual([
      'app-modernizer',
      'infra-modernizer',
      'data-modernizer',
    ]);

    for (const agent of agents) {
      expect(agent.responsibilities).toContain('create phase-dedicated squads');
      expect(agent.skills).toContain('github-copilot-modernization-workflow');
      expect(agent.tools).toEqual(
        expect.arrayContaining([
          'microsoft-agent-framework',
          'github-copilot-sdk',
          'squad-sdk',
          'agent-evals',
        ]),
      );
      expect(agent.modernizationPatterns.length).toBeGreaterThanOrEqual(4);
    }

    const skill = buildModernizationSkill();
    expect(skill.name).toBe('github-copilot-modernization-workflow');
    expect(skill.requiredWorkflowStates).toEqual([
      'legacy-discovery',
      'target-discovery',
      'modernization-planning',
      'plan-persistence',
      'specialist-squad-tdd',
      'incremental-development',
      'phase-retro',
    ]);
    expect(skill.content).toContain('Microsoft Agent Framework');
    expect(skill.content).toContain('experimental rubber duck');
    expect(skill.content).toContain('specs drive test development');
  });

  test('exposes the modernization workflow as a Copilot skill and GitHub Copilot agent', async () => {
    const skill = await readFile(
      path.join(repoRoot, '.copilot/skills/github-copilot-modernization-workflow/SKILL.md'),
      'utf8',
    );
    const agent = await readFile(
      path.join(repoRoot, '.github/agents/github-copilot-modernization.agent.md'),
      'utf8',
    );

    expect(skill).toContain('github-copilot-modernization-workflow');
    expect(skill).toContain('Stateful Async Workflow');
    expect(skill).toContain('app-modernizer');
    expect(skill).toContain('infra-modernizer');
    expect(skill).toContain('data-modernizer');

    expect(agent).toContain('github-copilot-modernization-workflow');
    expect(agent).toContain('app-modernizer');
    expect(agent).toContain('infra-modernizer');
    expect(agent).toContain('data-modernizer');
    expect(agent).toContain('rubber duck');
  });
});
