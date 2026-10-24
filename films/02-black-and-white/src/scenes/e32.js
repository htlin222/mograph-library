/* 32 文字粒子化 — a word sampled into particles: dissolve on a sweeping front, re-form, burst under gravity, re-form, erase.
   Every particle position is a closed-form function of t (no accumulated state), so any frame renders directly. */
const N = 4200, FLOOR = 1000;
let A, B, C, PR;                                   // targets (Float32 x,y pairs) and per-particle randoms
function sampleWord(draw, seed) {
  const m = mask(SW, SH, (x) => { x.fillStyle = '#fff'; draw(x); });
  const pts = [];
  for (let y = 0; y < SH; y += 4) for (let x = 0; x < SW; x += 4) if (m.data[(y * SW + x) * 4 + 3] > 128) pts.push([x, y]);
  const r = rng(seed), out = [];
  for (let i = 0; i < N; i++) { const p = pts[Math.floor(r() * pts.length)]; out.push([p[0] + r() * 4, p[1] + r() * 4]); }
  // order by x (with a little y) so particle i maps to a nearby part of every word → morphs sweep, not scramble
  out.sort((a, b) => (a[0] + a[1] * 0.15) - (b[0] + b[1] * 0.15));
  const f = new Float32Array(N * 2); out.forEach((p, i) => { f[i * 2] = p[0]; f[i * 2 + 1] = p[1]; });
  return f;
}
function glyphWord(ctx, str, cy, maxW, maxCap) {
  let adv = 0; for (const ch of str) adv += glyphAt(ch, 100, 900).adv;
  const sc = Math.min(maxW / adv, maxCap / 686); let x = (SW - adv * sc) / 2;
  ctx.beginPath(); for (const ch of str) { const gl = glyphAt(ch, 100, 900); traceGlyph(ctx, gl, x, cy + 343 * sc, sc); x += gl.adv * sc; } ctx.fill();
}
/* ---------- phase functions ---------- */
function wind(i, tau) {           // drift right and up, turbulence grows with time since departure
  const r1 = PR[i * 4], r2 = PR[i * 4 + 1], r3 = PR[i * 4 + 2];
  const tt = Math.max(0, tau);
  return [110 * tt + 34 * tt * tt + 40 * tt * Math.sin(tt * (2 + r1 * 3) + r2 * TAU),
          -(30 + 50 * r3) * tt - 12 * tt * tt + 36 * tt * Math.cos(tt * (1.5 + r2 * 3) + r1 * TAU)];
}
const depart = (x, i, t0, span, w = SW) => t0 + span * (x / w) + PR[i * 4 + 3] * 0.35;
function p1(i, t) {                // assemble (0–0.8 s) then dissolve
  const ax = A[i * 2], ay = A[i * 2 + 1];
  if (t < 0.8) { const k = E.outExpo(clamp(t / 0.8)); const sx = SW / 2 + (PR[i * 4] - 0.5) * 1600, sy = SH / 2 + (PR[i * 4 + 1] - 0.5) * 1600; return [lerp(sx, ax, k), lerp(sy, ay, k)]; }
  const d = depart(ax, i, 1.2, 2.4), w = wind(i, t - d);
  return [ax + w[0], ay + w[1]];
}
function p2(i, t) {                // re-form into 粒子
  const st = 4.6 + 0.9 * (B[i * 2] / SW) + PR[i * 4 + 3] * 0.2, k = E.inOutCubic(clamp((t - st) / 1.5));
  const q = p1(i, t);
  return [lerp(q[0], B[i * 2], k), lerp(q[1], B[i * 2 + 1], k)];
}
const BURST = 9.0, G0 = 2400;
function p3(i, t) {                // anticipation squeeze, then burst with gravity and a floor
  const bx = B[i * 2], by = B[i * 2 + 1], cx = 540, cy = 470;
  const sq = 1 - 0.12 * E.inBack(clamp((t - 8.4) / 0.6)) * (t < BURST ? 1 : 0);
  if (t < BURST) return [cx + (bx - cx) * sq, cy + (by - cy) * sq];
  const ang = Math.atan2(by - cy, bx - cx), sp = 350 + 650 * PR[i * 4 + 2];
  const vx = Math.cos(ang) * sp + (PR[i * 4] - 0.5) * 300, vy = Math.sin(ang) * sp - 700 - 400 * PR[i * 4 + 1];
  const x0 = cx + (bx - cx) * 0.88, y0 = cy + (by - cy) * 0.88, tau = t - BURST;
  const fy = FLOOR - Math.pow(PR[i * 4 + 3], 2) * 70;            // a loose pile, not a line
  // landing time: y0 + vy τ + ½ g τ² = fy
  const tl = (-vy + Math.sqrt(vy * vy + 2 * G0 * (fy - y0))) / G0;
  if (tau < tl) return [x0 + vx * tau, y0 + vy * tau + 0.5 * G0 * tau * tau];
  const xl = x0 + vx * tl, s = tau - tl; return [xl + vx * 0.15 * (1 - Math.exp(-6 * s)), fy];
}
function p4(i, t) {                // gather from the floor into TYPE
  const st = 12.0 + 1.0 * (C[i * 2] / SW) + PR[i * 4 + 2] * 0.25, k = E.outBack(clamp((t - st) / 1.1));
  const q = p3(i, Math.min(t, 12.0 + 1.0 * (C[i * 2] / SW) + PR[i * 4 + 2] * 0.25));
  return [lerp(q[0], C[i * 2], k), lerp(q[1], C[i * 2 + 1], k)];
}
const eraser = t => [540 + 380 * Math.sin((t - 14) * 1.3), 470 + 120 * Math.sin((t - 14) * 2.1 + 0.6)];
function p5(i, t) {                // eraser pushes particles aside; from 17.5 a slow dissolve from the right
  let x = C[i * 2], y = C[i * 2 + 1];
  const ea = ease(E.outCubic, 14.6, 15.2, t) * (1 - ease(E.inCubic, 17.0, 17.6, t));
  if (ea > 0) {
    const [ex, ey] = eraser(t), dx = x - ex, dy = y - ey, r = Math.hypot(dx, dy) + 1e-3, R = 150;
    if (r < R * 1.6) { const push = ea * R * Math.pow(Math.max(0, 1 - r / (R * 1.6)), 1.4) * 1.3; x += dx / r * push; y += dy / r * push; }
  }
  const d = 17.6 + 2.6 * (1 - C[i * 2] / SW) + PR[i * 4 + 3] * 0.4, w = wind(i, (t - d) * 0.8);
  return [x + w[0] * 0.6, y - Math.abs(w[1]) * 1.1];
}
const at = (i, t) => t < 4.6 ? p1(i, t) : t < 8.4 ? p2(i, t) : t < 12 ? p3(i, t) : t < 14.4 ? p4(i, t) : p5(i, t);
M.def({
  id: 'e32', num: 32, ch: 4, title: '文字粒子化', en: 'TEXT DISINTEGRATION', dur: 20, ground: 'light',
  prompt: '把「DUST」取樣成 4200 顆黑色粒子：先聚合成字，再由左往右被風吹散；接著依 x 排序配對、重組成「粒子」；在拍點上先內縮再爆開，受重力落地堆積；再從地上收回成「TYPE」，讓一個圓形橡皮擦推開粒子，最後從右側慢慢化成煙。白底。',
  how: ['把字畫進離屏遮罩，每 4px 取樣一點，依 x 排序', '離開時間 = 1.2 + 2.4·x/寬 + 隨機，風 = 二次漂移 + 擾動', '每顆粒子位置都是 t 的解析函數：任何一格都能直接算'],
  practice: '讓粒子從字的中心往外散，再從外往內收回。',
  cues: [{ t: 0, type: 'whoosh', dur: 0.8, v: 0.6 }, { t: 1.2, type: 'whoosh', dur: 2.6, v: 0.5 }, { t: 5, type: 'whoosh', dur: 1.6, v: 0.4 }, { t: 8.4, type: 'riser', t1: 9 }, { t: BURST, type: 'impact', v: 0.9 }, { t: 9.75, type: 'thud', v: 0.5 }, { t: 12, type: 'whoosh', dur: 1.3, v: 0.5 }, { t: 17.6, type: 'whoosh', dur: 2.4, v: 0.4 }],
  init() {
    A = sampleWord(x => glyphWord(x, 'DUST', 470, 900, 400), 1);
    B = sampleWord(x => text(x, '粒子', 540, 470 + 150, { size: 430, family: F.tcBlack, weight: 900, align: 'center', color: '#fff' }), 2);
    C = sampleWord(x => glyphWord(x, 'TYPE', 470, 900, 400), 3);
    const r = rng(32); PR = new Float32Array(N * 4); for (let i = 0; i < PR.length; i++) PR[i] = r();
  },
  frame(ctx, t) {
    // particles: one path, many tiny squares; size varies slightly per particle for texture
    ctx.fillStyle = fg(1); ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const [x, y] = at(i, t); if (x < -10 || x > SW + 10 || y < -10 || y > SH + 10) continue;
      const s = 2.4 + PR[i * 4 + 1] * 1.8; ctx.rect(x - s / 2, y - s / 2, s, s);
    }
    ctx.fill();
    /* ---------- teaching overlays ---------- */
    const lab = (a, b) => { text(ctx, a, 44, 62, { size: 21, family: F.mono, weight: 500 }); if (b) text(ctx, b, SW - 44, 62, { size: 20, family: F.mono, align: 'right', alpha: 0.7 }); };
    if (t < 4.6) {
      lab('01  風化 DISSOLVE', `${N} 顆粒子 · 每 4px 取樣`);
      const fx = SW * (t - 1.2) / 2.4;
      if (t > 1.2 && t < 4.0) { ctx.fillStyle = fg(0.6); ctx.fillRect(fx, 120, 1.5, 720); text(ctx, '前緣 front', fx + 10, 140, { size: 18, family: F.mono, alpha: 0.7 }); }
    } else if (t < 8.4) {
      lab('02  重組 RE-FORM');
      text(ctx, 'i ↔ i：兩個字都依 x 排序', SW - 44, 1040, { size: 20, family: F.mono, align: 'right', alpha: 0.7 });
      // show the pairing for a handful of particles
      ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1; ctx.setLineDash([3, 5]); ctx.beginPath();
      for (let i = 0; i < N; i += 300) { const [x, y] = at(i, t); ctx.moveTo(x, y); ctx.lineTo(B[i * 2], B[i * 2 + 1]); }
      ctx.stroke(); ctx.setLineDash([]);
    } else if (t < 12) {
      lab('03  爆散 BURST', `g = ${G0} px/s² · 內縮 → 爆開 → 堆積`);
      ctx.fillStyle = fg(0.5); ctx.fillRect(60, FLOOR + 4, SW - 120, 1.5);
    } else if (t < 14.4) {
      lab('04  收回 GATHER', 'outBack 1.1s · 依 x 錯開');
    } else {
      lab('05  橡皮擦與煙 ERASE & SMOKE', '位置 = f(i, t)');
      const ea = ease(E.outCubic, 14.6, 15.2, t) * (1 - ease(E.inCubic, 17.0, 17.6, t));
      if (ea > 0) { const [ex, ey] = eraser(t); ctx.strokeStyle = fg(0.5 * ea); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, ey, 150, 0, TAU); ctx.stroke(); }
    }
  },
});
