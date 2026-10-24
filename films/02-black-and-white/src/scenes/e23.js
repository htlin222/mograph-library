/* 23 碎裂 — a square split into Voronoi shards (half-plane clipping), exploded from an impact point, rewound, then a slow-motion burst with 3D flips. */
const CX = 540, CY = 470, SQ = 540;
let SET = [];                                       // [ {seeds, shards} ] for 24 and 90 pieces
function clip(poly, a, b, c) {                      // keep a·x + b·y <= c
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const fp = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
    if (fp <= 0) out.push(p);
    if ((fp < 0) !== (fq < 0) && fp !== fq) { const u = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]); }
  }
  return out;
}
function voronoi(n, seed, ix, iy) {
  const r = rng(seed), h = SQ / 2, seeds = [];
  for (let i = 0; i < n; i++) {
    if (r() < 0.45) seeds.push([clamp(ix + r.gauss() * 90, -h + 2, h - 2), clamp(iy + r.gauss() * 90, -h + 2, h - 2)]);
    else seeds.push([r.range(-h, h), r.range(-h, h)]);
  }
  const shards = seeds.map((s, i) => {
    let poly = [[-h, -h], [h, -h], [h, h], [-h, h]];
    for (let j = 0; j < n && poly.length; j++) if (j !== i) {
      const o = seeds[j], a = o[0] - s[0], b = o[1] - s[1], c = (o[0] * o[0] + o[1] * o[1] - s[0] * s[0] - s[1] * s[1]) / 2;
      poly = clip(poly, a, b, c);
    }
    let cx = 0, cy = 0, A = 0;
    for (let k = 0; k < poly.length; k++) { const p = poly[k], q = poly[(k + 1) % poly.length], cr = p[0] * q[1] - q[0] * p[1]; A += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr; }
    A /= 2; cx /= 6 * A; cy /= 6 * A;
    return { seed: s, c: [cx, cy], poly: poly.map(p => [p[0] - cx, p[1] - cy]), area: Math.abs(A), w: r.range(-1, 1), fl: r.range(1.5, 4) * (r() < 0.5 ? -1 : 1), j: r.range(0.7, 1.3) };
  });
  return { seeds, shards, ix, iy };
}
/* displacement of a shard τ seconds after the hit (decelerating burst + slight drop) */
function burst(sh, set, tau, power) {
  const dx = sh.c[0] - set.ix, dy = sh.c[1] - set.iy, d = Math.hypot(dx, dy) + 1;
  const v = power * sh.j * (0.35 + 260 / (d + 120));
  const k = (1 - Math.exp(-tau * 2.2));
  return { x: dx / d * v * k, y: dy / d * v * k + 40 * tau * tau * 0.25 * sh.j, rot: sh.w * k * 2.2, flip: sh.fl * k };
}
function drawShard(ctx, sh, ox, oy, rot, flip, gap) {
  const cf = Math.cos(flip);
  ctx.save(); ctx.translate(CX + sh.c[0] + ox, CY + sh.c[1] + oy); ctx.rotate(rot); ctx.scale(cf, 1);
  ctx.beginPath(); sh.poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  ctx.fillStyle = cf >= 0 ? K : g(1);
  ctx.fill();
  if (cf < 0) { ctx.setTransform(ctx.getTransform().scale(1 / cf, 1)); ctx.lineWidth = 2; ctx.strokeStyle = K; ctx.stroke(); }
  else if (gap > 0) { ctx.lineWidth = gap / Math.max(0.2, Math.abs(cf)); ctx.strokeStyle = P; ctx.stroke(); }
  ctx.restore();
}
const S = M.def({
  id: 'e23', num: 23, ch: 3, title: '碎裂', en: 'SHATTER', dur: 20, ground: 'light',
  prompt: '白底一塊黑色正方形：先在上面撒 24 個種子點，畫出 Voronoi 裂痕，第 4 秒從左上被擊中，碎片依距離延遲向外飛散、旋轉；第 8 秒倒帶拼回。接著換成 90 片從中心爆開成慢動作，碎片翻面露出白色背面，最後一口氣吸回成完整方塊。',
  how: ['Voronoi：每個種子用所有中垂線半平面裁切正方形', '位移 = 方向 × v·(1 − exp(−2.2τ))，v 隨距離遞減', '翻面用 scaleX(cos φ)；cos < 0 換成白色背面＋黑邊'],
  practice: '用同一套碎片，讓一個字母碎掉再拼回。',
  cues: [{ t: 0.1, type: 'tick', v: 0.4 }, { t: 2, type: 'glitch', v: 0.3 }, { t: 4, type: 'impact', v: 0.8 }, { t: 8, type: 'riser', t1: 10.5, v: 0.4 }, { t: 10.5, type: 'thud', v: 0.7 },
    { t: 12, type: 'impact', v: 0.9 }, { t: 16.5, type: 'riser', t1: 17.8, v: 0.45 }, { t: 17.8, type: 'thud', v: 0.9 }],
  init() { SET = [voronoi(24, 230, -170, -150), voronoi(90, 231, 0, 0)]; },
  frame(ctx, t) {
    const ph = t < 2 ? 0 : t < 4 ? 1 : t < 8 ? 2 : t < 11 ? 3 : t < 16.5 ? 4 : 5;
    const set = ph < 4 ? SET[0] : SET[1];
    const h = SQ / 2;
    // shadow/plinth line
    ctx.fillStyle = fg(0.12); ctx.fillRect(CX - h, CY + h + 40, SQ, 2);
    if (ph <= 1) {
      ctx.fillStyle = K; ctx.fillRect(CX - h, CY - h, SQ, SQ);
      // seeds pop in
      set.seeds.forEach((s, i) => {
        const a = ease(E.outBack, i * 0.06, i * 0.06 + 0.3, t), rr = 6 * Math.max(0, a);
        ctx.fillStyle = P; ctx.beginPath(); ctx.arc(CX + s[0], CY + s[1], rr, 0, TAU); ctx.fill();
      });
      if (ph === 1) {
        // cracks: each cell outline draws on, staggered by distance from the impact
        ctx.strokeStyle = P; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        set.shards.forEach(sh => {
          const d = Math.hypot(sh.c[0] - set.ix, sh.c[1] - set.iy), p = ease(E.outCubic, 2 + d * 0.0022, 2.9 + d * 0.0022, t);
          if (p <= 0) return;
          ctx.save(); ctx.translate(CX + sh.c[0], CY + sh.c[1]); ctx.beginPath();
          sh.poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
          ctx.setLineDash([2000 * p, 2000]); ctx.stroke(); ctx.restore();
        });
        ctx.setLineDash([]);
      }
    } else {
      let tau = 0, power = 115, gap = 3;              // 24-piece break: keep the far shards inside the stage
      for (const sh of set.shards) {
        const d = Math.hypot(sh.c[0] - set.ix, sh.c[1] - set.iy);
        if (ph === 2) tau = Math.max(0, t - 4 - d * 0.0012);
        else if (ph === 3) { const tt = Math.max(0, 4 - d * 0.0012); tau = tt * (1 - ease(E.inOutCubic, 8 + (1 - d / 600) * 0.6, 10.5, t)); gap = 3 * (1 - ease(E.inCubic, 10.3, 10.6, t)); }
        else if (ph === 4) { power = 150; tau = Math.max(0, t - 12 - d * 0.0009); const slow = tau > 0.5 ? 0.5 + (tau - 0.5) * 0.25 : tau; tau = slow; gap = t < 12 ? 2 * ease(E.outCubic, 11, 11.8, t) : 2; }
        else { power = 150; const tt = Math.max(0, 16.5 - 12 - d * 0.0009); const t0 = tt > 0.5 ? 0.5 + (tt - 0.5) * 0.25 : tt; tau = t0 * (1 - ease(E.inOutExpo, 16.5 + d * 0.0006, 17.8, t)); gap = 2 * (1 - ease(E.inCubic, 17.6, 17.85, t)); }
        if (ph === 3 && t > 10.6) gap = 0;
        if (ph === 5 && t > 17.85) gap = 0;
        const b = burst(sh, set, tau, power);
        drawShard(ctx, sh, b.x, b.y, b.rot, ph >= 4 ? b.flip * 0.55 : b.flip * 0.4, gap);
      }
      // impact rings
      const hitT = ph === 2 ? 4 : ph === 4 ? 12 : -9;
      for (let k = 0; k < 3; k++) {
        const u = t - hitT - k * 0.12; if (u < 0 || u > 0.8) continue;
        ctx.strokeStyle = fg(1 - u / 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(CX + set.ix, CY + set.iy, 20 + u * 520, 0, TAU); ctx.stroke();
      }
      // landing shake / final seams
      if (ph === 5 && t > 17.8) {
        const a = 1 - ease(E.outCubic, 17.8, 19.8, t);
        ctx.strokeStyle = g(1, 0.5 * a); ctx.lineWidth = 1.2;
        set.shards.forEach(sh => { ctx.beginPath(); sh.poly.forEach((q, i) => i ? ctx.lineTo(CX + sh.c[0] + q[0], CY + sh.c[1] + q[1]) : ctx.moveTo(CX + sh.c[0] + q[0], CY + sh.c[1] + q[1])); ctx.closePath(); ctx.stroke(); });
      }
    }
    // labels
    const L = [['01', 'SEEDS', '撒 24 個種子（45% 集中在撞擊點）'], ['02', 'VORONOI', '中垂線裁切 → 24 片'], ['03', 'BREAK', '依距離延遲 · 速度 ∝ 1/d'], ['04', 'REWIND', '同一條軌跡倒著播'], ['05', 'BULLET TIME', '90 片 · 0.5 s 後時間變慢 4 倍'], ['06', 'IMPLODE', 'inOutExpo 一口氣吸回']][ph];
    const at = [0, 2, 4, 8, 11, 16.5][ph], la = ease(E.outCubic, at, at + 0.4, t);
    ctx.fillStyle = bg(0.9); ctx.fillRect(40, 44, 420, 80);
    text(ctx, L[0], 48, 72, { size: 22, family: F.mono, weight: 500, alpha: 0.5 * la });
    text(ctx, L[1], 92, 72, { size: 22, family: F.mono, weight: 500, spacing: 3, alpha: la });
    text(ctx, L[2], 48, 112, { size: 26, family: F.tc, alpha: 0.8 * la });
    // readout
    const n = set.shards.length;
    text(ctx, `shards ${n}   impact (${set.ix}, ${set.iy})   ${ph >= 4 ? 'flip φ → scaleX(cos φ)' : 'gap 3 px'}`, 540, 1036, { size: 21, family: F.mono, align: 'center', alpha: 0.7 });
  },
});
void S;
