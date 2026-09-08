import { defineConfig } from 'vitest/config';

// Scope vitest to the UNIT suite only: the source contract/spec tests under src/**.
//
// Without this, vitest's default glob (**/*.{test,spec}.ts) also collects:
//   • tests/e2e/**/*.spec.ts — Playwright E2E specs. They call @playwright/test's
//     test() (not vitest's) and throw "Playwright Test did not expect test() to be
//     called here". E2E is run separately with `npx playwright test`.
//   • .claude/worktrees/** — nested workspace worktrees (separate git repos), whose
//     duplicate *.test.ts inflate/clash the run.
// Both make `pnpm test` (the CI gate in .github/workflows/ci.yml) red. Restricting
// `include` to src/**/*.test.ts keeps the gate fast, deterministic, and meaningful.
//
// forge-app/ui-src/**/*.test.js is included for the same reason src/** is: it is pure unit logic with
// injected dependencies, no Forge runtime and no browser needed. It is listed explicitly rather than by
// widening the glob, so the two exclusions above stay excluded.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'forge-app/ui-src/**/*.test.js'],
  },
});
