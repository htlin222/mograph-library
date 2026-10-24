/* 44 特魯謝磚 — one tile, two orientations, chosen at random; tiles flip on the beat. */
const GX = 100, GY = 120, GS = 880;               // grid square in stage coords
const PHASES = [
  { t0: 0, style: 'diag', N: 12, name: 'A · 對角線磚  ╱ ╲', prob: 0.16 },
  { t0: 4, style: 'arc', N: 12, name: 'B · 四分之一圓弧磚', prob: 0.16 },
  { t0: 8, style: 'arc', N: 20, name: 'B · N = 20', prob: 0.1 },
  { t0: 10, style: 'arc', N: 30, name: 'B · N = 30', prob: 0.08 },
  { t0: 12, style: 'fill', N: 10, name: 'C · 雙色填滿（棋盤奇偶）', prob: 0.12 },
];
const WAVES = [14, 16, 18];                       // payoff: radial flip waves on the bar
const D = 0.36;                                   // flip duration (s)
const hash = (i, j, k) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function tileState(ph, i, j, t) {
  let o = hash(i, j, 999) < 0.5 ? 0 : 1, last = -9, n = 0;
  const kMax = Math.floor(t / BEAT);
  for (let k = Math.ceil((ph.t0 + 0.25) / BEAT); k <= kMax; k++) if (hash(i, j, k) < ph.prob) { const te = k * BEAT; if (te <= t) { n++; last = te; } }
  if (ph.style === 'fill') {
    const d = Math.hypot(i - (ph.N - 1) / 2, j - (ph.N - 1) / 2);
    for (const w of WAVES) { const te = w + d * 0.09; if (te <= t) { n++; if (te > last) last = te; } }
  }
  const p = clamp((t - last) / D);
  return { prev: o ^ ((n - 1) & 1), cur: o ^ (n & 1), p: p < 1 ? E.inOutCubic(p) : 1 };
}
function drawPhase(ctx, ph, t, u) {
  const N = ph.N, s = GS / N, lw = ph.style === 'diag' ? s * 0.13 : Math.max(2, s * 0.11);
  if (ph.style === 'fill') { ctx.fillStyle = K; ctx.fillRect(GX, GY, GS, GS); }
  ctx.lineCap = 'round';
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const st = tileState(ph, i, j, t), cx = GX + (i + 0.5) * s, cy = GY + (j + 0.5) * s;
    // diagonal sweep-in of the phase
    const appear = clamp((u - (i + j) / (2 * N) * 0.5) / 0.3);
    if (appear <= 0) continue;
    ctx.save(); ctx.translate(cx, cy);
    if (ph.style === 'fill') {
      const flip = st.p < 1, o = flip && st.p < 0.5 ? st.prev : st.cur;
      ctx.scale(flip ? Math.max(0.02, Math.abs(Math.cos(Math.PI * st.p))) : 1, 1);
      ctx.scale(appear, appear);
      const band = (i + j + o) & 1, h = s / 2;
      ctx.fillStyle = band ? P : K; ctx.fillRect(-h, -h, 2 * h, 2 * h);
      ctx.fillStyle = band ? K : P; ctx.beginPath();
      const cs = o === 0 ? [[-1, -1, 0], [1, 1, Math.PI]] : [[1, -1, Math.PI / 2], [-1, 1, -Math.PI / 2]];
      for (const [sx, sy, a0] of cs) { ctx.moveTo(sx * s / 2, sy * s / 2); ctx.arc(sx * s / 2, sy * s / 2, s / 2, a0, a0 + Math.PI / 2); ctx.closePath(); }
      ctx.fill();
    } else {
      ctx.rotate((st.p < 1 ? st.p : 0) * Math.PI / 2);
      const o = st.p < 1 ? st.prev : st.cur;
      ctx.scale(appear, appear);
      ctx.strokeStyle = P; ctx.lineWidth = lw; ctx.beginPath();
      const h = s / 2;
      if (ph.style === 'diag') { if (o === 0) { ctx.moveTo(-h, -h); ctx.lineTo(h, h); } else { ctx.moveTo(h, -h); ctx.lineTo(-h, h); } }
      else if (o === 0) { ctx.moveTo(0, -h); ctx.arc(-h, -h, h, 0, Math.PI / 2); ctx.moveTo(0, h); ctx.arc(h, h, h, Math.PI, Math.PI * 1.5); }
      else { ctx.moveTo(0, -h); ctx.arc(h, -h, h, Math.PI, Math.PI / 2, true); ctx.moveTo(0, h); ctx.arc(-h, h, h, 0, -Math.PI / 2, true); }
      ctx.stroke();
      if (st.p < 1 && N <= 12) { ctx.strokeStyle = fg(0.5 * (1 - st.p)); ctx.lineWidth = 2; ctx.strokeRect(-h + 3, -h + 3, s - 6, s - 6); }
    }
    ctx.restore();
  }
}
/* the two orientations as a legend */
function legend(ctx, style, x, y, s, a) {
  ctx.save(); ctx.globalAlpha *= a;
  for (let o = 0; o < 2; o++) {
    const lx = x + o * (s + 16), h = s / 2;
    ctx.save(); ctx.translate(lx + h, y + h);
    if (style === 'fill') {
      ctx.fillStyle = o ? P : K; ctx.fillRect(-h, -h, s, s); ctx.fillStyle = o ? K : P; ctx.beginPath();
      const cs = o === 0 ? [[-1, -1, 0], [1, 1, Math.PI]] : [[1, -1, Math.PI / 2], [-1, 1, -Math.PI / 2]];
      for (const [sx, sy, a0] of cs) { ctx.moveTo(sx * h, sy * h); ctx.arc(sx * h, sy * h, h, a0, a0 + Math.PI / 2); ctx.closePath(); }
      ctx.fill();
    } else {
      ctx.strokeStyle = P; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      if (style === 'diag') { if (o === 0) { ctx.moveTo(-h, -h); ctx.lineTo(h, h); } else { ctx.moveTo(h, -h); ctx.lineTo(-h, h); } }
      else if (o === 0) { ctx.moveTo(0, -h); ctx.arc(-h, -h, h, 0, Math.PI / 2); ctx.moveTo(0, h); ctx.arc(h, h, h, Math.PI, Math.PI * 1.5); }
      else { ctx.moveTo(0, -h); ctx.arc(h, -h, h, Math.PI, Math.PI / 2, true); ctx.moveTo(0, h); ctx.arc(-h, h, h, 0, -Math.PI / 2, true); }
      ctx.stroke();
    }
    ctx.strokeStyle = fg(0.45); ctx.lineWidth = 1.5; ctx.strokeRect(-h, -h, s, s);
    ctx.restore();
  }
  ctx.restore();
}

