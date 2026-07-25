// Subprocess runner tests (design doc, "Error handling and recovery": "FFmpeg receives an argument array
// rather than a shell string"). Covers the two properties this whole pipeline's subprocess boundary depends
// on: arguments are never shell-interpreted, and a failing process is reported structurally rather than as a
// thrown, information-losing generic Error.
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runProcess } from '../src/process';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'demo-pipeline-process-test-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('runProcess: argument arrays, never a shell', () => {
  it('passes an argument containing shell metacharacters through literally, without shell interpretation', async () => {
    // If this were run through a shell string, ";", "&&", and the embedded "touch" would each be
    // interpreted as separate commands — the marker file would get created and/or stdout would contain
    // "pwned" instead of the literal argument text.
    const markerPath = join(workDir, 'should-not-exist');
    const dangerousArg = `hello; touch ${markerPath} && echo pwned`;

    const result = await runProcess('/bin/echo', [dangerousArg]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(dangerousArg);
    expect(existsSync(markerPath)).toBe(false);
  });

  it('passes multiple arguments as a true array, not a joined-then-re-split string', async () => {
    const result = await runProcess(process.execPath, [
      '-e',
      'console.log(JSON.stringify(process.argv.slice(1)))',
      'one two',
      'three;four',
      '$(five)',
      '`six`',
    ]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual(['one two', 'three;four', '$(five)', '`six`']);
  });
});

describe('runProcess: structured failures', () => {
  it('resolves (does not throw) with the exit code, stdout, and stderr on a non-zero exit', async () => {
    const result = await runProcess(process.execPath, [
      '-e',
      "process.stdout.write('partial-out'); process.stderr.write('boom'); process.exitCode = 7;",
    ]);

    expect(result.exitCode).toBe(7);
    expect(result.stdout).toBe('partial-out');
    expect(result.stderr).toContain('boom');
  });

  it('captures a large stderr payload in full rather than truncating it', async () => {
    const result = await runProcess(process.execPath, [
      '-e',
      "process.stderr.write('x'.repeat(20000)); process.exitCode = 1;",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toHaveLength(20000);
  });

  it('rejects when the command itself cannot be spawned', async () => {
    await expect(runProcess(join(workDir, 'does-not-exist-binary'), [])).rejects.toThrow();
  });
});
