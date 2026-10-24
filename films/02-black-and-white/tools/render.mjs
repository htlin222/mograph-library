// stills <id> <t,t,…> [tileWidth]   → build/stills/<id>_<t>.png + <id>_sheet.jpg (prints ms/frame + console warnings)
// video <ids|all> [workers]           → build/seg/<id>.mp4
// audio                               → build/audio/chNN.wav (float, chapter chunks with 4 s tails)
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import sharp from 'sharp';

const ROOT = process.cwd();
const HTML = process.env.HTML || 'dist/index.html';
const URL = 'file://' + ROOT + '/' + HTML + '?record=1';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--js-flags=--max-old-space-size=4096'];

async function open() {
  const b = await chromium.launch({ args: ARGS });
  const p = await b.newPage({ viewport: { width: 300, height: 500 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(URL);
  await p.waitForFunction(() => window.M && window.M.readyFlag, null, { timeout: 180000 }).catch(() => { console.log(errs.join('\n')); throw new Error('boot failed'); });
  p.errs = errs;
  return { b, p };
}
const timeline = p => p.evaluate(() => M.timeline.map(s => ({ id: s.id, kind: s.kind, ch: s.ch, num: s.num, start: s.start, dur: s.dur })));
const [mode, ...rest] = process.argv.slice(2);

if (mode === 'stills') {
  const [key, ts, wArg] = rest; const width = +(wArg || 360);
  const { b, p } = await open(); const tl = await timeline(p); const s = tl.find(q => q.id === key);
  if (!s) throw new Error('no scene ' + key + ' — have: ' + tl.map(q => q.id).join(','));
  const times = (ts || '1,5,10,15,19.5').split(',').map(Number).sort((a, c) => a - c);
  fs.mkdirSync('build/stills', { recursive: true });
  const files = [];
  for (const t of times) {
    const fi = Math.round((s.start + t) * 30), t0 = Date.now();
    const url = await p.evaluate(i => M.frameURL(i), fi);
    const f = `build/stills/${key}_${t.toFixed(2)}.png`;
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); files.push(f);
    console.log(f, (Date.now() - t0) + 'ms');
  }
  const h = Math.round(width * 16 / 9);
  const tiles = await Promise.all(files.map(f => sharp(f).resize(width, h).png().toBuffer()));
  await sharp({ create: { width: width * tiles.length + 8 * (tiles.length - 1), height: h, channels: 3, background: '#777' } })
    .composite(tiles.map((t, i) => ({ input: t, left: i * (width + 8), top: 0 }))).jpeg({ quality: 88 }).toFile(`build/stills/${key}_sheet.jpg`);
  console.log('sheet build/stills/' + key + '_sheet.jpg');
  if (p.errs.length) console.log('CONSOLE:\n' + [...new Set(p.errs)].slice(0, 20).join('\n'));
  await b.close();
}

else if (mode === 'video') {
  const keys = rest[0] || 'all', workers = +(rest[1] || 2);
  const probe = await open(); const tl = await timeline(probe.p); await probe.b.close();
  let list = keys === 'all' ? tl : keys.split(',').map(k => tl.find(q => q.id === k));
  if (process.env.SKIP_DONE) list = list.filter(s => !fs.existsSync(`build/seg/${s.id}.mp4`));
  fs.mkdirSync('build/seg', { recursive: true });
  const queue = [...list];
  const work = async wid => {
    let { b, p } = await open(); let since = 0;
    while (queue.length) {
      const s = queue.shift();
      if (since > 2500) { await b.close(); ({ b, p } = await open()); since = 0; }   // keep memory in check
      const f0 = Math.round(s.start * 30), f1 = Math.round((s.start + s.dur) * 30);
      const tmp = `build/seg/${s.id}.tmp.mp4`, out = `build/seg/${s.id}.mp4`;
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-tune', 'grain', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', '30', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
      const t0 = Date.now();
      for (let i = f0; i < f1; i++) {
        const url = await p.evaluate(i => M.frameURL(i), i);
        if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
        if ((i - f0) % 150 === 0) process.stdout.write(`[w${wid}] ${s.id} ${i - f0}/${f1 - f0} ${((Date.now() - t0) / (i - f0 + 1)).toFixed(0)}ms/f\n`);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
      fs.renameSync(tmp, out); since += f1 - f0;
      console.log(`[w${wid}] done ${s.id} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      if (p.errs.length) { console.log('CONSOLE ' + s.id + ':\n' + [...new Set(p.errs)].slice(0, 8).join('\n')); p.errs.length = 0; }
    }
    await b.close();
  };
  await Promise.all([...Array(workers)].map((_, i) => work(i)));
  fs.writeFileSync('build/seg/list.txt', tl.map(s => `file '${s.id}.mp4'`).join('\n'));
}

else if (mode === 'audio') {
  fs.mkdirSync('build/audio', { recursive: true });
  const probe = await open(); const tl = await timeline(probe.p); await probe.b.close();
  // chunks: intro, each chapter (card + its segments), outro
  const groups = [];
  for (const s of tl) {
    const key = s.kind === 'seg' || s.kind === 'card' ? 'ch' + s.ch : s.id;
    let gp = groups.find(q => q.key === key); if (!gp) { gp = { key, t0: s.start, t1: s.start + s.dur }; groups.push(gp); }
    gp.t1 = Math.max(gp.t1, s.start + s.dur);
  }
  fs.writeFileSync('build/audio/chunks.json', JSON.stringify({ groups, duration: tl.at(-1).start + tl.at(-1).dur }));
  for (const gp of groups) {
    const out = `build/audio/${gp.key}.wav`;
    if (fs.existsSync(out) && !process.env.FORCE) { console.log('skip', out); continue; }
    const { b, p } = await open(); const t0 = Date.now();
    const b64 = await p.evaluate(async ([a, c]) => { const [L, R] = await MUS.renderRange(a, c, 4); return MUS.wavF32(L, R); }, [gp.t0, gp.t1]);
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log(out, gp.t0.toFixed(1), '→', gp.t1.toFixed(1), ((Date.now() - t0) / 1000).toFixed(0) + 's');
    if (p.errs.length) console.log([...new Set(p.errs)].slice(0, 5).join('\n'));
    await b.close();
  }
}
