import { defineConfig } from '@nem035/agentevals';

export default defineConfig({
  include: ['tests/**/*.eval.ts'],
  exclude: ['node_modules/**'],
  trials: 1,
  timeout: 60_000,
  parallel: true,
  maxConcurrency: 4,
  reporters: ['console'],
  maxCost: 0.01,
});
