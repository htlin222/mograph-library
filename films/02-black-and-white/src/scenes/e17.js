/* 17 路徑描繪 — trim paths on a geometric emblem: trim end, travelling window, dash offset, symmetric trim. */
const CX = 540, CY = 500;
/* polyline with cumulative length; closed paths repeat their first point */
function mk(pts, closed, w, order) {
  if (closed) pts = [...pts, pts[0]];
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, len: L[L.length - 1], closed, w, order };
}
const circ = (r, n = 180, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => { const a = a0 + TAU * i / n; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; });
const poly = (r, n, a0) => Array.from({ length: n }, (_, i) => { const a = a0 + TAU * i / n; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; });
/* point at arc length s */
function at(p, s) {
  s = clamp(s, 0, p.len); let lo = 0, hi = p.L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p.L[m] <= s) lo = m; else hi = m; }
  const u = (s - p.L[lo]) / Math.max(1e-6, p.L[hi] - p.L[lo]);
  return [lerp(p.pts[lo][0], p.pts[hi][0], u), lerp(p.pts[lo][1], p.pts[hi][1], u), lo, hi];
}
/* add the sub-path between arc lengths a..b (a<b, both within 0..len) */
function sub(ctx, p, a, b) {
  if (b - a < 0.01) return;
  const A = at(p, a), B = at(p, b);
  ctx.moveTo(A[0], A[1]);
  for (let i = A[3]; i <= B[2]; i++) ctx.lineTo(p.pts[i][0], p.pts[i][1]);
  ctx.lineTo(B[0], B[1]);
}
/* trim with fractions start/end (+ offset, wraps on closed paths); returns head point */
function trim(ctx, p, s0, s1, off = 0) {
  if (s1 - s0 <= 0) return null;
  ctx.beginPath();
  if (s1 - s0 >= 1) { sub(ctx, p, 0, p.len); ctx.stroke(); return null; }
  let a = s0 + off, b = s1 + off;
  if (p.closed) { const k = Math.floor(a); a -= k; b -= k; if (b > 1) { sub(ctx, p, a * p.len, p.len); sub(ctx, p, 0, (b - 1) * p.len); } else sub(ctx, p, a * p.len, b * p.len); }
  else sub(ctx, p, clamp(a) * p.len, clamp(b) * p.len);
  ctx.stroke();
  return at(p, fract(b === 1 ? 0.99999 : b) * p.len);
}
let PATHS = [], GLY = [];
const S = M.def({
  id: 'e17', num: 17, ch: 3, title: '路徑描繪', en: 'DRAW-ON / TRIM PATHS', dur: 20, ground: 'light',
  prompt: '黑線幾何徽章（圓、六角、星、字母 S）自己畫出來：先只動 trim end，再讓 start 追 end 繞行，接著虛線偏移流動，start 追上把線擦掉，最後從中點往兩端畫開。每條路徑錯開 0.12 秒，白底黑線。',
  how: ['把路徑折成折線並累加弧長，只畫 start~end 那段', '閉合路徑加 offset 繞圈：超過 1 就拆兩段畫', '虛線用 setLineDash + lineDashOffset 隨時間流動'],
  practice: '用 trim 寫出你的簽名，筆速要有快慢。',
  cues: [{ t: 0.05, type: 'whoosh', dur: 1.2, v: 0.4 }, { t: 4, type: 'pop', v: 0.5 }, { t: 8, type: 'tick', v: 0.6 }, { t: 12, type: 'pop', v: 0.5 },
    { t: 14, type: 'whoosh', dur: 1.5, v: 0.5 }, { t: 16, type: 'bell', i: 4, v: 0.45, dec: 3 }],
  init() {
    PATHS = [];
    PATHS.push(mk(circ(318, 240), true, 6, 0));
    PATHS.push(mk(circ(288, 220, Math.PI / 2), true, 2, 1));
    PATHS.push(mk(poly(262, 6, -Math.PI / 2), true, 3, 2));
    PATHS.push(mk(poly(262, 3, -Math.PI / 2), true, 2.5, 3));
    PATHS.push(mk(poly(262, 3, Math.PI / 2), true, 2.5, 3.5));
    PATHS.push(mk(circ(140, 140, 0), true, 2, 4));
    for (let i = 0; i < 24; i++) { const a = -Math.PI / 2 + TAU * i / 24, r0 = i % 6 === 0 ? 334 : 340, r1 = 358;
      PATHS.push(mk([[CX + r0 * Math.cos(a), CY + r0 * Math.sin(a)], [CX + r1 * Math.cos(a), CY + r1 * Math.sin(a)]], false, i % 6 === 0 ? 4 : 2, 5 + i * 0.08)); }
    // the letter S, outline from the Archivo glyph
    const gl = glyphAt('S', 100, 800), sc = 0.25, cs = glyphContours(gl, 8);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    cs.forEach(c => c.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
    GLY = cs.map(c => mk(c.map(([x, y]) => [CX + (x - (x0 + x1) / 2) * sc, CY - (y - (y0 + y1) / 2) * sc]), true, 3, 6.5));
    PATHS.push(...GLY);
  },
  frame(ctx, t) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const P4 = 13.6, phase = t < 4 ? 0 : t < 8 ? 1 : t < 12 ? 2 : t < P4 ? 3 : 4;
    const names = [['01', 'TRIM END', '只動終點 end 0→100%'], ['02', 'START + END', 'start 追 end：一段光標繞行'], ['03', 'DASH OFFSET', '虛線 + 偏移流動'], ['04', 'TRIM START', '起點追上來：擦除'], ['05', 'SYMMETRIC', '從中點往兩端 0.5 ± x']];
    const nm = names[phase], la = ease(E.outCubic, [0, 4, 8, 12, P4][phase], [0, 4, 8, 12, P4][phase] + 0.4, t);
    text(ctx, nm[0], 48, 72, { size: 22, family: F.mono, weight: 500, alpha: 0.5 * la });
    text(ctx, nm[1], 92, 72, { size: 22, family: F.mono, weight: 500, spacing: 3, alpha: la });
    text(ctx, nm[2], 48, 110, { size: 26, family: F.tc, alpha: 0.75 * la });
    let rs = 0, re = 0, ro = 0;                    // readout values (for the master path = outer circle)
    for (const p of PATHS) {
      const d = p.order * 0.12;
      let s0 = 0, s1 = 0, off = 0, dash = null;
      if (phase === 0) { s1 = ease(E.inOutCubic, 0.05 + d, 1.9 + d, t); }
      else if (phase === 1) { const u = t - 4; s1 = 1; s0 = ease(E.inOutCubic, 0, 1.0, u) * 0.75; off = u < 1 ? 0 : (u - 1) * 0.42 * (p.order % 2 ? -1 : 1); if (!p.closed) { s0 = 0; s1 = 1 - 0.85 * ease(E.inOutSine, 0, 1, u) * (0.5 + 0.5 * Math.sin(u * 3 + p.order)); } }
      else if (phase === 2) { s1 = 1; dash = true; }
      else if (phase === 3) { s1 = 1; s0 = ease(E.inOutCubic, 12 + d * 0.4, 13.0 + d * 0.4, t); }
      else { const x = ease(E.outQuart, P4 + d * 0.8, P4 + 2.4 + d * 0.8, t); s0 = 0.5 - x / 2; s1 = 0.5 + x / 2; off = p.closed ? 0.25 * (p.order % 2 ? 1 : -1) : 0; }
      if (p === PATHS[0]) { rs = s0; re = s1; ro = off; }
      ctx.strokeStyle = fg(1); ctx.lineWidth = p.w;
      if (dash) {
        const u = t - 8, k = Math.floor(u / 1); // dash pattern changes every 2 beats
        const pats = [[38, 18], [12, 12], [1, 12], [60, 10]];
        const pat = pats[Math.min(3, Math.floor(u / 1))];
        ctx.setLineDash(p.closed ? pat : []); ctx.lineDashOffset = -(u * 90) * (p.order % 2 ? -1 : 1);
        ctx.beginPath(); sub(ctx, p, 0, p.len); ctx.stroke(); ctx.setLineDash([]);
        void k;
        continue;
      }
      const head = trim(ctx, p, s0, s1, off);
      // pen tip on drawing heads
      if (head && p.closed && p.w >= 2.5 && s1 - s0 < 0.999 && s1 - s0 > 0.002) { ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(head[0], head[1], p.w + 4, 0, TAU); ctx.fill(); }
    }
    // payoff: dashed inner circle keeps flowing after it is drawn
    if (phase === 4) {
      const a = ease(E.outCubic, 17, 18, t);
      if (false) { ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([2, 10]); ctx.lineDashOffset = -t * 40; ctx.lineWidth = 3; ctx.strokeStyle = fg(1); ctx.beginPath(); sub(ctx, PATHS[5], 0, PATHS[5].len); ctx.stroke(); ctx.restore(); }
      if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([1, 14]); ctx.lineDashOffset = t * 30; ctx.lineWidth = 4; ctx.strokeStyle = fg(1); ctx.beginPath(); for (let i = 0; i <= 200; i++) { const an = TAU * i / 200; i ? ctx.lineTo(CX + 303 * Math.cos(an), CY + 303 * Math.sin(an)) : ctx.moveTo(CX + 303, CY); } ctx.stroke(); ctx.restore(); }
    }
    // ---- trim track readout ----
    const tx = 120, tw = 840, ty = 935;
    ctx.fillStyle = fg(0.15); ctx.fillRect(tx, ty - 2, tw, 4);
    text(ctx, '0%', tx - 16, ty + 7, { size: 18, family: F.mono, align: 'right', alpha: 0.5 });
    text(ctx, '100%', tx + tw + 16, ty + 7, { size: 18, family: F.mono, alpha: 0.5 });
    ctx.lineCap = 'butt';
    if (phase === 2) {
      ctx.save(); ctx.setLineDash([[38, 18], [12, 12], [1, 12], [60, 10]][Math.min(3, Math.floor(t - 8))].map(v => v * 0.6)); ctx.lineDashOffset = -(t - 8) * 54;
      ctx.strokeStyle = fg(1); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + tw, ty); ctx.stroke(); ctx.restore();
      const pat = [[38, 18], [12, 12], [1, 12], [60, 10]][Math.min(3, Math.floor(t - 8))];
      text(ctx, `dash [${pat[0]}, ${pat[1]}]   offset ${(-(t - 8) * 90).toFixed(0)} px`, 540, ty + 70, { size: 24, family: F.mono, align: 'center' });
    } else {
      const segs = [];
      let a = rs + ro, b = re + ro; const k = Math.floor(a); a -= k; b -= k;
      if (re - rs >= 1) segs.push([0, 1]); else if (b > 1) { segs.push([a, 1]); segs.push([0, b - 1]); } else if (b > a) segs.push([a, b]);
      ctx.fillStyle = fg(1); segs.forEach(([u, v]) => ctx.fillRect(tx + tw * u, ty - 5, tw * (v - u), 10));
      const hs = re - rs >= 1 ? 0 : fract(a), he = re - rs >= 1 ? 1 : (b > 1 ? b - 1 : b);
      const handle = (u, lab, up) => { const x = tx + tw * u; ctx.fillStyle = fg(1); ctx.fillRect(x - 1.5, ty - 22, 3, 44);
        ctx.beginPath(); ctx.arc(x, up ? ty - 22 : ty + 22, 6, 0, TAU); ctx.fill();
        text(ctx, lab, x, up ? ty - 38 : ty + 50, { size: 18, family: F.mono, align: 'center', alpha: 0.75 }); };
      handle(hs, 'start', true); handle(he, 'end', false);
      text(ctx, `start ${(rs * 100).toFixed(0).padStart(3)}%   end ${(re * 100).toFixed(0).padStart(3)}%   offset ${(re - rs >= 1 ? 0 : (ro * 360) % 360).toFixed(0).padStart(4)}°`, 540, ty + 84, { size: 24, family: F.mono, align: 'center' });
    }
  },
});
void S;
