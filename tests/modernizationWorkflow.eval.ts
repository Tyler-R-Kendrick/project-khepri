import { evalite, type AIResult } from '@nem035/agentevals';
import {
  createModernizationWorkflow,
  toAgentEvalMessages,
  type ModernizationRequest,
} from '../src/modernizationWorkflow.ts';

const request: ModernizationRequest = {
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

function asEvalResult(text: string): AIResult {
  const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  return {
    text,
    toolCalls: [],
    toolResults: [],
    usage,
    totalUsage: usage,
    steps: [],
  };
}

evalite.group('github-copilot-modernization-workflow', () => {
  evalite('creates phase-dedicated squads and trajectory-visible handoffs', async ({ expect }) => {
    const workflow = createModernizationWorkflow({
      now: () => '2026-05-07T15:00:00.000Z',
      nextId: (prefix, index) => `${prefix}-${index + 1}`,
    });

    const result = await workflow.run(request);
    const trajectory = JSON.stringify(toAgentEvalMessages(result.events));
    const plan = JSON.stringify(result.plan);

    expect(asEvalResult(trajectory))
      .toContain('github_copilot.handoff')
      .toContain('agent_evals.evaluate_squad')
      .toContain('squad_sdk.define_phase_squad');

    expect(asEvalResult(plan))
      .toContain('squad-app-phase-1')
      .toContain('squad-infra-phase-1')
      .toContain('squad-data-phase-1');
  });
});
