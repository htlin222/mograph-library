/* 28 拆字交錯 — split a word into letters, give each its own delayed timeline.
   Presets: RISE · FLIP · SPIN · DROP(中文, random) — each with a live stagger diagram. Payoff: a diagonal-staggered paragraph. */
const WORD = 'STAGGER', CAP = 686;
const PRE = [
  { t0: 0, name: 'RISE', zh: '上升', d: 0.05, dur: 0.6, ease: 'outExpo', order: 'L→R' },
  { t0: 4, name: 'FLIP', zh: '翻轉', d: 0.08, dur: 0.7, ease: 'outBack', order: 'L→R' },
  { t0: 8, name: 'SPIN', zh: '旋轉縮放', d: 0.07, dur: 0.7, ease: 'outBack', order: '中心→外' },
  { t0: 12, name: 'DROP', zh: '落下', d: 0.09, dur: 0.75, ease: 'outBounce', order: '隨機' },
];
const TCW = '逐字交錯登場';
const PERM = (() => { const r = rng(28); return [...Array(TCW.length).keys()].map(i => [r(), i]).sort((a, b) => a[0] - b[0]).map(q => q[1]); })();
function delayOf(p, i, n) {
  if (p.order === 'L→R') return i * p.d;
  if (p.order === '中心→外') return Math.abs(i - (n - 1) / 2) * p.d;
  return PERM.indexOf(i) * p.d;
}
const LINES = ['SPLIT', 'EVERY', 'LETTER', 'INTO ITS', 'OWN', 'TIMELINE'];
M.def({
  id: 'e28', num: 28, ch: 4, title: '拆字交錯', en: 'SPLIT-TEXT STAGGER', dur: 20, ground: 'light',
  prompt: '把「STAGGER」拆成單一字母，每個字母有自己的時間軸：依序示範上升遮罩、翻轉、中心向外旋轉縮放、中文隨機落下四種預設，每段 2 小節；畫面下方畫出每個字母延遲多少、走多久的甘特圖。最後一段文字以對角線順序翻入。白底黑字。',
  how: ['延遲 delay_i = i × Δ（Δ 50–90ms），進度 = ease((t−delay_i)/dur)', '順序決定性格：左→右、中心→外、隨機排列各一種', '收尾 delay = 30ms ×（欄 + 2×列），形成對角線波'],
  practice: '同一個字只改 Δ：20ms、80ms、200ms，感覺差在哪？',
  cues: [...PRE.map(p => ({ t: p.t0, type: 'whoosh', dur: 0.6, v: 0.5 })), ...PRE.map(p => ({ t: p.t0 + 2.6, type: 'tick', v: 0.4 })), { t: 14.5, type: 'whoosh', dur: 1.2, v: 0.6 }, { t: 17.5, type: 'bell', i: 3, v: 0.4 }],
  frame(ctx, t) {
    if (t < 14.3) {
      const pi = Math.min(3, Math.floor(t / 4)), p = PRE[pi], u = t - p.t0;
      const tc = pi === 3;
      const chars = tc ? [...TCW] : [...WORD], n = chars.length;
      text(ctx, `0${pi + 1}  ${p.name} · ${p.zh}`, 44, 64, { size: 22, family: F.mono, weight: 500 });
      text(ctx, `Δ ${Math.round(p.d * 1000)}ms · dur ${p.dur}s · ${p.ease} · 順序 ${p.order}`, SW - 44, 64, { size: 19, family: F.mono, align: 'right', alpha: 0.65 });
      /* ---------- the word ---------- */
      const cap = tc ? 0 : Math.min(200, (930 - 60) / [...WORD].reduce((a, c) => a + glyphAt(c, 100, 820).adv, 0) * CAP), sc = cap / CAP, base = 390;
      let advs, tot;
      if (tc) { advs = chars.map(() => 150); tot = 150 * n; }
      else { advs = chars.map(c => glyphAt(c, 100, 820).adv * sc); tot = advs.reduce((a, b) => a + b, 0) + 10 * (n - 1); }
      let x = (SW - tot) / 2;
      chars.forEach((ch, i) => {
        const w = advs[i], dl = delayOf(p, i, n);
        const k = clamp((u - dl) / p.dur), e = E[p.ease](k);
        const ko = clamp((u - 2.6 - dl * 0.6) / 0.35), eo = E.inCubic(ko);          // exit: same order, faster
        ctx.save();
        if (p.name === 'RISE') {
          ctx.beginPath(); ctx.rect(0, base - cap - 20, SW, cap + 30); ctx.clip();
          ctx.translate(x, base + (1 - e) * (cap + 30) - eo * (cap + 30));
        } else if (p.name === 'FLIP') {
          const th = (1 - e) * Math.PI / 2 + eo * Math.PI / 2;
          ctx.translate(x + w / 2, base - cap / 2); ctx.scale(1, Math.cos(th)); ctx.translate(-w / 2, cap / 2);
          ctx.globalAlpha = k > 0 ? 1 : 0;
        } else if (p.name === 'SPIN') {
          const s = Math.max(0, e) * (1 - eo), r = (1 - e) * -Math.PI + eo * Math.PI * 0.5;
          ctx.translate(x + w / 2, base - cap / 2); ctx.rotate(r); ctx.scale(s, s); ctx.translate(-w / 2, cap / 2);
        } else {
          ctx.translate(x, lerp(-60, base + 40, e) + eo * 500);
          ctx.globalAlpha = k > 0 ? 1 : 0;
        }
        if (tc) text(ctx, ch, w / 2, 0, { size: 150, family: F.tcBlack, weight: 900, align: 'center' });
        else { ctx.beginPath(); traceGlyph(ctx, glyphAt(ch, 100, 820), 0, 0, sc); ctx.fillStyle = fg(1); ctx.fill(); }
        ctx.restore();
        x += w + (tc ? 0 : 10);
      });
      /* ---------- stagger diagram (Gantt) ---------- */
      const gx = 150, gw = 800, gy = 560, rh = 46, span = 1.6;
      const fade = 1 - ease(E.inCubic, 13.9, 14.3, t);
      ctx.save(); ctx.globalAlpha = fade;
      for (let s = 0; s <= 16; s++) { const xx = gx + gw * (s / 10) / span; ctx.fillStyle = fg(s % 5 === 0 ? 0.3 : 0.1); ctx.fillRect(xx, gy - 16, 1, n * rh + 10); if (s % 5 === 0) text(ctx, (s / 10).toFixed(1) + 's', xx, gy - 26, { size: 18, family: F.mono, align: 'center', alpha: 0.5 }); }
      chars.forEach((ch, i) => {
        const y = gy + i * rh, dl = delayOf(p, i, n), k = clamp((u - dl) / p.dur);
        text(ctx, ch, gx - 40, y + 22, { size: 26, family: tc ? F.tcBlack : F.mono, weight: tc ? 900 : 500, align: 'center' });
        const bx = gx + gw * dl / span, bw = gw * p.dur / span;
        ctx.strokeStyle = fg(0.5); ctx.lineWidth = 1.5; ctx.strokeRect(bx, y + 4, bw, rh - 18);
        ctx.fillStyle = fg(1); ctx.fillRect(bx, y + 4, bw * k, rh - 18);
        // eased value as a tick inside the bar
        if (k > 0 && k < 1) { const e = E[p.ease](k); ctx.fillStyle = fg(0.4); ctx.fillRect(bx, y + rh - 12, bw * clamp(e, 0, 1.2), 3); }
        if (dl > 0) { ctx.fillStyle = fg(0.35); ctx.fillRect(gx, y + 14, bx - gx - 6, 1.5); }
      });
      const ph = gx + gw * clamp(u / span, 0, 1);
      ctx.fillStyle = fg(1); ctx.fillRect(ph - 1, gy - 18, 2.5, n * rh + 16);
      text(ctx, '延遲 delay', gx, gy + n * rh + 30, { size: 18, family: F.mono, alpha: 0.6 });
      text(ctx, '■ 進行中  ━ 緩動值', gx + gw, gy + n * rh + 30, { size: 18, family: F.mono, align: 'right', alpha: 0.6 });
      ctx.restore();
    } else {
      /* ---------- payoff: the paragraph flips in on a diagonal; then a wave rides the same delays ---------- */
      const u = t - 14.5, cap = 112, sc = cap / CAP, lh = 152, x0 = 70, y0 = 90 + cap;
      ctx.fillStyle = fg(1);
      LINES.forEach((ln, r) => {
        let x = x0;
        [...ln].forEach((ch, c) => {
          if (ch === ' ') { x += 60; return; }
          const gl = glyphAt(ch, 100, 860), w = gl.adv * sc;
          const dl = 0.03 * (c + 2 * r), k = clamp((u - dl) / 0.7), e = E.outBack(k);
          const wave = Math.sin(clamp((u - 3.0 - dl) / 0.6) * Math.PI) * 26;
          const th = (1 - e) * Math.PI / 2;
          if (k > 0) {
            ctx.save(); ctx.translate(x + w / 2, y0 + r * lh - wave); ctx.scale(1, Math.cos(th)); ctx.beginPath(); traceGlyph(ctx, gl, -w / 2, 0, sc); ctx.fill(); ctx.restore();
          }
          x += w + 4;
        });
      });
      text(ctx, 'delay = 30ms × (col + 2·row)', SW - 44, 1040, { size: 21, family: F.mono, weight: 500, align: 'right', alpha: ease(E.outCubic, 15.5, 16, t) * 0.75 });
      // diagonal guide: the stagger front
      const fx = (u / 0.03);                         // col + 2row reached by the front
      if (u < 1.6) {
        ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]);
        const colW = 75, a = x0 + fx * colW;
        ctx.beginPath(); ctx.moveTo(a, 60); ctx.lineTo(a - (lh * 5.6) * colW * 2 / lh, 60 + lh * 5.6); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  },
});
