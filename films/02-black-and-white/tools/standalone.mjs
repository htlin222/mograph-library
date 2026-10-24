// Standalone segment films: each 20 s segment as its own MP4 with its own soundtrack.
//   node tools/standalone.mjs e01            → dist/segments/e01-timing-and-spacing.mp4
//   node tools/standalone.mjs e01,e17 | all
// Video comes from `render.mjs video`; the music for exactly that segment is synthesized with
// MUS.renderRange, then gain (tools/gain.json, the master's −14 LUFS calibration) → limiter → fades.
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';

const HTML = process.env.HTML || 'dist/index.html';
const URL = 'file://' + process.cwd() + '/' + HTML + '?record=1';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--js-flags=--max-old-space-size=4096'];
const gain = JSON.parse(fs.readFileSync('tools/gain.json', 'utf8')).gain;
const gainDb = 20 * Math.log10(gain);
const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const b = await chromium.launch({ args: ARGS });
const p = await b.newPage({ viewport: { width: 300, height: 500 } });
await p.goto(URL);
await p.waitForFunction(() => window.M && window.M.readyFlag, null, { timeout: 180000 });
const tl = await p.evaluate(() => M.timeline.filter(s => s.kind === 'seg').map(s => ({ id: s.id, num: s.num, title: s.title, en: s.en, start: s.start, dur: s.dur })));
const arg = process.argv[2] || 'all';
const list = arg === 'all' ? tl : arg.split(',').map(k => tl.find(s => s.id === k) || (() => { throw new Error('no segment ' + k); })());

// 1 · picture
const need = list.filter(s => process.env.FORCE || !fs.existsSync(`build/seg/${s.id}.mp4`)).map(s => s.id);
if (need.length) execFileSync('node', ['tools/render.mjs', 'video', need.join(','), process.env.WORKERS || '1'], { stdio: 'inherit' });

// 2 · sound + mux
fs.mkdirSync('dist/segments', { recursive: true });
for (const s of list) {
  const t0 = Date.now();
  const b64 = await p.evaluate(async ([a, c]) => { const [L, R] = await MUS.renderRange(a, c, 0); return MUS.wavF32(L, R); }, [s.start, s.start + s.dur]);
  const wav = `build/seg/${s.id}.wav`;
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  const out = `dist/segments/${s.id}-${slug(s.en)}.mp4`;
  const af = [`volume=${gainDb.toFixed(3)}dB`, 'alimiter=limit=0.8414:level=disabled:attack=5:release=80:asc=1',
    'afade=t=in:d=0.03', `afade=t=out:st=${(s.dur - 0.8).toFixed(2)}:d=0.8`, `atrim=0:${s.dur}`].join(',');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `build/seg/${s.id}.mp4`, '-i', wav, '-map', '0:v', '-map', '1:a',
    '-af', af, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest',
    '-metadata', `title=${String(s.num).padStart(2, '0')} ${s.title} ${s.en}`, '-metadata', 'album=黑白動態全書 Black & White Motion',
    '-metadata', `track=${s.num}/72`, '-movflags', '+faststart', out]);
  console.log('wrote', out, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
await b.close();
