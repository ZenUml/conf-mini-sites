// Contract + story-loader tests (design doc, "Testing and evidence gates": "accept the canonical StorySpec and
// reject invalid versions/evidence/scenes"). Pure — no network, no credentials, no browser.
import { sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StorySpecSchema } from '../src/contracts';
import { loadStory, parseStory, repoRoot, resolveEvidence, StoryValidationError } from '../src/story';

/** A minimal, schema-valid three-scene StorySpec used as a mutable base for the negative tests. Evidence
 *  paths point at real files in this repository (the sample bundle used by tests/e2e/ui/full-flow.spec.ts) so
 *  the positive path — and the evidence-resolution tests — exercise real disk I/O, not fixtures invented for
 *  the test. Returns a fresh object each call so tests can mutate their own copy freely. */
function validStoryFixture(): unknown {
  return {
    schemaVersion: 1,
    product: { name: 'Mini Site for Confluence', build: 'dev' },
    objective: 'Prove upload-to-live works end to end without leaving Confluence.',
    audience: 'Confluence admins evaluating hosting options.',
    evidence: [
      {
        id: 'sample-index',
        description: 'sample bundle entry point',
        path: 'tests/e2e/fixtures/sample-bundle/index.html',
      },
      {
        id: 'sample-app',
        description: 'sample bundle script',
        path: 'tests/e2e/fixtures/sample-bundle/app.js',
      },
    ],
    scenes: [
      { id: 'scene-1', title: 'Start', operations: [{ type: 'openMacro' }] },
      {
        id: 'scene-2',
        title: 'Upload',
        operations: [
          { type: 'openPublisher' },
          { type: 'selectFiles', evidenceIds: ['sample-index', 'sample-app'] },
          { type: 'publishAndAwait' },
        ],
      },
      { id: 'scene-3', title: 'Prove', operations: [{ type: 'gotoPreview' }] },
    ],
    narration: [
      { sceneId: 'scene-1', script: 'An empty Mini Site macro, waiting to be filled in.' },
      { sceneId: 'scene-2', script: 'Upload a bundle and publish it.' },
      { sceneId: 'scene-3', script: 'The mini-site is live.' },
    ],
    observableClaim: { text: 'Mini-Site is live' },
  };
}

describe('StorySpec parsing', () => {
  it('parses a valid three-scene story', () => {
    const story = parseStory(validStoryFixture());
    expect(story.scenes).toHaveLength(3);
    expect(story.schemaVersion).toBe(1);
    expect(story.observableClaim.text).toBe('Mini-Site is live');
  });

  it('rejects an unknown schema version', () => {
    const fixture = validStoryFixture() as { schemaVersion: number };
    fixture.schemaVersion = 2;
    expect(() => parseStory(fixture)).toThrow(StoryValidationError);
  });

  it('rejects duplicate scene ids', () => {
    const fixture = validStoryFixture() as { scenes: unknown[] };
    // Append a clone of scene-1: same id, no matching extra narration entry is needed since narration
    // correspondence is checked against the deduplicated *set* of scene ids — this isolates the failure to
    // the duplicate-id check alone.
    fixture.scenes.push(structuredClone(fixture.scenes[0]));
    expect(() => parseStory(fixture)).toThrow(/duplicate scene id: scene-1/);
  });

  it('rejects an unknown operation type', () => {
    const fixture = validStoryFixture() as { scenes: { operations: unknown[] }[] };
    fixture.scenes[0].operations = [{ type: 'runArbitraryScript', code: 'evil()' }];
    expect(() => parseStory(fixture)).toThrow(StoryValidationError);
  });

  it('rejects an empty observable claim', () => {
    const fixture = validStoryFixture() as { observableClaim: { text: string } };
    fixture.observableClaim.text = '   ';
    expect(() => parseStory(fixture)).toThrow(StoryValidationError);
  });

  it('rejects narration/scene mismatches', () => {
    const fixture = validStoryFixture() as { narration: { sceneId: string }[] };
    fixture.narration[1].sceneId = 'scene-does-not-exist';
    expect(() => parseStory(fixture)).toThrow(/no narration entry|unknown scene id/);
  });
});

