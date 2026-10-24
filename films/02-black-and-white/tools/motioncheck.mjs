// Temporal QA: things a contact sheet cannot show — one-frame pops, mid-motion snaps, loop seams, flicker.
//   node tools/motioncheck.mjs e01,e05      → build/motion/<id>.png (chart) + <id>.json, flagged frames on stdout
// Every frame of the segment is rendered, the 1080² stage is reduced to 270² grey, and d[n] = mean |frame n − frame n−1|.
// A smooth motion makes d vary slowly; a pop is a frame whose d stands far above its neighbours (spike), and a
// blip is a stage tile where frame n differs from n−1 and n+1 while n−1 ≈ n+1 (something lives for one frame). Flags are leads to look at, not verdicts: an
// intentional hard cut (section change) is also a spike — check the listed time against the scene's script.
import { chromium } from 'playwright';
import fs from 'fs';
import sharp from 'sharp';

const HTML = process.env.HTML || 'dist/index.html';
const URL = 'file://' + process.cwd() + '/' + HTML + '?record=1';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--js-flags=--max-old-space-size=4096'];
const STAGE = { left: 0, top: 180, width: 1080, height: 1080 }, R = 270;
const ids = (process.argv[2] || '').split(',').filter(Boolean);
if (!ids.length) { console.error('usage: node tools/motioncheck.mjs e01[,e05…]'); process.exit(1); }

const b = await chromium.launch({ args: ARGS });
const p = await b.newPage({ viewport: { width: 300, height: 500 } });
await p.goto(URL);
await p.waitForFunction(() => window.M && window.M.readyFlag, null, { timeout: 180000 });
const tl = await p.evaluate(() => M.timeline.map(s => ({ id: s.id, start: s.start, dur: s.dur })));
fs.mkdirSync('build/motion', { recursive: true });

const median = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
for (const id of ids) {
  const s = tl.find(q => q.id === id); if (!s) throw new Error('no segment ' + id);
  const f0 = Math.round(s.start * 30), n = Math.round(s.dur * 30), d = [0], T = 6, TS = R / T, td = [...Array(T * T)].map(() => [0]);
  let prev = null, prev2 = null; const t0 = Date.now(), t2 = [...Array(T * T)].map(() => [0, 0]);
  for (let i = 0; i < n; i++) {
    const url = await p.evaluate(k => M.frameURL(k), f0 + i);
    const g = await sharp(Buffer.from(url.split(',')[1], 'base64')).extract(STAGE).resize(R, R).greyscale().raw().toBuffer();
    if (prev) {
      let sum = 0; const ts = new Float64Array(T * T);
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { const k = y * R + x, v = Math.abs(g[k] - prev[k]); sum += v; ts[((y / TS) | 0) * T + ((x / TS) | 0)] += v; }
      d.push(sum / g.length); ts.forEach((v, k) => td[k].push(v / (TS * TS)));
    }
    if (prev2) {                                            // frame n vs n−2: a one-frame blip makes this ≈ 0
      const ts = new Float64Array(T * T);
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { const k = y * R + x; ts[((y / TS) | 0) * T + ((x / TS) | 0)] += Math.abs(g[k] - prev2[k]); }
      ts.forEach((v, k) => t2[k].push(v / (TS * TS)));
    }
    prev2 = prev; prev = g;
  }
  // spikes: d[i] far above the median of its ±4 neighbourhood (excluding itself); flicker: up-down-up-down runs
  const flags = [];
  for (let i = 1; i < n; i++) {
    const nb = []; for (let j = i - 4; j <= i + 4; j++) if (j !== i && j >= 1 && j < n) nb.push(d[j]);
    const m = median(nb);
    if (d[i] > 0.35 && d[i] > 3 * m + 0.15) flags.push({ frame: i, t: +(i / 30).toFixed(2), kind: 'pop', d: +d[i].toFixed(2), around: +m.toFixed(2) });
  }
  // blips: in some 180×180 px tile, frame i differs from both neighbours while i−1 ≈ i+1 — something exists for
  // exactly one frame (a one-frame squash in mid-air, a vanishing object, flicker). A genuine contact squash is
  // not a blip: the ball is at different heights on the frames before and after it.
  for (let k = 0; k < T * T; k++) {
    const a = td[k], c = t2[k];
    for (let i = 2; i < n; i++) {
      const lo = Math.min(a[i - 1], a[i]);
      if (lo > 1.2 && c[i] < 0.3 * lo && !flags.some(f => f.frame === i - 1 && f.at && f.at[0] === (k % T) * 180 + 90 && f.at[1] === ((k / T) | 0) * 180 + 90))
        flags.push({ frame: i - 1, t: +((i - 1) / 30).toFixed(2), kind: 'blip', d: +lo.toFixed(2), at: [(k % T) * 180 + 90, ((k / T) | 0) * 180 + 90] });
    }
  }
  flags.sort((x, y) => x.frame - y.frame);
  // chart
  const W = 1200, H = 260, max = Math.max(1, ...d) * 1.05, X = i => 40 + (W - 60) * i / (n - 1), Y = v => H - 30 - (H - 50) * v / max;
  const path = d.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const marks = flags.map(f => `<circle cx="${X(f.frame)}" cy="${Y(d[f.frame])}" r="5" fill="none" stroke="${f.kind === 'pop' ? '#000' : f.kind === 'blip' ? '#c00' : '#888'}" stroke-width="2"/>`).join('');
  const ticks = [...Array(Math.round(s.dur) + 1)].map((_, k) => `<line x1="${X(k * 30)}" x2="${X(k * 30)}" y1="${H - 30}" y2="${H - 24}" stroke="#999"/><text x="${X(k * 30)}" y="${H - 10}" font-size="11" text-anchor="middle" fill="#666">${k}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fff"/>
    <text x="40" y="18" font-size="13" font-family="monospace">${id} · frame-to-frame change (mean |Δ| of stage, 0–255) · ○ pop (whole stage)  ○ blip (one-frame, local) · ${flags.length} flags</text>
    ${ticks}<path d="${path}" fill="none" stroke="#222" stroke-width="1.2"/>${marks}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`build/motion/${id}.png`);
  fs.writeFileSync(`build/motion/${id}.json`, JSON.stringify({ id, d: d.map(v => +v.toFixed(3)), flags }));
  console.log(`${id}: ${flags.length} flags in ${((Date.now() - t0) / 1000).toFixed(0)}s → build/motion/${id}.png`);
  for (const f of flags) console.log(`  ${f.kind.padEnd(7)} t=${f.t.toFixed(2)}s  f${String(f.frame).padStart(3, '0')}  Δ=${f.d}${f.around !== undefined ? ' (around ' + f.around + ')' : ''}${f.at ? '  stage@' + f.at.join(',') : ''}`);
}
await b.close();
