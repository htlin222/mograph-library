/* OUTRO — 12 s. Seventy-two ticks fill in; the closing line; real source stats. */
M.def({
  id: 'outro', kind: 'outro', label: '片尾', dur: 12, ground: 'dark',
  cues: [{ t: 0, type: 'impact', v: 0.6 }, { t: 3.5, type: 'bell', i: 0, v: 0.5, dec: 5 }, { t: 3.6, type: 'bell', i: 2, v: 0.4, dec: 5 }, { t: 3.7, type: 'bell', i: 4, v: 0.35, dec: 5 }],
  frame(ctx, t) {
    ctx.fillStyle = K; ctx.fillRect(0, 0, W, H);
    const out = ease(E.inCubic, 11.0, 11.95, t);
    ctx.save(); ctx.globalAlpha = 1 - out;
    // 72 cells, 8 × 9, filling in order
    const cols = 8, cw = 104, gap = 12, x0 = (W - (cols * cw + (cols - 1) * gap)) / 2, y0 = 170;
    for (let i = 0; i < 72; i++) {
      const c = i % cols, r = Math.floor(i / cols), x = x0 + c * (cw + gap), y = y0 + r * 70;
      const a = ease(E.outCubic, 0.2 + i * 0.03, 0.5 + i * 0.03, t);
      ctx.strokeStyle = g(1, 0.25); ctx.lineWidth = 1.5; ctx.strokeRect(x, y, cw, 56);
      ctx.fillStyle = g(1, a); ctx.fillRect(x, y + 56 * (1 - a), cw, 56 * a);
      text(ctx, String(i + 1).padStart(2, '0'), x + 10, y + 36, { size: 20, family: F.mono, weight: 500, color: a > 0.5 ? K : P });
    }
    const st = M.STATS || { lines: 0, chars: 0 };
    text(ctx, '黑與白之間，', 72, 1000, { size: 76, family: F.tcBlack, weight: 900, color: P, alpha: ease(E.outCubic, 2.6, 3.4, t) });
    text(ctx, '就是全部的動態語言。', 72, 1100, { size: 76, family: F.tcBlack, weight: 900, color: P, alpha: ease(E.outCubic, 3.0, 3.8, t) });
    const rows = [['段落', '72 段 × 20 秒'], ['程式碼', `${st.lines.toLocaleString('en-US')} 行 · ${st.chars.toLocaleString('en-US')} 字元`], ['畫面與配樂', '100% 程式生成，只用黑與白'], ['響度', '−14 LUFS']];
    rows.forEach(([k, v], i) => { const y = 1300 + i * 74, a = ease(E.outCubic, 4.6 + i * 0.4, 5.2 + i * 0.4, t);
      ctx.fillStyle = g(1, 0.2 * a); ctx.fillRect(72, y + 22, W - 144, 1);
      text(ctx, k, 72, y, { size: 30, family: F.tc, color: g(.6), alpha: a });
      text(ctx, v, W - 72, y, { size: 30, family: F.mono, color: P, align: 'right', alpha: a }); });
    text(ctx, 'Claude Opus 5.5', 72, 1700, { size: 48, family: F.latin, weight: 800, color: P, alpha: ease(E.outCubic, 7, 7.8, t) });
    text(ctx, 'frame = f(t)', 72, 1770, { size: 30, family: F.mono, color: g(.6), alpha: ease(E.outCubic, 7.4, 8.2, t) });
    ctx.restore();
  },
});
