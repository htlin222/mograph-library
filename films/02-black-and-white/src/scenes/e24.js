/* 24 等角 — isometric column field: wave extrusion, diagonal wave, beat pops, the projection itself, then a rotating city. */
const N = 12, A = 46, S_ = A * 1.2247, OX = 540, OY = 600;
const TAN30 = Math.tan(Math.PI / 6), ZK = 0.8165;
let CITY = null, BEATSET = [];
function proj(x, y, z, cs, sn) {
  const u = x * cs - y * sn, v = x * sn + y * cs;
  return [OX + u * S_, OY + v * S_ * TAN30 - z * S_ * ZK, v];
}
function heights(t) {
  const H = new Float32Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const k = i * N + j, x = i - (N - 1) / 2, y = j - (N - 1) / 2, d = Math.hypot(x, y);
    let h;
    if (t < 4) { const amp = ease(E.inOutCubic, 0.6, 2.2, t); h = 0.12 + amp * 1.6 * (0.5 + 0.5 * Math.sin(d * 0.75 - t * Math.PI)); }
    else if (t < 8) { const m = ease(E.inOutCubic, 4, 4.8, t), wd = 1.6 * (0.5 + 0.5 * Math.sin((i + j) * 0.5 - t * Math.PI)), wr = 1.6 * (0.5 + 0.5 * Math.sin(d * 0.75 - t * Math.PI)); h = 0.12 + lerp(wr, wd, m); }
    else if (t < 12) {
      const m = 1 - ease(E.inOutCubic, 8, 8.6, t); h = 0.12 + m * 1.6 * (0.5 + 0.5 * Math.sin((i + j) * 0.5 - t * Math.PI));
      const b = Math.floor((t - 8) / BEAT);
      for (let q = Math.max(0, b - 3); q <= b; q++) { const u = t - 8 - q * BEAT; if (BEATSET[q] && BEATSET[q].has(k)) h += 2.6 * Math.max(0, spring(u, 300, 14)) * Math.exp(-u * 1.6) + 0; }
    }
    else if (t < 14) { h = lerp(0.12, 0.12, 1); if (i === 8 && j === 3) h = 0.12 + 1.0 * ease(E.outBack, 12.2, 12.8, t); }
    else { const c = CITY[k], g_ = ease(E.outCubic, 14 + (i + j) * 0.03, 15.2 + (i + j) * 0.03, t); h = 0.12 + g_ * c * (0.75 + 0.25 * Math.sin(d * 0.9 - t * 2.4)); }
    H[k] = Math.max(0.05, h);
  }
  return H;
}
const S = M.def({
  id: 'e24', num: 24, ch: 3, title: '等角', en: 'ISOMETRIC', dur: 20, ground: 'dark',
  prompt: '黑底 12×12 等角方柱陣列，頂面白、兩側面深淺灰、黑色描邊。先由中心向外的正弦波升起，再換成斜向波，接著每一拍隨機 12 根柱子用彈簧彈高；第 12 秒停下來畫出 x、y、z 軸與投影公式；最後變成城市天際線並整片旋轉 90°。',
  how: ['投影：X = (x−y)·cos30°，Y = (x+y)·sin30° − z', '依深度 v 由遠到近排序再畫（畫家演算法）', '側面法線朝向觀眾才畫，灰階 = 法線與光的內積'],
  practice: '把每根柱子的高度改成一張灰階圖的亮度。',
  cues: [{ t: 0.05, type: 'riser', t1: 1.5, v: 0.3 }, { t: 4, type: 'whoosh', dur: 1, v: 0.35 }, ...Array.from({ length: 8 }, (_, i) => ({ t: 8 + i * BEAT, type: i % 4 === 0 ? 'kick' : 'pop', v: 0.6 })),
    { t: 12, type: 'tick', v: 0.6 }, { t: 14, type: 'impact', v: 0.6 }, { t: 16, type: 'bell', i: 3, v: 0.4, dec: 4 }],
  init() {
    CITY = new Float32Array(N * N); const r = rng(24);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const n = noise.fbm(i * 0.22 + 3.1, j * 0.22 + 7.7, 0.5, 3), d = Math.hypot(i - 5.5, j - 5.5);
      let h = Math.max(0.15, 0.4 + n * 6 + (2.0 - d * 0.36)); if (r() < 0.1) h += 2.4; CITY[i * N + j] = Math.min(5.2, h);
    }
    BEATSET = Array.from({ length: 9 }, (_, q) => { const rr = rng(400 + q), s = new Set(); while (s.size < 12) s.add(rr.int(0, N * N - 1)); return s; });
  },
  frame(ctx, t) {
    const H = heights(t);
    const yaw = Math.PI / 4 + ease(E.inOutCubic, 15.5, 19.2, t) * Math.PI / 2, cs = Math.cos(yaw), sn = Math.sin(yaw);
    const L = [-0.55, -0.35, 0.76];                 // light direction (x, y) in world for side shading
    // floor diamond
    const fl = [[-6, -6], [6, -6], [6, 6], [-6, 6]].map(([x, y]) => proj(x, y, 0, cs, sn));
    ctx.strokeStyle = fg(0.25); ctx.lineWidth = 1.5; ctx.beginPath(); fl.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
    // columns sorted far → near
    const order = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = i - N / 2 + 0.5, y = j - N / 2 + 0.5; order.push([x * sn + y * cs, i, j]); }
    order.sort((a, b) => a[0] - b[0]);
    const pop = (i, j) => ease(E.outBack, (i + j) * 0.03, (i + j) * 0.03 + 0.4, t);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.4; ctx.strokeStyle = K;
    for (const [, i, j] of order) {
      const k = i * N + j, s = t < 1.2 ? Math.max(0, pop(i, j)) : 1; if (s <= 0) continue;
      const x0 = i - N / 2, y0 = j - N / 2, inset = (1 - s) * 0.5 + 0.04, h = H[k];
      const xa = x0 + inset, xb = x0 + 1 - inset, ya = y0 + inset, yb = y0 + 1 - inset;
      const top = [[xa, ya], [xb, ya], [xb, yb], [xa, yb]];
      // sides: edge from corner c to c+1 with outward normal
      const sides = [[1, 2, 1, 0], [2, 3, 0, 1], [3, 0, -1, 0], [0, 1, 0, -1]];
      for (const [a, b, nx, ny] of sides) {
        const nv = nx * sn + ny * cs; if (nv <= 0.001) continue;
        const lam = clamp(nx * L[0] + ny * L[1], -1, 1);
        const P0 = proj(top[a][0], top[a][1], 0, cs, sn), P1 = proj(top[b][0], top[b][1], 0, cs, sn), P2 = proj(top[b][0], top[b][1], h, cs, sn), P3 = proj(top[a][0], top[a][1], h, cs, sn);
        ctx.fillStyle = g(lerp(0.2, 0.62, 0.5 + 0.5 * lam));
        ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.lineTo(P2[0], P2[1]); ctx.lineTo(P3[0], P3[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      const T = top.map(([x, y]) => proj(x, y, h, cs, sn));
      const hi = t >= 12 && t < 14 && i === 8 && j === 3;
      ctx.fillStyle = P; ctx.beginPath(); T.forEach((p, q) => q ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (hi) { ctx.fillStyle = K; ctx.font = `500 18px ${F.mono}`; ctx.textAlign = 'center'; const c = proj(x0 + 0.5, y0 + 0.5, h, cs, sn); ctx.fillText('1×1×1', c[0], c[1] + 6); ctx.textAlign = 'left'; }
    }
    // projection overlay (12–14 s)
    const ov = ease(E.outCubic, 12, 12.5, t) * (1 - ease(E.inCubic, 13.6, 14, t));
    if (ov > 0) {
      ctx.save(); ctx.globalAlpha = ov;
      const o = proj(-6, -6, 0, cs, sn), ax = [[proj(-1.5, -6, 0, cs, sn), 'x'], [proj(-6, -1.5, 0, cs, sn), 'y'], [proj(-6, -6, 4.5, cs, sn), 'z']];
      ctx.strokeStyle = P; ctx.fillStyle = P; ctx.lineWidth = 3;
      ax.forEach(([p, lab]) => {
        ctx.lineWidth = 9; ctx.strokeStyle = K; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = P; ctx.stroke();
        const an = Math.atan2(p[1] - o[1], p[0] - o[0]);
        ctx.beginPath(); ctx.moveTo(p[0] + 14 * Math.cos(an), p[1] + 14 * Math.sin(an)); ctx.lineTo(p[0] + 14 * Math.cos(an + 2.5), p[1] + 14 * Math.sin(an + 2.5)); ctx.lineTo(p[0] + 14 * Math.cos(an - 2.5), p[1] + 14 * Math.sin(an - 2.5)); ctx.fill();
        const lx = p[0] + 34 * Math.cos(an) + (lab === 'z' ? 18 : 0), ly = p[1] + 34 * Math.sin(an);
        ctx.fillStyle = K; ctx.fillRect(lx - 18, ly - 20, 36, 40); ctx.fillStyle = P;
        text(ctx, lab, lx, ly + 10, { size: 30, family: F.mono, weight: 500, color: P, align: 'center' });
      });
      // 30° arcs
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(o[0], o[1], 70, 0, Math.PI / 6); ctx.stroke(); ctx.beginPath(); ctx.arc(o[0], o[1], 70, Math.PI - Math.PI / 6, Math.PI); ctx.stroke();
      ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(o[0] - 110, o[1]); ctx.lineTo(o[0] + 110, o[1]); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '30°', o[0] + 84, o[1] + 30, { size: 20, family: F.mono, color: P });
      text(ctx, '30°', o[0] - 84, o[1] + 30, { size: 20, family: F.mono, color: P, align: 'right' });
      ctx.restore();
    }
    // labels
    const ph = t < 4 ? 0 : t < 8 ? 1 : t < 12 ? 2 : t < 14 ? 3 : 4;
    const Lb = [['01', 'RADIAL WAVE', 'h = sin(d·0.75 − πt)'], ['02', 'DIAGONAL WAVE', 'h = sin((i+j)·0.5 − πt)'], ['03', 'ON THE BEAT', `每拍 12 根彈高 · 拍 ${Math.min(8, Math.floor((t - 8) / BEAT) + 1)}/8`], ['04', 'PROJECTION', '三軸互成 120°，地面線斜 30°'], ['05', 'CITY · YAW 45° → 135°', '雜訊天際線，整片旋轉']][ph];
    const at = [0, 4, 8, 12, 14][ph], la = ease(E.outCubic, at, at + 0.4, t);
    text(ctx, Lb[0], 48, 72, { size: 22, family: F.mono, weight: 500, alpha: 0.5 * la });
    text(ctx, Lb[1], 92, 72, { size: 22, family: F.mono, weight: 500, spacing: 3, alpha: la });
    text(ctx, Lb[2], 48, 112, { size: 24, family: ph === 2 || ph >= 3 ? F.tc : F.mono, alpha: 0.8 * la });
    // formula readout
    const yd = (yaw * 180 / Math.PI).toFixed(0);
    text(ctx, 'X = (x − y)·cos30°·a', 60, 990, { size: 22, family: F.mono, alpha: 0.75 });
    text(ctx, 'Y = (x + y)·sin30°·a − z·a', 60, 1026, { size: 22, family: F.mono, alpha: 0.75 });
    text(ctx, `a = ${A}px`, 1020, 990, { size: 22, family: F.mono, align: 'right', alpha: 0.75 });
    text(ctx, `yaw = ${yd}°`, 1020, 1026, { size: 22, family: F.mono, align: 'right', alpha: 0.75 });
  },
});
void S;