describe('evidence resolution', () => {
  it('rejects a missing evidence file', () => {
    const fixture = validStoryFixture() as { evidence: { path: string }[] };
    fixture.evidence[0].path = 'tests/e2e/fixtures/sample-bundle/does-not-exist.html';
    const story = parseStory(fixture);
    expect(() => resolveEvidence(story)).toThrow(/evidence file not found/);
  });

  it('rejects an evidence path that traverses outside the repository', () => {
    const fixture = validStoryFixture() as { evidence: { path: string }[] };
    fixture.evidence[0].path = '../../../../../../etc/passwd';
    const story = parseStory(fixture);
    expect(() => resolveEvidence(story)).toThrow(/escapes the repository root/);
  });

  it('resolves evidence paths inside the repository root with stable SHA-256 hashes', () => {
    const story = parseStory(validStoryFixture());
    const first = resolveEvidence(story);
    const second = resolveEvidence(story);

    expect(first).toHaveLength(2);
    const root = repoRoot();
    for (const [i, entry] of first.entries()) {
      expect(entry.absolutePath.startsWith(root + sep)).toBe(true);
      // Same file, computed twice: the hash must be byte-for-byte stable across calls.
      expect(entry.sha256).toBe(second[i].sha256);
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe('directory evidence', () => {
  /** A copy of the base fixture with one directory-kind evidence entry added — `samples/release-dashboard/`,
   *  the real nested bundle `tests/e2e/ui/nested-upload.spec.ts` uploads via `selectFolder` — referenced by a
   *  `selectFolder` operation appended to scene-2 so the story stays internally consistent (the kind-
   *  consistency check below requires every `selectFolder` op to reference `'directory'`-kind evidence). */
  function directoryFixture() {
    const fixture = validStoryFixture() as {
      evidence: { id: string; description: string; path: string; kind?: string }[];
      scenes: { id: string; title: string; operations: { type: string; evidenceIds?: string[]; evidenceId?: string }[] }[];
    };
    fixture.evidence.push({
      id: 'release-dashboard-dir',
      description: 'the real nested sample bundle, uploaded as a directory (tests/e2e/ui/nested-upload.spec.ts)',
      path: 'samples/release-dashboard',
      kind: 'directory',
    });
    fixture.scenes[1].operations.push({ type: 'selectFolder', evidenceId: 'release-dashboard-dir' });
    return fixture;
  }

  it('resolves a real directory and hashes its contents', () => {
    const story = parseStory(directoryFixture());
    const resolved = resolveEvidence(story);
    const dirEntry = resolved.find((e) => e.id === 'release-dashboard-dir');
    expect(dirEntry).toBeDefined();
    expect(dirEntry?.kind).toBe('directory');
    expect(dirEntry?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a stable hash across two computations', () => {
    const story = parseStory(directoryFixture());
    const first = resolveEvidence(story).find((e) => e.id === 'release-dashboard-dir');
    const second = resolveEvidence(story).find((e) => e.id === 'release-dashboard-dir');
    expect(first?.sha256).toBe(second?.sha256);
  });

  it('rejects kind "directory" declared against a real file', () => {
    const fixture = validStoryFixture() as { evidence: { id: string; description: string; path: string; kind?: string }[] };
    // Added as an extra, unreferenced evidence entry (rather than mutating `sample-index` in place) so this
    // only exercises resolveEvidence's on-disk kind check, not the schema-level operation/evidence kind check
    // above — sample-index stays file-kind and matches its selectFiles reference.
    fixture.evidence.push({
      id: 'index-mislabeled-as-directory',
      description: 'wrong on purpose: a real file mislabeled as directory evidence',
      path: 'tests/e2e/fixtures/sample-bundle/index.html',
      kind: 'directory',
    });
    const story = parseStory(fixture);
    expect(() => resolveEvidence(story)).toThrow(/declares kind "directory" but .* is not a directory/);
  });

  it('rejects kind "file" (the default) declared against a real directory', () => {
    const fixture = validStoryFixture() as { evidence: { id: string; description: string; path: string; kind?: string }[] };
    fixture.evidence.push({
      id: 'release-dashboard-as-file',
      description: 'wrong on purpose: a directory referenced without kind: "directory"',
      path: 'samples/release-dashboard',
      // kind omitted -> defaults to 'file'
    });
    const story = parseStory(fixture);
    expect(() => resolveEvidence(story)).toThrow(/declares kind "file" but .* is not a file/);
  });

  it('rejects a selectFolder operation referencing file-kind evidence', () => {
    const fixture = validStoryFixture() as { scenes: { operations: { type: string; evidenceId?: string }[] }[] };
    fixture.scenes[1].operations.push({ type: 'selectFolder', evidenceId: 'sample-index' }); // sample-index is file-kind
    expect(() => parseStory(fixture)).toThrow(/requires "directory" evidence/);
  });

  it('rejects a selectFiles operation referencing directory-kind evidence', () => {
    const fixture = directoryFixture();
    const selectFilesOp = fixture.scenes[1].operations.find((op) => op.type === 'selectFiles');
    selectFilesOp?.evidenceIds?.push('release-dashboard-dir');
    expect(() => parseStory(fixture)).toThrow(/requires "file" evidence/);
  });
});

describe('the fixed PoC story on disk', () => {
  it('loads and validates demo-pipeline/stories/mini-site-launch.story.json', () => {
    const storyPath = `${repoRoot()}/demo-pipeline/stories/mini-site-launch.story.json`;
    const { story, evidence } = loadStory(storyPath);

    expect(story.schemaVersion).toBe(1);
    expect(story.scenes).toHaveLength(3);
    expect(story.scenes.map((s) => s.id)).toEqual(['start-in-confluence', 'upload-and-publish', 'prove-the-outcome']);
    expect(story.observableClaim.text).toBe('Mini-Site is live');
    expect(evidence).toHaveLength(story.evidence.length);
    for (const e of evidence) {
      expect(e.absolutePath.startsWith(repoRoot() + sep)).toBe(true);
      expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
    }

    // Re-validating with the raw schema directly (not just through parseStory) proves the file is a genuine
    // StorySpec, not merely something our own loader happens to accept.
    expect(StorySpecSchema.safeParse(JSON.parse(JSON.stringify(story))).success).toBe(true);
  });
});
