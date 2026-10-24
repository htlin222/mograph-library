/* 61 穿越轉場 — the camera dives into a letter's counter (the hole of O, A, D …). The next scene is drawn
   INSIDE the counter, clipped by its outline, so when the hole fills the frame the cut has already happened.
   Zoom is interpolated in log space: s = exp(ln S_end · ease(u)). */
const SC = [
  { ch: 'O', word: 'ZOOM', dark: false, wd: 125, wt: 900 },
  { ch: 'A', word: 'THROUGH', dark: true, wd: 125, wt: 900 },
  { ch: 'D', word: 'DEPTH', dark: false, wd: 110, wt: 900 },
  { ch: '8', word: 'EIGHT', dark: true, wd: 100, wt: 900 },
  { ch: 'Q', word: 'QUIET', dark: false, wd: 125, wt: 900 },
  { ch: '0', word: 'ZERO', dark: true, wd: 100, wt: 900 },
  { ch: 'B', word: 'BEYOND', dark: false, wd: 125, wt: 900 },
];
/* dives: [start, end] — scene i → i+1 */
const DIVES = [[0, 3.6], [4, 7.6], [8, 11.6], [12, 15.6], [16, 17.8], [18, 19.6]];
const GH = 640;                                        // glyph cap height on stage, px

function prep(sc, i) {
  const gl = glyphAt(sc.ch, sc.wd, sc.wt), cs = glyphContours(gl, 10);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const c of cs) for (const [x, y] of c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const s = GH / (y1 - y0), ox = 540 - (x0 + x1) / 2 * s, oy = 520 + (y0 + y1) / 2 * s;   // baseline origin
  const toS = ([x, y]) => [ox + x * s, oy - y * s];
  const polys = cs.map(c => c.map(toS));
  const area = p => { let a = 0; for (let k = 0; k < p.length; k++) { const [ax, ay] = p[k], [bx, by] = p[(k + 1) % p.length]; a += ax * by - bx * ay; } return a / 2; };
  const areas = polys.map(area);
  const big = areas.reduce((m, a, k) => Math.abs(a) > Math.abs(areas[m]) ? k : m, 0);
  const inside = (pt, poly) => { let c = false; for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const [xa, ya] = poly[a], [xb, yb] = poly[b]; if ((ya > pt[1]) !== (yb > pt[1]) && pt[0] < (xb - xa) * (pt[1] - ya) / (yb - ya) + xa) c = !c; } return c; };
  const mid = p => { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; };
  const holes = polys.map((p, k) => k).filter(k => k !== big && inside(mid(polys[k]), polys[big]));
  holes.sort((a, b) => Math.abs(areas[b]) - Math.abs(areas[a]));
  const hole = polys[holes[0]];
  // area centroid of the hole
  let cx = 0, cy = 0, A = 0;
  for (let k = 0; k < hole.length; k++) { const [ax, ay] = hole[k], [bx, by] = hole[(k + 1) % hole.length], f = ax * by - bx * ay; cx += (ax + bx) * f; cy += (ay + by) * f; A += f; }
  cx /= 3 * A; cy /= 3 * A;
  let rmin = 1e9;
  for (let k = 0; k < hole.length; k++) {
    const [ax, ay] = hole[k], [bx, by] = hole[(k + 1) % hole.length], dx = bx - ax, dy = by - ay;
    if (dx * dx + dy * dy < 1e-9) continue;
    const u = clamp(((cx - ax) * dx + (cy - ay) * dy) / (dx * dx + dy * dy)), px = ax + u * dx - cx, py = ay + u * dy - cy;
    rmin = Math.min(rmin, Math.hypot(px, py));
  }
  return Object.assign(sc, { gl, s, ox, oy, hole, cx, cy, Send: 790 / rmin, i });
}

