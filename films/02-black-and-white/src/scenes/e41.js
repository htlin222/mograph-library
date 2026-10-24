/* 41 沃羅諾伊 — nearest-seed cells by half-plane clipping, Lloyd relaxation, then an inset-ring payoff. */
const BX0 = 100, BY0 = 120, BX1 = 980, BY1 = 1000, BCX = (BX0 + BX1) / 2, BCY = (BY0 + BY1) / 2;
const RECT = [[BX0, BY0], [BX1, BY0], [BX1, BY1], [BX0, BY1]];
/* keep the part of convex polygon `poly` where a·x + b·y ≤ c (Sutherland–Hodgman, one plane) */
function clipHalf(poly, a, b, c) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    const dp = a * p[0] + b * p[1] - c, dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const u = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]); }
  }
  return out;
}
/* Voronoi cell of every seed: start from the box, cut by each perpendicular bisector */
function cells(S, reach = Infinity) {
  const n = S.length, out = new Array(n), r2 = reach * reach;
  for (let i = 0; i < n; i++) {
    const [xi, yi] = S[i]; let poly = RECT;
    for (let j = 0; j < n && poly.length; j++) {
      if (j === i) continue;
      const [xj, yj] = S[j], dx = xj - xi, dy = yj - yi;
      if (dx * dx + dy * dy > r2) continue;
      poly = clipHalf(poly, dx, dy, (xj * xj + yj * yj - xi * xi - yi * yi) / 2);
    }
    out[i] = poly;
  }
  return out;
}
function centroid(poly) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n], c = x0 * y1 - x1 * y0;
    A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  if (Math.abs(A) < 1e-6) return poly[0] ? [poly[0][0], poly[0][1]] : [BCX, BCY];
  return [cx / (3 * A), cy / (3 * A)];
}
const lloyd = S => cells(S).map(centroid);
const pathPoly = (ctx, poly) => { ctx.moveTo(poly[0][0], poly[0][1]); for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k][0], poly[k][1]); ctx.closePath(); };

const N1 = 34, N3 = 230, T_LLOYD = 6, STEP = 0.5, ITERS = 13, T_PAY = 13;
const r0 = rng(4101), BASE = Array.from({ length: N1 }, () => [r0.range(BX0 + 40, BX1 - 40), r0.range(BY0 + 40, BY1 - 40), r0() * 100]);
/* phase A: seeds drift on a smooth noise path (pure function of t) */
function seedsAt(t) {
  return BASE.map(([x, y, k]) => [
    clamp(x + 70 * noise(k, t * 0.22, 1.3) * 2, BX0 + 14, BX1 - 14),
    clamp(y + 70 * noise(k, t * 0.22, 7.9) * 2, BY0 + 14, BY1 - 14)]);
}
let L = [], PAY = [];

