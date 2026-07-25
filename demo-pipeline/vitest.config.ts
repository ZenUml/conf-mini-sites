import { defineConfig } from 'vitest/config';

// `root` is pinned to this file's own directory (not process.cwd()) so `pnpm
// demo:test` behaves identically no matter where it's invoked from — see the root
// vitest.config.ts for the full rationale on why an unscoped/ambient root is
// dangerous in this repo (it would happily collect src/**/*.test.ts too).
//
// `include` mirrors the design doc's file layout (demo-pipeline/test/ holds the
// pure contract/timing/render-command tests) and stays local to demo-pipeline so
// this run never touches the Worker's own tests.
//
// `passWithNoTests` is required for Task 1: this is the empty tool shell with no
// test/ directory yet, so vitest must exit 0 on "no tests found" rather than its
// default exit 1. Task 2 adds the first test/**/*.test.ts files.
export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ['test/**/*.test.ts'],
    passWithNoTests: true,
  },
});
