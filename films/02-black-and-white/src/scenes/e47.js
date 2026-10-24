/* 47 奇異吸引子 — Lorenz (two pens, sensitive dependence) → Clifford map density, accumulated point by point. */
const T_CLIF = 6, T_MORPH = 11, T_PAY = 14;
const HR = 720, OX = 80, OY = 100, OW = 920;       // histogram resolution and where it lands on stage
const PA = [-1.4, 1.6, 1.0, 0.7], PB = [1.7, 1.7, 0.6, 1.2];
const LZ = { s: 10, r: 28, b: 8 / 3, dt: 0.004, perSec: 1100 };
let LA = null, LB = null, buf = null, bctx = null, img = null;
let H = null, cache = null;

function lorenz(x0) {
  const n = Math.ceil(LZ.perSec * T_CLIF) + 2, out = new Float32Array(n * 3);
  let x = x0, y = 1, z = 1.05; const { s, r, b, dt } = LZ;
  const f = (x, y, z) => [s * (y - x), x * (r - z) - y, x * y - b * z];
  for (let i = 0; i < n; i++) {
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    const k1 = f(x, y, z), k2 = f(x + k1[0] * dt / 2, y + k1[1] * dt / 2, z + k1[2] * dt / 2), k3 = f(x + k2[0] * dt / 2, y + k2[1] * dt / 2, z + k2[2] * dt / 2), k4 = f(x + k3[0] * dt, y + k3[1] * dt, z + k3[2] * dt);
    x += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); z += dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  }
  return out;
}
/* accumulate Clifford iterates into H: x' = sin(a y) + c cos(a x), y' = sin(b x) + d cos(b y) */
function accumulate(p, n, st) {
  const [a, b, c, d] = p, sc = HR * 0.47 / Math.max(1 + Math.abs(c), 1 + Math.abs(d)), h = HR / 2;
  let { x, y } = st;
  for (let i = 0; i < n; i++) {
    const nx = Math.sin(a * y) + c * Math.cos(a * x); y = Math.sin(b * x) + d * Math.cos(b * y); x = nx;
    const px = (h + x * sc) | 0, py = (h - y * sc) | 0;
    H[py * HR + px]++;
  }
  st.x = x; st.y = y;
}
function toneMap(gamma = 0.75, gain = 1) {
  let mx = 0; for (let i = 0; i < H.length; i++) if (H[i] > mx) mx = H[i];
  const L = Math.log(1 + mx * 0.18), d = img.data;
  for (let i = 0, j = 0; i < H.length; i++, j += 4) {
    const v = H[i] ? Math.min(1, Math.pow(Math.log(1 + H[i]) / L, gamma) * gain * 0.94 + 0.06) : 0;
    const c = 242 - 231 * v; d[j] = d[j + 1] = d[j + 2] = c; d[j + 3] = 255;
  }
  bctx.putImageData(img, 0, 0);
}
/* deterministic count of iterates that have been accumulated by time t */
const countA = t => Math.floor(1500 * Math.pow(2, (t - T_CLIF) * 2.45));            // ~6.3 M at 11 s
const countB = t => Math.floor(450000 + 13.55e6 * Math.pow(clamp((t - T_PAY) / 5.6), 1.6));   // starts where the morph left off: never an empty frame

