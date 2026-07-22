// The :15 cut, for paid placements that cap at fifteen seconds.
//
// Not a trim of the 35s film. The five-beat structure survives — satisfaction, pause, discovery, magic,
// relief — but each beat gets one shot instead of four, and the pause shortens to 1.1s (at this length
// a 2s hold is a seventh of the film). It reuses the SAME captures, the same marks, and the same
// assembler; only the beat sheet, the cue list, and the score plan differ.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { PLAN_15, renderMaster, toWav } from './audio';
import { toAss, validateCues, type Cue } from './captions';
import { validateShots, type Shot } from './shots';
import { FFMPEG, FFPROBE, buildMarkMap, checkContinuity, detectClap, focusCentre, markTime, readLog, resolveSourceIn, shotArgs } from './assemble';

const exec = promisify(execFile);
export const CUT15_DURATION = 15.0;

/** One shot per beat. The magic hold stays >= 1.0s — it is the only rule that does not scale down. */
export const SHOTS_15: Shot[] = [
  { id: 'open', t: 0.00, dur: 1.20, src: 'act1', at: ['a1_idle', -0.55], fadeIn: 0.3,
    evidence: 'A real interactive site, running on localhost.' },
  { id: 'vote-click', t: 1.20, dur: 1.10, src: 'act1', at: ['a1_vote_click', -0.35],
    evidence: 'It answers a real click.' },
  { id: 'vote-result', t: 2.30, dur: 1.00, src: 'act1', at: ['a1_vote_settled', -0.25], continues: true,
    evidence: '4 becomes 5 and the bar grows — state really changed.' },
  { id: 'address-bar', t: 3.30, dur: 0.75, src: 'act1', at: ['a1_omnibox_focus', -0.15], zoom: 1.55, cx: 0.30, cy: 0.06,
    evidence: 'It says localhost: one machine can see this.' },
  { id: 'now-what', t: 4.05, dur: 1.10, src: 'act1', at: ['a1_still', 0.15], dim: 0.55,
    evidence: 'Nothing is broken; it just cannot be shared.' },
  { id: 'prd-page', t: 5.15, dur: 0.90, src: 'act2', at: ['a2_page_view', -0.25],
    evidence: 'The team already works in a Confluence PRD.' },
  { id: 'slash-mini', t: 6.05, dur: 1.00, src: 'act2', at: ['a2_slash_typed', -0.55], zoom: 1.7, focus: 'target', focusMark: 'a2_macro_picked', fy: 0.2,
    evidence: 'Reachable from the editor like any other macro: /mini.' },
  { id: 'file-list', t: 7.05, dur: 1.00, src: 'act2', at: ['a2_filelist_shown', -0.25], zoom: 1.25,
    evidence: 'A whole multi-file folder, not a screenshot.' },
  { id: 'publish', t: 8.05, dur: 0.95, src: 'act2', at: ['a2_publish_click', -0.15], zoom: 1.25,
    evidence: 'One decisive action.' },
  { id: 'it-runs', t: 9.00, dur: 1.30, src: 'act2', at: ['a2_live', -0.10],
    evidence: 'THE shot: the same site, live inside the Confluence page, untouched.' },
  { id: 'vote-inside', t: 10.30, dur: 1.00, src: 'act3', at: ['a3_vote_click', -0.30], zoom: 1.15, focus: 'embed',
    evidence: 'Live interaction inside the embed.' },
  { id: 'effort-filter', t: 11.30, dur: 1.10, src: 'act3', at: ['a3_effort_click', -0.30], zoom: 1.15, focus: 'embed',
    evidence: 'Filtering re-ranks the list — a screenshot could not.' },
  { id: 'card-logo', t: 12.40, dur: 1.00, src: 'endcard', at: ['card1', 0], evidence: 'Product identity.' },
  { id: 'card-market', t: 13.40, dur: 0.90, src: 'endcard', at: ['card2', 0], evidence: 'Where to get it.' },
  { id: 'card-cta', t: 14.30, dur: 0.70, src: 'endcard', at: ['card3', 0], evidence: 'One conversion goal: install.' },
];

