/* 65 微互動 — four controls (toggle, like, checkbox, button) driven by spring superposition;
   the spring mode switches (crisp → linear → bouncy) so the difference is felt; payoff: submit button state machine. */
const MODES = [
  { t0: 0, name: '彈簧 SPRING', k: 420, c: 30, read: 'k 420 · c 30 · ζ 0.73' },
  { t0: 6, name: '線性 LINEAR', lin: 0.2, read: 'linear · 200ms' },
  { t0: 10, name: 'Q 彈 BOUNCY', k: 300, c: 11, read: 'k 300 · c 11 · ζ 0.32' },
];
const modeAt = t => MODES[t >= 10 ? 2 : t >= 6 ? 1 : 0];
const resp = (dt, m) => dt <= 0 ? 0 : m.lin ? clamp(dt / m.lin) : spring(dt, m.k, m.c);
/* superposition of step responses: value = v0 + Σ Δv_i · resp(t − t_i) — exact for a linear spring */
const track = (t, keys) => { let v = keys[0][1]; for (let i = 1; i < keys.length; i++) { const [ti, vi, m] = keys[i]; if (t < ti) break; v += (vi - keys[i - 1][1]) * resp(t - ti, m || modeAt(ti)); } return v; };
const CRISP = { k: 520, c: 34 }, POP = { k: 500, c: 14 };

// tap schedule: card i at 0.3 + 0.5 i + 2k (one card per beat, each card once per bar)
const TAPS = [0, 1, 2, 3].map(i => { const a = []; for (let k = 0; k < 7; k++) { const T = 0.3 + 0.5 * i + 2 * k; if (T < 13.5) a.push(T); } return a; });
const toggleKeys = [[0, 0], ...TAPS[0].map((T, j) => [T, (j + 1) % 2])];
const likeKeys = [[0, 0], ...TAPS[1].map((T, j) => [T, (j + 1) % 2])];
const ROWS = ['草圖', '動態', '交付'];
const rowKeys = ROWS.map(() => [[0, 0]]);
TAPS[2].forEach((T, j) => { const ph = j % 4; if (ph < 3) rowKeys[ph].push([T, 1]); else ROWS.forEach((_, r) => rowKeys[r].push([T + r * 0.06, 0])); });
const btnKeys = [[0, 1]]; TAPS[3].forEach(T => { btnKeys.push([T, 0.9, CRISP]); btnKeys.push([T + 0.14, 1]); });

// payoff timeline
const PT = { enter: 14.4, tap: 15.5, shrink: 15.75, load: 16.0, ok: 17.6, grow: 18.3 };

