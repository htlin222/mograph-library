/* 71 動態設計系統 — motion tokens: three durations, four easings, then a choreographed UI where every
   move is labelled with the token it uses and plotted on a spec timeline. */
const DUR = { fast: 0.15, base: 0.3, slow: 0.6 };
const EZ = { standard: bezierEase(0.2, 0, 0, 1), decelerate: bezierEase(0, 0, 0, 1), accelerate: bezierEase(0.3, 0, 1, 1) };
const EZTXT = { standard: '(.2, 0, 0, 1)', decelerate: '(0, 0, 0, 1)', accelerate: '(.3, 0, 1, 1)', spring: 'k 300 · c 20' };
const anim = (t, t0, d, e) => e === 'spring' ? (t <= t0 ? 0 : spring(t - t0, 300, 20)) : EZ[e](clamp((t - t0) / d));
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); };
function chip(ctx, x, y, s, inv, size = 20) {
  font(ctx, size, F.mono, 500); const w = ctx.measureText(s).width + 28;
  rr(ctx, x, y - size - 6, w, size + 18, (size + 18) / 2);
  if (inv) { ctx.fillStyle = K; ctx.fill(); } else { ctx.strokeStyle = g(0, 0.35); ctx.lineWidth = 1.5; ctx.stroke(); }
  text(ctx, s, x + 14, y + 1, { size, family: F.mono, weight: 500, color: inv ? P : K });
  return w;
}
const TA = [0.3, 2.3, 4.3], TB = [5.9, 7.9, 9.9];
const toggled = (t, Ts, f) => { let v = 0; Ts.forEach((T, i) => { v += (i % 2 ? -1 : 1) * f(T); }); return v; };
// section C choreography
const EV = [
  { k: 'toast', zh: '提示進場', t0: 11.5, d: 'fast', e: 'decelerate' },
  { k: 'cards', zh: '卡片交錯', t0: 11.9, d: 'base', e: 'standard', stagger: 0.05 },
  { k: 'toastOut', zh: '提示離場', t0: 13.4, d: 'fast', e: 'accelerate' },
  { k: 'sheet', zh: '面板上滑', t0: 14.0, d: 'slow', e: 'decelerate' },
  { k: 'press', zh: '按鈕按壓', t0: 15.6, d: 'fast', e: 'spring' },
  { k: 'sheetOut', zh: '面板收起', t0: 16.1, d: 'base', e: 'accelerate' },
  { k: 'done', zh: '完成提示', t0: 16.6, d: 'fast', e: 'decelerate' },
];
const ev = k => EV.find(e => e.k === k);
const A = (t, k, off = 0) => { const e = ev(k); return anim(t, e.t0 + off, DUR[e.d], e.e); };

