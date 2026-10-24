/* 46 差分增長 — a closed curve: neighbours attract, everything repels, long edges split. Fixed-step sim (M.sim). */
const CX = 540, CY = 560, BOUND = 310, ZS = 1.4, HZ = 60, CAP = 7000, EXPOSED = 5;
const RULES = [
  [0.3, '① 吸引：每點拉向兩鄰點的中點'],
  [4, '② 排斥：半徑 R 內的點互相推開'],
  [7.5, '③ 分裂：邊長 > L 就插入新點'],
  [10.5, '④ 只有外緣（鄰點少）的點會長：分枝向外'],
  [15, '年輪：每 1.5 秒留下一圈輪廓'],
];
const Rof = t => 15;
let st = null, CC = null;
const cpuCtx = () => CC || (CC = makeCanvas(SW, SH).getContext('2d', { willReadFrequently: true }));

function reset() {
  const n = 48, X = [], Y = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; X.push(CX + Math.cos(a) * 46); Y.push(CY + Math.sin(a) * 46); }
  st = { X, Y, r: rng(4601), rings: [], nextRing: 1.5 };
}
function step(dt, n, t) {
  const { X, Y } = st, N = X.length, R = Rof(t), L = R * 0.55;
  // spatial hash: flat cell grid with per-cell linked lists (no per-step Map/array allocation)
  const cs = R, G0X = CX - BOUND - 60, G0Y = CY - BOUND - 60, GW = Math.ceil((2 * BOUND + 120) / cs) + 2;
  if (!st.head || st.head.length !== GW * GW) st.head = new Int32Array(GW * GW);
  const head = st.head; head.fill(-1);
  const next = st.next && st.next.length >= N ? st.next : (st.next = new Int32Array(CAP + 64));
  const cellOf = (x, y) => clamp(Math.floor((x - G0X) / cs), 0, GW - 1) + clamp(Math.floor((y - G0Y) / cs), 0, GW - 1) * GW;
  for (let i = 0; i < N; i++) { const k = cellOf(X[i], Y[i]); next[i] = head[k]; head[k] = i; }
  const FX = new Float64Array(N), FY = new Float64Array(N), CNT = new Uint16Array(N);
  for (let i = 0; i < N; i++) {
    const x = X[i], y = Y[i], ip = (i + N - 1) % N, inx = (i + 1) % N;
    // attraction / smoothing toward the neighbours' midpoint
    FX[i] += ((X[ip] + X[inx]) / 2 - x) * 0.35; FY[i] += ((Y[ip] + Y[inx]) / 2 - y) * 0.35;
    // repulsion
    const gx = clamp(Math.floor((x - G0X) / cs), 1, GW - 2), gy = clamp(Math.floor((y - G0Y) / cs), 1, GW - 2);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      for (let j = head[(gx + a) + (gy + b) * GW]; j >= 0; j = next[j]) {
        if (j === i || j === ip || j === inx) continue;
        const dx = x - X[j], dy = y - Y[j], d2 = dx * dx + dy * dy;
        if (d2 < R * R) CNT[i]++;
        if (d2 < R * R && d2 > 1e-6) { const d = Math.sqrt(d2), f = (R - d) / R * 0.9; FX[i] += dx / d * f; FY[i] += dy / d * f; }
      }
    }
    // soft circular boundary
    const bx = x - CX, by = y - CY, br = Math.hypot(bx, by);
    if (br > BOUND - 20) { const f = (br - (BOUND - 20)) * 0.25; FX[i] -= bx / br * f; FY[i] -= by / br * f; }
  }
  for (let i = 0; i < N; i++) { const m = Math.hypot(FX[i], FY[i]), k = m > 3 ? 3 / m : 1; X[i] += FX[i] * k; Y[i] += FY[i] * k; }
  // growth: split long edges, plus a few random insertions (the curve's "appetite")
  const want = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (st.r() < (CNT[i] < EXPOSED ? 0.09 : 0.0004)) want[i] = 1;
  const NX = [], NY = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N; NX.push(X[i]); NY.push(Y[i]);
    const d = Math.hypot(X[j] - X[i], Y[j] - Y[i]);
    if ((d > L || want[i]) && N + NX.length - i < CAP) { NX.push((X[i] + X[j]) / 2 + (st.r() - 0.5) * 0.2); NY.push((Y[i] + Y[j]) / 2 + (st.r() - 0.5) * 0.2); }
  }
  st.X = NX; st.Y = NY;
  if (t + dt >= st.nextRing) { st.rings.push(Float32Array.from(NX.flatMap((x, i) => [x, NY[i]]))); st.nextRing += 1.5; }
}
const loop = (ctx, X, Y) => { ctx.moveTo(X[0], Y[0]); for (let i = 1; i < X.length; i++) ctx.lineTo(X[i], Y[i]); ctx.closePath(); };
const loopF = (ctx, A) => { ctx.moveTo(A[0], A[1]); for (let i = 2; i < A.length; i += 2) ctx.lineTo(A[i], A[i + 1]); ctx.closePath(); };