/* draw scene i so that its point (ax, ay) lands on screen (sx, sy) at scale s */
function drawScene(ctx, sc, s, sx, sy, ax, ay, t) {
  const ink = sc.dark ? P : K, paper = sc.dark ? K : P;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(s, s); ctx.translate(-ax, -ay);
  ctx.fillStyle = paper; ctx.fillRect(-2000, -2000, 5080, 5080);
  // dot grid fading toward the edges: gives the zoom something to measure against
  ctx.fillStyle = ink;
  for (let gx = 0; gx <= 20; gx++) for (let gy = 0; gy <= 20; gy++) {
    const x = 0 + gx * 54, y = gy * 54, d = Math.hypot(x - 540, y - 540) / 760;
    const r = 2.6 * (1 - d); if (r <= 0.3) continue;
    ctx.globalAlpha = 0.5; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  // corner marks + caption
  ctx.strokeStyle = ink; ctx.lineWidth = 3;
  // (bottom corners only, kept inside the HUD-free band so they never cross the readouts or the timeline)
  const capA = clamp(1 - (s - 1) * 10);              // captions fade as soon as the camera starts diving
  ctx.globalAlpha = capA;
  for (const [x, y, dx, dy] of [[150, 930, 1, -1], [930, 930, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + dy * 40); ctx.lineTo(x, y); ctx.lineTo(x + dx * 40, y); ctx.stroke(); }
  text(ctx, `SCENE ${String(sc.i + 1).padStart(2, '0')}`, 176, 906, { size: 22, family: F.mono, weight: 500, color: ink, spacing: 6 });
  text(ctx, sc.word, 904, 906, { size: 22, family: F.mono, weight: 500, color: ink, spacing: 6, align: 'right' });
  ctx.globalAlpha = 1;
  // the glyph
  ctx.fillStyle = ink; ctx.beginPath(); traceGlyph(ctx, sc.gl, sc.ox, sc.oy, sc.s); ctx.fill('nonzero');
  ctx.restore();
}

const S = M.def({
  id: 'e61', num: 61, ch: 8, title: '穿越轉場', en: 'ZOOM-THROUGH TRANSITION', dur: 20, ground: 'light',
  prompt: '連續六次「穿越轉場」：鏡頭推進字母 O、A、D、8、Q、0 的字腔（中間的洞），下一個場景就畫在洞裡，洞填滿畫面時剪接已經完成。黑白場景交替；縮放用對數插值 inOutCubic，加速時畫放射速度線，下方時間軸標 CUT。',
  how: ['取字形內輪廓（字腔）當 clip，把下一場景畫在裡面', '目標＝字腔質心；S_end = 790 ÷ 質心到邊的最短距離', '縮放在 log 空間插值：s = exp(ln S_end · ease(u))'],
  practice: '從一張照片的窗戶穿進去，接到下一個場景。',
  cues: DIVES.flatMap(([a, b]) => [{ t: a + (b - a) * 0.35, type: 'whoosh', dur: (b - a) * 0.65 }, { t: b, type: 'impact', v: 0.45 }]),
  init() { SC.forEach(prep); },
  frame(ctx, t) {
    // which dive / which scene
    let k = DIVES.findIndex(([a, b]) => t >= a && t < b);
    let cur, u = 0;
    if (k < 0) { cur = DIVES.filter(([a]) => t >= a).length; }        // settled between dives
    else { cur = k; u = (t - DIVES[k][0]) / (DIVES[k][1] - DIVES[k][0]); }
    const A = SC[cur];
    let s = 1, sx = 540, sy = 540, ax = 540, ay = 540, speed = 0;
    if (k >= 0) {
      const e = E.inOutCubic(u), z = Math.log(A.Send) * e;
      s = Math.exp(z);
      const m = E.inOutSine(clamp(u * 1.25));
      sx = lerp(A.cx, 540, m); sy = lerp(A.cy, 540, m); ax = A.cx; ay = A.cy;
      const du = 0.01, e2 = E.inOutCubic(Math.min(1, u + du));
      speed = (e2 - e) / du * Math.log(A.Send) / (DIVES[k][1] - DIVES[k][0]);   // d ln s / dt
      drawScene(ctx, A, s, sx, sy, ax, ay, t);
      // the next scene, inside the counter
      ctx.save(); ctx.beginPath();
      A.hole.forEach(([x, y], j) => { const X = sx + s * (x - ax), Y = sy + s * (y - ay); j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.clip();
      drawScene(ctx, SC[cur + 1], s / A.Send, sx, sy, 540, 540, t);
      // portal rim: the next scene's ink traced just inside the counter, so the seam always reads
      ctx.beginPath(); A.hole.forEach(([x, y], j) => { const X = sx + s * (x - ax), Y = sy + s * (y - ay); j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
      ctx.strokeStyle = SC[cur + 1].dark ? P : K; ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
    } else drawScene(ctx, A, 1, 540, 540, 540, 540, t);

    // ---- teaching overlays (difference: legible on both grounds) ----
    ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.strokeStyle = P; ctx.fillStyle = P;
    // speed lines from the target
    const sp = clamp((speed - 1.2) / 3);
    if (sp > 0) {
      const r = rng(Math.floor(t * 30));
      ctx.lineWidth = 2; ctx.globalAlpha = sp * 0.8;
      ctx.beginPath();
      for (let j = 0; j < 46; j++) { const a = r() * TAU, r0 = 300 + r() * 260, len = 120 + 420 * sp * r(); ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a) * (r0 + len), sy + Math.sin(a) * (r0 + len)); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // target crosshair + counter outline during the slow first part of each dive
    const show = k >= 0 ? 1 - smooth(0.25, 0.45, u) : 0;
    if (show > 0) {
      ctx.globalAlpha = show; ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]);
      ctx.beginPath(); A.hole.forEach(([x, y], j) => { const X = sx + s * (x - ax), Y = sy + s * (y - ay); j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(sx - 26, sy); ctx.lineTo(sx + 26, sy); ctx.moveTo(sx, sy - 26); ctx.lineTo(sx, sy + 26); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // timeline with CUT markers
    const tx = X => 60 + 960 * X / 20, ty = 1036;
    ctx.globalAlpha = 0.35; ctx.fillRect(60, ty, 960, 2); ctx.globalAlpha = 1;
    DIVES.forEach(([a, b], j) => {
      ctx.globalAlpha = t >= a ? 0.9 : 0.35;
      ctx.fillRect(tx(a), ty - 5, tx(b) - tx(a), 12);
      ctx.fillRect(tx(b) - 1.5, ty - 18, 3, 30);
    });
    ctx.globalAlpha = 1; ctx.fillRect(tx(t) - 2, ty - 26, 4, 42);
    ctx.restore();
    // labels drawn with difference too (text helper → manual)
    ctx.save(); ctx.globalCompositeOperation = 'difference';
    const name = k >= 0 ? `DIVE ${k + 1} · ${A.ch} → ${SC[cur + 1].ch}` : `SCENE ${cur + 1} · ${A.ch}`;
    text(ctx, name, 44, 70, { size: 24, family: F.mono, weight: 500, color: P, spacing: 3 });
    text(ctx, `×${s < 10 ? s.toFixed(2) : s.toFixed(1)}`, 44, 130, { size: 52, family: F.mono, weight: 500, color: P });
    text(ctx, k >= 0 ? `S_end ×${A.Send.toFixed(0)} · log-ease` : '', 46, 162, { size: 18, family: F.mono, color: P, alpha: 0.7 });
    if (show > 0.05) text(ctx, '目標：字腔質心', sx + 36, sy - 18, { size: 22, family: F.tc, color: P, alpha: show });
    // CUT label just after each cut
    DIVES.forEach(([, b]) => { const a = 1 - smooth(b, b + 0.45, t); if (t >= b && a > 0) text(ctx, 'CUT', tx(b), ty - 32, { size: 18, family: F.mono, weight: 500, color: P, align: 'center', spacing: 3, alpha: a }); });
    text(ctx, '字腔填滿畫面 = 剪接點', 1036, 70, { size: 22, family: F.tc, color: P, align: 'right', alpha: 0.8 });
    ctx.restore();
  },
});
