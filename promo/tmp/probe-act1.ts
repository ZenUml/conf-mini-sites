import { detectClap, buildMarkMap, readLog, FFMPEG } from '../edit/assemble';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const EV = '/Users/pengxiao/.overnight-runs/conf-mini-sites/2026-07-21-2330/evidence';

async function main() {
  const video = 'promo/out/captures/act1.webm';
  const clap = await detectClap(video);
  const map = buildMarkMap(readLog('promo/out/captures/act1.actions.jsonl'), clap);
  console.log('clap:', clap);
  const grabs: Array<[string, number, string]> = [
    ['a1_idle', 0.2, 'act1-01-idle.png'],
    ['a1_vote_click', -0.15, 'act1-02-preclick.png'],
    ['a1_vote_settled', 0.6, 'act1-03-voted.png'],
    ['a1_impact_settled', 0.5, 'act1-04-impact.png'],
    ['a1_panel_open', 0.8, 'act1-05-panel.png'],
    ['a1_omnibox_focus', 0.5, 'act1-06-omnibox.png'],
    ['a1_still', 1.0, 'act1-07-still.png'],
  ];
  for (const [mark, off, name] of grabs) {
    const t = (map.get(mark) as number) + off;
    console.log(mark, '-> video t =', t.toFixed(3));
    await exec(FFMPEG, ['-hide_banner','-nostats','-y','-ss', t.toFixed(3), '-i', video, '-frames:v','1', `${EV}/${name}`]);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
