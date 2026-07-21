// Renders the score to disk: the mixed master the film uses, plus separated stems so a licensed music
// track can replace the synthesized bed later without re-cutting anything.
//   pnpm promo:audio [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DURATION_S, renderMaster, rmsDb, silenceHoldIsClean, toWav } from './audio';

const outDir = resolve(process.argv[2] || 'promo/out/audio');
mkdirSync(join(outDir, 'stems'), { recursive: true });

const { master, music, sfxBuf } = renderMaster(DURATION_S);

writeFileSync(join(outDir, 'master.wav'), toWav(master));
writeFileSync(join(outDir, 'stems', 'music.wav'), toWav(music));
writeFileSync(join(outDir, 'stems', 'sfx.wav'), toWav(sfxBuf));

// JSON has no -Infinity, and the "Now what?" window legitimately measures as absolute digital silence
// (exactly 0.0 samples), so report it as a string rather than letting it serialize to null.
const db = (from: number, to: number): number | string => {
  const v = rmsDb(master, from, to);
  return Number.isFinite(v) ? +v.toFixed(2) : 'digital silence (-inf dBFS)';
};

const hold = rmsDb(master, 6.6, 8.25);
const magic = rmsDb(master, 19.0, 21.0);
const report = {
  durationS: DURATION_S,
  silenceHoldClean: silenceHoldIsClean(music),
  rmsDb: {
    'now-what hold 6.6-8.25': db(6.6, 8.25),
    'magic beat 19.0-21.0': db(19.0, 21.0),
    'opening 1.0-3.0': db(1.0, 3.0),
    'end card 33.0-35.0': db(33.0, 35.0),
  },
  contrastDb: Number.isFinite(hold) ? +(magic - hold).toFixed(2) : 'infinite (hold is true silence)',
};
writeFileSync(join(outDir, 'audio-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log('wrote', outDir);
