/* 19 遮罩揭示 — one clip path, five shapes: iris, wipe, venetian, grid, text. A live matte inset shows the mask itself. */
const WORD = 'MASK';
const PH = [
  { t0: 0, t1: 2.5, id: '01', name: 'IRIS', zh: '圓形光圈 r 0 → 780 px', ease: 'outExpo' },
  { t0: 2.5, t1: 5, id: '02', name: 'WIPE', zh: '斜向擦除 20°', ease: 'inOutQuart' },
  { t0: 5, t1: 7.5, id: '03', name: 'VENETIAN', zh: '百葉窗 10 片，錯開 0.08 s', ease: 'outCubic' },
  { t0: 7.5, t1: 10, id: '04', name: 'GRID', zh: '8×8 方格，依距離延遲', ease: 'outBack' },
  { t0: 10, t1: 14, id: '05', name: 'TEXT MASK', zh: '字形當遮罩：只在字裡看見 B', ease: 'outExpo' },
  { t0: 14, t1: 15.5, id: '06', name: 'INVERT', zh: '反轉：全畫面 rect + 字形，evenodd', ease: 'lin' },
  { t0: 15.5, t1: 20, id: '07', name: 'ZOOM-THROUGH', zh: '放大字形 ×40，鑽進 M 的筆畫', ease: 'inExpo' },
];
let WD = null;
function wordLayout(wdth) {
  const gl = [...WORD].map(c => glyphAt(c, wdth, 820));
  const total = gl.reduce((a, q) => a + q.adv, 0), sc = 900 / total;
  return { gl, sc, x0: 540 - total * sc / 2, base: 540 + 700 * sc / 2 };
}
/* build the mask path for phase k at progress t (scene seconds). All in stage coordinates. */
function maskPath(ctx, k, t) {
  const P_ = PH[k], u = t - (k >= 4 ? 10 : P_.t0);
  ctx.beginPath();
  if (k === 5) ctx.rect(-10, -10, SW + 20, SH + 20);
  if (k === 0) {
    const r = ease(E.outExpo, 0.05, 1.9, u) * 780, cx = lerp(380, 540, ease(E.inOutCubic, 0, 2, u)), cy = lerp(620, 540, ease(E.inOutCubic, 0, 2, u));
    ctx.arc(cx, cy, Math.max(0.1, r), 0, TAU);
  } else if (k === 1) {
    const a = 20 * Math.PI / 180, pos = lerp(-820, 820, ease(E.inOutQuart, 0.05, 1.8, u)), c = Math.cos(a), s = Math.sin(a);
    const pt = (x, y) => [540 + x * c - y * s, 540 + x * s + y * c];
    const q = [pt(-1600, -1600), pt(pos, -1600), pt(pos, 1600), pt(-1600, 1600)];
    ctx.moveTo(...q[0]); q.slice(1).forEach(p => ctx.lineTo(...p)); ctx.closePath();
  } else if (k === 2) {
    for (let i = 0; i < 10; i++) { const h = 108 * ease(E.outCubic, 0.05 + i * 0.08, 1.0 + i * 0.08, u); ctx.rect(0, i * 108, SW, h); }
  } else if (k === 3) {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const d = Math.hypot(i - 1.5, j - 6) / 9, e = ease(E.outBack, 0.05 + d * 0.9, 0.75 + d * 0.9, u), w = 135 * Math.max(0, e) * 1.002;
      ctx.rect(i * 135 + 67.5 - w / 2, j * 135 + 67.5 - w / 2, w, w);
    }
  } else {
    const wd = 100 + 22 * Math.sin((t - 10) * Math.PI / 2) * ease(E.inOutSine, 12, 13, t);
    const L = wordLayout(wd);
    // zoom-through at the end: scale around a point inside the M's left stem
    const z = Math.exp(ease(E.inExpo, 17.6, 19.2, t) * Math.log(40));
    const zx = L.x0 + 150 * L.sc, zy = L.base - 330 * L.sc;
    let x = L.x0;
    L.gl.forEach((gl, i) => {
      const rise = (1 - ease(E.outExpo, 0.1 + i * 0.12, 1.2 + i * 0.12, u)) * 700;
      const sx = q => zx + (q - zx) * z;
      // traceGlyph with zoom: scale about (zx, zy)
      traceGlyph(ctx, gl, sx(x), zy + (L.base + rise - zy) * z, L.sc * z);
      x += gl.adv * L.sc;
    });
  }
  return k === 5 ? 'evenodd' : 'nonzero';
}
function layerA(ctx, t) {
  ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH);
  ctx.fillStyle = g(0, 0.16);
  for (let x = 60; x < SW; x += 60) ctx.fillRect(x, 0, 1.5, SH);
  for (let y = 60; y < SH; y += 60) ctx.fillRect(0, y, SW, 1.5);
  ctx.strokeStyle = K; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(540, 540, 150, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(540, 360); ctx.lineTo(540, 720); ctx.moveTo(360, 540); ctx.lineTo(720, 540); ctx.lineWidth = 1.5; ctx.stroke();
  text(ctx, 'LAYER A', 60, 1030, { size: 26, family: F.mono, weight: 500, color: K, spacing: 6 });
  text(ctx, '底圖', 1020, 1030, { size: 26, family: F.tc, color: K, align: 'right' });
}
function layerB(ctx, t) {
  ctx.fillStyle = K; ctx.fillRect(0, 0, SW, SH);
  ctx.strokeStyle = P; ctx.lineWidth = 15;
  const ph = (t * 40) % 40;
  ctx.beginPath();
  for (let r = ph + 4; r < 800; r += 40) { ctx.moveTo(540 + r, 540); ctx.arc(540, 540, r, 0, TAU); }
  ctx.stroke();
  ctx.fillStyle = K; ctx.fillRect(40, 990, 300, 60); ctx.fillRect(800, 990, 240, 60);
  text(ctx, 'LAYER B', 60, 1030, { size: 26, family: F.mono, weight: 500, color: P, spacing: 6 });
  text(ctx, '被揭示', 1020, 1030, { size: 26, family: F.tc, color: P, align: 'right' });
}
const S = M.def({
  id: 'e19', num: 19, ch: 3, title: '遮罩揭示', en: 'MASK REVEALS', dur: 20, ground: 'light',
  prompt: '兩層畫面：白底格線 A、黑底同心圓環 B。用同一個遮罩技巧輪流揭示 B：圓形光圈、20° 斜擦、10 片百葉窗、8×8 方格依距離彈出，再用「MASK」字形當遮罩、反轉一次，最後鑽進 M 的筆畫轉場。右上角即時顯示遮罩本身。',
  how: ['先畫 A，再 clip(遮罩路徑) 畫 B；路徑每格重算', '百葉窗、方格 = 多個 rect 放進同一條路徑錯開', '文字遮罩：字形輪廓 traceGlyph 進路徑，放大 40 倍穿越'],
  practice: '用時鐘指針掃過的扇形，做 12 秒的揭示。',
  cues: [{ t: 0.05, type: 'whoosh', dur: 1.0, v: 0.45 }, { t: 2.5, type: 'whoosh', dur: 1.2, v: 0.45 }, { t: 5, type: 'tick', v: 0.6 }, { t: 7.5, type: 'pop', v: 0.5 },
    { t: 10.1, type: 'thud', v: 0.6 }, { t: 17.6, type: 'riser', t1: 19.2, v: 0.45 }, { t: 19.2, type: 'impact', v: 0.6 }],
  frame(ctx, t) {
    const k = PH.findIndex(p => t < p.t1);
    layerA(ctx, t);
    ctx.save(); const rule = maskPath(ctx, k, t); ctx.clip(rule); layerB(ctx, t); ctx.restore();
    // label chip
    const P_ = PH[k], la = ease(E.outCubic, P_.t0, P_.t0 + 0.35, t);
    ctx.save(); ctx.globalAlpha = la;
    font(ctx, 22, F.mono, 500); ctx.letterSpacing = '3px';
    const lab = `${P_.id}  ${P_.name}`, w1 = ctx.measureText(lab).width + 28;
    ctx.fillStyle = K; ctx.fillRect(40, 40, w1, 40); ctx.fillStyle = P; ctx.fillText(lab, 54, 68);
    ctx.letterSpacing = '0px'; font(ctx, 24, F.tc, 400);
    const w2 = ctx.measureText(P_.zh).width + 28;
    ctx.fillStyle = P; ctx.fillRect(40, 80, w2, 42); ctx.strokeStyle = K; ctx.lineWidth = 2; ctx.strokeRect(41, 81, w2 - 2, 40);
    ctx.fillStyle = K; ctx.fillText(P_.zh, 54, 110);
    ctx.restore();
    // matte inset: the mask itself, white = shown
    const ix = 860, iy = 40, iw = 180;
    ctx.save();
    ctx.fillStyle = K; ctx.fillRect(ix - 4, iy - 4, iw + 8, iw + 8);
    ctx.fillStyle = P; ctx.fillRect(ix - 2, iy - 2, iw + 4, iw + 4);
    ctx.fillStyle = K; ctx.fillRect(ix, iy, iw, iw);
    ctx.beginPath(); ctx.rect(ix, iy, iw, iw); ctx.clip();
    ctx.translate(ix, iy); ctx.scale(iw / SW, iw / SH);
    ctx.fillStyle = P; ctx.fill(maskPath(ctx, k, t));
    ctx.restore();
    ctx.fillStyle = K; ctx.fillRect(ix - 4, iy + iw + 4, iw + 8, 34);
    text(ctx, 'MATTE 遮罩', ix + iw / 2, iy + iw + 29, { size: 20, family: F.tc, color: P, align: 'center' });
  },
});
void S; void WD;
