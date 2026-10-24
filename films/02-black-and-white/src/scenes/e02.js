/* 02 緩動曲線 — six curves race the same distance; then the same curves drive rotation and scale;
   payoff: all six overlaid on one graph with a projection rail. Light ground. */
const LANES = [
  { name: 'linear', f: E.lin, bz: '0, 0, 1, 1' },
  { name: 'inOutSine', f: E.inOutSine, bz: '.37, 0, .63, 1' },
  { name: 'inOutCubic', f: E.inOutCubic, bz: '.65, 0, .35, 1' },
  { name: 'inOutQuint', f: E.inOutQuint, bz: '.83, 0, .17, 1' },
  { name: 'inOutExpo', f: E.inOutExpo, bz: '.87, 0, .13, 1' },
  { name: 'outBack', f: E.outBack, bz: '.34, 1.56, .64, 1' },
];
const MOVE = 1.5;                              // seconds of motion inside each 2-s bar
const LY = 236, LH = 140;                      // first lane centre, lane pitch
const X0 = 236, X1 = 900, CX = 568;            // position track, centre for rotation / scale
const BX = 48, BW = 92;                        // curve thumbnail box

const MODES = [
  { t0: 0, t1: 6, key: 'pos', tc: '位置', sym: 'x = f(t)' },
  { t0: 6, t1: 10, key: 'rot', tc: '旋轉', sym: 'θ = 180° · f(t)' },
  { t0: 10, t1: 14, key: 'scl', tc: '縮放', sym: 's = f(t)' },
];

function curvePath(ctx, f, x, y, w, h, u1 = 1, n = 48) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * u1;
    const px = x + u * w, py = y - f(u) * h;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
}