const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); };
function heart(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.92);
  ctx.bezierCurveTo(cx - s * 0.35, cy + s * 0.62, cx - s * 1.12, cy + s * 0.18, cx - s * 1.0, cy - s * 0.42);
  ctx.bezierCurveTo(cx - s * 0.9, cy - s * 0.98, cx - s * 0.18, cy - s * 1.05, cx, cy - s * 0.52);
  ctx.bezierCurveTo(cx + s * 0.18, cy - s * 1.05, cx + s * 0.9, cy - s * 0.98, cx + s * 1.0, cy - s * 0.42);
  ctx.bezierCurveTo(cx + s * 1.12, cy + s * 0.18, cx + s * 0.35, cy + s * 0.62, cx, cy + s * 0.92);
  ctx.closePath();
}
function check(ctx, cx, cy, s, p, lw, col) {          // trim-path checkmark, p 0..1
  if (p <= 0) return;
  const pts = [[-0.42, 0.02], [-0.12, 0.32], [0.46, -0.3]];
  const l1 = Math.hypot(0.3, 0.3), l2 = Math.hypot(0.58, 0.62), L = (l1 + l2) * p;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx + pts[0][0] * s, cy + pts[0][1] * s);
  const a = Math.min(1, L / l1); ctx.lineTo(cx + lerp(pts[0][0], pts[1][0], a) * s, cy + lerp(pts[0][1], pts[1][1], a) * s);
  if (L > l1) { const b = (L - l1) / l2; ctx.lineTo(cx + lerp(pts[1][0], pts[2][0], b) * s, cy + lerp(pts[1][1], pts[2][1], b) * s); }
  ctx.stroke(); ctx.restore();
}
function finger(ctx, x, y, t, T) {                     // touch indicator around a tap at time T
  const d = t - T; if (d < -0.18 || d > 0.4) return;
  const a = d < 0 ? ease(E.outCubic, -0.18, 0, d) : 1 - ease(E.inQuad, 0.1, 0.4, d);
  const s = d < 0 ? lerp(1.5, 1, ease(E.outCubic, -0.18, 0, d)) : 1 + 0.2 * ease(E.outCubic, 0, 0.4, d);
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = g(0, 0.16); ctx.beginPath(); ctx.arc(x, y, 30 * s, 0, TAU); ctx.fill();
  ctx.strokeStyle = g(0, 0.55); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function spark(ctx, x, y, w, h, f, t, lo, hi) {        // plot f over the last 2 s
  ctx.save();
  ctx.strokeStyle = g(0, 0.12); ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(x, y + h - h * (1 - lo) / (hi - lo)); ctx.lineTo(x + w, y + h - h * (1 - lo) / (hi - lo)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = g(0, 0.85); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath();
  const N = 72;
  for (let i = 0; i <= N; i++) { const tt = t - 2 + 2 * i / N; const v = tt < 0 ? f(0) : f(tt); const px = x + w * i / N, py = y + h - h * (v - lo) / (hi - lo); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
  ctx.fillStyle = K; const v = f(t); ctx.beginPath(); ctx.arc(x + w, y + h - h * (v - lo) / (hi - lo), 5, 0, TAU); ctx.fill();
  ctx.restore();
}

const CARD = { w: 476, h: 440, xs: [48, 556], ys: [130, 602] };

M.def({
  id: 'e65', num: 65, ch: 9, title: '微互動', en: 'MICRO-INTERACTIONS', dur: 20, ground: 'light',
  prompt: '做四個黑白 UI 元件：開關、愛心、勾選框、按鈕，每拍點一個。動畫全用彈簧，前 6 秒 ζ 0.73，再換線性 200ms 對照，再換 ζ 0.32；每張卡畫出數值曲線。最後一顆送出鈕：按下、縮成圓轉圈、打勾。',
  how: ['彈簧疊加：值 = Σ Δv·step(t − tᵢ)，切換不會跳', '愛心：填色彈簧放大＋空心環擴散＋12 顆粒', '送出鈕寬度彈簧收成圓，弧線轉圈，打勾用 trim'],
  practice: '把開關改成 ζ 1.0，比較「穩」與「活」。',
  cues: [...TAPS.flatMap((a, i) => a.map(T => ({ t: T, type: i === 1 ? 'pop' : 'tick', v: 0.5 }))),
    { t: 14.0, type: 'whoosh', dur: 0.4, v: 0.5 }, { t: PT.tap, type: 'pop', v: 0.7 }, { t: PT.ok, type: 'bell', i: 4, v: 0.55, dec: 2.5 }],
  frame(ctx, t) {
    const outA = 1 - ease(E.inOutCubic, 13.9, 14.4, t);
    // ---------- segmented control (mode) ----------
    if (outA > 0) {
      ctx.save(); ctx.globalAlpha = outA;
      const sx = 48, sw = 984, sh = 64, sy = 40, seg = sw / 3;
      rr(ctx, sx, sy, sw, sh, 32); ctx.fillStyle = g(0, 0.07); ctx.fill();
      const idx = track(t, [[0, 0], [6, 1, CRISP], [10, 2, CRISP]]);
      rr(ctx, sx + 5 + idx * seg, sy + 5, seg - 10, sh - 10, 27); ctx.fillStyle = K; ctx.fill();
      MODES.forEach((m, i) => {
        const on = clamp(1 - Math.abs(idx - i));
        text(ctx, m.name, sx + seg * i + seg / 2, sy + 42, { size: 26, family: F.tc, align: 'center', color: on > 0.5 ? P : K, alpha: on > 0.5 ? 1 : 0.6 });
      });
      ctx.restore();
    }
    const m = modeAt(t);
    // ---------- four cards ----------
    for (let i = 0; i < 4; i++) {
      const cx0 = CARD.xs[i % 2], cy0 = CARD.ys[i >> 1], w = CARD.w, h = CARD.h;
      const ex = ease(E.inBack, 13.9 + i * 0.07, 14.35 + i * 0.07, t);
      if (ex >= 1) continue;
      ctx.save();
      const ccx = cx0 + w / 2, ccy = cy0 + h / 2;
      ctx.translate(ccx, ccy); ctx.scale(1 - 0.25 * ex, 1 - 0.25 * ex); ctx.translate(-ccx, -ccy);
      ctx.globalAlpha = 1 - ex;
      const intro = spring(t - 0.05 * i, 380, 30);
      ctx.translate(0, (1 - intro) * 40); ctx.globalAlpha *= clamp(intro * 1.5);
      rr(ctx, cx0 - 2, cy0 + 4, w + 4, h + 8, 38); ctx.fillStyle = g(0, 0.035); ctx.fill();
      rr(ctx, cx0, cy0, w, h, 36); ctx.fillStyle = '#ffffff'; ctx.fill();
      rr(ctx, cx0, cy0, w, h, 36); ctx.strokeStyle = g(0, 0.1); ctx.lineWidth = 1.5; ctx.stroke();
      const names = ['01  開關 TOGGLE', '02  按讚 LIKE', '03  勾選 CHECK', '04  按壓 PRESS'];
      text(ctx, names[i], cx0 + 32, cy0 + 52, { size: 20, family: F.mono, weight: 500, alpha: 0.55, spacing: 1 });
      const midY = cy0 + 200, sy = cy0 + h - 108, sw = w - 64;
      let f, lo = 0, hi = 1, tapPt = [ccx, midY];
      if (i === 0) {                                                   // TOGGLE
        f = tt => track(tt, toggleKeys); const v = f(t), vel = (v - f(t - 1 / 120)) * 120;
        const tw = 228, th = 128, tx = ccx - tw / 2, ty = midY - th / 2;
        rr(ctx, tx, ty, tw, th, th / 2); ctx.fillStyle = g(0, 0.1); ctx.fill();
        ctx.save(); ctx.globalAlpha *= clamp(v); rr(ctx, tx, ty, tw, th, th / 2); ctx.fillStyle = K; ctx.fill(); ctx.restore();
        const kr = 54, stretch = Math.min(46, Math.abs(vel) * 9), kx = lerp(tx + 10 + kr, tx + tw - 10 - kr, v);
        rr(ctx, kx - kr - stretch / 2, midY - kr + 3, kr * 2 + stretch, kr * 2, kr); ctx.fillStyle = g(0, 0.12); ctx.fill();
        rr(ctx, kx - kr - stretch / 2, midY - kr, kr * 2 + stretch, kr * 2, kr); ctx.fillStyle = '#ffffff'; ctx.fill();
        lo = -0.15; hi = 1.4; tapPt = [ccx, midY];
        text(ctx, v > 0.5 ? 'ON' : 'OFF', ccx, midY + 116, { size: 22, family: F.mono, weight: 500, align: 'center', alpha: 0.7 });
      } else if (i === 1) {                                            // LIKE
        f = tt => track(tt, likeKeys);
        const v = f(t), hs = 64, hy = midY - 18;   // heart sits a little high so the burst clears the counter
        let lastLike = -9; TAPS[1].forEach((T, j) => { if (j % 2 === 0 && T <= t) lastLike = T; });
        const d = t - lastLike;
        if (d < 0.8) {                                                  // burst: hollowing ring + 12 particles
          const p = E.outCubic(clamp(d / 0.5));
          const lw = 26 * (1 - p); ctx.strokeStyle = K; ctx.lineWidth = Math.max(0.01, lw); if (lw > 0.3) { ctx.beginPath(); ctx.arc(ccx, hy, 40 + 66 * p, 0, TAU); ctx.stroke(); }
          const q = E.outCubic(clamp(d / 0.7));
          for (let k = 0; k < 12; k++) {
            const a = k / 12 * TAU - Math.PI / 2, rad = 82 + 26 * q, r0 = (k % 2 ? 6 : 9) * (1 - q);
            if (r0 > 0.2) { ctx.fillStyle = K; ctx.beginPath(); ctx.arc(ccx + Math.cos(a) * rad, hy + Math.sin(a) * rad, r0, 0, TAU); ctx.fill(); }
          }
        }
        heart(ctx, ccx, hy, hs); ctx.strokeStyle = K; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.stroke();
        const sc = Math.max(0, v);
        if (sc > 0.01) { heart(ctx, ccx, hy, hs * sc); ctx.fillStyle = K; ctx.fill(); }
        // rolling counter 1,284 ↔ 1,285
        const cnt = clamp(v, 0, 1);
        ctx.save(); ctx.beginPath(); ctx.rect(ccx - 80, midY + 88, 160, 40); ctx.clip();
        font(ctx, 26, F.mono, 500);
        const base = '1,28', bw = ctx.measureText(base + '0').width, bx = ccx - bw / 2;
        text(ctx, base, bx, midY + 118, { size: 26, family: F.mono, weight: 500, alpha: 0.7 });
        const dx = bx + ctx.measureText(base).width;
        text(ctx, '4', dx, midY + 118 - cnt * 36, { size: 26, family: F.mono, weight: 500, alpha: 0.7 });
        text(ctx, '5', dx, midY + 154 - cnt * 36, { size: 26, family: F.mono, weight: 500, alpha: 0.7 });
        ctx.restore();
        lo = -0.2; hi = 1.5;
      } else if (i === 2) {                                            // CHECKBOX list
        f = tt => rowKeys.reduce((a, k) => a + track(tt, k), 0) / 3;
        ROWS.forEach((name, r) => {
          const v = track(t, rowKeys[r]), y = cy0 + 100 + r * 78, bx = cx0 + 60, bs = 56;
          rr(ctx, bx, y, bs, bs, 16); ctx.strokeStyle = g(0, 0.35); ctx.lineWidth = 3; ctx.stroke();
          const s = clamp(v, 0, 1.3);
          if (s > 0.01) { ctx.save(); ctx.translate(bx + bs / 2, y + bs / 2); ctx.scale(s, s); rr(ctx, -bs / 2, -bs / 2, bs, bs, 16); ctx.fillStyle = K; ctx.fill(); ctx.restore(); }
          // the check draws on with trim once the box is mostly filled
          let lastOn = -9; rowKeys[r].forEach(([T, val]) => { if (val === 1 && T <= t) lastOn = T; });
          const cp = v > 0.5 ? ease(E.outCubic, lastOn + 0.06, lastOn + 0.3, t) : 0;
          check(ctx, bx + bs / 2, y + bs / 2, bs * 0.78, cp, 6, P);
          const tx = bx + 88, a = 1 - 0.55 * clamp(v);
          text(ctx, name, tx, y + 40, { size: 34, family: F.tc, alpha: a });
          const sw2 = 72 * clamp(v);
          if (sw2 > 1) { ctx.fillStyle = g(0, 0.6); ctx.fillRect(tx - 4, y + 28, sw2, 3); }
        });
        const ph = TAPS[2].filter(T => T <= t + 0.18).length - 1;
        const r = ph < 0 ? 0 : ph % 4;
        tapPt = r < 3 ? [cx0 + 88, cy0 + 128 + r * 78] : [cx0 + 88, cy0 + 206];
        lo = -0.1; hi = 1.3;
      } else {                                                         // BUTTON press + ripple
        f = tt => track(tt, btnKeys);
        const s = f(t), bw = 300, bh = 112;
        ctx.save(); ctx.translate(ccx, midY); ctx.scale(s, s);
        rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fillStyle = K; ctx.fill();
        ctx.save(); rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.clip();
        TAPS[3].forEach((T, j) => {
          const d = t - T; if (d < 0 || d > 0.9) return;
          const r2 = rng(40 + j), px = r2.range(-90, 90), py = r2.range(-20, 20);
          ctx.fillStyle = g(1, 0.32 * (1 - ease(E.inQuad, 0.25, 0.9, d)));
          ctx.beginPath(); ctx.arc(px, py, 20 + 200 * E.outCubic(clamp(d / 0.6)), 0, TAU); ctx.fill();
        });
        ctx.restore();
        text(ctx, '按下 PRESS', 0, 11, { size: 32, family: F.tc, align: 'center', color: P });
        ctx.restore();
        const j = TAPS[3].filter(T => T <= t + 0.18).length - 1, r2 = rng(40 + Math.max(0, j));
        tapPt = [ccx + r2.range(-90, 90), midY + r2.range(-20, 20)];
        text(ctx, `scale ${s.toFixed(3)}`, ccx, midY + 116, { size: 22, family: F.mono, weight: 500, align: 'center', alpha: 0.7 });
        lo = 0.86; hi = 1.04;
      }
      // response trace
      spark(ctx, cx0 + 32, sy, sw, 56, f, t, lo, hi);
      text(ctx, i === 3 || m.lin ? m.read : m.read, cx0 + 32, cy0 + h - 24, { size: 19, family: F.mono, alpha: 0.5 });
      text(ctx, '最近 2 秒', cx0 + w - 32, cy0 + h - 24, { size: 19, family: F.tc, alpha: 0.4, align: 'right' });
      // touch indicator
      const Tn = TAPS[i].find(T => t - T > -0.2 && t - T < 0.45);
      if (Tn !== undefined) finger(ctx, tapPt[0], tapPt[1], t, Tn);
      ctx.restore();
    }
    // ---------- payoff: submit button state machine ----------
    if (t > PT.enter - 0.1) {
      const cx = SW / 2, cy = 480;
      const enter = spring(t - PT.enter, 300, 22);
      const press = track(t, [[0, 1], [PT.tap, 0.94, CRISP], [PT.tap + 0.14, 1, { k: 420, c: 30 }]]);
      const width = track(t, [[0, 620], [PT.shrink, 156, { k: 260, c: 30 }], [PT.grow, 470, { k: 300, c: 24 }]]);
      const okPop = t > PT.ok ? 1 + 0.18 * Math.exp(-(t - PT.ok) * 9) * Math.sin((t - PT.ok) * 26) : 1;
      const bh = 156, s = (0.6 + 0.4 * enter) * press * okPop;
      ctx.save(); ctx.globalAlpha = clamp(enter * 2);
      // burst ring at success
      const d = t - PT.ok;
      if (d > 0 && d < 0.5) { const p = E.outCubic(clamp(d / 0.5)); ctx.strokeStyle = g(0, 1 - p); ctx.lineWidth = 18 * (1 - p); ctx.beginPath(); ctx.arc(cx, cy, 80 + 120 * p, 0, TAU); ctx.stroke(); }
      ctx.translate(cx, cy); ctx.scale(s, s);
      rr(ctx, -width / 2 + 6, -bh / 2 + 16, width - 12, bh, bh / 2); ctx.fillStyle = g(0, 0.08); ctx.fill();
      rr(ctx, -width / 2, -bh / 2, width, bh, bh / 2); ctx.fillStyle = K; ctx.fill();
      // ripple at the press
      if (t > PT.tap && t < PT.tap + 0.7) { ctx.save(); rr(ctx, -width / 2, -bh / 2, width, bh, bh / 2); ctx.clip(); const q = t - PT.tap; ctx.fillStyle = g(1, 0.3 * (1 - q / 0.7)); ctx.beginPath(); ctx.arc(40, 10, 30 + 380 * E.outCubic(q / 0.7), 0, TAU); ctx.fill(); ctx.restore(); }
      const la = 1 - ease(E.outCubic, PT.shrink - 0.05, PT.shrink + 0.1, t);
      if (la > 0) text(ctx, '送出 SUBMIT', 0, 15, { size: 44, family: F.tc, align: 'center', color: P, alpha: la });
      if (t > PT.load - 0.1 && t < PT.ok + 0.1) {                     // spinner
        const q = t - PT.load, a = ease(E.outCubic, -0.1, 0.15, q) * (1 - ease(E.inCubic, PT.ok - PT.load - 0.15, PT.ok - PT.load + 0.05, q));
        const rot = q * 5.2, len = 0.6 + 1.9 * (0.5 - 0.5 * Math.cos(q * 4.4));
        ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = g(1, 0.18); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.stroke();
        ctx.strokeStyle = P; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 44, rot, rot + len); ctx.stroke(); ctx.restore();
      }
      if (t > PT.ok) {
        const ix = lerp(0, -width / 2 + bh / 2, clamp((width - 156) / (470 - 156)));
        check(ctx, ix, 0, 92, ease(E.outCubic, PT.ok, PT.ok + 0.35, t), 11, P);
        const ta = ease(E.outCubic, PT.grow + 0.15, PT.grow + 0.5, t);
        if (ta > 0) text(ctx, '已送出 SENT', ix + 70 + (1 - ta) * 20, 15, { size: 44, family: F.tc, color: P, alpha: ta });
      }
      ctx.restore();
      // a minimal form gives the button context
      const fa = ease(E.outCubic, 14.2, 14.7, t);
      if (fa > 0) {
        ctx.save(); ctx.globalAlpha = fa; const fy = 150 + (1 - fa) * 24;
        text(ctx, '電子報 NEWSLETTER', 230, fy, { size: 22, family: F.mono, weight: 500, alpha: 0.5, spacing: 2 });
        rr(ctx, 230, fy + 24, 620, 96, 24); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = g(0, 0.18); ctx.lineWidth = 2; ctx.stroke();
        const typed = 'you@studio.tw', nC = Math.floor(clamp((t - 14.5) * 18, 0, typed.length));
        text(ctx, typed.slice(0, nC), 262, fy + 84, { size: 34, family: F.mono });
        font(ctx, 34, F.mono); if (t < PT.tap && Math.floor(t * 4) % 2 === 0) { ctx.fillStyle = K; ctx.fillRect(266 + ctx.measureText(typed.slice(0, nC)).width, fy + 50, 3, 44); }
        ctx.restore();
      }
      // state machine chips
      const states = [['閒置', 'IDLE', PT.enter], ['按下', 'PRESSED', PT.tap], ['載入', 'LOADING', PT.load], ['成功', 'SUCCESS', PT.ok]];
      const cur = states.reduce((a, s2, k) => t >= s2[2] ? k : a, 0);
      const chipW = 200, gap = 26, x0 = (SW - (chipW * 4 + gap * 3)) / 2, y0 = 720;
      states.forEach(([zh, en, T], k) => {
        const a = ease(E.outCubic, PT.enter + 0.3 + k * 0.1, PT.enter + 0.8 + k * 0.1, t);
        if (a <= 0) return;
        const x = x0 + k * (chipW + gap), on = k === cur;
        const fillA = on ? ease(E.outCubic, T, T + 0.2, t) : 0;
        ctx.save(); ctx.globalAlpha = a;
        rr(ctx, x, y0 + (1 - a) * 20, chipW, 92, 22); ctx.strokeStyle = g(0, 0.25); ctx.lineWidth = 2; ctx.stroke();
        if (fillA > 0) { ctx.globalAlpha = a * fillA; ctx.fillStyle = K; ctx.fill(); ctx.globalAlpha = a; }
        text(ctx, zh, x + chipW / 2, y0 + 44 + (1 - a) * 20, { size: 30, family: F.tc, align: 'center', color: fillA > 0.5 ? P : K });
        text(ctx, en, x + chipW / 2, y0 + 74 + (1 - a) * 20, { size: 18, family: F.mono, align: 'center', color: fillA > 0.5 ? P : K, alpha: 0.7, spacing: 2 });
        if (k < 3) text(ctx, '→', x + chipW + gap / 2, y0 + 56, { size: 22, family: F.mono, align: 'center', alpha: 0.4 });
        ctx.restore();
      });
      text(ctx, '一個元件，四個狀態，每次轉換都是彈簧', SW / 2, 900, { size: 30, family: F.tc, align: 'center', alpha: 0.6 * ease(E.outCubic, 18.6, 19.2, t) });
      finger(ctx, cx + 40, cy + 10, t, PT.tap);
    }
  },
});
