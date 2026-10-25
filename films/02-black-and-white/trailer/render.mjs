// Render the trailer:  node trailer/render.mjs stills 0,40,120  |  video [from-to frames] [workers]  |  music  |  plan
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import sharp from 'sharp';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = process.cwd(), URL = 'file://' + ROOT + '/trailer/build/trailer.html?record=1';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--js-flags=--max-old-space-size=4096'];
const open = async () => {
  const b = await chromium.launch({ args: ARGS }), p = await b.newPage({ viewport: { width: 500, height: 900 } }), errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(URL);
  await p.waitForFunction(() => window.T && T.readyFlag, null, { timeout: 600000 }).catch(() => { console.log(errs.join('\n')); throw new Error('boot failed'); });
  p.errs = errs; return { b, p };
};
const [mode, ...rest] = process.argv.slice(2);
fs.mkdirSync('trailer/build/frames', { recursive: true });
if (mode === 'plan') {
  const { PLAN, TBEAT } = new Function(fs.readFileSync('trailer/plan.js', 'utf8') + '; return { PLAN, TBEAT };')();
  fs.writeFileSync('trailer/build/plan.json', JSON.stringify({ ...PLAN, beat: TBEAT }, null, 1)); console.log('plan.json', PLAN.shots.length, 'shots');
}
if (mode === 'stills') {
  const { b, p } = await open(); const files = [];
  for (const f of rest[0].split(',').map(Number)) { const t0 = Date.now(); const url = await p.evaluate(i => T.frameURL(i), f); const out = `trailer/build/frames/f${String(f).padStart(4, '0')}.png`; fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); files.push(out); console.log(out, Date.now() - t0 + 'ms'); }
  const tiles = await Promise.all(files.map(f => sharp(f).resize(640, 360).png().toBuffer()));
  const cols = Math.min(4, tiles.length), rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: cols * 648, height: rows * 368, channels: 3, background: '#777' } }).composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * 648, top: Math.floor(i / cols) * 368 }))).jpeg({ quality: 85 }).toFile('trailer/build/sheet.jpg');
  if (p.errs.length) console.log([...new Set(p.errs)].slice(0, 10).join('\n'));
  await b.close();
}
if (mode === 'video') {
  // frames [a, b) into trailer/build/part_a.mp4 ; workers split the range
  const { b: b0, p: p0 } = await open(); const N = await p0.evaluate(() => T.frames); await b0.close();
  const [a, z] = (rest[0] || `0-${N}`).split('-').map(Number), W = +(rest[1] || 1), step = Math.ceil((z - a) / W);
  await Promise.all([...Array(W)].map(async (_, w) => {
    const s = a + w * step, e = Math.min(z, s + step); if (s >= e) return;
    const { b, p } = await open(), out = `trailer/build/part_${String(s).padStart(4, '0')}.mp4`;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', '30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = s; i < e; i++) {
      const url = await p.evaluate(k => T.frameURL(k), i);
      if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if ((i - s) % 30 === 0) console.log(`[w${w}] ${i}/${e} ${((Date.now() - t0) / (i - s + 1)).toFixed(0)}ms/f`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out);
  }));
}
if (mode === 'music') {
  const { b, p } = await open(); const t0 = Date.now();
  const b64 = await p.evaluate(async () => await TMUS.render());
  fs.writeFileSync('trailer/build/music.wav', Buffer.from(b64, 'base64')); console.log('music.wav', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  if (p.errs.length) console.log(p.errs.slice(0, 5).join('\n'));
  await b.close();
}
