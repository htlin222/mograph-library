/* 57 構圖法則 — one seaside shot, re-framed four times: centre, thirds, golden ratio, negative space.
   Guides are stroked with 'difference' so they read white over black and black over white. */
const PHI = (1 + Math.sqrt(5)) / 2;

/* golden spiral: quarter arcs in successively smaller squares of a φ rectangle, centred vertically */
const SPIRAL = (() => {
  let x = 0, w = 1080, h = 1080 / PHI, y = (1080 - h) / 2;
  const arcs = [], rects = [];
  for (let i = 0; i < 11; i++) {
    const d = i % 4; let s;
    if (d === 0) { s = h; rects.push([x, y, s, s]); arcs.push([x + s, y + s, s, Math.PI, 1.5 * Math.PI]); x += s; w -= s; }
    else if (d === 1) { s = w; rects.push([x, y, s, s]); arcs.push([x, y + s, s, 1.5 * Math.PI, 2 * Math.PI]); y += s; h -= s; }
    else if (d === 2) { s = h; rects.push([x + w - s, y, s, s]); arcs.push([x + w - s, y, s, 0, 0.5 * Math.PI]); w -= s; }
    else { s = w; rects.push([x, y + h - s, s, s]); arcs.push([x + s, y + h - s, s, 0.5 * Math.PI, Math.PI]); h -= s; }
  }
  return { arcs, rects, eye: [x + w / 2, y + h / 2], top: (1080 - 1080 / PHI) / 2 };
})();

/* framings: horizon y, sun (x, y, r), figure (x, feet y, height, facing) */
const EY = SPIRAL.eye;
const SHOTS = [
  { key: 'START', hy: 640, sx: 770, sy: 520, sr: 120, fx: 760, fy: 820, fh: 300, dir: 1 },
  { key: 'CENTER', zh: '中心構圖', en: 'CENTRE · SYMMETRY', note: '主體壓在正中：穩定、正面、儀式感', hy: 600, sx: 540, sy: 560, sr: 170, fx: 540, fy: 740, fh: 330, dir: 1 },
  { key: 'THIRDS', zh: '三分法', en: 'RULE OF THIRDS', note: '地平線放下三分線，頭與太陽各壓一個交點', hy: 720, sx: 720, sy: 360, sr: 92, fx: 360, fy: 760, fh: 432, dir: 1 },
  { key: 'GOLDEN', zh: '黃金比例', en: 'GOLDEN RATIO · 1 : 1.618', note: '地平線放在 0.618，人物落在螺旋的眼', hy: 1080 / PHI, sx: 250, sy: 420, sr: 64, fx: EY[0], fy: EY[1] + 236, fh: 270, dir: -1 },
  { key: 'NEGATIVE', zh: '留白', en: 'NEGATIVE SPACE · LEAD ROOM', note: '主體縮小到角落，前方留出視線空間', hy: 860, sx: 300, sy: 330, sr: 34, fx: 830, fy: 900, fh: 100, dir: -1 },
  { key: 'FINAL', zh: '成片', en: 'FINAL · 2.39 : 1', note: '', hy: 690, sx: 715, sy: 690, sr: 210, fx: 360, fy: 790, fh: 230, dir: 1 },
];
const T0 = [0, 0.2, 4, 8, 12, 16];             // when each framing starts (move lasts 1.1 s)
const KEYS = ['hy', 'sx', 'sy', 'sr', 'fx', 'fy', 'fh'];
function shotAt(t) {
  let i = 0; while (i < T0.length - 1 && t >= T0[i + 1]) i++;
  const a = SHOTS[Math.max(0, i - 1)], b = SHOTS[i];
  const k = i === 0 ? 1 : ease(E.inOutCubic, T0[i], T0[i] + 1.1, t);
  const o = { i, k, dir: k < 0.5 ? a.dir : b.dir };
  for (const key of KEYS) o[key] = lerp(a[key], b[key], k);
  return o;
}

const SAND = (() => { const r = rng(57), a = []; for (let i = 0; i < 260; i++) a.push([r(), r(), r()]); return a; })();