M.def({
  id: 'e02', num: 2, ch: 1, title: '緩動曲線', en: 'EASING CURVES', dur: 20, ground: 'light',
  prompt: '六顆點在 1.5 秒內跑同樣距離，分別用 linear、sine、cubic、quint、expo、back 緩動；每條跑道左邊即時畫出曲線，每格留一個點顯示間距。接著同組曲線改驅動旋轉、縮放，最後六條疊成一張圖。黑白、等寬字標註。',
  how: ['位置 = lerp(a, b, f(u))，u = 經過時間 ÷ 1.5 s', 'in-out 次方越高，起步越慢、中段越猛；back 會衝過頭', '同一個 f(u) 可接到 x、角度、縮放任何屬性'],
  practice: '用 cubic-bezier 調出一條「先猶豫再衝刺」的曲線。',
  cues: [0, 2, 4, 6, 8, 10, 12].map(t => ({ t, type: 'tick', v: 0.6 }))
    .concat([{ t: 14, type: 'whoosh', dur: 0.6, v: 0.5 }, { t: 16, type: 'bell', i: 0, v: 0.4 }, { t: 18, type: 'bell', i: 2, v: 0.4 }]),

  frame(ctx, t) {
    const out = ease(E.inCubic, 13.5, 13.9, t);        // lanes leave fully before the overlay arrives
    if (t < 13.9) this.lanes(ctx, t, 1 - out);
    if (t > 13.9) this.overlay(ctx, t);
  },

  lanes(ctx, t, A) {
    const k = Math.floor(t / 2), u = clamp((t - k * 2) / MOVE), dir = k % 2 ? -1 : 1;
    const mode = MODES.find(m => t < m.t1) || MODES[2];
    // per-mode fade: a short crossfade at 6 s and 10 s
    const ma = Math.min(ease(E.outCubic, mode.t0, mode.t0 + 0.35, t + (mode.t0 === 0 ? 1 : 0)), 1);
    ctx.save(); ctx.globalAlpha = A;
    // header
    MODES.forEach((m, i) => {
      const on = m === mode, x = 48 + i * 150;
      text(ctx, m.tc, x, 104, { size: 40, family: F.tcBlack, weight: 900, alpha: on ? 1 : 0.18 });
    });
    ctx.fillStyle = fg(1); ctx.fillRect(48 + MODES.indexOf(mode) * 150, 122, 80 * ease(E.outCubic, mode.t0, mode.t0 + 0.4, t + (mode.t0 === 0 ? 1 : 0)), 4);
    text(ctx, mode.sym, 1032, 100, { size: 24, family: F.mono, weight: 500, align: 'right', alpha: ma });
    text(ctx, 'u = (t − t0) / 1.5 s', 1032, 128, { size: 18, family: F.mono, align: 'right', alpha: 0.45 * ma });

    LANES.forEach((L, i) => {
      const cy = LY + i * LH, v = L.f(u);
      const ent = ease(E.outCubic, i * 0.05, 0.4 + i * 0.05, t);
      ctx.save(); ctx.globalAlpha *= ent;
      // separator
      if (i < 5) { ctx.fillStyle = fg(0.08); ctx.fillRect(BX, cy + LH / 2, 1032 - BX, 1); }
      // curve thumbnail
      const by = cy + BW / 2;
      ctx.strokeStyle = fg(0.14); ctx.lineWidth = 1; ctx.strokeRect(BX + .5, cy - BW / 2 + .5, BW, BW);
      ctx.strokeStyle = fg(0.25); ctx.lineWidth = 2; curvePath(ctx, L.f, BX, by, BW, BW); ctx.stroke();
      ctx.strokeStyle = fg(1); ctx.lineWidth = 3; curvePath(ctx, L.f, BX, by, BW, BW, u); ctx.stroke();
      ctx.fillStyle = fg(0.25); ctx.fillRect(BX + u * BW, cy - BW / 2, 1, BW);
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(BX + u * BW, by - v * BW, 5, 0, TAU); ctx.fill();
      // labels
      text(ctx, L.name, X0 - 6, cy - 40, { size: 21, family: F.mono, weight: 500 });
      const read = mode.key === 'pos' ? `cubic-bezier(${L.bz})` : mode.key === 'rot' ? `θ ${(v * 180).toFixed(0).padStart(3, ' ')}°` : `s ${v.toFixed(2)}`;
      text(ctx, read, 1032, cy - 40, { size: 18, family: F.mono, align: 'right', alpha: 0.5 * ma });

      ctx.save(); ctx.globalAlpha *= ma;
      const nF = Math.floor(u * MOVE * FPS + 1e-6);
      if (mode.key === 'pos') {
        const xa = dir > 0 ? X0 : X1, xb = dir > 0 ? X1 : X0;
        ctx.fillStyle = fg(0.14); ctx.fillRect(X0, cy, X1 - X0, 2);
        ctx.fillRect(X0 - 1, cy - 10, 2, 22); ctx.fillRect(X1 - 1, cy - 10, 2, 22);
        // one mark per frame: the spacing *is* the easing
        ctx.fillStyle = fg(0.55);
        for (let f = 0; f <= nF; f++) { const x = lerp(xa, xb, L.f(f / (MOVE * FPS))); ctx.fillRect(x - 1, cy + 14, 2, 12); }
        ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(lerp(xa, xb, v), cy, 20, 0, TAU); ctx.fill();
      } else if (mode.key === 'rot') {
        const base = (k % 2) * Math.PI, len = 116;
        ctx.strokeStyle = fg(0.13); ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let f = 0; f <= nF; f++) { const a = base + Math.PI * L.f(f / (MOVE * FPS)); ctx.moveTo(CX - Math.cos(a) * len / 2, cy - Math.sin(a) * len / 2); ctx.lineTo(CX + Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2); }
        ctx.stroke();
        ctx.save(); ctx.translate(CX, cy); ctx.rotate(base + Math.PI * v);
        ctx.fillStyle = fg(1); ctx.fillRect(-len / 2, -7, len, 14); ctx.restore();
        ctx.fillStyle = bg(1); ctx.beginPath(); ctx.arc(CX, cy, 3, 0, TAU); ctx.fill();
      } else {
        const grow = k % 2 === 1, sz = s => grow ? lerp(14, 104, s) : lerp(104, 14, s);
        ctx.strokeStyle = fg(0.16); ctx.lineWidth = 1;
        ctx.beginPath();
        for (let f = 0; f <= nF; f += 1) { const d = sz(L.f(f / (MOVE * FPS))); ctx.rect(CX - d / 2, cy - d / 2, d, d); }
        ctx.stroke();
        const d = Math.max(2, sz(v)); ctx.fillStyle = fg(1); ctx.fillRect(CX - d / 2, cy - d / 2, d, d);
      }
      ctx.restore();
      ctx.restore();
    });
    // bar clock along the bottom: motion window vs hold
    const by = 1030, bw = 1032 - BX;
    ctx.fillStyle = fg(0.12); ctx.fillRect(BX, by, bw, 2);
    ctx.fillStyle = fg(0.35); ctx.fillRect(BX, by - 6, bw * MOVE / 2, 2);
    ctx.fillStyle = fg(1); ctx.fillRect(BX + bw * (t - k * 2) / 2 - 1.5, by - 14, 3, 24);
    text(ctx, 'MOVE 1.5 s', BX, by - 16, { size: 18, family: F.mono, alpha: 0.5 });
    text(ctx, 'HOLD 0.5 s', BX + bw, by - 16, { size: 18, family: F.mono, alpha: 0.5, align: 'right' });
    ctx.restore();
  },

  overlay(ctx, t) {
    const a = ease(E.outCubic, 13.9, 14.4, t);
    const GX = 150, GW = 600, GY = 930, GH = 560, RX = 900;
    const focus = Math.floor(Math.max(0, t - 14) / 0.5) % 6;
    // run: one per bar, starting on the bar at 16 and 18
    const run = t < 16 ? 0 : Math.floor((t - 16) / 2), u = t < 16 ? 0 : clamp((t - 16 - run * 2) / MOVE);
    ctx.save(); ctx.globalAlpha = a;
    text(ctx, '疊在一起看', 48, 104, { size: 40, family: F.tcBlack, weight: 900 });
    text(ctx, 'y = f(u)', 1032, 100, { size: 24, family: F.mono, weight: 500, align: 'right' });
    // axes + unit lines
    const ax = ease(E.inOutCubic, 14, 14.8, t);
    ctx.fillStyle = fg(1); ctx.fillRect(GX, GY, GW * ax, 2); ctx.fillRect(GX, GY - GH * ax, 2, GH * ax);
    ctx.fillStyle = fg(0.14); ctx.fillRect(GX, GY - GH, GW * ax, 1); ctx.fillRect(GX + GW, GY - GH * ax, 1, GH * ax);
    text(ctx, '0', GX - 14, GY + 30, { size: 20, family: F.mono, alpha: 0.6 });
    text(ctx, '1', GX - 24, GY - GH + 7, { size: 20, family: F.mono, alpha: 0.6 });
    text(ctx, 'u →', GX + GW, GY + 36, { size: 20, family: F.mono, alpha: 0.6, align: 'right' });
    // rail
    ctx.fillStyle = fg(0.2); ctx.fillRect(RX - 1, GY - GH * ax, 2, GH * ax);
    text(ctx, 'OUTPUT', RX, GY + 36, { size: 18, family: F.mono, align: 'center', alpha: 0.5, spacing: 3 });
    // curves draw on, staggered
    LANES.forEach((L, i) => {
      const d = ease(E.inOutCubic, 14.2 + i * 0.12, 15.0 + i * 0.12, t);
      if (d <= 0) return;
      const on = i === focus;
      ctx.strokeStyle = fg(on ? 1 : 0.22); ctx.lineWidth = on ? 5 : 2;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      curvePath(ctx, L.f, GX, GY, GW, GH, d, 90); ctx.stroke();
    });
    // dots on the curves + rail
    const dA = ease(E.outCubic, 15.2, 15.8, t);
    if (dA > 0) {
      ctx.globalAlpha = a * dA;
      LANES.forEach((L, i) => {
        if (i === focus) return;
        const v = L.f(u);
        ctx.fillStyle = fg(0.35);
        ctx.beginPath(); ctx.arc(GX + u * GW, GY - v * GH, 7, 0, TAU); ctx.fill();
        ctx.fillRect(RX - 9, GY - v * GH - 1.5, 18, 3);
      });
      const L = LANES[focus], v = L.f(u), px = GX + u * GW, py = GY - v * GH;
      ctx.setLineDash([4, 6]); ctx.strokeStyle = fg(0.6); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(RX, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(px, py, 13, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(RX, py, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = bg(1); ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill();
      // focus caption (inside the graph, top-left)
      text(ctx, L.name, GX + GW - 24, GY - 76, { size: 30, family: F.mono, weight: 500, align: 'right' });
      text(ctx, `cubic-bezier(${L.bz})`, GX + GW - 24, GY - 42, { size: 18, family: F.mono, alpha: 0.5, align: 'right' });
      // spacing on the output rail: one tick per frame of this run
      ctx.fillStyle = fg(0.7);
      for (let f = 0; f <= Math.floor(u * MOVE * FPS + 1e-6); f++) ctx.fillRect(RX - 34, GY - L.f(f / (MOVE * FPS)) * GH - 1, 14, 2);
      text(ctx, v.toFixed(2), RX + 30, py + 7, { size: 20, family: F.mono, weight: 500 });
    }
    ctx.restore();
  },
});
