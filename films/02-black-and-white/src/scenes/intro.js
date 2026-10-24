/* INTRO — 10 s. A black frame splits into black and white; the title sets in. */
M.def({
  id: 'intro', kind: 'intro', label: '片頭', dur: 10, ground: 'dark',
  cues: [{ t: 0.5, type: 'bell', i: 2, v: 0.5, dec: 4 }, { t: 4.0, type: 'impact', v: 0.7 }, { t: 3.0, type: 'riser', t1: 4.0, v: 0.5 }],
  frame(ctx, t) {
    ctx.fillStyle = K; ctx.fillRect(0, 0, W, H);
    // the split: a white field rises from the bottom at 4 s, stops at the golden line
    const split = ease(E.inOutQuint, 3.2, 4.0, t), out = ease(E.inCubic, 9.4, 9.98, t);
    const yS = lerp(H, 1180, split);
    ctx.fillStyle = P; ctx.fillRect(0, yS, W, H - yS);
    // frame ruler running along the split
    const fnow = t * FPS;
    for (let f = Math.floor(fnow - 40); f < fnow + 40; f++) {
      if (f < 0) continue; const x = W / 2 + (f - fnow) * 14; const major = f % 30 === 0;
      ctx.fillStyle = g(1, major ? 0.9 : f % 5 === 0 ? 0.5 : 0.22); ctx.fillRect(x, yS - (major ? 40 : f % 5 === 0 ? 22 : 10), 2, major ? 40 : f % 5 === 0 ? 22 : 10);
    }
    text(ctx, `t = ${t.toFixed(3)}`, W / 2, yS - 64, { size: 24, family: F.mono, weight: 500, color: P, align: 'center', alpha: ease(E.outCubic, 0.3, 1, t) });
    // title on black
    const a1 = ease(E.outExpo, 0.6, 1.6, t);
    ctx.save(); ctx.globalAlpha = 1 - out;
    text(ctx, 'BLACK & WHITE', 72, 330, { size: 26, family: F.mono, weight: 500, color: P, spacing: 10, alpha: a1 });
    ctx.save(); ctx.beginPath(); ctx.rect(0, 360, W, 520); ctx.clip();
    ['黑白', '動態全書'].forEach((w, i) => text(ctx, w, 66, 560 + i * 220 + (1 - ease(E.outExpo, 0.9 + i * 0.25, 2.0 + i * 0.25, t)) * 260, { size: 200, family: F.tcBlack, weight: 900, color: P }));
    ctx.restore();
    text(ctx, '72 種動態效果，每段 20 秒', 72, 960, { size: 44, family: F.tc, color: P, alpha: ease(E.outCubic, 2.0, 2.8, t) });
    text(ctx, '每一格都由程式碼算出，每段附上 prompt 與做法', 72, 1030, { size: 32, family: F.tc, color: g(.65), alpha: ease(E.outCubic, 2.4, 3.2, t) });
    // on white
    const a2 = ease(E.outCubic, 4.4, 5.2, t);
    text(ctx, '只用黑與白', 72, 1400, { size: 92, family: F.tcBlack, weight: 900, color: K, alpha: a2 });
    text(ctx, '沒有任何顏色、圖片、影片或音效素材', 72, 1480, { size: 34, family: F.tc, color: K, alpha: ease(E.outCubic, 5.0, 5.8, t) });
    const items = ['時間與緩動', '程序與模擬', '形狀與圖形', '動態字體', '3D 與光', '生成演算法', '後製與風格化', '構成、鏡頭、轉場', '介面、資料、聲音'];
    items.forEach((s, i) => { const col = i % 3, row = Math.floor(i / 3), aa = ease(E.outCubic, 6 + i * 0.15, 6.6 + i * 0.15, t);
      text(ctx, `${'一二三四五六七八九'[i]}　${s}`, 72 + col * 320, 1600 + row * 64, { size: 28, family: F.tc, color: K, alpha: aa }); });
    text(ctx, 'Claude Opus 5.5', W - 72, 1840, { size: 26, family: F.latin, weight: 800, color: K, align: 'right', alpha: ease(E.outCubic, 7.5, 8.2, t) });
    ctx.restore();
  },
});