const S = M.def({
  id: 'e44', num: 44, ch: 6, title: '特魯謝磚', en: 'TRUCHET TILES', dur: 20, ground: 'dark',
  prompt: '只用一塊方磚、兩種方向，隨機擺滿 12×12 格：先是對角線，再換成四分之一圓弧，線自動接成迷宮。每拍隨機翻轉幾塊；最後改成黑白雙色填滿，每小節從中心掀起一波翻轉。',
  how: ['每格 hash(i, j) 決定方向 0 / 1；圓弧在相鄰格邊中點相接', '翻轉 = 旋轉 90°，每拍以機率 p 觸發，0.36 s 緩動', '雙色：底色 = (i + j + 方向) mod 2，保證整片相接'],
  practice: '加入第三種磚：十字線，看迷宮怎麼斷開。',
  cues: [{ t: 4, type: 'whoosh', dur: 0.5 }, { t: 8, type: 'tick' }, { t: 10, type: 'tick' }, { t: 12, type: 'impact', v: 0.6 }, ...WAVES.map(w => ({ t: w, type: 'clap', v: 0.7 }))],
  frame(ctx, t) {
    let k = 0; while (k + 1 < PHASES.length && PHASES[k + 1].t0 <= t) k++;
    const ph = PHASES[k], u = t - ph.t0;
    if (k > 0 && u < 0.8) drawPhase(ctx, PHASES[k - 1], t, 9);
    // new phase sweeps in along the diagonal over the old one
    ctx.save();
    if (k > 0 && u < 0.8) {
      const w = E.inOutCubic(clamp(u / 0.8)) * 2 * GS + 40;
      ctx.beginPath(); ctx.moveTo(GX - 20, GY - 20); ctx.lineTo(GX - 20 + w, GY - 20); ctx.lineTo(GX - 20, GY - 20 + w); ctx.closePath(); ctx.clip();
      ctx.fillStyle = K; ctx.fillRect(GX - 20, GY - 20, GS + 40, GS + 40);
    }
    drawPhase(ctx, ph, t, k === 0 ? u : 9);
    ctx.restore();
    // labels
    const a = ease(E.outCubic, 0.1, 0.6, t);
    text(ctx, ph.name, GX, 82, { size: 24, family: F.tc, alpha: a });
    legend(ctx, ph.style, GX + GS - 2 * 44 - 16, 40, 44, a);
    text(ctx, '兩種方向', GX + GS - 2 * 44 - 32, 70, { size: 18, family: F.tc, alpha: a * 0.6, align: 'right' });
    const nTiles = ph.N * ph.N;
    text(ctx, `${ph.N}×${ph.N} = ${nTiles} 格 · 2^${nTiles} 種排法 · 每拍翻轉機率 p = ${ph.prob.toFixed(2)}`, GX, 1040, { size: 19, family: F.mono, weight: 500, alpha: a * 0.7 });
  },
});
