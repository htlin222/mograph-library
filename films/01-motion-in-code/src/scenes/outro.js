/* OUTRO — the closing statement. 3 bars. Staged on beats: memory line → statement → frame = f(t) with the
   real global clock → the project's own numbers → signature. Ends calm, fading to near-black. */
const BG = '#0c0c0e', FG = '#f1eee7', DIMA = 'rgba(241,238,231,.46)', ACC = '#ff5a3c';
const ST = M.STATS || { lines: 0, chars: 0 };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const X = 84;

/* clip-reveal a line of text from below */
function rise(ctx, str, x, y, o, t0, t, h) {
  const k = E.outExpo(clamp((t - t0) / 0.9));
  if (k <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - h, W, h * 1.32); ctx.clip();
  text(ctx, str, x, y + (1 - k) * h, Object.assign({}, o, { alpha: (o.alpha === undefined ? 1 : o.alpha) * clamp((t - t0) * 4) }));
  ctx.restore();
}

M.def({
  id: 'outro', label: '結尾', dur: 6,
  frame(ctx, t, s) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    // impact on the downbeat: a soft horizon of light that settles
    const imp = Math.exp(-t * 2.4);
    const hg = ctx.createRadialGradient(W / 2, 1010, 0, W / 2, 1010, 900);
    hg.addColorStop(0, `rgba(255,90,60,${0.10 + 0.14 * imp})`); hg.addColorStop(1, 'rgba(255,90,60,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    // rule that draws across on the first beat
    const rl = ease(E.outExpo, 0, 0.9, t);
    ctx.fillStyle = 'rgba(241,238,231,.22)'; ctx.fillRect(X, 520, (W - 2 * X) * rl, 1);
    text(ctx, 'FIN', X, 500, { size: 20, family: F.mono, weight: 500, color: DIMA, spacing: 6, alpha: rl });
    text(ctx, `${(s.gt / 60 | 0)}:${String(Math.floor(s.gt % 60)).padStart(2, '0')}`, W - X, 500, { size: 20, family: F.mono, color: DIMA, align: 'right', alpha: rl });

    // line 1 — memory (small, dim)
    rise(ctx, '過去做動態，是拿滑鼠一格一格喬曲線、對拍點。', X, 618, { size: 33, family: F.tc, color: DIMA, spacing: 1 }, 0.15, t, 44);
    // line 2 — statement (big)
    rise(ctx, '這次，時間只是', X, 760, { size: 82, family: F.tcBlack, weight: 900, color: FG, spacing: 2 }, 0.62, t, 100);
    rise(ctx, '函數裡的一個變數。', X, 868, { size: 82, family: F.tcBlack, weight: 900, color: FG, spacing: 2 }, 0.8, t, 100);

    // equation: frame = f(t), t ticking live
    const eqA = ease(E.outCubic, 1.5, 2.1, t);
    if (eqA > 0) {
      ctx.save(); ctx.globalAlpha = eqA; ctx.translate((1 - eqA) * -24, 0);
      const ey = 1050;
      font(ctx, 88, F.mono, 500);
      const parts = [['frame', FG], [' = ', DIMA], ['f', ACC], ['(', DIMA], ['t', FG], [')', DIMA]];
      let x = X;
      parts.forEach(([p, c]) => { text(ctx, p, x, ey, { size: 88, family: F.mono, weight: 500, color: c }); x += ctx.measureText(p).width; });
      const caret = fract(t * 2) < 0.5 ? 1 : 0.15;
      ctx.fillStyle = rgba(ACC, caret); ctx.fillRect(x + 12, ey - 70, 5, 82);
      // t readout
      const ty = 1130;
      text(ctx, 't =', X, ty, { size: 34, family: F.mono, color: DIMA });
      text(ctx, s.gt.toFixed(3), X + 82, ty, { size: 34, family: F.mono, weight: 500, color: FG });
      text(ctx, 's', X + 82 + 34 * 0.6 * s.gt.toFixed(3).length + 6, ty, { size: 34, family: F.mono, color: DIMA });
      text(ctx, `frame ${String(s.frame).padStart(4, '0')}`, W - X, ty, { size: 34, family: F.mono, color: DIMA, align: 'right' });
      // a hairline timeline of the whole film with the playhead
      const tlY = 1166, tlW = W - 2 * X, pos = s.gt / M.duration;
      ctx.fillStyle = 'rgba(241,238,231,.16)'; ctx.fillRect(X, tlY, tlW, 1);
      for (const sc of M.timeline) { ctx.fillStyle = 'rgba(241,238,231,.35)'; ctx.fillRect(X + tlW * sc.start / M.duration, tlY - 5, 1, 11); }
      ctx.fillStyle = FG; ctx.fillRect(X, tlY, tlW * pos, 1);
      ctx.fillStyle = ACC; ctx.fillRect(X + tlW * pos - 1, tlY - 9, 3, 19);
      ctx.restore();
    }

    // stats block — beat-staggered
    const rows = [
      [fmt(ST.lines), '行程式碼', fmt(ST.chars), '字元'],
      ['畫面＋配樂', '100% 程式碼生成'],
      ['響度', '−14 LUFS'],
    ];
    const sy = 1272, lh = 58;
    rows.forEach((r, i) => {
      const t0 = 2.5 + i * BEAT * 0.5;
      const a = ease(E.outCubic, t0, t0 + 0.5, t);
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 18);
      const y = sy + i * lh;
      ctx.fillStyle = 'rgba(241,238,231,.12)'; ctx.fillRect(X, y + 20, (W - 2 * X) * a, 1);
      if (r.length === 4) {
        font(ctx, 34, F.mono, 500); let x = X;
        text(ctx, r[0], x, y, { size: 34, family: F.mono, weight: 500, color: FG }); x += ctx.measureText(r[0]).width + 12;
        text(ctx, r[1], x, y, { size: 30, family: F.tc, color: DIMA }); font(ctx, 30, F.tc); x += ctx.measureText(r[1]).width + 22;
        text(ctx, '·', x, y, { size: 30, family: F.mono, color: DIMA }); x += 34;
        font(ctx, 34, F.mono, 500);
        text(ctx, r[2], x, y, { size: 34, family: F.mono, weight: 500, color: FG }); x += ctx.measureText(r[2]).width + 12;
        text(ctx, r[3], x, y, { size: 30, family: F.tc, color: DIMA });
      } else {
        text(ctx, r[0], X, y, { size: 30, family: F.tc, color: DIMA });
        text(ctx, r[1], W - X, y, { size: 34, family: F.mono, weight: 500, color: FG, align: 'right' });
      }
      ctx.restore();
    });

    // signature
    const sg = ease(E.outCubic, 3.55, 4.4, t);
    if (sg > 0) {
      ctx.save(); ctx.globalAlpha = sg;
      ctx.fillStyle = ACC; ctx.fillRect(X, 1500, 14 * sg, 14);
      ctx.font = `700 ${46}px ${F.latin}`; ctx.letterSpacing = (2 + 10 * (1 - sg)) + 'px';
      ctx.fillStyle = FG; ctx.fillText('Claude Opus 5.5', X + 32, 1517);
      ctx.restore();
    }

    // calm exit
    const fade = ease(E.inOutSine, 5.4, 6.0, t);
    if (fade > 0) { ctx.fillStyle = `rgba(8,8,9,${0.94 * fade})`; ctx.fillRect(0, 0, W, H); }
    grain(ctx, 0.045, s.frame);
  },
});
