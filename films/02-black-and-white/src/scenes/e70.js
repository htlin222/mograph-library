/* 70 捲動敘事 — a phone page scrolled by flicks. Every element is a function of scrollY:
   parallax hero, a sticky (pinned) morph, a pinned horizontal track, counters on enter, an END reveal,
   iOS rubber-band at the bottom. A minimap on the right shows the whole document and the viewport. */
const SCR = { x: 74, y: 54, w: 512, h: 972, r: 50 };
const VH = SCR.h;
const BLOCKS = [
  { id: 'hero', zh: '開場', en: 'HERO', h: 972, pin: 0 },
  { id: 'sticky', zh: '釘住', en: 'STICKY', h: 972, pin: 1300 },
  { id: 'horiz', zh: '橫向', en: 'H-SCROLL', h: 972, pin: 900 },
  { id: 'count', zh: '計數', en: 'COUNT', h: 760, pin: 0 },
  { id: 'end', zh: '結尾', en: 'END', h: 972, pin: 0 },
];
{ let s = 0; for (const b of BLOCKS) { b.s = s; s += b.h + b.pin; } }
const DOC = BLOCKS.at(-1).s + BLOCKS.at(-1).h, MAXY = DOC - VH;
const FLICKS = [[0.4, 1.6, 700], [2.0, 3.3, 1400], [3.7, 5.0, 1900], [5.4, 6.8, 2400], [7.2, 8.4, 3244], [8.6, 11.6, 4144, 'sine'], [12.0, 13.3, 4760], [13.7, 15.0, 5300], [15.4, 16.5, MAXY]];
function scrollY(t) {
  let y = 0;
  for (const [a, b, to, kind] of FLICKS) { if (t < a) break; const p = clamp((t - a) / (b - a)); y = lerp(y, to, kind === 'sine' ? E.inOutSine(p) : E.outQuart(p)); if (t < b) return y; y = to; }
  return y;
}
// rubber band: arriving with momentum overshoots past the end, then springs back
const BAND_T = 16.25;
const overscroll = t => t < BAND_T ? 0 : 420 * Math.exp(-(t - BAND_T) * 6.5) * Math.sin((t - BAND_T) * 7.5);
const blockTop = (b, Y) => b.s - Y + clamp(Y - b.s, 0, b.pin);          // viewport y of a block's top (pinned while inside its pin range)
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); };
const STATS = [['72', '段落'], ['1,440', '秒'], ['43,200', '格']];

