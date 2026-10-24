/* INTRO — 2 bars. A frame ruler runs; "Motion, in code." springs in letter by letter. */
const STATS = M.STATS || { lines: 0, chars: 0 };
M.def({
  id: 'intro', label: '開場', dur: 4,
  frame(ctx, t, s) {
    ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0, 0, W, H);
    // dot grid
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let y = 40; y < H; y += 60) for (let x = 30; x < W; x += 60) ctx.fillRect(x, y, 2, 2);

    // frame ruler: 30 ticks per second scroll left, playhead fixed at center
    const ry = 1240, pxPerFrame = 22, head = W / 2;
    const fnow = t * FPS;
    const rA = ease(E.outCubic, 0.1, 0.8, t) * (1 - ease(E.inCubic, 3.55, 3.95, t));
    ctx.save(); ctx.globalAlpha = rA;
    for (let f = Math.floor(fnow - 30); f < fnow + 30; f++) {
      if (f < 0) continue;
      const x = head + (f - fnow) * pxPerFrame;
      const major = f % 30 === 0, mid = f % 5 === 0;
      ctx.fillStyle = major ? '#f1efe9' : mid ? 'rgba(241,239,233,.55)' : 'rgba(241,239,233,.25)';
      const h = major ? 46 : mid ? 26 : 14;
      ctx.fillRect(x - 1, ry - h, 2, h);
      if (major) text(ctx, `${f / 30}s`, x + 8, ry - 30, { size: 22, family: F.mono, color: 'rgba(241,239,233,.7)' });
      else if (mid) text(ctx, String(f), x, ry + 34, { size: 17, family: F.mono, color: 'rgba(241,239,233,.32)', align: 'center' });
    }
    ctx.fillStyle = P.coral; ctx.fillRect(head - 1.5, ry - 90, 3, 150);
    ctx.beginPath(); ctx.moveTo(head - 12, ry - 104); ctx.lineTo(head + 12, ry - 104); ctx.lineTo(head, ry - 88); ctx.closePath(); ctx.fill();
    text(ctx, `t = ${t.toFixed(3)}`, head + 22, ry + 90, { size: 26, family: F.mono, weight: 500, color: '#f1efe9' });
    text(ctx, `frame ${String(Math.floor(fnow)).padStart(3, '0')}`, head - 22, ry + 90, { size: 26, family: F.mono, color: 'rgba(241,239,233,.5)', align: 'right' });
    ctx.restore();

    // headline: springs in per letter
    const lines = [['M', 'o', 't', 'i', 'o', 'n', ','], ['i', 'n', ' ', 'c', 'o', 'd', 'e', '.']];
    const size = 196, x0 = 84;
    const out = ease(E.inExpo, 3.5, 3.95, t);
    lines.forEach((L, li) => {
      font(ctx, size, F.latin, 800);
      let x = x0;
      L.forEach((ch, i) => {
        const delay = 0.25 + li * 0.32 + i * 0.045;
        const k = spring(t - delay, 220, 18);
        const y = 760 + li * 196 + (1 - k) * 140 - out * 260 * (1 + i * 0.08);
        ctx.save();
        ctx.globalAlpha = clamp((t - delay) * 6) * (1 - out);
        ctx.fillStyle = li === 1 && i >= 3 ? P.coral : '#f1efe9';
        ctx.translate(x, y); ctx.scale(1, 0.6 + 0.4 * k);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        x += ctx.measureText(ch).width - 4;
      });
    });
    const sA = ease(E.outCubic, 1.1, 1.7, t) * (1 - out);
    text(ctx, 'CLAUDE OPUS 5.5', x0, 470, { size: 28, family: F.mono, weight: 500, color: '#f1efe9', spacing: 8, alpha: ease(E.outCubic, 0.1, 0.6, t) * (1 - out) });
    ctx.fillStyle = `rgba(241,239,233,${0.4 * sA})`; ctx.fillRect(x0, 500, 360 * ease(E.outExpo, 0.2, 1.2, t), 2);
    text(ctx, '12 種動態效果，每一格都由程式碼算出', x0, 1060, { size: 40, family: F.tc, color: '#f1efe9', alpha: sA, spacing: 2 });
    text(ctx, '0 影片 · 0 圖片 · 0 音效素材', x0, 1500, { size: 26, family: F.mono, color: 'rgba(241,239,233,.55)', alpha: ease(E.outCubic, 1.6, 2.2, t) * (1 - out), spacing: 1 });
    grain(ctx, 0.05, s.frame);
  },
});