function figure(ctx, x, y, h, dir, walk) {
  const u = h / 100;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const sw = Math.sin(walk) * 0.32;
  ctx.lineCap = 'round'; ctx.lineWidth = 4.6 * u;
  ctx.beginPath();
  ctx.moveTo(-2 * u, -44 * u); ctx.lineTo(-6 * u + Math.sin(sw) * 44 * u, (-44 + Math.cos(sw) * 44) * u);
  ctx.moveTo(2 * u, -44 * u); ctx.lineTo(6 * u - Math.sin(sw) * 44 * u, (-44 + Math.cos(sw) * 44) * u);
  ctx.stroke();
  ctx.beginPath();                                  // long coat
  ctx.moveTo(-8 * u, -79 * u); ctx.quadraticCurveTo(0, -83 * u, 9 * u, -79 * u);
  ctx.lineTo(13 * u, -36 * u); ctx.lineTo(-13 * u, -34 * u); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0.5 * u, -88 * u, 7 * u, 0, TAU); ctx.fill();   // head
  ctx.fillRect(-10 * u, -95 * u, 25 * u, 2.6 * u);                       // hat brim (forward = facing)
  ctx.fillRect(-6.5 * u, -104 * u, 13 * u, 10 * u);                      // hat crown
  ctx.restore();
}

function scene(ctx, c, t) {
  const hy = c.hy;
  ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH);
  // sky: a faint graded band just above the horizon
  const sg = ctx.createLinearGradient(0, hy - 260, 0, hy);
  sg.addColorStop(0, 'rgba(11,11,11,0)'); sg.addColorStop(1, 'rgba(11,11,11,0.07)');
  ctx.fillStyle = sg; ctx.fillRect(0, hy - 260, SW, 260);
  // sun (clipped by horizon)
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SW, hy); ctx.clip();
  ctx.fillStyle = K; ctx.beginPath(); ctx.arc(c.sx, c.sy, c.sr, 0, TAU); ctx.fill();
  ctx.restore();
  // wet sand / sea: engraved lines, denser near the horizon
  const N = 46, depth = SH - hy;
  for (let i = 0; i < N; i++) {
    const q = i / N, y = hy + depth * Math.pow(q, 1.7);
    ctx.fillStyle = K; ctx.globalAlpha = lerp(0.85, 0.22, q);
    ctx.fillRect(0, y, SW, lerp(1.2, 2.4, q));
    // sun reflection: broken dashes under the sun
    const vis = clamp((c.sy + c.sr - hy + c.sr * 0.6) / (c.sr * 1.6));
    if (vis > 0) {
      const wv = c.sr * lerp(1.1, 0.35, q) * (0.6 + 0.4 * noise(i * 0.7, t * 0.8, 3)) * vis;
      ctx.globalAlpha = lerp(1, 0.5, q);
      ctx.fillRect(c.sx - wv + noise(i, t * 0.5) * 12, y - 1, wv * 2, lerp(3, 7, q));
    }
  }
  ctx.globalAlpha = 1;
  // figure + broken reflection
  const walk = c.walk || 0;
  // paper rim (8 offset copies) so the silhouette separates from the black sun
  ctx.fillStyle = P; ctx.strokeStyle = P;
  const rim = Math.max(3, c.fh * 0.014);
  for (let j = 0; j < 8; j++) figure(ctx, c.fx + Math.cos(j * TAU / 8) * rim, c.fy + Math.sin(j * TAU / 8) * rim, c.fh, c.dir, walk);
  ctx.fillStyle = K; ctx.strokeStyle = K;
  figure(ctx, c.fx, c.fy, c.fh, c.dir, walk);
  ctx.save(); ctx.beginPath();
  for (let y = c.fy; y < c.fy + c.fh; y += 9) ctx.rect(c.fx - c.fh, y, c.fh * 2, 5.5);
  ctx.clip(); ctx.globalAlpha = 0.28; ctx.translate(0, 2 * c.fy); ctx.scale(1, -1);
  figure(ctx, c.fx, c.fy, c.fh, c.dir, walk);
  ctx.restore();
}