const S = M.def({
  id: 'e46', num: 46, ch: 6, title: '差分增長', en: 'DIFFERENTIAL GROWTH', dur: 20, ground: 'dark',
  prompt: '一條 48 點的閉合曲線：鄰點互相吸引、半徑 15px 內互相排斥、邊太長就插入新點，只有外緣的點會長。曲線在圓框內擠出珊瑚般的分枝，最後填白並畫出每 1.5 秒一圈的年輪。',
  how: ['每步：拉向鄰點中點 0.35 + 半徑 R 內線性斥力', '邊長 > 0.55R 就分裂；R 內鄰點 < 5 的外緣點 9% 插點', '60 Hz 固定步長模擬，空間雜湊找鄰點'],
  practice: '只讓上半圈的點會分裂，形狀會往哪邊長？',
  cues: [...RULES.map(r => ({ t: r[0], type: 'tick', v: 0.5 })), { t: 11, type: 'riser', t1: 15 }, { t: 15, type: 'bell', i: 2 }],
  reset,
  // drawn into a CPU-backed canvas (willReadFrequently): software raster of a 5000-point path is far cheaper than SwiftShader
  frame(stage, t) { const c = cpuCtx(); c.fillStyle = bg(1); c.fillRect(0, 0, SW, SH); this.draw(c, t); stage.drawImage(c.canvas, 0, 0); },
  draw(ctx, t) {
    if (!st) reset();
    M.sim(S, t, step, HZ);
    const { X, Y, rings } = st, N = X.length;
    const pay = ease(E.inOutCubic, 15, 16.2, t);
    // boundary (the sim is drawn ×ZS about the centre)
    ctx.save(); ctx.translate(CX, CY); ctx.scale(ZS, ZS); ctx.translate(-CX, -CY);
    ctx.strokeStyle = fg(0.3); ctx.lineWidth = 1.5 / ZS; ctx.setLineDash([3 / ZS, 9 / ZS]); ctx.beginPath(); ctx.arc(CX, CY, BOUND, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const draw = filled => {
      if (filled) { ctx.fillStyle = P; ctx.beginPath(); loop(ctx, X, Y); ctx.fill('evenodd'); }
      if (filled) {                                   // growth rings belong to the payoff only (cleaner line stage, cheaper frames)
        ctx.strokeStyle = g(0, 0.85); ctx.lineWidth = 1.3 / ZS; ctx.beginPath();
        rings.forEach(A => loopF(ctx, A)); ctx.stroke();
      }
      ctx.strokeStyle = filled ? K : P; ctx.lineWidth = (N < 400 ? 3 : 2) / ZS; ctx.lineJoin = 'round';
      ctx.beginPath(); loop(ctx, X, Y); ctx.stroke();
      if (filled) { ctx.strokeStyle = P; ctx.lineWidth = 1 / ZS; ctx.stroke(); }
    };
    // payoff: a radial wipe turns the line drawing into a filled body with growth rings in ink
    if (pay < 1) draw(false);
    if (pay > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, pay * (BOUND + 30), 0, TAU); ctx.clip();
      ctx.fillStyle = K; ctx.fillRect(CX - BOUND - 40, CY - BOUND - 40, 2 * BOUND + 80, 2 * BOUND + 80);
      draw(true); ctx.restore();
      ctx.strokeStyle = fg(0.3); ctx.lineWidth = 1.5 / ZS; ctx.setLineDash([3 / ZS, 9 / ZS]); ctx.beginPath(); ctx.arc(CX, CY, BOUND, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    // nodes visible while there are few
    const na = clamp(1 - (N - 150) / 450);
    if (na > 0) { ctx.fillStyle = P; ctx.globalAlpha = na; for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(X[i], Y[i], 4.5 / ZS, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    ctx.restore();
    // rule captions
    let r = 0; while (r + 1 < RULES.length && RULES[r + 1][0] <= t) r++;
    const ra = ease(E.outCubic, RULES[r][0], RULES[r][0] + 0.4, t);
    text(ctx, RULES[r][1], 60, 64 + (1 - ra) * 10, { size: 26, family: F.tc, alpha: ra });
    const R = Rof(t);
    text(ctx, `N = ${String(N).padStart(5)}   R = ${R.toFixed(0)} px   L = ${(R * 0.55).toFixed(1)} px`, 60, 1040, { size: 20, family: F.mono, weight: 500, alpha: 0.7 });
    text(ctx, `t = ${(S.sim ? S.sim.t : 0).toFixed(2)} s · ${S.sim ? S.sim.n : 0} 步`, 1020, 1040, { size: 20, family: F.mono, weight: 500, alpha: 0.5, align: 'right' });
  },
});
