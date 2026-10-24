/* 26 可變字體 — Archivo outlines interpolated live across wdth 62–125 × wght 100–900.
   1 wght only · 2 wdth only (outline points shown) · 3 both, staggered per letter · payoff: proximity-driven justified poster. */
const WD = [62, 100, 125], WT = [100, 400, 900];
/* advance only (cheap): same piecewise-bilinear interpolation as glyphAt */
function advAt(ch, wd, wt) {
  if (ch === ' ') return 260;
  if (typeof GLYPHS === 'undefined') return glyphAt(ch, wd, wt).adv;
  const a = GLYPHS.glyphs[ch].adv;
  const seg = (arr, v) => { let i = v > arr[1] ? 1 : 0; return [i, clamp((v - arr[i]) / (arr[i + 1] - arr[i]))]; };
  const [i, u] = seg(WD, wd), [j, v] = seg(WT, wt);
  return lerp(lerp(a[i][j], a[i + 1][j], u), lerp(a[i][j + 1], a[i + 1][j + 1], u), v);
}
const WORD = 'FLEX';
const ROWS = ['VARIABLE', 'TYPE', 'BREATHES', 'ON TWO', 'AXES'];
/* axis values over time for letter i (sections 1–3) */
function axes(t, i) {
  if (t < 4) { const k = E.inOutSine(0.5 - 0.5 * Math.cos(Math.PI * t / 2)); return [100, lerp(100, 900, k)]; }
  if (t < 8) { const k = 0.5 - 0.5 * Math.cos(Math.PI * (t - 4) / 2); return [lerp(62, 125, k), lerp(900, 600, ease(E.inOutCubic, 4, 4.6, t))]; }
  const ph = (t - 8) * 1.4 - i * 0.55;                          // per-letter phase offset = stagger
  const blend = ease(E.inOutCubic, 8, 9, t);
  const wd = lerp(100, 93.5 + 31.5 * Math.sin(ph * 1.0), blend), wt = lerp(600, 500 + 400 * Math.sin(ph * 2.0 + 1.2) * 1, blend);
  return [clamp(wd, 62, 125), clamp(wt, 100, 900)];
}
M.def({
  id: 'e26', num: 26, ch: 4, title: '可變字體', en: 'VARIABLE FONT AXES', dur: 20, ground: 'light',
  prompt: '用 Archivo 可變字體的真實字形輪廓做「FLEX」：先只動字重 100→900，再只動字寬 62→125 並露出控制點，再讓每個字母錯開相位走過設計空間；畫出兩條軸的滑桿與九個母版點。最後一張整版字塊，字母越靠近游標越寬越粗，每行永遠左右對齊。黑字白底。',
  how: ['3×3 母版（寬 62/100/125 × 重 100/400/900）雙線性插值', '同一組控制點逐點內插：點數與順序不變才能變形', '收尾每行用二分法解基準寬度，讓整行剛好撐滿版寬'],
  practice: '讓一個字的字重跟著音量走，靜音時最細。',
  cues: [{ t: 0, type: 'whoosh', dur: 1.8, v: 0.5 }, { t: 4, type: 'pop', v: 0.6 }, { t: 8, type: 'pop', v: 0.6 }, { t: 13.4, type: 'riser', t1: 14 }, { t: 14, type: 'impact', v: 0.7 }],
  frame(ctx, t) {
    const payoff = t >= 14;
    const fadeA = 1 - ease(E.inCubic, 13.3, 13.9, t);
    let cur = [];
    if (!payoff) {
      /* ---------- the hero word ---------- */
      const cap = Math.min(330, 980 / [...WORD].reduce((a, c) => a + advAt(c, 125, 900), 0) * 686), sc = cap / 686, base = 500;
      const vals = [...WORD].map((_, i) => axes(t, i));
      const advs = [...WORD].map((ch, i) => advAt(ch, vals[i][0], vals[i][1]));
      const tot = advs.reduce((a, b) => a + b, 0) * sc;
      let x = (SW - tot) / 2;
      ctx.save(); ctx.globalAlpha = fadeA;
      const showPts = ease(E.outCubic, 4.4, 5, t) * (1 - ease(E.inCubic, 7.4, 8, t));
      [...WORD].forEach((ch, i) => {
        const gl = glyphAt(ch, vals[i][0], vals[i][1]);
        ctx.beginPath(); traceGlyph(ctx, gl, x, base, sc);
        if (showPts > 0) {                              // outline + control points: same points, moved
          ctx.fillStyle = fg(lerp(1, 0.1, showPts)); ctx.fill();
          ctx.strokeStyle = fg(showPts); ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = fg(showPts);
          for (let k = 0; k < gl.pts.length; k += 2) ctx.fillRect(x + gl.pts[k] * sc - 3.5, base - gl.pts[k + 1] * sc - 3.5, 7, 7);
        } else { ctx.fillStyle = fg(1); ctx.fill(); }
        x += gl.adv * sc;
      });
      // baseline + cap guides
      ctx.fillStyle = fg(0.25); ctx.fillRect(60, base, SW - 120, 1.5); ctx.fillRect(60, base - cap, SW - 120, 1);
      text(ctx, 'BASELINE', 60, base + 26, { size: 18, family: F.mono, alpha: 0.5 });
      text(ctx, 'CAP 686', 60, base - cap - 10, { size: 18, family: F.mono, alpha: 0.5 });
      if (showPts > 0) text(ctx, `${gl0pts()} 個控制點 · 每點都在 9 個母版之間內插`, SW - 60, base + 26, { size: 18, family: F.mono, align: 'right', alpha: 0.6 * showPts });
      ctx.restore();
      cur = vals;
      /* ---------- sliders ---------- */
      const sec = t < 4 ? '01  只動字重 wght' : t < 8 ? '02  只動字寬 wdth' : '03  兩軸同動 · 每個字母錯開相位';
      text(ctx, sec, 44, 64, { size: 22, family: F.mono, weight: 500, alpha: fadeA });
      const v0 = vals[0], sx = 60, sw = 560;
      ctx.save(); ctx.globalAlpha = fadeA;
      [['wdth', 62, 125, v0[0], WD, t >= 4], ['wght', 100, 900, v0[1], WT, t < 4 || t >= 8]].forEach(([nm, lo, hi, v, ms, act], r) => {
        const y = 700 + r * 110;
        text(ctx, nm, sx, y - 24, { size: 22, family: F.mono, weight: 500, alpha: act ? 1 : 0.4 });
        text(ctx, v.toFixed(0), sx + sw, y - 24, { size: 22, family: F.mono, weight: 500, align: 'right', alpha: act ? 1 : 0.4 });
        ctx.fillStyle = fg(0.2); ctx.fillRect(sx, y - 1, sw, 2);
        ms.forEach(m => { const mx = sx + sw * (m - lo) / (hi - lo); ctx.fillStyle = fg(0.5); ctx.fillRect(mx - 1, y + 8, 2, 10); text(ctx, String(m), mx, y + 40, { size: 18, family: F.mono, align: 'center', alpha: 0.5 }); });
        if (t >= 8) [...WORD].forEach((_, i) => { const vv = vals[i][r]; const mx = sx + sw * (vv - lo) / (hi - lo); ctx.fillStyle = fg(0.35); ctx.fillRect(mx - 1, y - 12, 2, 24); });
        const mx = sx + sw * (v - lo) / (hi - lo);
        ctx.fillStyle = fg(1); ctx.fillRect(sx, y - 2.5, mx - sx, 5);
        ctx.beginPath(); ctx.arc(mx, y, act ? 13 : 9, 0, TAU); ctx.fill();
      });
      /* ---------- design-space pad: 9 masters + current points ---------- */
      const px = 720, py = 640, ps = 280;
      ctx.strokeStyle = fg(0.6); ctx.lineWidth = 1.5; ctx.strokeRect(px, py, ps, ps);
      const P2 = (wd, wt) => [px + ps * (wd - 62) / 63, py + ps - ps * (wt - 100) / 800];
      ctx.strokeStyle = fg(0.15); ctx.lineWidth = 1;
      WD.forEach(w => { const [x] = P2(w, 100); ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ps); ctx.stroke(); });
      WT.forEach(w => { const [, y] = P2(62, w); ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + ps, y); ctx.stroke(); });
      WD.forEach(a => WT.forEach(b => { const [x, y] = P2(a, b); ctx.fillStyle = bg(1); ctx.fillRect(x - 6, y - 6, 12, 12); ctx.strokeStyle = fg(0.8); ctx.lineWidth = 2; ctx.strokeRect(x - 6, y - 6, 12, 12); }));
      // trails: last 1.5 s of each letter's path through the space
      [...WORD].forEach((_, i) => {
        if (i > 0 && t < 8) return;
        ctx.beginPath();
        for (let k = 0; k <= 30; k++) { const tt = Math.max(0, t - 1.5 + k * 0.05); const [a, b] = axes(tt, i); const [x, y] = P2(a, b); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.strokeStyle = fg(0.45); ctx.lineWidth = 2; ctx.stroke();
        const [x, y] = P2(vals[i][0], vals[i][1]); ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
        if (t >= 8) text(ctx, WORD[i], x + 11, y - 9, { size: 18, family: F.mono, weight: 500 });
      });
      text(ctx, 'wdth →', px + ps, py + ps + 30, { size: 18, family: F.mono, align: 'right', alpha: 0.6 });
      text(ctx, '↑ wght', px, py - 12, { size: 18, family: F.mono, alpha: 0.6 });
      ctx.restore();
    } else {
      /* ---------- payoff: proximity poster, each row justified ---------- */
      const ax = SW / 2 + 360 * Math.sin((t - 14) * 1.15), ay = 520 + 330 * Math.sin((t - 14) * 0.83 + 0.7);
      const caps = [118, 150, 118, 150, 200], gap = 34, x0 = 56, tw = SW - 112;
      let y = 70; const reveal = t - 14;
      ROWS.forEach((row, r) => {
        const cap = caps[r], sc = cap / 686; y += cap;
        const chars = [...row];
        // per-letter proximity → wght and a wdth offset; the row's base wdth is solved so the row fills tw
        const prox = chars.map((ch, i) => { const cx = x0 + tw * (i + 0.5) / chars.length, cy = y - cap / 2; const d = Math.hypot(cx - ax, cy - ay); return Math.exp(-(d * d) / (2 * 230 * 230)); });
        const wts = prox.map(p => lerp(140, 900, p));
        const wdOf = (base, i) => clamp(base + 70 * prox[i], 62, 125);
        const rowAdv = base => chars.reduce((a, ch, i) => a + advAt(ch, wdOf(base, i), wts[i]), 0) * sc;
        let lo = -10, hi = 125;
        for (let it = 0; it < 22; it++) { const m = (lo + hi) / 2; if (rowAdv(m) < tw) lo = m; else hi = m; }
        const base = (lo + hi) / 2, extra = Math.max(0, (tw - rowAdv(base)) / Math.max(1, chars.length - 1));
        const k = ease(E.outExpo, r * 0.12, 0.7 + r * 0.12, reveal);
        ctx.save(); ctx.beginPath(); ctx.rect(0, y - cap - 6, SW, cap + 12); ctx.clip();
        ctx.beginPath(); let x = x0;
        chars.forEach((ch, i) => { if (ch === ' ') { x += 260 * sc + extra; return; } const gl = glyphAt(ch, wdOf(base, i), wts[i]); traceGlyph(ctx, gl, x, y + (1 - k) * (cap + 12), sc); x += gl.adv * sc + extra; });
        ctx.fillStyle = fg(1); ctx.fill(); ctx.restore();
        y += gap;
      });
      // the cursor
      const ca = ease(E.outCubic, 14.6, 15.2, t);
      ctx.save(); ctx.globalAlpha = ca; ctx.globalCompositeOperation = 'difference';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, ay, 22, 0, TAU); ctx.moveTo(ax - 36, ay); ctx.lineTo(ax + 36, ay); ctx.moveTo(ax, ay - 36); ctx.lineTo(ax, ay + 36); ctx.stroke();
      ctx.restore();
      text(ctx, '04  距離 → 字重與字寬 · 每行解出基準寬度以對齊', 44, 1040, { size: 19, family: F.mono, weight: 500, alpha: 0.75 * ca });
    }
  },
});
let _n = 0; function gl0pts() { if (!_n) _n = [...WORD].reduce((a, c) => a + glyphAt(c, 100, 400).pts.length / 2, 0); return _n; }