/* guides (difference: always visible) */
function dline(ctx, x0, y0, x1, y1, k) { if (k <= 0) return; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); ctx.stroke(); }
function ring(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fill ? ctx.fill() : ctx.stroke(); }
function guides(ctx, i, k, a, c) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.globalAlpha = a;
  ctx.strokeStyle = P; ctx.fillStyle = P; ctx.lineWidth = 2;
  const key = SHOTS[i].key;
  if (key === 'CENTER') {
    ctx.setLineDash([10, 10]);
    dline(ctx, 540, 0, 540, 1080, k); dline(ctx, 0, 540, 1080, 540, k);
    ctx.globalAlpha = a * 0.45; dline(ctx, 0, 0, 1080, 1080, k); dline(ctx, 1080, 0, 0, 1080, k);
    ctx.setLineDash([]); ctx.globalAlpha = a; ctx.lineWidth = 3; ring(ctx, 540, 540, 26 * k);
  } else if (key === 'THIRDS' || key === 'FINAL') {
    for (const v of [360, 720]) { dline(ctx, v, 0, v, 1080, k); dline(ctx, 0, v, 1080, v, k); }
    if (key === 'THIRDS') {
      const head = [c.fx, c.fy - c.fh * 0.88], sun = [c.sx, c.sy];
      for (const [x, y] of [[360, 360], [720, 360], [360, 720], [720, 720]]) {
        const near = Math.min(Math.hypot(head[0] - x, head[1] - y), Math.hypot(sun[0] - x, sun[1] - y));
        ctx.lineWidth = 3; ring(ctx, x, y, 18 * k);
        if (near < 30) ring(ctx, x, y, 9 * k, true);
      }
    }
  } else if (key === 'GOLDEN') {
    const g1 = 1080 / PHI / PHI, g2 = 1080 / PHI;
    ctx.globalAlpha = a * 0.7;
    for (const v of [g1, g2]) { dline(ctx, v, 0, v, 1080, k); dline(ctx, 0, v, 1080, v, k); }
    ctx.globalAlpha = a * 0.35; ctx.lineWidth = 1.5;
    SPIRAL.rects.forEach((r, j) => { if (j < 8 * k) ctx.strokeRect(r[0], r[1], r[2], r[3]); });
    ctx.globalAlpha = a; ctx.lineWidth = 3.5;
    const n = SPIRAL.arcs.length * k;
    ctx.beginPath();
    SPIRAL.arcs.forEach((s, j) => { if (j >= n) return; const f = clamp(n - j); ctx.arc(s[0], s[1], s[2], s[3], s[3] + (s[4] - s[3]) * f); });
    ctx.stroke();
    ring(ctx, EY[0], EY[1], 8 * k, true);
  } else if (key === 'NEGATIVE') {
    // hatch the empty field lightly, mark the subject's box and the lead room
    ctx.globalAlpha = a * 0.22; ctx.lineWidth = 1.5;
    ctx.save(); ctx.beginPath(); ctx.rect(40, 176, 700 * k, 614); ctx.clip();
    for (let d = -1080; d < 1080; d += 22) { ctx.beginPath(); ctx.moveTo(d, 150); ctx.lineTo(d + 640, 790); ctx.stroke(); }
    ctx.restore();
    ctx.globalAlpha = a; ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]); ctx.strokeRect(c.fx - c.fh * 0.3, c.fy - c.fh * 1.08, c.fh * 0.6, c.fh * 1.1); ctx.setLineDash([]);
    const ax = c.fx - c.fh * 0.4, ay = c.fy - c.fh * 0.88, len = 420 * k;
    ctx.lineWidth = 3; dline(ctx, ax, ay, ax - len, ay, 1);
    if (k > 0.2) { ctx.beginPath(); ctx.moveTo(ax - len - 4, ay); ctx.lineTo(ax - len + 16, ay - 10); ctx.lineTo(ax - len + 16, ay + 10); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}