const S = M.def({
  id: 'e47', num: 47, ch: 6, title: '奇異吸引子', en: 'STRANGE ATTRACTORS', dur: 20, ground: 'light',
  prompt: '先畫勞倫茲吸引子：兩支筆起點只差 0.001，幾秒後軌跡完全分岔。再迭代克利福德映射，把幾百萬點累積成密度，以對數色調壓成墨色；接著滑動參數 a 換形，最後累積 1400 萬點。',
  how: ['Lorenz：σ 10、ρ 28、β 8/3，RK4 步長 0.004', 'Clifford：x′ = sin(a·y) + c·cos(a·x)，y′ 同理', '720² 直方圖計數，灰階 = log(1+n) / log(1+max)'],
  practice: '把 a 每次加 0.01，挑出你最喜歡的一組參數。',
  cues: [{ t: 0, type: 'whoosh', dur: 0.6 }, { t: 3.5, type: 'glitch' }, { t: T_CLIF, type: 'impact', v: 0.5 }, { t: T_MORPH, type: 'riser', t1: T_PAY }, { t: T_PAY, type: 'bell', i: 4 }],
  init() {
    LA = lorenz(1.0); LB = lorenz(1.001);
    buf = makeCanvas(HR, HR); bctx = buf.getContext('2d'); img = bctx.createImageData(HR, HR);
    H = new Uint32Array(HR * HR);
  },
  frame(ctx, t) {
    const lab = (s, x, y, o = {}) => text(ctx, s, x, y, Object.assign({ size: 20, family: F.mono, weight: 500, spacing: 1 }, o));
    if (t < T_CLIF + 0.5) {
      // ---- Lorenz, two pens
      ctx.save();
      if (t > T_CLIF) ctx.globalAlpha = 1 - (t - T_CLIF) / 0.5;
      const n = Math.min(Math.floor(t * LZ.perSec), LA.length / 3 - 1), th = 0.5 + t * 0.16;
      const ct = Math.cos(th), sn = Math.sin(th), sc = 14, cx = 540, cy = 590;
      const P = (A, i) => [cx + (A[i * 3] * ct + A[i * 3 + 1] * sn) * sc, cy - (A[i * 3 + 2] - 26) * sc];
      const pen = (A, color, w, dash) => {
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.lineJoin = 'round'; ctx.beginPath();
        for (let i = 0; i <= n; i += 2) { const [x, y] = P(A, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.setLineDash([]);
        const [x, y] = P(A, n); return [x, y];
      };
      const b = pen(LB, g(0.55), 1.3, []), a = pen(LA, K, 1.6, []);
      ctx.fillStyle = g(0.55); ctx.beginPath(); ctx.arc(b[0], b[1], 9, 0, TAU); ctx.fill();
      ctx.fillStyle = K; ctx.beginPath(); ctx.arc(a[0], a[1], 9, 0, TAU); ctx.fill();
      const dx = LA[n * 3] - LB[n * 3], dy = LA[n * 3 + 1] - LB[n * 3 + 1], dz = LA[n * 3 + 2] - LB[n * 3 + 2], dd = Math.hypot(dx, dy, dz);
      lab('LORENZ  σ = 10  ρ = 28  β = 8/3', 60, 70);
      lab('● x0 = 1.000', 60, 104); lab('● x0 = 1.001', 60, 134, { color: g(0.5) });
      lab(`|Δ| = ${dd < 0.01 ? dd.toExponential(1) : dd.toFixed(2).padStart(5)}`, 1020, 70, { align: 'right', size: 30 });
      lab(dd < 1 ? '幾乎重疊' : '已分岔：對初值敏感', 1020, 104, { align: 'right', family: F.tc, size: 22, alpha: 0.75 });
      lab(`t = ${(n * LZ.dt).toFixed(1)}`, 60, 1040, { alpha: 0.6 });
      ctx.restore();
    }
    if (t >= T_CLIF) {
      // ---- Clifford density
      let p = PA, N = 0, fresh = false;
      if (t < T_MORPH) { N = countA(t); }
      else if (t < T_PAY) { const u = ease(E.inOutSine, T_MORPH, T_PAY - 0.2, t); p = [lerp(1.52, PB[0], u), PB[1], PB[2], PB[3]]; N = 450000; fresh = true; }
      else { p = PB; N = countB(t); }
      const key = t < T_MORPH ? 'A' : t < T_PAY ? 'M' + t : 'B';
      if (fresh || !cache || cache.key !== key || cache.n > N) { H.fill(0); cache = { key, n: 0, st: { x: 0.1, y: 0.1 } }; accumulate(p, 50, cache.st); H.fill(0); }
      if (N > cache.n) { accumulate(p, N - cache.n, cache.st); cache.n = N; }
      toneMap(fresh ? 0.9 : 1.35, 1);
      const ia = ease(E.outCubic, T_CLIF, T_CLIF + 0.5, t);
      ctx.save(); ctx.globalAlpha = ia; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(buf, OX, OY, OW, OW); ctx.restore();
      // the newest iterates, while they are still countable
      if (t < T_CLIF + 2.5 && cache.key === 'A') {
        const k = 14, st = { x: 0.1, y: 0.1 }, pts = [];
        const [a, b, c, d] = PA, sc = HR * 0.47 / Math.max(1 + Math.abs(c), 1 + Math.abs(d)) * OW / HR;
        const n0 = Math.max(0, Math.min(N, 300) - k);
        let x = 0.1, y = 0.1;
        for (let i = 0; i < 50 + Math.min(N, 300); i++) { const nx = Math.sin(a * y) + c * Math.cos(a * x); y = Math.sin(b * x) + d * Math.cos(b * y); x = nx; if (i >= 50 + n0) pts.push([OX + OW / 2 + x * sc, OY + OW / 2 - y * sc]); }
        const fa = 1 - ease(E.inCubic, T_CLIF + 1.6, T_CLIF + 2.5, t);
        ctx.strokeStyle = fg(0.5 * fa); ctx.lineWidth = 1.2; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        pts.forEach(([x, y], i) => { ctx.fillStyle = fg(fa * (0.25 + 0.75 * i / pts.length)); ctx.beginPath(); ctx.arc(x, y, 4 + 6 * i / pts.length, 0, TAU); ctx.fill(); });
      }
      const a = ease(E.outCubic, T_CLIF + 0.2, T_CLIF + 0.7, t);
      lab(`CLIFFORD  a ${p[0].toFixed(2)}  b ${p[1].toFixed(2)}  c ${p[2].toFixed(2)}  d ${p[3].toFixed(2)}`, 60, 70, { alpha: a });
      const cap = t < T_MORPH ? '迭代越多，密度越清楚' : t < T_PAY ? '改參數 = 換一個吸引子（每格重算 45 萬點）' : '同一條軌道累積 1400 萬點';
      lab(cap, 60, 1040, { alpha: a * 0.8, family: F.tc, size: 22 });
      lab(`N = ${N.toLocaleString('en-US').padStart(10)}`, 1020, 1040, { alpha: a, align: 'right' });
    }
  },
});