M.def({
  id: 'e71', num: 71, ch: 9, title: '動態設計系統', en: 'MOTION TOKENS', dur: 20, ground: 'light',
  prompt: '做一頁黑白動態設計規範：先並排三個時長 token（150、300、600ms）跑同一段位移；再並排四個緩動 token（standard、decelerate、accelerate、spring）畫出曲線；最後組一個介面，每個動作旁標出用了哪個 token，下方畫時間軸。',
  how: ['時長 token：fast 0.15s、base 0.3s、slow 0.6s', '緩動 token 用 cubic-bezier 求解，spring 用閉式解', '介面每個動作 = (起點, 時長 token, 緩動 token)'],
  practice: '替「刪除」動作挑 token，寫下理由。',
  cues: [...TA.map(t => ({ t, type: 'tick', v: 0.45 })), ...TB.map(t => ({ t, type: 'tick', v: 0.45 })), ...EV.map(e => ({ t: e.t0, type: e.k === 'press' ? 'pop' : 'tick', v: 0.45 })), { t: 16.6, type: 'bell', i: 4, v: 0.4, dec: 2 }],
  frame(ctx, t) {
    // header
    text(ctx, 'MOTION TOKENS', 60, 76, { size: 22, family: F.mono, weight: 500, spacing: 4 });
    const sec = t < 5.4 ? 0 : t < 10.9 ? 1 : 2, st = [0, 5.4, 10.9][sec];
    const tabs = ['時長 DURATION', '緩動 EASING', '編排 CHOREOGRAPHY'];
    let tx = 1020;
    for (let i = 2; i >= 0; i--) { font(ctx, 20, F.tc); const w = ctx.measureText(tabs[i]).width + 28; tx -= w + 10; const on = i === sec;
      rr(ctx, tx, 46, w, 42, 21); if (on) { ctx.fillStyle = K; ctx.fill(); } else { ctx.strokeStyle = g(0, 0.2); ctx.lineWidth = 1.5; ctx.stroke(); }
      text(ctx, tabs[i], tx + 14, 74, { size: 20, family: F.tc, color: on ? P : K, alpha: on ? 1 : 0.55 }); }
    ctx.fillStyle = g(0, 0.15); ctx.fillRect(60, 112, 960, 1.5);
    const inA = (a, b) => ease(E.outCubic, a, a + 0.4, t) * (1 - ease(E.inCubic, b - 0.35, b, t));
    // ================= A: durations =================
    const aA = inA(-0.4, 5.4);
    if (aA > 0) {
      ctx.save(); ctx.globalAlpha = aA;
      const tx0 = 400, tw = 560;
      Object.entries(DUR).forEach(([name, d], i) => {
        const y = 200 + i * 230;
        chip(ctx, 60, y + 20, `duration.${name}`, true, 22);
        text(ctx, `${d * 1000}ms`, 60, y + 72, { size: 40, family: F.latin, weight: 800 });
        // mover
        const v = toggled(t, TA, T => EZ.standard(clamp((t - T) / d)));
        ctx.fillStyle = g(0, 0.08); rr(ctx, tx0, y - 20, tw, 84, 42); ctx.fill();
        rr(ctx, tx0 + 10 + v * (tw - 84), y - 10, 64, 64, 32); ctx.fillStyle = K; ctx.fill();
        // ms ruler: 0–600, bar = this token's length, playhead = elapsed time since last trigger
        const ry = y + 104, last = TA.filter(T => T <= t).pop() ?? 0, el = clamp(t - last, 0, 0.7);
        ctx.fillStyle = g(0, 0.12); ctx.fillRect(tx0, ry, tw, 10);
        ctx.fillStyle = K; ctx.fillRect(tx0, ry, tw * Math.min(el, d) / 0.6, 10);
        for (let ms = 0; ms <= 600; ms += 150) { ctx.fillStyle = g(0, 0.4); ctx.fillRect(tx0 + tw * ms / 600, ry + 14, 1.5, 8); text(ctx, String(ms), tx0 + tw * ms / 600, ry + 44, { size: 18, family: F.mono, align: 'center', alpha: 0.45 }); }
        if (el >= d) text(ctx, '✓', tx0 + tw * d / 600 + 6, ry - 6, { size: 22, family: F.tc, alpha: 0.8 });
      });
      text(ctx, '規則：移動距離越大、元件越大 → 用越長的 token', 60, 1010, { size: 26, family: F.tc, alpha: 0.65 });
      ctx.restore();
    }
    // ================= B: easings =================
    const aB = inA(5.4, 10.9);
    if (aB > 0) {
      ctx.save(); ctx.globalAlpha = aB;
      const names = ['standard', 'decelerate', 'accelerate', 'spring'], tx0 = 400, tw = 560;
      names.forEach((name, i) => {
        const y = 170 + i * 200, f = x => name === 'spring' ? spring(x * 0.9, 300, 20) : EZ[name](x);
        // curve thumbnail
        const bx = 60, by = y - 30, bs = 110;
        ctx.strokeStyle = g(0, 0.15); ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bs, bs);
        ctx.strokeStyle = K; ctx.lineWidth = 3; ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const x = k / 40, yy = f(x); const X = bx + x * bs, Y = by + bs - yy * bs * 0.85; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
        ctx.stroke();
        const last = TB.filter(T => T <= t).pop() ?? TB[0], u = clamp((t - last) / 0.6), dir = TB.indexOf(last) % 2;
        ctx.fillStyle = K; ctx.beginPath(); ctx.arc(bx + u * bs, by + bs - f(u) * bs * 0.85, 7, 0, TAU); ctx.fill();
        chip(ctx, 196, y + 4, `ease.${name}`, true, 21);
        text(ctx, EZTXT[name], 198, y + 52, { size: 20, family: F.mono, alpha: 0.55 });
        // mover: same 600 ms, different curve
        const v = toggled(t, TB, T => (name === 'spring' ? (t <= T ? 0 : spring(t - T, 300, 20)) : EZ[name](clamp((t - T) / 0.6))));
        ctx.fillStyle = g(0, 0.08); rr(ctx, tx0 + 40, y - 14, tw - 40, 72, 36); ctx.fill();
        rr(ctx, tx0 + 50 + v * (tw - 112), y - 4, 52, 52, 26); ctx.fillStyle = K; ctx.fill();
        void dir;
      });
      text(ctx, '規則：進場 decelerate、離場 accelerate、畫面內位移 standard', 60, 1010, { size: 26, family: F.tc, alpha: 0.65 });
      ctx.restore();
    }
    // ================= C: choreography =================
    const aC = ease(E.outCubic, 10.9, 11.3, t);
    if (aC > 0) {
      ctx.save(); ctx.globalAlpha = aC;
      // the UI
      const ux = 60, uy = 140, uw = 480, uh = 730;
      ctx.save(); rr(ctx, ux, uy, uw, uh, 40); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = g(0, 0.15); ctx.lineWidth = 2; ctx.stroke(); ctx.clip();
      text(ctx, '收件匣', ux + 36, uy + 80, { size: 40, family: F.tcBlack, weight: 900 });
      for (let i = 0; i < 4; i++) {
        const p = A(t, 'cards', i * ev('cards').stagger), y = uy + 120 + i * 130 + (1 - p) * 40;
        ctx.save(); ctx.globalAlpha *= p;
        rr(ctx, ux + 28, y, uw - 56, 110, 22); ctx.fillStyle = g(0, 0.05); ctx.fill();
        ctx.fillStyle = K; ctx.beginPath(); ctx.arc(ux + 82, y + 55, 28, 0, TAU); ctx.fill();
        ctx.fillStyle = g(0, 0.7); rr(ctx, ux + 130, y + 32, 180 - i * 20, 16, 8); ctx.fill();
        ctx.fillStyle = g(0, 0.2); rr(ctx, ux + 130, y + 64, 260 - i * 30, 14, 7); ctx.fill();
        ctx.restore();
      }
      // scrim + bottom sheet
      const sIn = A(t, 'sheet'), sOut = A(t, 'sheetOut'), sp = sIn - sOut;
      if (sp > 0.001) {
        ctx.fillStyle = `rgba(0,0,0,${0.72 * clamp(sp)})`; ctx.fillRect(ux, uy, uw, uh);
        const sy = uy + uh - 380 * sp;
        rr(ctx, ux, sy, uw, 420, 36); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.fillStyle = g(0, 0.2); rr(ctx, ux + uw / 2 - 30, sy + 14, 60, 6, 3); ctx.fill();
        text(ctx, '封存這 4 封信？', ux + 36, sy + 84, { size: 32, family: F.tcBlack, weight: 900 });
        text(ctx, '可以在「封存」裡找回。', ux + 36, sy + 128, { size: 24, family: F.tc, alpha: 0.6 });
        const pr = t > ev('press').t0 ? 1 - 0.06 * Math.exp(-(t - ev('press').t0) * 9) * Math.cos((t - ev('press').t0) * 18) - 0.0 : 1;
        ctx.save(); ctx.translate(ux + uw / 2, sy + 230); ctx.scale(pr, pr);
        rr(ctx, -(uw - 72) / 2, -40, uw - 72, 80, 40); ctx.fillStyle = K; ctx.fill();
        text(ctx, '封存', 0, 10, { size: 30, family: F.tc, align: 'center', color: P });
        ctx.restore();
      }
      // toasts
      const toast = (s, p, inv) => { if (p <= 0.001) return; const y = uy + 24 - (1 - p) * 120; ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); rr(ctx, ux + 24, y, uw - 48, 64, 32); ctx.fillStyle = inv ? K : P; ctx.fill(); text(ctx, s, ux + uw / 2, y + 42, { size: 26, family: F.tc, align: 'center', color: inv ? P : K }); ctx.restore(); };
      toast('已同步 4 封新信', A(t, 'toast') - A(t, 'toastOut'), true);
      toast('已封存 ✓', A(t, 'done'), true);
      ctx.restore();
      // spec list (right)
      const lx = 580;
      text(ctx, '動作', lx, 170, { size: 20, family: F.tc, alpha: 0.5 }); text(ctx, 'TOKEN', 1020, 170, { size: 20, family: F.mono, alpha: 0.5, align: 'right' });
      EV.forEach((e, i) => {
        const y = 222 + i * 92, dd = DUR[e.d], live = t >= e.t0 && t < e.t0 + (e.e === 'spring' ? 0.5 : dd) + (e.stagger ? 3 * e.stagger : 0);
        const seen = t >= e.t0, a = seen ? 1 : 0.3;
        ctx.save(); ctx.globalAlpha *= a;
        if (live) { rr(ctx, lx - 14, y - 40, 454, 82, 18); ctx.fillStyle = K; ctx.fill(); }
        const c = live ? P : K;
        text(ctx, String(i + 1), lx, y - 4, { size: 20, family: F.mono, weight: 500, color: c, alpha: 0.6 });
        text(ctx, e.zh, lx + 30, y - 2, { size: 28, family: F.tc, color: c });
        text(ctx, e.e === 'spring' ? 'spring ≈ 500ms' : `${e.d} ${dd * 1000}ms${e.stagger ? ' +50ms' : ''}`, 1020 - 14, y - 6, { size: 19, family: F.mono, weight: 500, align: 'right', color: c });
        text(ctx, e.e === 'spring' ? 'k 300 · c 20' : e.e, 1020 - 14, y + 22, { size: 19, family: F.mono, align: 'right', color: c, alpha: 0.65 });
        ctx.restore();
      });
      // spec timeline (Gantt)
      const gx = 90, gw = 930, gy = 900, t0 = 11.3, t1 = 17.3, X = tt => gx + gw * (tt - t0) / (t1 - t0);
      ctx.fillStyle = g(0, 0.3); ctx.fillRect(gx, gy + 104, gw, 1.5);
      for (let s = 12; s <= 17; s++) text(ctx, `${s - 11}s`, X(s), gy + 132, { size: 18, family: F.mono, align: 'center', alpha: 0.45 });
      EV.forEach((e, i) => {
        const w = Math.max(10, gw * ((e.e === 'spring' ? 0.5 : DUR[e.d]) + (e.stagger ? 3 * e.stagger : 0)) / (t1 - t0));
        const row = i % 3, y = gy + row * 32;
        ctx.fillStyle = t >= e.t0 ? K : g(0, 0.15); rr(ctx, X(e.t0), y, w, 22, 6); ctx.fill();
        text(ctx, String(i + 1), X(e.t0) - 8, y + 18, { size: 18, family: F.mono, weight: 500, align: 'right', alpha: t >= e.t0 ? 0.8 : 0.35 });
      });
      const ph = clamp(t, t0, t1);
      ctx.fillStyle = K; ctx.fillRect(X(ph) - 1.5, gy - 12, 3, 116);
      ctx.restore();
      if (t > 17.6) text(ctx, '每個動作 = (起點, 時長 token, 緩動 token)', 580, 878, { size: 22, family: F.tc, alpha: 0.6 * ease(E.outCubic, 17.6, 18.2, t) });
    }
  },
});