const S = M.def({
  id: 'e57', num: 57, ch: 8, title: '構圖法則', en: 'COMPOSITION', dur: 20, ground: 'light',
  prompt: '同一個海邊鏡頭（黑太陽、戴帽人影、倒影）連續重新構圖四次：中心、三分法、黃金比例螺旋、留白；每次 1.1 秒 inOutCubic 移動到位，疊上對應的參考線並標名稱，最後加 2.39:1 黑邊成片。黑白版畫風。',
  how: ['三分法：地平線放 y=720，人頭與太陽各壓一個交點', '黃金螺旋：φ 矩形逐次切正方形畫四分之一圓弧', '參考線用 difference 混合，壓在黑或白上都看得見'],
  practice: '拍一張照片，分別裁成中心、三分、留白三種構圖。',
  cues: [{ t: 0.2, type: 'whoosh', dur: 0.8 }, { t: 4, type: 'whoosh', dur: 0.8 }, { t: 8, type: 'whoosh', dur: 0.8 }, { t: 12, type: 'whoosh', dur: 0.8 }, { t: 16, type: 'impact', v: 0.5 },
    { t: 5.1, type: 'tick' }, { t: 9.1, type: 'tick' }, { t: 13.1, type: 'tick' }, { t: 1.3, type: 'tick' }],
  frame(ctx, t) {
    const c = shotAt(t);
    // payoff: the figure walks along the lower third; the sun keeps sinking
    if (t > 16) {
      const u = t - 16, kk = ease(E.inOutCubic, 16, 17.1, t);
      c.fx += u * 26 * kk; c.walk = u * 6.2 * kk; c.sy += u * 9 * kk;
    }
    scene(ctx, c, t);
    // guides: fade previous out quickly, draw the new set on
    const cur = c.i;
    if (cur >= 1) {
      const t0 = T0[cur], drawK = ease(E.outCubic, t0 + 0.35, t0 + 1.3, t);
      const alive = cur === 5 ? 0.35 * (1 - ease(E.inOutCubic, 17.5, 19.5, t)) : 1;
      guides(ctx, cur, drawK, alive, c);
      if (cur >= 2) guides(ctx, cur - 1, 1, 1 - ease(E.outCubic, t0, t0 + 0.35, t), shotAt(t0 - 0.01));
    } else guides(ctx, 1, ease(E.outCubic, 0.1, 1.2, t), 1, c);
    // letterbox on the payoff
    const lb = ease(E.inOutCubic, 16.2, 17.4, t) * (1080 - 1080 / 2.39) / 2;
    if (lb > 0) { ctx.fillStyle = K; ctx.fillRect(0, 0, SW, lb); ctx.fillRect(0, SH - lb, SW, lb); }
    // labels
    const sh = SHOTS[Math.max(1, cur)];
    const la = ease(E.outCubic, T0[Math.max(1, cur)] + 0.2, T0[Math.max(1, cur)] + 0.7, t);
    const onDark = cur === 5;
    const col = onDark ? P : K;
    if (cur < 5) {
      ctx.save(); ctx.globalAlpha = la;
      text(ctx, `0${Math.max(1, cur)} / 04`, 44, 64, { size: 20, family: F.mono, weight: 500, color: col, spacing: 3, alpha: 0.6 });
      text(ctx, sh.zh, 44, 122, { size: 50, family: F.tcBlack, weight: 900, color: col });
      text(ctx, sh.en, 46, 156, { size: 18, family: F.mono, weight: 500, color: col, spacing: 4, alpha: 0.65 });
      ctx.restore();
      // readout: subject position in frame units
      const hx = c.fx / 1080, hyy = (c.fy - c.fh * 0.88) / 1080;
      ctx.save(); ctx.globalAlpha = la;
      ctx.fillStyle = P; ctx.fillRect(40, 1004, 420, 38);
      text(ctx, `頭 (${hx.toFixed(2)}, ${hyy.toFixed(2)})  地平線 ${(c.hy / 1080).toFixed(3)}`, 50, 1030, { size: 18, family: F.mono, weight: 500, color: K });
      ctx.restore();
      text(ctx, sh.note, 1040, 64, { size: 22, family: F.tc, align: 'right', color: K, alpha: la * 0.85 });
    } else {
      const a = ease(E.outCubic, 17.2, 17.9, t);
      text(ctx, 'FINAL · 2.39 : 1', 44, 82, { size: 20, family: F.mono, weight: 500, color: P, spacing: 5, alpha: a });
      text(ctx, '三分法 + 留白 + 動態引導', 1036, 82, { size: 22, family: F.tc, align: 'right', color: P, alpha: a * 0.8 });
      text(ctx, `SUN ↓  ·  WALK →`, 44, SH - 52, { size: 18, family: F.mono, color: P, spacing: 4, alpha: a * 0.6 });
    }
  },
});
