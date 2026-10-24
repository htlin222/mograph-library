/* 42 德勞內三角化 — Bowyer–Watson insertion with circumcircles, the Voronoi dual, then a lit low-poly relief. */
function circum(P, a, b, c) {
  const [ax, ay] = P[a], [bx, by] = P[b], [cx, cy] = P[c];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return { a, b, c, x: 0, y: 0, r2: Infinity };
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  const x = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d, y = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  return { a, b, c, x, y, r2: (ax - x) ** 2 + (ay - y) ** 2 };
}
/* Bowyer–Watson. Returns triangles over P[0..n). `probe` (an index ≥ n) → also return the bad set it would remove. */
function delaunay(Pin, n) {
  const P = Pin.slice(0, n);
  P.push([-3000, -3000], [5000, -3000], [540, 6000]);
  let tris = [circum(P, n, n + 1, n + 2)];
  let lastBad = [];
  for (let i = 0; i < n; i++) {
    const [px, py] = P[i], bad = [], keep = [];
    for (const T of tris) ((px - T.x) ** 2 + (py - T.y) ** 2 < T.r2 ? bad : keep).push(T);
    const edges = new Map();
    for (const T of bad) for (const [u, v] of [[T.a, T.b], [T.b, T.c], [T.c, T.a]]) {
      const k = u < v ? u * 4096 + v : v * 4096 + u; edges.set(k, edges.has(k) ? null : [u, v]);
    }
    for (const e of edges.values()) if (e) keep.push(circum(P, e[0], e[1], i));
    tris = keep;
    if (i === n - 1) lastBad = bad;
  }
  const real = T => T.a < n && T.b < n && T.c < n;
  return { tris: tris.filter(real), bad: lastBad.filter(real), all: tris, P };
}

const CX = 540, CY = 560, R = 430;
let PTS = [], LOW = [], LOWT = [];
const PR = 400;
const T_DUAL = 8.5, T_LOW = 13;
/* insertion schedule: first 16 on eighth notes, then a flood */
const insT = i => i < 3 ? i * 0.1 : i < 16 ? 0.25 + (i - 2) * 0.25 : 4.15 + (i - 16) * 0.035;

