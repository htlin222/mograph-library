// one browser, contact sheets for many scenes: node tools/sheets.mjs [ids] → build/review/<id>.jpg (5 frames) + <id>_full.png (t=14)
import { chromium } from 'playwright';
import fs from 'fs'; import sharp from 'sharp';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage(); const errs = [];
p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/' + (process.env.HTML || 'dist/index.html') + '?record=1');
await p.waitForFunction(() => window.M && M.readyFlag, null, { timeout: 180000 });
const tl = await p.evaluate(() => M.timeline.map(s => ({ id: s.id, kind: s.kind, start: s.start, dur: s.dur })));
const ids = process.argv[2] ? process.argv[2].split(',') : tl.filter(s => s.kind === 'seg').map(s => s.id);
fs.mkdirSync('build/review', { recursive: true });
for (const id of ids) {
  const s = tl.find(q => q.id === id); const tiles = [];
  for (const t of [1.0, 5.0, 9.0, 14.0, 19.5]) {
    const url = await p.evaluate(i => M.frameURL(i), Math.round((s.start + t) * 30));
    const buf = Buffer.from(url.split(',')[1], 'base64');
    if (t === 14.0) fs.writeFileSync(`build/review/${id}_full.png`, buf);
    tiles.push(await sharp(buf).resize(400, 711).png().toBuffer());
  }
  await sharp({ create: { width: 400 * 5 + 32, height: 711, channels: 3, background: '#808080' } })
    .composite(tiles.map((t, i) => ({ input: t, left: i * 408, top: 0 }))).jpeg({ quality: 85 }).toFile(`build/review/${id}.jpg`);
  console.log(id, errs.length ? 'WARN ' + [...new Set(errs)].join(' | ') : ''); errs.length = 0;
}
await b.close();