M.def({
  id: 'e70', num: 70, ch: 9, title: '捲動敘事', en: 'SCROLL-DRIVEN STORY', dur: 20, ground: 'dark',
  prompt: '黑白手機長頁面，用幾次慣性滑動往下捲：開場大標題視差縮小、釘住的圖形隨捲動進度從圓變方、一段垂直捲動推動橫向卡片、數字進畫面才開始跳、結尾字母逐一升起，到底時 iOS 回彈。右側畫整頁縮圖與視窗框。',
  how: ['一切都是 scrollY 的函數；滑動用 outQuart 模擬慣性', '釘住：區塊頂 = 起點 − scrollY + clamp(scrollY − 起點, 0, 釘長)', '橫向位移 = 釘住進度 × (軌道寬 − 螢幕寬)'],
  practice: '加一個隨進度改變粗細的標題，0→1 對應 100→900。',
  cues: [...FLICKS.map(([a]) => ({ t: a, type: 'whoosh', dur: 0.35, v: 0.35 })), { t: BAND_T + 0.2, type: 'thud', v: 0.5 }, { t: 17.2, type: 'bell', i: 2, v: 0.4, dec: 2.5 }],
  frame(ctx, t) {
    const Y = scrollY(t) + overscroll(t), prog = clamp(Y / MAXY);
    const intro = spring(t + 0.05, 220, 26);
    // ---------- phone ----------
    ctx.save(); ctx.translate(0, (1 - intro) * 50); ctx.globalAlpha = clamp(intro * 1.3);
    ctx.beginPath(); ctx.roundRect(SCR.x - 14, SCR.y - 14, SCR.w + 28, SCR.h + 28, SCR.r + 14); ctx.strokeStyle = fg(0.4); ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(SCR.x, SCR.y, SCR.w, SCR.h, SCR.r); ctx.clip();
    ctx.fillStyle = g(0.13); ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);           // what shows through when over-scrolled
    ctx.translate(SCR.x, SCR.y);
    const W_ = SCR.w;
    for (const b of BLOCKS) {
      const top = blockTop(b, Y);
      if (top > VH || top + b.h < 0) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(0, top, W_, b.h); ctx.clip();
      if (b.id === 'hero') {
        ctx.fillStyle = K; ctx.fillRect(0, top, W_, b.h);
        const k = clamp(Y / 700), sc = 1 - 0.35 * k;
        ctx.save(); ctx.translate(W_ / 2, top + 430 + Y * 0.5); ctx.scale(sc, sc); ctx.globalAlpha *= 1 - k * 0.85;
        text(ctx, '捲動', 0, 0, { size: 190, family: F.tcBlack, weight: 900, align: 'center', color: P });
        text(ctx, 'SCROLL STORY', 0, 70, { size: 30, family: F.mono, weight: 500, align: 'center', color: P, spacing: 10 });
        ctx.restore();
        text(ctx, '視差 0.5×', 40, top + 120, { size: 22, family: F.mono, color: P, alpha: 0.5 });
        const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 14;
        text(ctx, '↓', W_ / 2, top + 860 + bob, { size: 44, family: F.mono, align: 'center', color: P, alpha: 1 - k });
      } else if (b.id === 'sticky') {
        ctx.fillStyle = P; ctx.fillRect(0, top, W_, b.h);
        const q = clamp((Y - b.s) / b.pin);
        // text cards scroll normally (document flow) and slide under the pinned panel
        const notes = [['01 釘住', '上方面板停住，文字照常捲過。'], ['02 進度連動', '圓角、旋轉、填滿都等於 q。'], ['03 解除釘住', 'q 到 1，整段跟著頁面離開。']];
        notes.forEach(([h, d], i) => {
          const cardY = b.s + 900 + i * 430 - Y;
          ctx.fillStyle = K; rr(ctx, 36, cardY, W_ - 72, 170, 24); ctx.fill();
          text(ctx, h, 64, cardY + 64, { size: 32, family: F.tcBlack, weight: 900, color: P });
          text(ctx, d, 64, cardY + 118, { size: 24, family: F.tc, color: P, alpha: 0.75 });
        });
        // pinned panel: circle → rotated square, outline → solid, all driven by q
        ctx.fillStyle = P; ctx.fillRect(0, top, W_, 520); ctx.fillStyle = g(0, 0.25); ctx.fillRect(36, top + 518, W_ - 72, 2);
        const cx = W_ / 2, cy = top + 290, sz = 105 + 15 * q, rad = lerp(sz, 16, E.inOutCubic(q));
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(E.inOutCubic(q) * Math.PI / 4);
        rr(ctx, -sz, -sz, sz * 2, sz * 2, rad); ctx.lineWidth = 10; ctx.strokeStyle = K; ctx.stroke();
        ctx.clip(); ctx.fillStyle = K; ctx.fillRect(-sz, sz - 2 * sz * q, 2 * sz, 2 * sz * q);
        ctx.restore();
        text(ctx, `q = ${q.toFixed(2)}`, cx, top + 480, { size: 28, family: F.mono, weight: 500, align: 'center', color: K });
        text(ctx, 'STICKY', 40, top + 120, { size: 20, family: F.mono, weight: 500, color: K, alpha: 0.5, spacing: 3 });
      } else if (b.id === 'horiz') {
        ctx.fillStyle = K; ctx.fillRect(0, top, W_, b.h);
        const h = clamp((Y - b.s) / b.pin), pw = 380, gap = 24, trackW = 4 * pw + 3 * gap + 80;
        text(ctx, '橫向 H-SCROLL', 40, top + 120, { size: 30, family: F.tcBlack, weight: 900, color: P });
        text(ctx, `x = −${(h * (trackW - W_)).toFixed(0)}`, 40, top + 160, { size: 22, family: F.mono, color: P, alpha: 0.55 });
        for (let i = 0; i < 4; i++) {
          const x = 40 + i * (pw + gap) - h * (trackW - W_), y = top + 220;
          ctx.save(); rr(ctx, x, y, pw, 560, 30); ctx.fillStyle = P; ctx.fill(); ctx.clip();
          ctx.fillStyle = K;
          if (i === 0) for (let k = 0; k < 14; k++) ctx.fillRect(x + k * 30, y, 14, 560);
          if (i === 1) for (let r = 360; r > 0; r -= 36) { ctx.beginPath(); ctx.arc(x + pw / 2, y + 230, r, 0, TAU); ctx.lineWidth = 14; ctx.strokeStyle = K; ctx.stroke(); }
          if (i === 2) for (let yy = 0; yy < 560; yy += 34) for (let xx = 0; xx < pw; xx += 34) { ctx.beginPath(); ctx.arc(x + xx + 17, y + yy + 17, 15 * (yy / 560), 0, TAU); ctx.fill(); }
          if (i === 3) { ctx.beginPath(); ctx.moveTo(x, y + 560); ctx.lineTo(x + pw, y); ctx.lineTo(x + pw, y + 560); ctx.fill(); }
          ctx.fillStyle = P; ctx.fillRect(x + 24, y + 440, 120, 96);
          text(ctx, `0${i + 1}`, x + 40, y + 512, { size: 56, family: F.latin, weight: 800, color: K });
          ctx.restore();
        }
        ctx.fillStyle = g(1, 0.2); ctx.fillRect(40, top + 830, W_ - 80, 6); ctx.fillStyle = P; ctx.fillRect(40, top + 830, (W_ - 80) * h, 6);
      } else if (b.id === 'count') {
        ctx.fillStyle = P; ctx.fillRect(0, top, W_, b.h);
        text(ctx, '進畫面才開始數', 40, top + 100, { size: 30, family: F.tcBlack, weight: 900, color: K });
        STATS.forEach(([n, u], i) => {
          const y = top + 230 + i * 180, e = E.outCubic(clamp((VH - 60 - y) / 380));
          const num = Math.round(parseInt(n.replace(/,/g, '')) * e).toLocaleString('en-US');
          text(ctx, num, 40, y + 40, { size: 96, family: F.latin, weight: 800, color: K });
          text(ctx, u, W_ - 40, y + 40, { size: 30, family: F.tc, color: K, align: 'right', alpha: 0.6 });
          ctx.fillStyle = g(0, 0.15); ctx.fillRect(40, y + 70, W_ - 80, 2); ctx.fillStyle = K; ctx.fillRect(40, y + 70, (W_ - 80) * e, 2);
        });
      } else {
        ctx.fillStyle = K; ctx.fillRect(0, top, W_, b.h);
        const pe = clamp((Y - (b.s - VH)) / VH);                          // 0 when the block enters, 1 at the very bottom
        ctx.save(); ctx.beginPath(); ctx.rect(0, top + 160, W_, 330); ctx.clip();
        'END'.split('').forEach((ch, i) => {
          const r = E.outCubic(clamp((pe - 0.35 - i * 0.12) / 0.35)), gl = glyphAt(ch, 100, 900);
          ctx.fillStyle = P; ctx.beginPath(); traceGlyph(ctx, gl, 40 + i * 150, top + 460 + (1 - r) * 330, 0.235); ctx.fill();
        });
        ctx.restore();
        text(ctx, 'frame = f(scrollY)', 40, top + 580, { size: 28, family: F.mono, weight: 500, color: P, alpha: E.outCubic(clamp((pe - 0.75) / 0.25)) });
        text(ctx, '到底了，放手就回彈', 40, top + 640, { size: 26, family: F.tc, color: P, alpha: 0.6 * clamp((pe - 0.85) / 0.15) });
      }
      ctx.restore();
    }
    // status bar + scroll progress bar (progress-linked)
    ctx.fillStyle = K; ctx.fillRect(0, 0, W_, 74);
    text(ctx, '9:41', 46, 46, { size: 22, family: F.mono, weight: 500, color: P, alpha: 0.8 });
    ctx.fillStyle = g(1, 0.2); ctx.fillRect(0, 70, W_, 4); ctx.fillStyle = P; ctx.fillRect(0, 70, W_ * prog, 4);
    ctx.restore();
    ctx.restore();
    // ---------- minimap ----------
    const mx = 660, my = 60, mh = 820, ms = mh / DOC, mw = 130;
    ctx.save(); ctx.globalAlpha = ease(E.outCubic, 0.1, 0.6, t);
    text(ctx, '整頁 DOCUMENT', mx, my - 10, { size: 20, family: F.tc, alpha: 0.6 });
    BLOCKS.forEach(b => {
      const y0 = my + 16 + b.s * ms, h0 = (b.h + b.pin) * ms, active = Y + VH / 2 >= b.s && Y + VH / 2 < b.s + b.h + b.pin;
      ctx.fillStyle = fg(active ? 0.28 : 0.1); ctx.fillRect(mx, y0, mw, h0 - 3);
      if (b.pin) { ctx.save(); ctx.beginPath(); ctx.rect(mx, y0 + b.h * ms, mw, b.pin * ms - 3); ctx.clip(); ctx.strokeStyle = fg(0.25); ctx.lineWidth = 2; ctx.beginPath(); for (let k = -20; k < 60; k++) { ctx.moveTo(mx + k * 12, y0 + b.h * ms); ctx.lineTo(mx + k * 12 - 200, y0 + b.h * ms + 200); } ctx.stroke(); ctx.restore(); }
      text(ctx, b.zh, mx + mw + 22, y0 + 32, { size: 26, family: active ? F.tcBlack : F.tc, weight: active ? 900 : 400, alpha: active ? 1 : 0.5 });
      text(ctx, b.en, mx + mw + 22, y0 + 60, { size: 18, family: F.mono, alpha: active ? 0.7 : 0.35, spacing: 2 });
      if (b.pin) text(ctx, `釘住 ${b.pin}px`, mx + mw + 22, y0 + 88, { size: 18, family: F.tc, alpha: 0.45 });
    });
    const vy = my + 16 + Y * ms;
    ctx.strokeStyle = fg(1); ctx.lineWidth = 3; ctx.strokeRect(mx - 8, vy, mw + 16, VH * ms);
    ctx.fillStyle = fg(1); ctx.beginPath(); ctx.moveTo(mx - 10, vy + VH * ms / 2); ctx.lineTo(mx - 24, vy + VH * ms / 2 - 9); ctx.lineTo(mx - 24, vy + VH * ms / 2 + 9); ctx.fill();
    const ry = 940;
    text(ctx, `scrollY ${Math.round(Y).toString().padStart(4, ' ')}`, mx, ry, { size: 26, family: F.mono, weight: 500 });
    text(ctx, `progress ${prog.toFixed(2)}`, mx, ry + 40, { size: 22, family: F.mono, alpha: 0.6 });
    const os = Y - MAXY;
    if (os > 2) text(ctx, `回彈 +${Math.round(os)}px`, mx, ry + 80, { size: 22, family: F.tc, weight: 400 });
    ctx.restore();
  },
});