const S = M.def({
  id: 'e42', num: 42, ch: 6, title: '德勞內三角化', en: 'DELAUNAY TRIANGULATION', dur: 20, ground: 'dark',
  prompt: '點一顆顆加入，用 Bowyer–Watson 即時重連三角網：外接圓含新點的三角形被挖掉、改連到新點。再疊上對偶的沃羅諾伊圖；最後約 270 點拼成低多邊形星球，光源繞行，7 階灰面。',
  how: ['新點落入誰的外接圓，就刪掉那些三角形再補扇形', '空圓性質：任何三角形的外接圓內都沒有其他點', '收尾：半球高度 + 雜訊 → 面法線·光向量 → 7 階灰'],
  practice: '把點換成泊松圓盤取樣，三角形會變得多均勻？',
  cues: [...Array.from({ length: 16 }, (_, i) => ({ t: insT(i), type: 'tick', v: 0.45 })), { t: 4.15, type: 'riser', t1: 8.5 }, { t: T_DUAL, type: 'bell', i: 1 }, { t: T_LOW, type: 'impact', v: 0.7 }],
  init() {
    // insertion points: rejection-sampled disc points inside the circle, min distance shrinking
    const r = rng(4202); PTS = [];
    let guard = 0;
    while (PTS.length < 140 && guard++ < 20000) {
      const a = r() * TAU, rr = R * 0.96 * Math.sqrt(r()), x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
      const md = PTS.length < 16 ? 150 : 40;
      if (PTS.every(p => Math.hypot(p[0] - x, p[1] - y) > md)) PTS.push([x, y]);
    }
    // low-poly planet: dart-throwing points in a disc + a ring on the limb; triangulated once
    const q = rng(4243); LOW = [];
    for (let k = 0; k < 72; k++) { const a = (k + q.range(-0.2, 0.2)) / 72 * TAU, rr = PR + q.range(-2, 2); LOW.push([CX + Math.cos(a) * rr, CY + Math.sin(a) * rr]); }
    let gd = 0;
    while (gd++ < 60000 && LOW.length < 560) {
      const a = q() * TAU, rr = PR * Math.sqrt(q()), x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
      const md = 26 + 22 * (rr / PR);
      if (rr < PR - 18 && LOW.every(p => (p[0] - x) ** 2 + (p[1] - y) ** 2 > md * md)) LOW.push([x, y]);
    }
    LOWT = delaunay(LOW, LOW.length).tris;
  },
  frame(ctx, t) {
    const lab = (s, x, y, o = {}) => text(ctx, s, x, y, Object.assign({ size: 20, family: F.mono, weight: 500, spacing: 2 }, o));
    if (t < T_LOW + 0.7) {
      let n = 0; while (n < PTS.length && insT(n) <= t) n++;
      const D = delaunay(PTS, Math.max(n, 1)), P = D.P;
      const since = n ? t - insT(n - 1) : 9;
      // the new point's cavity: bad triangles + their circumcircles (only while points arrive slowly)
      const slow = n <= 16 || n === PTS.length;
      if (n > 3 && since < 0.25 && n <= 17) {
        const a = 1 - since / 0.25;
        const old = delaunay(PTS, n - 1), nw = PTS[n - 1];
        const badSet = old.tris.filter(T => (nw[0] - T.x) ** 2 + (nw[1] - T.y) ** 2 < T.r2);
        ctx.fillStyle = g(0.32, a); ctx.beginPath();
        for (const T of badSet) { ctx.moveTo(...PTS[T.a]); ctx.lineTo(...PTS[T.b]); ctx.lineTo(...PTS[T.c]); ctx.closePath(); }
        ctx.fill();
        ctx.strokeStyle = fg(0.9 * a); ctx.lineWidth = 1.6; ctx.setLineDash([6, 6]);
        for (const T of badSet) { ctx.beginPath(); ctx.arc(T.x, T.y, Math.sqrt(T.r2), 0, TAU); ctx.stroke(); }
        ctx.setLineDash([]);
      }
      // mesh
      ctx.strokeStyle = fg(0.95); ctx.lineWidth = n < 30 ? 2.4 : 1.6; ctx.lineJoin = 'round'; ctx.beginPath();
      for (const T of D.tris) { ctx.moveTo(...P[T.a]); ctx.lineTo(...P[T.b]); ctx.lineTo(...P[T.c]); ctx.closePath(); }
      if (n > 1) ctx.stroke();
      // empty-circle reveal + Voronoi dual
      if (t > T_DUAL - 0.5) {
        const ca = ease(E.outCubic, T_DUAL - 0.5, T_DUAL, t) * (1 - ease(E.inOutCubic, T_DUAL + 1.6, T_DUAL + 2.4, t));
        if (ca > 0) {
          ctx.strokeStyle = fg(0.35 * ca); ctx.lineWidth = 1; ctx.beginPath();
          for (const T of D.tris) { const rr = Math.sqrt(T.r2); ctx.moveTo(T.x + rr, T.y); ctx.arc(T.x, T.y, rr, 0, TAU); }
          ctx.stroke();
        }
        const va = ease(E.outCubic, T_DUAL + 1.6, T_DUAL + 2.6, t);
        if (va > 0) {
          const byEdge = new Map();
          for (const T of D.tris) for (const [u, v] of [[T.a, T.b], [T.b, T.c], [T.c, T.a]]) {
            const k = u < v ? u * 4096 + v : v * 4096 + u; (byEdge.get(k) || byEdge.set(k, []).get(k)).push(T);
          }
          ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R + 6, 0, TAU); ctx.clip();
          ctx.strokeStyle = fg(va); ctx.lineWidth = 4; ctx.beginPath();
          for (const [, ts] of byEdge) if (ts.length === 2) { ctx.moveTo(ts[0].x, ts[0].y); ctx.lineTo(ts[1].x, ts[1].y); }
          ctx.stroke(); ctx.restore();
          ctx.fillStyle = fg(va);
          for (const T of D.tris) { ctx.beginPath(); ctx.arc(T.x, T.y, 3.5, 0, TAU); ctx.fill(); }
        }
      }
      // points
      for (let i = 0; i < n; i++) {
        const age = t - insT(i), pop = 1 + 1.4 * Math.exp(-age * 9);
        const r = (n < 30 ? 7 : 4.5) * pop;
        ctx.fillStyle = BG; ctx.beginPath(); ctx.arc(P[i][0], P[i][1], r + 2.5, 0, TAU); ctx.fill();
        ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(P[i][0], P[i][1], r, 0, TAU); ctx.fill();
      }
      const a = ease(E.outCubic, 0.2, 0.7, t);
      lab(`N = ${String(n).padStart(3)}   三角形 = ${String(D.tris.length).padStart(3)}`, 60, 70, { alpha: a });
      const phase = t < 4.15 ? '插入新點 → 挖掉外接圓含點的三角形' : t < T_DUAL ? 'BOWYER–WATSON · 每點 O(n)' : t < T_DUAL + 1.8 ? '空圓性質：外接圓內沒有其他點' : '對偶：外心相連 = 沃羅諾伊';
      lab(phase, 1020, 70, { alpha: a, align: 'right' });
    }
    // payoff — low-poly relief
    if (t >= T_LOW) {
      const ir = ease(E.inOutCubic, T_LOW, T_LOW + 0.8, t);
      ctx.save();
      if (ir < 1) { ctx.beginPath(); ctx.rect(0, 0, SW * ir, SH); ctx.clip(); }
      ctx.fillStyle = K; ctx.fillRect(0, 0, SW, SH);
      const u = t - T_LOW, pts = LOW;
      const Hh = pts.map(([x, y]) => { const r2 = (x - CX) ** 2 + (y - CY) ** 2; return Math.sqrt(Math.max(0, PR * PR - r2)) + 46 * (1 - Math.pow(r2 / (PR * PR), 3)) * noise(x / 160, y / 160 - u * 0.35, 4.2); });
      const la = u * 0.95 - 2.2, el = 0.55 + 0.25 * Math.sin(u * 0.7), L = [Math.cos(la) * Math.cos(el), Math.sin(la) * Math.cos(el), Math.sin(el)];
      const bands = [[], [], [], [], [], [], []];
      for (const T of LOWT) {
        const A = [...pts[T.a], Hh[T.a]], B = [...pts[T.b], Hh[T.b]], C = [...pts[T.c], Hh[T.c]];
        const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const d = clamp((nx * L[0] + ny * L[1] + nz * L[2]) / nl);
        bands[clamp(Math.floor(Math.pow(d, 1.3) * 7), 0, 6)].push(T);
      }
      bands.forEach((ts, b) => {
        const v = 0.07 + 0.93 * b / 6; ctx.fillStyle = g(v); ctx.strokeStyle = g(v); ctx.lineWidth = 1; ctx.beginPath();
        for (const T of ts) { ctx.moveTo(...pts[T.a]); ctx.lineTo(...pts[T.b]); ctx.lineTo(...pts[T.c]); ctx.closePath(); }
        ctx.fill(); ctx.stroke();
      });
      // thin wire on the lit side shows the mesh
      ctx.strokeStyle = 'rgba(11,11,11,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const T of LOWT) { ctx.moveTo(...pts[T.a]); ctx.lineTo(...pts[T.b]); ctx.lineTo(...pts[T.c]); ctx.closePath(); }
      ctx.stroke();
      const D = { tris: LOWT };
      // light direction widget
      const wa = ease(E.outCubic, T_LOW + 0.8, T_LOW + 1.4, t);
            lab(`${pts.length} PTS · ${D.tris.length} TRIS · 7 TONES`, 60, 68, { alpha: wa, color: P });
      ctx.fillStyle = K; ctx.beginPath(); ctx.arc(980, 980, 62, 0, TAU); ctx.fill();
      ctx.strokeStyle = g(1, wa); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(980, 980, 44, 0, TAU); ctx.stroke();
      ctx.fillStyle = g(1, wa); ctx.beginPath(); ctx.arc(980 + Math.cos(la) * 44, 980 + Math.sin(la) * 44, 8, 0, TAU); ctx.fill();
      lab('光', 980, 988, { alpha: wa, align: 'center', family: F.tc, size: 22, color: P });
      ctx.restore();
    }
  },
});
