// Renders the score to disk: the mixed master the film uses, plus separated stems so a licensed music
// track can replace the synthesized bed later without re-cutting anything.
//   pnpm promo:audio [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DURATION_S, PLAN_15, PLAN_35, renderMaster, rmsDb, silenceHoldIsClean, toWav, type ScorePlan } from './audio';

const outDir = resolve(process.argv[2] || 'promo/out/audio');
mkdirSync(join(outDir, 'stems'), { recursive: true });

// `pnpm promo:audio [outDir] [15]` renders the :15 cut's score instead.
const plan: ScorePlan = process.argv[3] === '15' ? PLAN_15 : PLAN_35;
const { master, music, sfxBuf } = renderMaster(plan);

writeFileSync(join(outDir, 'master.wav'), toWav(master));
writeFileSync(join(outDir, 'stems', 'music.wav'), toWav(music));
writeFileSync(join(outDir, 'stems', 'sfx.wav'), toWav(sfxBuf));

// JSON has no -Infinity, and the "Now what?" window legitimately measures as absolute digital silence
// (exactly 0.0 samples), so report it as a string rather than letting it serialize to null.
const db = (from: number, to: number): number | string => {
  const v = rmsDb(master, from, to);
  return Number.isFinite(v) ? +v.toFixed(2) : 'digital silence (-inf dBFS)';
};

const hold = rmsDb(master, plan.silence[0] + 0.3, plan.silence[1] - 0.15);
const magic = rmsDb(master, plan.magicAt, plan.magicAt + 2);
const report = {
  durationS: plan.duration,
  silenceHoldClean: silenceHoldIsClean(music),
  rmsDb: {
    'now-what hold': db(plan.silence[0] + 0.3, plan.silence[1] - 0.15),
    'magic beat': db(plan.magicAt, plan.magicAt + 2),
    'opening': db(1.0, 3.0),
    'end card': db(plan.resolveAt, plan.duration),
  },
  contrastDb: Number.isFinite(hold) ? +(magic - hold).toFixed(2) : 'infinite (hold is true silence)',
};
writeFileSync(join(outDir, 'audio-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log('wrote', outDir);