export const CUES_15: Cue[] = [
  { text: 'Built something with AI?', start: 0.35, end: 3.1 },
  { text: 'Now what?', start: 4.15, end: 5.1, pos: 'center' },
  { text: 'Bring it to your team.', start: 5.3, end: 6.0 },
  { text: 'Insert Mini Sites.', start: 6.2, end: 7.0 },
  { text: 'Upload the folder.', start: 7.2, end: 8.0 },
  { text: 'Publish.', start: 8.15, end: 8.9 },
  { text: 'It runs.', start: 9.05, end: 10.2 },
  { text: 'Right inside Confluence.', start: 10.4, end: 11.25 },
  { text: 'Not a screenshot.', start: 11.45, end: 12.3 },
  { text: 'Bring AI-built interactive websites\\Ninto Confluence.', start: 12.5, end: 13.35, pos: 'end' },
  { text: 'Available on the Atlassian Marketplace.', start: 13.45, end: 14.25, pos: 'end' },
  { text: 'Install Mini Sites.', start: 14.35, end: 15.0, pos: 'end' },
];

export async function renderCut15(capturesDir: string, outDir: string): Promise<{ path: string; duration: number }> {
  // The magic hold is absolute (1.0s); the pause scales down with the runtime.
  const shotProblems = validateShots(SHOTS_15, CUT15_DURATION, { magic: 1.0, nowWhat: 1.0 });
  const cueProblems = validateCues(CUES_15, CUT15_DURATION);
  if (shotProblems.length) throw new Error(`:15 beat sheet invalid: ${JSON.stringify(shotProblems)}`);
  if (cueProblems.length) throw new Error(`:15 captions invalid: ${JSON.stringify(cueProblems)}`);

  const captures = resolve(capturesDir);
  const out = resolve(outDir);
  const shotsDir = join(out, 'shots15');
  mkdirSync(shotsDir, { recursive: true });

  const markMaps = new Map<string, Map<string, number>>();
  const logs = new Map<string, ReturnType<typeof readLog>>();
  for (const act of ['act1', 'act2', 'act3']) {
    const video = join(captures, `${act}.webm`);
    const log = join(captures, `${act}.actions.jsonl`);
    if (!existsSync(video) || !existsSync(log)) continue;
    const entries = readLog(log);
    const clapOn = entries.find((e) => e.mark === 'clap_on');
    markMaps.set(act, buildMarkMap(entries, await detectClap(video, (clapOn?.t ?? 0) / 1000)));
    logs.set(act, entries);
  }

  const rendered: string[] = [];
  // Same continuity discipline as the 35s cut: two shots covering one action must not run the
  // source backwards (a vote counter flickering 5 -> 4 -> 5).
  const lastOut = new Map<string, number>();
  for (const [i, shot] of SHOTS_15.entries()) {
    const clip = join(shotsDir, `${String(i).padStart(2, '0')}-${shot.id}.mp4`);
    const centre = focusCentre(shot, logs.get(shot.src) ?? []);
    let src: string;
    let inS = 0;
    if (shot.src === 'endcard') {
      src = join(captures, `${shot.at![0]}.png`);
    } else {
      src = join(captures, `${shot.src}.webm`);
      const map = markMaps.get(shot.src);
      if (!map) throw new Error(`:15 shot ${shot.id} needs ${shot.src}.webm`);
      inS = resolveSourceIn(shot, markTime(map, shot), lastOut.get(shot.src));
      const gap = checkContinuity(shot, inS, lastOut.get(shot.src));
      if (gap) throw new Error(gap);
      lastOut.set(shot.src, inS + shot.dur * (shot.speed ?? 1));
    }
    await exec(FFMPEG, shotArgs(shot, src, inS, clip, centre));
    rendered.push(clip);
  }

  const list = join(out, 'concat15.txt');
  writeFileSync(list, rendered.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const silent = join(out, 'silent15.mp4');
  await exec(FFMPEG, ['-hide_banner', '-nostats', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);

  const audioDir = join(out, 'audio15');
  mkdirSync(audioDir, { recursive: true });
  const wav = join(audioDir, 'master.wav');
  writeFileSync(wav, toWav(renderMaster(PLAN_15).master));

  const ass = join(out, 'captions15.ass');
  writeFileSync(ass, toAss(CUES_15));

  const final = join(out, 'final_15s.mp4');
  await exec(
    FFMPEG,
    [
      '-hide_banner', '-nostats', '-y', '-i', silent, '-i', wav,
      '-vf', `subtitles=${ass.replace(/[\\:]/g, '\\$&')}`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', final,
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );

  const { stdout } = await exec(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', final]);
  const probe = JSON.parse(stdout);
  return { path: final, duration: +probe.format.duration };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  renderCut15(process.argv[2] || 'promo/out/captures', process.argv[3] || 'promo/out')
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error(':15 cut failed:', e.message);
      process.exit(1);
    });
}
