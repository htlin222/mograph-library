/* 29 文字遮罩 — giant letters as windows onto moving patterns; then knockout (letters cut out of a plate). */
const ROWS = ['MA', 'SK'], CAP = 440, SC = CAP / 686, GAP = 46, TOP = 92;
const BASE_WD = 72, BASE_WT = 900;
const advOf = (s, wd, wt) => [...s].reduce((a, c) => a + glyphAt(c, wd, wt).adv, 0);
/* glyph placements for a given width axis value: rows centred */
function layout(wdFn) {
  const out = [];
  ROWS.forEach((row, r) => {
    const wds = [...row].map((c, i) => wdFn(r * 2 + i));
    const gls = [...row].map((c, i) => glyphAt(c, wds[i], BASE_WT));
    const tot = gls.reduce((a, g) => a + g.adv * SC, 0) + 20;
    let x = (SW - tot) / 2; const y = TOP + CAP * (r + 1) + GAP * r;
    gls.forEach((gl, i) => { out.push({ gl, x, y, w: gl.adv * SC, idx: r * 2 + i }); x += gl.adv * SC + 20; });
  });
  return out;
}
const pathOf = (ctx, L, only = -1) => { ctx.beginPath(); for (const g of L) if (only < 0 || g.idx === only) traceGlyph(ctx, g.gl, g.x, g.y, SC); };
/* ---------- patterns (all vector, all pure tone) ---------- */
function stripes(ctx, t, col, w = 26, ang = -Math.PI / 4) {
  ctx.save(); ctx.translate(SW / 2, SH / 2); ctx.rotate(ang);
  const off = (t * 120) % (w * 2);
  ctx.fillStyle = col; ctx.beginPath();
  for (let x = -900 - off; x < 900; x += w * 2) ctx.rect(x, -900, w, 1800);
  ctx.fill(); ctx.restore();
}
function rings(ctx, t, col, cx = SW / 2, cy = SH / 2) {
  const w = 22, ph = (t * 70) % (w * 2);
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath();
  for (let r = ph + w / 2; r < 1600; r += w * 2) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); }
  ctx.stroke();
}
function dots(ctx, t, col) {
  const step = 30; ctx.fillStyle = col; ctx.beginPath();
  for (let y = step / 2; y < SH; y += step) for (let x = step / 2; x < SW; x += step) {
    const v = 0.5 + 0.5 * Math.sin(x * 0.009 + t * 2.2) * Math.cos(y * 0.011 - t * 1.6) + 0.35 * noise(x * 0.004, y * 0.004, t * 0.4);
    const r = clamp(v, 0.05, 1) * step * 0.52;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
}
function typeRows(ctx, t, col) {
  font(ctx, 46, F.latin, 900); ctx.fillStyle = col; ctx.textBaseline = 'alphabetic';
  const s = 'MASK · 遮罩 · MASK · 遮罩 · MASK · 遮罩 · MASK · 遮罩 · ';
  const w = ctx.measureText(s).width;
  for (let r = 0; r < 22; r++) { const dir = r % 2 ? 1 : -1, off = ((t * 140 * dir) % w + w) % w; ctx.fillText(s + s, -off, 46 + r * 50); }
}
const PATS = [
  { t0: 0, name: '斜紋 STRIPES', fn: stripes },
  { t0: 4, name: '同心圓 RINGS', fn: rings },
  { t0: 8, name: '網點 HALFTONE', fn: dots },
  { t0: 12, name: '文字中的文字 TYPE IN TYPE', fn: typeRows },
];
let plate = null;
M.def({
  id: 'e29', num: 29, ch: 4, title: '文字遮罩', en: 'TEXT AS MASK', dur: 20, ground: 'dark',
  prompt: '把「MASK」排成兩行撐滿畫面，當成窗戶：窗裡依序是流動斜紋、擴散同心圓、波動網點、反向捲動的小字，每 2 小節換一種；遮罩本身也能獨立呼吸。最後反過來做鏤空：白色底板挖掉字形，每個字母透出不同圖樣。純黑白。',
  how: ['字形路徑 clip()，在裡面畫圖樣：只有字的區域會顯示', '遮罩與圖樣各自有時間軸：字寬呼吸、圖樣照跑', '鏤空：底板上用 destination-out 把字挖掉'],
  practice: '用你名字的首字母當窗，窗內放一段倒數數字。',
  cues: [{ t: 0, type: 'whoosh', dur: 0.8, v: 0.5 }, ...[4, 8, 12].map(t => ({ t, type: 'pop', v: 0.6 })), { t: 13.5, type: 'riser', t1: 14 }, { t: 14, type: 'impact', v: 0.75 }],
  init() { plate = makeCanvas(SW, SH); },
  frame(ctx, t) {
    if (t < 14) {
      const pi = Math.min(3, Math.floor(t / 4)), p = PATS[pi];
      // mask breathes only in the 4th section (independent timeline)
      const breathe = t >= 12 ? Math.sin((t - 12) * Math.PI * 2 / 2) : 0;
      const L = layout(i => clamp(BASE_WD + breathe * 10 * (i % 2 ? -1 : 1), 62, 125));
      const intro = ease(E.outExpo, 0, 0.6, t);
      ctx.save();
      pathOf(ctx, L); ctx.clip();
      ctx.fillStyle = g(0.08); ctx.fillRect(0, 0, SW, SH);              // letter interior tone (dark grey) behind the pattern
      ctx.globalAlpha = intro;
      p.fn(ctx, t, fg(1));
      ctx.restore();
      // faint outline so the window's edge reads
      ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1.5; pathOf(ctx, L); ctx.stroke();
      text(ctx, `0${pi + 1}  ${p.name}`, 44, 62, { size: 21, family: F.mono, weight: 500 });
      text(ctx, t >= 12 ? '遮罩 wdth ' + (BASE_WD + breathe * 10).toFixed(0) + ' · 圖樣照跑' : 'clip(字形) → 畫圖樣', SW - 44, 62, { size: 20, family: F.mono, align: 'right', alpha: 0.7 });
      // switch flash: a wipe line on each change
      const sw = (t % 4); if (t > 3.9 && sw < 0.3) { ctx.fillStyle = fg(1); ctx.fillRect(SW * E.outExpo(sw / 0.3) - 3, 0, 3, SH); }
    } else {
      /* ---------- knockout: white plate, letters cut out, each hole shows its own pattern ---------- */
      const u = t - 14, beat = (t - 14) / BEAT;
      const L = layout(i => clamp(BASE_WD + 10 * Math.sin(beat * Math.PI / 2) * (i % 2 ? -1 : 1), 62, 125));
      // under the plate: four patterns, each clipped to its own letter (on black)
      for (const gp of L) {
        ctx.save(); pathOf(ctx, L, gp.idx); ctx.clip();
        PATS[gp.idx].fn(ctx, t, P);
        ctx.restore();
      }
      // the plate rises in from below on the downbeat
      const k = ease(E.outExpo, 0, 0.7, u);
      const pc = plate.getContext('2d');
      pc.globalCompositeOperation = 'source-over'; pc.clearRect(0, 0, SW, SH);
      pc.fillStyle = P; pc.fillRect(0, 0, SW, SH);
      pc.globalCompositeOperation = 'destination-out'; pathOf(pc, L); pc.fill();
      pc.globalCompositeOperation = 'source-over';
      // plate slides up; holes stay registered with the letters (plate is drawn at the letters' own coordinates)
      ctx.save(); ctx.beginPath(); ctx.rect(0, SH * (1 - k), SW, SH); ctx.clip();
      ctx.drawImage(plate, 0, 0); ctx.restore();
      text(ctx, '04  鏤空 KNOCKOUT · destination-out', 44, 62, { size: 21, family: F.mono, weight: 500, color: K, alpha: k });
      text(ctx, '字寬隨拍呼吸 · 每個洞一種圖樣', SW - 44, 62, { size: 20, family: F.mono, align: 'right', color: K, alpha: 0.75 * ease(E.outCubic, 15, 15.6, t) });
    }
  },
});
