// Generic subprocess runner (design doc, "Error handling and recovery": "FFmpeg receives an argument array
// rather than a shell string" — this module generalizes that same principle to every subprocess this
// pipeline spawns, not just FFmpeg: narration.ts uses it for both the Kokoro adapter and ffprobe
// measurement, and a later render.ts (Task 5) is expected to use it for FFmpeg itself).
//
// This module has NO knowledge of Kokoro, ffprobe, or FFmpeg specifically — it only knows how to run one
// command with an argument array (never a shell string, so a shell metacharacter embedded in an argument —
// e.g. narration text containing ";", "$()", "&&", backticks — is always passed through to the child process
// literally, never interpreted) and report back exactly what happened.
//
// It never throws away exit code, stdout, or stderr in favor of a generic Error: a non-zero exit is a normal,
// structured outcome that a caller decides how to react to (e.g. narration.ts turns a non-zero ffprobe exit
// into a NarrationError that includes the captured stderr) — `runProcess` only *rejects* when the process
// could not be started at all (e.g. the command does not exist on PATH), since there is no exit code to
// report in that case.
import { spawn } from 'node:child_process';

/** The complete outcome of running one subprocess to completion. Every field a caller could plausibly need
 *  to decide success/failure and explain it is here — nothing is collapsed into a single Error message. */
export interface ProcessResult {
  readonly command: string;
  readonly args: readonly string[];
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface RunProcessOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
}

/** Run `command` with `args` as a literal argument array — never through a shell (`shell: false`, and no
 *  string concatenation anywhere in this function), so no argument is ever subject to shell interpolation,
 *  globbing, or metacharacter expansion.
 *
 *  Resolves with the full `ProcessResult` for every run that actually starts and completes, success or
 *  failure — a non-zero `exitCode` is not a rejection. Rejects only if the process itself could not be
 *  spawned (e.g. `command` is not found, or the caller lacks permission to execute it): in that case there is
 *  no exit code, stdout, or stderr to report, only the underlying spawn error. */
export function runProcess(command: string, args: readonly string[], options: RunProcessOptions = {}): Promise<ProcessResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let spawnFailed = false;

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('error', (error) => {
      // The process never started (ENOENT, EACCES, ...) — nothing completed, so this is a genuine rejection
      // rather than a structured ProcessResult with some placeholder exit code.
      spawnFailed = true;
      rejectPromise(error);
    });

    child.on('close', (exitCode) => {
      if (spawnFailed) return; // 'error' already rejected the promise; 'close' still fires afterward.
      resolvePromise({ command, args, exitCode: exitCode ?? -1, stdout, stderr });
    });
  });
}
