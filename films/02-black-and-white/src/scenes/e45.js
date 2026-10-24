/* 45 L 系統 — string rewriting + turtle graphics. Each generation is a full rewrite that regrows from the root. */
const SPECIES = {
  A: { axiom: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' }, deg: 25, name: '蕨草' },
  B: { axiom: 'F', rules: { F: 'FF+[+F-F-F]-[-F+F+F]' }, deg: 22.5, name: '灌木' },
  C: { axiom: 'X', rules: { X: 'F[+X]F[-X]+X', F: 'FF' }, deg: 20, name: '細枝' },
};
const rewrite = (s, R) => { let o = ''; for (const c of s) o += R[c] || c; return o; };
const STR = {};                                   // STR[key][n] = string of generation n
const GEN_T = n => (n - 1) * 1.6;                 // gen n of species A starts growing at this time
const GROW = 1.35, T_ANG = 10, T_GARDEN = 14;

/* turtle: returns segments [x0,y0,x1,y1,dist,nest] in unit steps, plus bbox and max dist */
function turtle(s, deg, bend = null) {
  const segs = [], st = []; let x = 0, y = 0, a = -Math.PI / 2, d = 0, nest = 0;
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0, md = 0;
  const da = deg * Math.PI / 180;
  for (const c of s) {
    if (c === 'F') {
      if (bend) a += bend(nest, d);
      const nx = x + Math.cos(a), ny = y + Math.sin(a);
      segs.push([x, y, nx, ny, d, nest]); x = nx; y = ny; d++;
      if (d > md) md = d;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    } else if (c === '+') a += da; else if (c === '-') a -= da;
    else if (c === '[') { st.push([x, y, a, d]); nest++; }
    else if (c === ']') { [x, y, a, d] = st.pop(); nest--; }
  }
  return { segs, bb: [x0, y0, x1, y1], md };
}
/* draw with tapering width by nesting depth; `reveal` 0..1 grows from the root along path distance */
function drawPlant(ctx, T, cx, by, scale, reveal = 1, color = K, wMul = 1) {
  const lim = reveal * (T.md + 1), byNest = [];
  for (const sg of T.segs) {
    if (sg[4] >= lim) continue;
    const f = Math.min(1, lim - sg[4]);
    (byNest[Math.min(sg[5], 9)] ||= []).push(sg, f);
  }
  ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  byNest.forEach((arr, n) => {
    if (!arr) return;
    ctx.lineWidth = Math.max(0.9, 6.5 * Math.pow(0.7, n)) * wMul;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i += 2) {
      const [x0, y0, x1, y1] = arr[i], f = arr[i + 1];
      ctx.moveTo(cx + x0 * scale, by + y0 * scale); ctx.lineTo(cx + (x0 + (x1 - x0) * f) * scale, by + (y0 + (y1 - y0) * f) * scale);
    }
    ctx.stroke();
  });
}
const fit = (T, w, h) => Math.min(w / Math.max(1e-6, T.bb[2] - T.bb[0]), h / Math.max(1e-6, T.bb[3] - T.bb[1]));
let FITA = [], T0S = {};

