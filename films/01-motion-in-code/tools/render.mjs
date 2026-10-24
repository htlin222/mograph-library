// Renderer: stills / contact sheets / per-scene video segments / audio / final mux.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const URL = 'file://' + ROOT + '/' + (process.env.HTML || 'dist/index.html') + '?record=1';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--autoplay-policy=no-user-gesture-required'];

async function open() {
  const b = await chromium.launch({ args: ARGS });
  const p = await b.newPage({ viewport: { width: 300, height: 500 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(URL);
  await p.waitForFunction(() => window.M && window.M.readyFlag, null, { timeout: 120000 }).catch(() => { console.log(errs.join('\n')); throw new Error('boot failed'); });
  p.errs = errs;
  return { b, p };
}
const timeline = p => p.evaluate(() => M.timeline.map(s => ({ id: s.id, num: s.num, start: s.start, dur: s.dur })));
const findScene = (tl, key) => tl.find(s => s.id === key || s.num === key);

const [mode, ...rest] = process.argv.slice(2);

if (mode === 'stills') {
  // stills <scene> <t,t,t> [width]   → build/stills/<scene>_<t>.png + build/stills/<scene>_sheet.jpg
  const [key, ts, wArg] = rest; const width = +(wArg || 360);
  const { b, p } = await open(); const tl = await timeline(p); const s = findScene(tl, key);
  if (!s) throw new Error('no scene ' + key);
  const times = (ts || '0.5,1.5,3,4.5').split(',').map(Number).sort((a, b) => a - b);
  fs.mkdirSync('build/stills', { recursive: true });
  const files = [];
  // step sequentially through frames for stateful scenes (sim is fixed-step, so stepping frames == jumping)
  for (const t of times) {
    const fi = Math.round((s.start + t) * 30);
    const t0 = Date.now();
    const url = await p.evaluate(i => M.frameURL(i), fi);
    const f = `build/stills/${key}_${t.toFixed(2)}.png`;
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); files.push(f);
    console.log(f, (Date.now() - t0) + 'ms');
  }
  const h = Math.round(width * 16 / 9);
  const tiles = await Promise.all(files.map(f => sharp(f).resize(width, h).png().toBuffer()));
  const sheet = sharp({ create: { width: width * tiles.length + 8 * (tiles.length - 1), height: h, channels: 3, background: '#333' } })
    .composite(tiles.map((t, i) => ({ input: t, left: i * (width + 8), top: 0 })));
  await sheet.jpeg({ quality: 88 }).toFile(`build/stills/${key}_sheet.jpg`);
  console.log('sheet build/stills/' + key + '_sheet.jpg');
  if (p.errs.length) console.log('CONSOLE:\n' + p.errs.slice(0, 20).join('\n'));
  await b.close();
}

else if (mode === 'video') {
  // video <keys|all> [workers]  → build/seg/<id>.mp4
  const keys = (rest[0] || 'all'); const workers = +(rest[1] || 2);
  const probe = await open(); const tl = await timeline(probe.p); await probe.b.close();
  const list = keys === 'all' ? tl : keys.split(',').map(k => findScene(tl, k));
  fs.mkdirSync('build/seg', { recursive: true });
  const queue = [...list];
  const work = async (wid) => {
    const { b, p } = await open();
    while (queue.length) {
      const s = queue.shift();
      const f0 = Math.round(s.start * 30), f1 = Math.round((s.start + s.dur) * 30);
      const out = `build/seg/${s.id}.mp4`;
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', '30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
      const t0 = Date.now();
      for (let i = f0; i < f1; i++) {
        const url = await p.evaluate(i => M.frameURL(i), i);
        if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
        if ((i - f0) % 30 === 0) process.stdout.write(`[w${wid}] ${s.id} ${i - f0}/${f1 - f0} ${((Date.now() - t0) / (i - f0 + 1)).toFixed(0)}ms/f\n`);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
      console.log(`[w${wid}] done ${s.id} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      if (p.errs.length) { console.log('CONSOLE ' + s.id + ':\n' + p.errs.slice(0, 10).join('\n')); p.errs.length = 0; }
    }
    await b.close();
  };
  await Promise.all([...Array(workers)].map((_, i) => work(i)));
}

else if (mode === 'audio') {
  const { b, p } = await open();
  const info = await p.evaluate(async () => { await MUS.render(); return { lufs: MUS.measured, peak: MUS.peakDb, wav: MUS.wavBase64() }; });
  fs.writeFileSync('build/music.wav', Buffer.from(info.wav, 'base64'));
  console.log('js-measured LUFS', info.lufs.toFixed(2), 'peak dBFS', info.peak.toFixed(2));
  if (p.errs.length) console.log(p.errs.join('\n'));
  await b.close();
}

else if (mode === 'mux') {
  const probe = await open(); const tl = await timeline(probe.p); await probe.b.close();
  fs.writeFileSync('build/seg/list.txt', tl.map(s => `file '${s.id}.mp4'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'build/seg/list.txt', '-i', 'build/music.wav',
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', 'dist/motion-in-code.mp4']);
  console.log('wrote dist/motion-in-code.mp4');
}
