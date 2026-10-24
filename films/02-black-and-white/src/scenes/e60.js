/* 60 無限縮放 — Droste effect. One tile (a gallery wall) holds a frame whose picture IS the tile, mapped by a
   similarity T (scale r, rotation θ, centre C). The camera zooms toward T's fixed point p* by r^(−u):
   after one full level (u = 1) the view equals T⁻¹, so it loops seamlessly — forever. */
const R0 = 0.4, O = 540;
let TILE = null, BG = null, MIP1 = null, MIP2 = null, KEY = '';
const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const sim = (cx, cy, s, a, ox, oy) => { const c = Math.cos(a) * s, n = Math.sin(a) * s; return [c, n, -n, c, cx - (c * ox - n * oy), cy - (n * ox + c * oy)]; };
const app = (A, x, y) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];

function params(t) {
  const th = (20 * Math.PI / 180) * (ease(E.inOutCubic, 6, 8, t) - ease(E.inOutCubic, 12, 14, t) * 0.55);
  const off = ease(E.inOutCubic, 12, 14, t);
  return { r: R0, th, cx: 540 + 70 * off, cy: 470 - 40 * off };
}
/* levels travelled: 1 level per bar, doubling to 1 per beat in the payoff */
const levels = t => t / 2 + (t < 16 ? 0 : t < 17 ? 0.25 * (t - 16) ** 2 : 0.25 + 0.5 * (t - 17));

function figure(ctx, x, y, h) {
  const u = h / 100; ctx.save(); ctx.translate(x, y);
  ctx.lineCap = 'round'; ctx.lineWidth = 4.6 * u;
  ctx.beginPath(); ctx.moveTo(-3 * u, -44 * u); ctx.lineTo(-6 * u, 0); ctx.moveTo(3 * u, -44 * u); ctx.lineTo(6 * u, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8 * u, -79 * u); ctx.quadraticCurveTo(0, -83 * u, 9 * u, -79 * u); ctx.lineTo(13 * u, -36 * u); ctx.lineTo(-13 * u, -34 * u); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0.5 * u, -88 * u, 7 * u, 0, TAU); ctx.fill();
  ctx.fillRect(-10 * u, -95 * u, 25 * u, 2.6 * u); ctx.fillRect(-6.5 * u, -104 * u, 13 * u, 10 * u);
  ctx.restore();
}

function buildBG() {
  const c = makeCanvas(1080, 1080), x = c.getContext('2d');
  x.fillStyle = g(0.05); x.fillRect(0, 0, 1080, 1080);
  const sp = x.createRadialGradient(560, 380, 40, 560, 470, 620);
  sp.addColorStop(0, g(0.34)); sp.addColorStop(0.55, g(0.14)); sp.addColorStop(1, g(0.05));
  x.fillStyle = sp; x.fillRect(0, 0, 1080, 830);
  x.fillStyle = g(0, 0.35); for (let i = 0; i < 1080; i += 54) x.fillRect(i, 0, 2, 830);
  // floor with boards converging to the frame
  x.fillStyle = g(0.2); x.fillRect(0, 830, 1080, 250);
  x.strokeStyle = g(0.08); x.lineWidth = 2;
  for (let i = -12; i <= 12; i++) { x.beginPath(); x.moveTo(540 + i * 40, 830); x.lineTo(540 + i * 190, 1080); x.stroke(); }
  x.fillStyle = g(0.92); x.fillRect(0, 826, 1080, 4);
  // bench and visitor (white)
  x.fillStyle = g(0.85); x.fillRect(770, 760, 210, 18); x.fillRect(785, 778, 12, 60); x.fillRect(953, 778, 12, 60);
  x.fillStyle = P; x.strokeStyle = P; figure(x, 220, 905, 360);
  // visitor's shadow
  x.fillStyle = g(0, 0.4); x.beginPath(); x.ellipse(240, 908, 70, 10, 0, 0, TAU); x.fill();
  return c;
}

