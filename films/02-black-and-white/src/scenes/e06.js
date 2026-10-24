/* 06 交錯 — 12×12 bars turn 90° once per bar; only the delay formula changes. Each bar's grey shows
   its delay; a strip below plots every start time. Payoff: a looping ripple. Light ground. */
const N = 12, CELL = 62, GX = (SW - N * CELL) / 2, GY = 196;
const ANIM = 0.6, SPAN = 1.4;
const R7 = rng(606), RAND = [...Array(N * N)].map(() => R7());
const ORDERS = [
  { tc: '由左到右', f: 'delay = col × 70 ms', d: (i, j) => i * 0.07 },
  { tc: '由中心向外', f: 'delay = dist(中心) × 95 ms', d: (i, j) => Math.hypot(i - 5.5, j - 5.5) * 0.095 },
  { tc: '對角線', f: 'delay = (col + row) × 35 ms', d: (i, j) => (i + j) * 0.035 },
  { tc: '隨機', f: 'delay = rand() × 800 ms', d: (i, j) => RAND[j * N + i] * 0.8 },
  { tc: '閱讀順序', f: 'delay = index × 5 ms', d: (i, j) => (j * N + i) * 0.005 },
  { tc: '角度掃描', f: 'delay = angle ÷ 360° × 800 ms', d: (i, j) => (((Math.atan2(j - 5.5, i - 5.5) + Math.PI / 2) / TAU + 1) % 1) * 0.8 },
  { tc: '離某一點的距離', f: 'delay = dist(p) × 60 ms', d: (i, j) => Math.hypot(i - 2, j - 9) * 0.06 },
];
const D = ORDERS.map(o => { const a = new Float32Array(N * N); let mx = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { a[j * N + i] = o.d(i, j); mx = Math.max(mx, a[j * N + i]); } return { a, mx }; });
const PAY = 14, RIP = (i, j) => Math.hypot(i - 5.5, j - 5.5) * 0.2;

M.def({
  id: 'e06', num: 6, ch: 1, title: '交錯', en: 'STAGGER', dur: 20, ground: 'light',
  prompt: '12×12 根短棒，每 2 秒全部轉 90°，動畫本身不變，只換延遲公式：由左到右、中心向外、對角線、隨機、閱讀順序、角度掃描、離一點距離。灰階表示延遲，下方畫出每根的起跑時間。最後變成從中心擴散的循環漣漪。',
  how: ['每根 start = 小節起點 + delay(i, j)，動畫一律 0.6 s', 'delay 只是一個函數：距離、角度、索引、亂數都可以', '漣漪：angle = 90° × ease(fract(t − dist × 200 ms))'],
  practice: '把 delay 改成「離游標的距離」，做滑鼠漣漪。',
  cues: [0, 2, 4, 6, 8, 10, 12].map(t => ({ t, type: 'tick', v: 0.6 })).concat([{ t: 14, type: 'whoosh', dur: 0.5, v: 0.5 }, { t: 16, type: 'bell', i: 1, v: 0.35 }, { t: 18, type: 'bell', i: 3, v: 0.35 }]),

  angle(i, j, t) {
    const k = Math.min(Math.floor(t / 2), ORDERS.length - 1);
    let a = 0;
    for (let q = 0; q <= k; q++) a += E.inOutCubic(clamp((t - q * 2 - D[q].a[j * N + i]) / ANIM));
    if (t >= PAY) {
      const ph = t - PAY - RIP(i, j);
      if (ph > 0) a += Math.floor(ph) + E.inOutCubic(clamp(fract(ph) / ANIM));
    }
    return a * Math.PI / 2;
  },

  frame(ctx, t) {
    const k = Math.min(Math.floor(t / 2), ORDERS.length - 1), O = ORDERS[k], pay = t >= PAY;
    const pa = ease(E.outCubic, PAY, PAY + 0.6, t);
    // header
    const ha = ease(E.outCubic, pay ? PAY : k * 2, (pay ? PAY : k * 2) + 0.35, t);
    text(ctx, pay ? '循環漣漪' : O.tc, 48, 92, { size: 42, family: F.tcBlack, weight: 900, alpha: ha });
    text(ctx, pay ? 'angle = 90° · ease(fract(t − dist × 200 ms))' : O.f, 48, 134, { size: 22, family: F.mono, weight: 500, alpha: 0.75 * ha });
    if (!pay) text(ctx, `${k + 1} / ${ORDERS.length}`, 1032, 92, { size: 22, family: F.mono, align: 'right', alpha: 0.45 });
    // delay field fades in at each bar
    const tone = ease(E.outCubic, k * 2, k * 2 + 0.3, t) * (1 - pa);
    const prev = k > 0 ? D[k - 1] : null;
    // grid
    const breath = pay ? 1 : 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const cx = GX + (i + 0.5) * CELL, cy = GY + (j + 0.5) * CELL;
      const dn = D[k].a[j * N + i] / D[k].mx, dp = prev ? prev.a[j * N + i] / prev.mx : 0;
      const v = lerp(dp * (k > 0 ? 1 : 0), dn, tone) * 0.62 * (1 - pa);
      let len = 50, wid = 10;
      if (breath) { const ph = t - PAY - RIP(i, j); len = lerp(50, 22, pa * (0.5 + 0.5 * Math.cos(TAU * ph / 2))); wid = lerp(10, 14, pa * (0.5 - 0.5 * Math.cos(TAU * ph / 2))); }
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.angle(i, j, t));
      ctx.fillStyle = g(v); ctx.beginPath(); ctx.roundRect(-len / 2, -wid / 2, len, wid, wid / 2); ctx.fill();
      ctx.restore();
    }
    // the point for "distance from p"
    if (k === 6 && !pay) {
      const a = ease(E.outCubic, 12, 12.3, t);
      const px = GX + 2.5 * CELL, py = GY + 9.5 * CELL;
      ctx.strokeStyle = fg(a); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 26, 0, TAU); ctx.stroke();
      text(ctx, 'p', px + 32, py - 24, { size: 24, family: F.mono, weight: 500, alpha: a });
    }
    // start-time strip
    const sx = GX, sw = N * CELL, sy = 1010;
    ctx.save(); ctx.globalAlpha = 1 - pa;
    ctx.fillStyle = fg(0.15); ctx.fillRect(sx, sy, sw, 2);
    const a = D[k].a;
    ctx.fillStyle = fg(0.22);
    for (let q = 0; q < a.length; q++) ctx.fillRect(sx + sw * a[q] / SPAN - 1, sy - 26, 2, 24);
    // animation window of the last element
    ctx.fillStyle = fg(0.5); ctx.fillRect(sx + sw * D[k].mx / SPAN, sy - 4, sw * ANIM / SPAN, 4);
    const ph = clamp(t - k * 2, 0, SPAN);
    ctx.fillStyle = fg(1); ctx.fillRect(sx + sw * ph / SPAN - 1.5, sy - 36, 3, 46);
    text(ctx, '0', sx, sy + 34, { size: 18, family: F.mono, alpha: 0.5 });
    text(ctx, '每根的起跑時間 →', sx + sw / 2, sy + 34, { size: 20, family: F.tc, align: 'center', alpha: 0.55 });
    text(ctx, `${SPAN} s`, sx + sw, sy + 34, { size: 18, family: F.mono, alpha: 0.5, align: 'right' });
    ctx.restore();
  },
});