const S = M.def({
  id: 'e41', num: 41, ch: 6, title: '沃羅諾伊', en: 'VORONOI DIAGRAM', dur: 20, ground: 'light',
  prompt: '撒 34 顆種子，畫面每一點歸給最近的種子，切出沃羅諾伊細胞。種子先隨雜訊漂移，再每一拍做一次 Lloyd 鬆弛、走向重心；最後 230 格細胞以同心內縮線波動，黑白版畫感。',
  how: ['每格從方框開始，被所有中垂線半平面裁切', 'Lloyd 鬆弛：種子移到細胞重心，13 次趨於均勻', '收尾 230 格，以內縮環數畫出波紋般的密度'],
  practice: '改用曼哈頓距離 |dx|+|dy|，細胞會長成什麼樣？',
  cues: [...Array.from({ length: ITERS }, (_, i) => ({ t: T_LLOYD + i * STEP, type: 'tick', v: 0.5 })), { t: T_PAY, type: 'whoosh', dur: 0.8 }, { t: 16, type: 'bell', i: 2 }],
  init() {
    L = [seedsAt(T_LLOYD)];
    for (let k = 0; k < ITERS; k++) L.push(lloyd(L[k]));
    const r = rng(4142); let P3 = Array.from({ length: N3 }, () => [r.range(BX0, BX1), r.range(BY0, BY1)]);
    for (let k = 0; k < 28; k++) P3 = lloyd(P3);
    PAY = P3;
  },
  frame(ctx, t) {
    const lab = (s, x, y, o = {}) => text(ctx, s, x, y, Object.assign({ size: 20, family: F.mono, weight: 500, spacing: 2 }, o));
    if (t < T_PAY + 0.6) {
      let seeds, cent = null, k = 0, f = 0;
      if (t < T_LLOYD) seeds = seedsAt(t);
      else {
        k = Math.min(ITERS - 1, Math.floor((t - T_LLOYD) / STEP));
        f = ease(E.outCubic, 0, 0.32, t - T_LLOYD - k * STEP);
        seeds = L[k].map((p, i) => [lerp(p[0], L[k + 1][i][0], f), lerp(p[1], L[k + 1][i][1], f)]);
        cent = L[k + 1];
      }
      const C = cells(seeds);
      // probe: which seed is nearest? (0.6–6 s)
      const pa = ease(E.outCubic, 1.0, 1.6, t) * (1 - ease(E.inCubic, 5.4, 6.0, t));
      if (pa > 0) {
        const px = BCX + 300 * Math.sin(t * 0.9), py = BCY + 260 * Math.sin(t * 1.37 + 1);
        const order = seeds.map((s, i) => [Math.hypot(s[0] - px, s[1] - py), i]).sort((a, b) => a[0] - b[0]);
        const near = order[0][1];
        ctx.fillStyle = g(0.78, pa); ctx.beginPath(); pathPoly(ctx, C[near]); ctx.fill();
        ctx.save(); ctx.globalAlpha = pa; ctx.strokeStyle = K; ctx.lineWidth = 2;
        for (let q = 1; q < 3; q++) { const s = seeds[order[q][1]]; ctx.setLineDash([4, 7]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(s[0], s[1]); ctx.stroke(); }
        ctx.setLineDash([]); ctx.lineWidth = 3; const s0 = seeds[near]; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(s0[0], s0[1]); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px - 14, py); ctx.lineTo(px + 14, py); ctx.moveTo(px, py - 14); ctx.lineTo(px, py + 14); ctx.stroke();
        ctx.fillStyle = P; ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
        lab(`d = ${order[0][0].toFixed(0).padStart(3)} px  最近`, BX0, 1048, { alpha: pa });
      }
      // cell edges (draw-on during the first second)
      const grow = ease(E.outCubic, 0, 1.2, t);
      ctx.strokeStyle = K; ctx.lineJoin = 'round'; ctx.lineWidth = 2.6;
      ctx.beginPath();
      C.forEach((poly, i) => {
        if (!poly.length) return;
        if (grow < 1) { const c = seeds[i]; ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(grow, grow); ctx.translate(-c[0], -c[1]); pathPoly(ctx, poly); ctx.restore(); }
        else pathPoly(ctx, poly);
      });
      ctx.stroke();
      // Lloyd: arrow seed → centroid
      if (cent) {
        const la = ease(E.outCubic, T_LLOYD, T_LLOYD + 0.4, t);
        let disp = 0;
        ctx.save(); ctx.globalAlpha = la; ctx.lineWidth = 1.6;
        seeds.forEach((s, i) => {
          const c = centroid(C[i]); disp += Math.hypot(c[0] - s[0], c[1] - s[1]);
          ctx.beginPath(); ctx.arc(c[0], c[1], 7, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
        });
        ctx.restore();
        disp /= seeds.length;
        lab(`LLOYD 鬆弛  i = ${String(k + 1).padStart(2, '0')} / ${ITERS}`, BX0, 80, { alpha: la });
        lab(`平均位移 Δ = ${disp.toFixed(1).padStart(5)} px`, BX1, 80, { alpha: la, align: 'right' });
        lab('●  種子      ○  重心', BX0, 1048, { alpha: la * 0.7 });
      } else {
        const a = ease(E.outCubic, 0.2, 0.8, t);
        lab(`SEEDS ${N1}  ·  每一點歸給最近的種子`, BX0, 80, { alpha: a });
      }
      ctx.fillStyle = K;
      seeds.forEach(s => { ctx.beginPath(); ctx.arc(s[0], s[1], 6.5, 0, TAU); ctx.fill(); });
    }
    // payoff: relaxed 230-cell field, each cell drawn as inset rings whose count rides a travelling wave
    if (t >= T_PAY) {
      const ir = ease(E.inOutCubic, T_PAY, T_PAY + 1.0, t) * 1000;
      ctx.save();
      if (ir < 999) { ctx.beginPath(); ctx.arc(BCX, BCY, ir, 0, TAU); ctx.clip(); }
      ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH);
      const u = t - T_PAY, sw = 0.05 * u;
      const seeds = PAY.map(([x, y]) => {
        const dx = x - BCX, dy = y - BCY, r = Math.hypot(dx, dy), a = sw * Math.max(0, 1 - r / 520) * Math.sin(u * 0.6);
        return [clamp(BCX + dx * Math.cos(a) - dy * Math.sin(a), BX0 + 6, BX1 - 6), clamp(BCY + dx * Math.sin(a) + dy * Math.cos(a), BY0 + 6, BY1 - 6)];
      });
      const C = cells(seeds, 260);
      ctx.strokeStyle = K; ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2; ctx.beginPath(); C.forEach(p => p.length && pathPoly(ctx, p)); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath();
      const fill = [];
      C.forEach((poly, i) => {
        if (!poly.length) return;
        const c = centroid(poly), d = Math.hypot(c[0] - BCX, c[1] - BCY);
        const w = 0.5 + 0.5 * Math.sin(d / 70 - u * 3.2 + Math.atan2(c[1] - BCY, c[0] - BCX) * 2);
        const rings = Math.round(w * 5);
        for (let q = 1; q <= rings; q++) {
          const sc = 1 - q * 0.16; ctx.moveTo(c[0] + (poly[0][0] - c[0]) * sc, c[1] + (poly[0][1] - c[1]) * sc);
          for (let m = 1; m < poly.length; m++) ctx.lineTo(c[0] + (poly[m][0] - c[0]) * sc, c[1] + (poly[m][1] - c[1]) * sc);
          ctx.closePath();
        }
        if (rings >= 5) fill.push([poly, c]);
      });
      ctx.stroke();
      ctx.fillStyle = K; ctx.beginPath();
      fill.forEach(([poly, c]) => { const sc = 0.12; ctx.moveTo(c[0] + (poly[0][0] - c[0]) * sc, c[1] + (poly[0][1] - c[1]) * sc); for (let m = 1; m < poly.length; m++) ctx.lineTo(c[0] + (poly[m][0] - c[0]) * sc, c[1] + (poly[m][1] - c[1]) * sc); ctx.closePath(); });
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeRect(BX0, BY0, BX1 - BX0, BY1 - BY0);
      const a = ease(E.outCubic, T_PAY + 0.8, T_PAY + 1.4, t);
      lab(`${N3} CELLS · LLOYD ×28`, BX0, 80, { alpha: a });
      lab('內縮環數 = 波紋密度', BX1, 80, { alpha: a, align: 'right' });
      lab('ring k: scale 1 − 0.16k toward centroid', BX0, 1048, { alpha: a * 0.7, size: 18 });
      ctx.restore();
    }
  },
});