const S = M.def({
  id: 'e60', num: 60, ch: 8, title: '無限縮放', en: 'INFINITE ZOOM · DROSTE', dur: 20, ground: 'dark',
  prompt: '畫廊牆上掛一幅畫，畫裡是同一面牆和同一幅畫（Droste 效果）。鏡頭以指數 r^(−t) 往畫中推進，每 2 秒一層、無縫循環；之後每層旋轉 20° 成螺旋、再讓中心偏移，最後加速到每拍一層。標出層數與累積倍率。黑白。',
  how: ['相似變換 T（縮放 r=0.4、旋轉 θ、平移）把整張圖放進畫框', '相機繞 T 的不動點 p* 縮放 r^(−u)，u=1 時等於 T⁻¹', '由深到淺畫 8 層，畫框內挖空讓下一層透出'],
  practice: '用一張照片做出「畫中畫」的 2 秒無縫縮放循環。',
  cues: [...Array(8)].map((_, i) => ({ t: i * 2, type: 'bell', i: i % 5, v: 0.35 }))
    .concat([16, 17, 17.67, 18.33, 19].map(t => ({ t, type: 'tick' })), [{ t: 6, type: 'whoosh', dur: 1.2 }, { t: 12, type: 'whoosh', dur: 1.2 }, { t: 16, type: 'riser', t1: 19.5 }]),
  init() { BG = buildBG(); TILE = makeCanvas(1080, 1080); MIP1 = makeCanvas(540, 540); MIP2 = makeCanvas(270, 270); KEY = ''; },
  frame(ctx, t) {
    const p = params(t), Tm = sim(p.cx, p.cy, p.r, p.th, O, O);
    // tile = background + frame border + transparent hole (the next level shows through)
    const key = `${p.th.toFixed(5)},${p.cx.toFixed(3)},${p.cy.toFixed(3)}`;
    if (key !== KEY) {            // rebuild the tile (and two smaller mips for the deep levels) only when T changes
      KEY = key;
      const x = TILE.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'copy'; x.drawImage(BG, 0, 0); x.globalCompositeOperation = 'source-over';
      x.save(); x.transform(...Tm);
      x.fillStyle = g(0, 0.55); x.fillRect(30, 60, 1080 + 60, 1080 + 60);                       // drop shadow
      x.fillStyle = P; x.fillRect(-70, -70, 1220, 1220);                                     // white frame
      x.fillStyle = K; x.fillRect(-18, -18, 1116, 1116);                                     // black fillet
      x.fillStyle = g(0.85); x.fillRect(440, 1150, 200, 50);                                // caption plate
      x.globalCompositeOperation = 'destination-out'; x.fillRect(0, 0, 1080, 1080);
      x.restore();
      for (const m of [MIP1, MIP2]) { const mx = m.getContext('2d'); mx.globalCompositeOperation = 'copy'; mx.drawImage(TILE, 0, 0, m.width, m.height); }
    }
    // camera: zoom about the fixed point p* of T
    const a = Tm[0], b = Tm[1];                            // T(p) = A p + e ; p* = (I − A)^−1 e
    const m00 = 1 - a, m01 = b, m10 = -b, m11 = 1 - a, det = m00 * m11 - m01 * m10;
    const px = (m11 * Tm[4] - m01 * Tm[5]) / det, py = (-m10 * Tm[4] + m00 * Tm[5]) / det;
    const L = levels(t), u = fract(L), lvl = Math.floor(L);
    const V = sim(px, py, Math.pow(p.r, -u), -p.th * u, px, py);
    ctx.fillStyle = g(0.05); ctx.fillRect(0, 0, SW, SH);
    const N = 8; const mats = [V];
    for (let k = 1; k <= N; k++) mats.push(mul(mats[k - 1], Tm));
    for (let k = N; k >= 0; k--) { ctx.save(); ctx.transform(...mats[k]); ctx.drawImage(k === 0 ? TILE : k === 1 ? MIP1 : MIP2, 0, 0, 1080, 1080); ctx.restore(); }
    // ---- overlays ----
    ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.strokeStyle = P; ctx.fillStyle = P;
    // outline of the next level (the picture we are diving into)
    const corners = [[0, 0], [1080, 0], [1080, 1080], [0, 1080]].map(([cx, cy]) => app(mats[1], cx, cy));
    const ola = ease(E.outCubic, 0.1, 0.6, t) * (t > 18.6 ? 1 - ease(E.inCubic, 18.6, 19.4, t) : 1);
    ctx.globalAlpha = ola * 0.9; ctx.lineWidth = 2.5; ctx.setLineDash([12, 9]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); corners.forEach(([cx, cy], i) => i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy)); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    // fixed point p*
    const [sx, sy] = app(V, px, py), pa = ease(E.outCubic, 12.2, 12.8, t) * (1 - ease(E.inCubic, 15.6, 16.2, t));
    if (pa > 0) { ctx.globalAlpha = pa; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 30, sy); ctx.lineTo(sx + 30, sy); ctx.moveTo(sx, sy - 30); ctx.lineTo(sx, sy + 30); ctx.stroke(); ctx.beginPath(); ctx.arc(sx, sy, 12, 0, TAU); ctx.stroke(); }
    ctx.restore();
    if (pa > 0) {
      font(ctx, 20, F.mono, 500); const lw = ctx.measureText('p* 不動點').width;
      ctx.fillStyle = g(0.04, 0.88 * pa); ctx.fillRect(sx + 32, sy - 38, lw + 16, 30);
      text(ctx, 'p* 不動點', sx + 40, sy - 16, { size: 20, family: F.mono, weight: 500, color: P, alpha: pa });
    }
    // phase label (top-left) & big cumulative zoom (top-right)
    const PH = [[0, '01', '等比縮放', `r = 0.40 · θ = 0°`], [6, '02', '每層旋轉 → 螺旋', `θ = ${(p.th * 180 / Math.PI).toFixed(0)}°`], [12, '03', '偏心：朝不動點推進', 'C ≠ 中心'], [16, '04', '加速：每拍一層', '1 level / beat']];
    const ph = PH.reduce((acc, q) => t >= q[0] ? q : acc, PH[0]);
    const la = ease(E.outCubic, ph[0] + 0.1, ph[0] + 0.5, t);
    ctx.fillStyle = 'rgba(11,11,11,0.82)'; ctx.fillRect(40, 40, 440, 132); ctx.fillRect(620, 40, 420, 132);
    text(ctx, `${ph[1]} / 04`, 58, 76, { size: 20, family: F.mono, weight: 500, color: P, spacing: 3, alpha: 0.55 * la });
    text(ctx, ph[2], 58, 124, { size: 40, family: F.tcBlack, weight: 900, color: P, alpha: la });
    text(ctx, ph[3], 60, 156, { size: 18, family: F.mono, weight: 500, color: P, alpha: 0.65 * la });
    const z = Math.pow(1 / p.r, L);
    text(ctx, 'ZOOM', 1022, 76, { size: 18, family: F.mono, weight: 500, color: P, align: 'right', spacing: 4, alpha: 0.55 });
    text(ctx, '×' + Math.round(z).toLocaleString('en-US'), 1022, 132, { size: 50, family: F.mono, weight: 500, color: P, align: 'right' });
    text(ctx, `LEVEL ${String(lvl).padStart(2, '0')} · s = r^(−t/T)`, 1022, 160, { size: 18, family: F.mono, color: P, align: 'right', alpha: 0.6 });
    // corner tag on the next level
    if (ola > 0) {
      const [qx, qy] = corners[0];
      if (qx > 40 && qx < 900 && qy > 200 && qy < 880) text(ctx, `L${lvl + 1} ×${p.r.toFixed(2)}`, qx + 4, qy - 12, { size: 18, family: F.mono, weight: 500, color: P, alpha: ola * 0.9 });
    }
    // log-scale graph: exponential zoom is a straight line in log space
    const gx = 40, gy = 900, gw = 330, gh = 140;
    ctx.fillStyle = 'rgba(11,11,11,0.82)'; ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = g(1, 0.25); ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
    const Lmax = levels(20), X = tt => gx + 16 + (gw - 32) * tt / 20, Y = l => gy + gh - 18 - (gh - 50) * l / Lmax;
    ctx.strokeStyle = g(1, 0.3); ctx.beginPath(); for (let tt = 0; tt <= 20; tt += 0.25) ctx.lineTo(X(tt), Y(levels(tt))); ctx.stroke();
    ctx.strokeStyle = P; ctx.lineWidth = 2.5; ctx.beginPath(); for (let tt = 0; tt <= t; tt += 0.1) ctx.lineTo(X(tt), Y(levels(tt))); ctx.lineTo(X(t), Y(L)); ctx.stroke();
    ctx.fillStyle = P; ctx.beginPath(); ctx.arc(X(t), Y(L), 5, 0, TAU); ctx.fill();
    text(ctx, 'log(zoom)', gx + 14, gy + 26, { size: 18, family: F.mono, color: P, alpha: 0.6 });
    text(ctx, '直線 = 等速感', gx + gw - 14, gy + 26, { size: 18, family: F.tc, color: P, align: 'right', alpha: 0.8 });
  },
});