const S = M.def({
  id: 'e45', num: 45, ch: 6, title: 'L 系統', en: 'L-SYSTEM', dur: 20, ground: 'light',
  prompt: '用 L 系統長蕨草：公理 X，X→F+[[X]-X]-F[-FX]+X、F→FF，夾角 25°。每 1.6 秒改寫一代並從根部重長，舊代留灰影；再把夾角掃過 15°–35°；最後三種規則並排迎風搖。',
  how: ['字串改寫：每一代把每個字母同時換成規則右邊', '海龜繪圖：F 前進、± 轉 δ、[ ] 存取位置與方向', '線寬依括號深度 ×0.7 遞減；搖擺 = 每步加微小轉角'],
  practice: '把 F→FF 改成 F→F，植物會怎麼變矮？',
  cues: [...[1, 2, 3, 4, 5, 6].map(n => ({ t: GEN_T(n), type: 'bell', i: n - 1, v: 0.45 })), { t: T_ANG, type: 'whoosh', dur: 0.6 }, { t: T_GARDEN, type: 'impact', v: 0.5 }],
  init() {
    for (const k in SPECIES) { const sp = SPECIES[k]; STR[k] = [sp.axiom]; for (let n = 1; n <= 6; n++) STR[k].push(rewrite(STR[k][n - 1], sp.rules)); }
    FITA = STR.A.map(s => turtle(s, 25));
    T0S = { B: turtle(STR.B[3], 22.5), A: FITA[5], C: turtle(STR.C[6], 20) };   // unbent layouts for the garden (fit + centring)
  },
  frame(ctx, t) {
    const lab = (s, x, y, o = {}) => text(ctx, s, x, y, Object.assign({ size: 20, family: F.mono, weight: 500 }, o));
    const ground = 1000;
    if (t < T_GARDEN + 0.6) {
      ctx.save();
      if (t > T_GARDEN) ctx.globalAlpha = 1 - (t - T_GARDEN) / 0.6;
      let n = 1; while (n < 6 && GEN_T(n + 1) <= t) n++;
      let deg = 25;
      if (t > T_ANG) deg = 25 + 10 * Math.sin(Math.min(1, (t - T_ANG) / 3.6) * TAU * 0.75) * ease(E.outCubic, T_ANG, T_ANG + 0.3, t) * (1 - ease(E.inOutCubic, T_ANG + 3.2, T_GARDEN, t));
      const W_ = 780, H_ = 700;
      // ghost of the previous generation
      const r = ease(E.inOutSine, GEN_T(n), GEN_T(n) + GROW, t);
      if (n > 1 && r < 1) { const Tp = FITA[n - 1]; const sc = fit(Tp, W_, H_); drawPlant(ctx, Tp, 540 - (Tp.bb[0] + Tp.bb[2]) / 2 * sc, ground, sc, 1, g(0.75, 1 - r * 0.6), 0.8); }
      const T = t > T_ANG ? turtle(STR.A[n], deg) : FITA[n];
      const sc = fit(FITA[n], W_, H_);
      drawPlant(ctx, T, 540 - (FITA[n].bb[0] + FITA[n].bb[2]) / 2 * sc, ground, sc, r);
      // readouts
      const a = ease(E.outCubic, 0.1, 0.5, t);
      lab('AXIOM  X', 60, 70, { alpha: a });
      lab('X → F+[[X]-X]-F[-FX]+X', 60, 102, { alpha: a });
      lab('F → FF', 60, 134, { alpha: a });
      lab(`δ = ${deg.toFixed(1)}°`, 60, 166, { alpha: a, size: t > T_ANG ? 26 : 20 });
      lab(`n = ${n}`, 1020, 84, { alpha: a, align: 'right', size: 44 });
      lab(`|S| = ${STR.A[n].length.toLocaleString('en-US')}`, 1020, 122, { alpha: a, align: 'right' });
      lab(`F × ${STR.A[n].split('F').length - 1}`, 1020, 152, { alpha: a * 0.7, align: 'right' });
      // the string itself, typed under the ground
      const head = STR.A[n].slice(0, 46) + (STR.A[n].length > 46 ? '…' : '');
      lab(head, 60, 1040, { alpha: a * 0.65, size: 19, spacing: 1 });
      ctx.restore();
    }
    // garden: three rule sets grow together and sway
    if (t >= T_GARDEN) {
      const u = t - T_GARDEN, a = ease(E.outCubic, T_GARDEN, T_GARDEN + 0.6, t);
      const cols = [['B', 3, 200], ['A', 5, 540], ['C', 6, 880]];
      cols.forEach(([k, n, cx], i) => {
        const sp = SPECIES[k];
        const T0 = T0S[k], amp = 0.14 / T0.md;          // total lean at the tip ≈ 0.14 rad, whatever the depth
        const bend = (nest, d) => amp * Math.sin(u * 2.1 - d * 0.02 + i) * (1 + nest * 0.25);
        const T = turtle(STR[k][n], sp.deg, bend);
        const sc = fit(T0, 300, 760);
        const r = ease(E.outCubic, T_GARDEN + 0.1 + i * 0.25, T_GARDEN + 2.2 + i * 0.25, t);
        drawPlant(ctx, T, cx - (T0.bb[0] + T0.bb[2]) / 2 * sc, ground, sc, r, K, 0.85);
        lab(`${sp.name}  n=${n}  δ=${sp.deg}°`, cx, ground + 38, { alpha: a, align: 'center', family: F.tc, size: 21 });
      });
      ctx.fillStyle = fg(a); ctx.fillRect(60, ground + 4, SW - 120, 2);
      lab('換規則 = 換物種', 60, 70, { alpha: a, family: F.tc, size: 26 });
      lab('B: F → FF+[+F-F-F]-[-F+F+F]', 60, 106, { alpha: a * 0.7, size: 18 });
      lab('C: X → F[+X]F[-X]+X, F → FF', 60, 134, { alpha: a * 0.7, size: 18 });
    } else { ctx.fillStyle = fg(1); ctx.fillRect(60, ground + 4, SW - 120, 2); }
  },
});
