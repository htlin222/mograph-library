/* 59 推軌變焦 — a real 3D corridor (checker floor, columns, lit doorway) through a pinhole camera.
   Dolly zoom keeps f / d constant: the subject stays the same size while the background perspective stretches. */
const CY = 470, EYE = 1.6, SUBH = 1.8, KDZ = 200;          // horizon y, eye height, subject height, f = KDZ·d
const WALLZ = 30;
/* camera keyframes: [t0, t1, d0, d1, mode]  mode: 'dz' f=KDZ·d, 'dolly' f fixed, 'zoom' d fixed */
const KEYS = [
  [0.0, 3.4, 3, 9, 'dz'],
  [4.0, 7.2, 9, 6, 'dolly', 1800],
  [8.0, 11.2, 6, 6, 'zoom', 1800, 1200],
  [12.0, 15.4, 6, 2.2, 'dz'],
  [16.0, 19.6, 2.2, 12, 'dz'],
];
const PH = [
  { t: 0, n: '01', zh: '推軌變焦', en: 'DOLLY ZOOM · VERTIGO' },
  { t: 3.6, n: '02', zh: '只推軌', en: 'DOLLY ONLY · f FIXED' },
  { t: 7.6, n: '03', zh: '只變焦', en: 'ZOOM ONLY · d FIXED' },
  { t: 11.6, n: '04', zh: '推軌 + 反向變焦', en: 'DOLLY IN + ZOOM OUT' },
  { t: 15.6, n: '05', zh: 'f ÷ d = 常數', en: 'f / d = CONST' },
];
function camAt(t) {
  let d = 3, f = 600, mode = 'dz', k = 0;
  for (const K of KEYS) {
    if (t < K[0]) break;
    k = K[4] === 'dz' && K[0] === 16 ? ease(E.inOutSine, K[0], K[1], t) : ease(E.inOutCubic, K[0], K[1], t);
    mode = K[4];
    if (mode === 'dz') { d = lerp(K[2], K[3], k); f = KDZ * d; }
    else if (mode === 'dolly') { d = lerp(K[2], K[3], k); f = K[5]; }
    else { d = K[2]; f = lerp(K[5], K[6], k); }
  }
  return { d, f, mode, moving: k > 0.001 && k < 0.999 };
}

function figure(ctx, x, y, h) {
  const u = h / 100;
  ctx.save(); ctx.translate(x, y);
  ctx.lineCap = 'round'; ctx.lineWidth = 4.6 * u;
  ctx.beginPath(); ctx.moveTo(-3 * u, -44 * u); ctx.lineTo(-5 * u, 0); ctx.moveTo(3 * u, -44 * u); ctx.lineTo(5 * u, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9 * u, -80 * u); ctx.quadraticCurveTo(0, -84 * u, 9 * u, -80 * u);
  ctx.lineTo(14 * u, -34 * u); ctx.lineTo(-14 * u, -34 * u); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -89 * u, 7.5 * u, 0, TAU); ctx.fill();
  ctx.restore();
}

M.def({
  id: 'e59', num: 59, ch: 8, title: '推軌變焦', en: 'DOLLY ZOOM', dur: 20, ground: 'light',
  prompt: '3D 走廊：棋盤地板、兩排黑柱、盡頭亮門，人站中央。相機後退的同時焦距按比例拉長（f = 200×d），人保持 360px 不變、背景被拉伸。先對照「只推軌」「只變焦」，標出主體高度與門寬的像素、俯視 FOV 圖。黑白。',
  how: ['針孔投影 x′= f·x ÷ (z+d)，主體高 = f·1.8 ÷ d', '推軌變焦：f 與 d 同比例改，f÷d=200 恆定', '只變焦＝整張等比放大，透視不變；推軌才改透視'],
  practice: '用手機邊後退邊放大，讓朋友的臉大小不變。',
  cues: [{ t: 0.2, type: 'riser', t1: 3.4, v: 0.6 }, { t: 4, type: 'whoosh', dur: 1 }, { t: 8, type: 'whoosh', dur: 1 }, { t: 12, type: 'riser', t1: 15.4, v: 0.7 }, { t: 16, type: 'riser', t1: 19.6 }, { t: 19.6, type: 'impact', v: 0.5 }],
  frame(ctx, t) {
    const c = camAt(t), fp = c.f, d = c.d;
    const P2 = (x, y, z) => { const zz = Math.max(0.05, z + d); return [540 + fp * x / zz, CY - fp * (y - EYE) / zz]; };
    ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH);
    // back wall with a lit doorway
    {
      const [x0, y0] = P2(-3.2, 4.6, WALLZ), [x1, y1] = P2(3.2, 0, WALLZ);
      ctx.fillStyle = g(0.13); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      const [dx0, dy0] = P2(-0.9, 3.0, WALLZ), [dx1, dy1] = P2(0.9, 0, WALLZ);
      ctx.fillStyle = P; ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
    }
    // checker floor (black tiles only, one path)
    const zNear = Math.max(-13, -d + 0.25);
    ctx.fillStyle = K; ctx.beginPath();
    for (let zi = Math.floor(zNear); zi < WALLZ; zi++) for (let xi = -3; xi < 3; xi++) {
      if (((xi + zi) & 1) === 0) continue;
      const za = Math.max(zi, zNear), zb = zi + 1;
      const a = P2(xi, 0, za), b = P2(xi + 1, 0, za), cc = P2(xi + 1, 0, zb), e = P2(xi, 0, zb);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(cc[0], cc[1]); ctx.lineTo(e[0], e[1]); ctx.closePath();
    }
    ctx.fill();
    { const a = P2(-3, 0, zNear), b = P2(-3, 0, WALLZ), c2 = P2(3, 0, WALLZ), e = P2(3, 0, zNear);   // floor outline
      ctx.strokeStyle = K; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); }
    // columns, far → near; subject inserted at z = 0
    const cols = [];
    for (let z = 27.5; z >= -13; z -= 2.5) for (const x of [-2.6, 2.6]) cols.push([x, z]);
    const drawCol = (x, z) => {
      if (z + d < 0.4) return;
      const w = 0.4, H = 4.2, s = Math.sign(x);
      const inner = x - s * w / 2;                         // the face that looks into the corridor
      const f0 = P2(x - w / 2, H, z), f1 = P2(x + w / 2, 0, z);
      // inner side face (z .. z + w)
      const a = P2(inner, H, z), b = P2(inner, H, z + w), cc = P2(inner, 0, z + w), e = P2(inner, 0, z);
      ctx.fillStyle = g(0.42); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(cc[0], cc[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = K; ctx.fillRect(f0[0], f0[1], f1[0] - f0[0], f1[1] - f0[1]);
    };
    let subjDrawn = false;
    const subj = () => {
      const [sx, sy] = P2(0, 0, 0), hs = fp * SUBH / d;
      ctx.fillStyle = P; ctx.strokeStyle = P;
      const rim = Math.max(3, hs * 0.014);
      for (let j = 0; j < 8; j++) figure(ctx, sx + Math.cos(j * TAU / 8) * rim, sy + Math.sin(j * TAU / 8) * rim, hs);
      ctx.fillStyle = K; ctx.strokeStyle = K; figure(ctx, sx, sy, hs);
      subjDrawn = true;
    };
    for (const [x, z] of cols) { if (!subjDrawn && z < 0) subj(); drawCol(x, z); }
    if (!subjDrawn) subj();

    // ---- measurements (difference: readable on any tone) ----
    const hs = fp * SUBH / d, [, feet] = P2(0, 0, 0), head = feet - hs * 1.0;
    const [dx0, dy0] = P2(-0.9, 3.0, WALLZ), [dx1] = P2(0.9, 0, WALLZ);
    const dz = c.mode === 'dz';
    ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.strokeStyle = P; ctx.fillStyle = P; ctx.lineWidth = 2.5;
    const bx = 540 + hs * 0.3 + 34;
    ctx.beginPath(); ctx.moveTo(bx, head); ctx.lineTo(bx, feet); ctx.moveTo(bx - 10, head); ctx.lineTo(bx + 10, head); ctx.moveTo(bx - 10, feet); ctx.lineTo(bx + 10, feet); ctx.stroke();
    if (dy0 > 20) { ctx.beginPath(); ctx.moveTo(dx0, dy0 - 18); ctx.lineTo(dx1, dy0 - 18); ctx.moveTo(dx0, dy0 - 26); ctx.lineTo(dx0, dy0 - 10); ctx.moveTo(dx1, dy0 - 26); ctx.lineTo(dx1, dy0 - 10); ctx.stroke(); }
    ctx.restore();
    const tag = (s, x, y, al = 'left', inv = false) => {
      font(ctx, 20, F.mono, 500); const w = ctx.measureText(s).width + 18, x0 = al === 'left' ? x : al === 'center' ? x - w / 2 : x - w;
      ctx.fillStyle = inv ? K : P; ctx.fillRect(x0, y - 22, w, 31); ctx.strokeStyle = K; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y - 22, w, 31);
      text(ctx, s, x0 + 9, y, { size: 20, family: F.mono, weight: 500, color: inv ? P : K });
    };
    tag(`人 ${Math.round(hs)}px${dz ? ' 不變' : ''}`, Math.min(bx + 16, 860), (head + feet) / 2 + 8, 'left', dz);
    if (dy0 > 60) tag(`門 ${Math.round(dx1 - dx0)}px`, (dx0 + dx1) / 2, dy0 - 36, 'center', !dz);

    // ---- top view inset: camera, FOV cone, subject, columns ----
    {
      const X = 760, Y = 40, Wd = 280, Hd = 300;
      ctx.fillStyle = P; ctx.fillRect(X, Y, Wd, Hd); ctx.strokeStyle = K; ctx.lineWidth = 2; ctx.strokeRect(X, Y, Wd, Hd);
      const mx = x => X + Wd / 2 + x * 26, mz = z => Y + Hd - 22 - (z + 13) * (Hd - 72) / 43;
      ctx.save(); ctx.beginPath(); ctx.rect(X, Y, Wd, Hd); ctx.clip();
      ctx.fillStyle = K; for (const [x, z] of cols) ctx.fillRect(mx(x) - 3, mz(z) - 3, 6, 6);
      ctx.fillRect(mx(-3.2), mz(WALLZ) - 2, 6.4 * 26, 4);
      const ha = Math.atan(540 / fp), cz = mz(-d), cx = mx(0), L = 400;
      ctx.fillStyle = g(0, 0.12); ctx.beginPath(); ctx.moveTo(cx, cz); ctx.lineTo(cx - Math.sin(ha) * L, cz - Math.cos(ha) * L); ctx.lineTo(cx + Math.sin(ha) * L, cz - Math.cos(ha) * L); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = K; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = K; ctx.beginPath(); ctx.arc(mx(0), mz(0), 6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cz - 9); ctx.lineTo(cx - 8, cz + 7); ctx.lineTo(cx + 8, cz + 7); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = P; ctx.fillRect(X + 2, Y + 2, Wd - 4, 38); ctx.fillStyle = K; ctx.fillRect(X, Y + 40, Wd, 1.5);
      text(ctx, 'TOP VIEW', X + 12, Y + 28, { size: 18, family: F.mono, weight: 500, color: K, alpha: 0.7, spacing: 2 });
      text(ctx, `FOV ${(2 * Math.atan(540 / fp) * 180 / Math.PI).toFixed(0)}°`, X + Wd - 12, Y + 28, { size: 18, family: F.mono, weight: 500, color: K, align: 'right' });
    }
    // ---- readout + phase label ----
    const ph = PH.reduce((a, p) => t >= p.t ? p : a, PH[0]);
    const la = ease(E.outCubic, ph.t, ph.t + 0.45, t);
    ctx.fillStyle = P; ctx.fillRect(40, 40, 430, 136);
    text(ctx, `${ph.n} / 05`, 56, 76, { size: 20, family: F.mono, weight: 500, color: K, spacing: 3, alpha: 0.55 * la });
    text(ctx, ph.zh, 56, 128, { size: 44, family: F.tcBlack, weight: 900, color: K, alpha: la });
    text(ctx, ph.en, 58, 160, { size: 18, family: F.mono, weight: 500, color: K, spacing: 3, alpha: 0.6 * la });
    const mm = fp / 1080 * 36;
    ctx.fillStyle = P; ctx.fillRect(34, 978, 1012, 68); ctx.fillStyle = K; ctx.fillRect(40, 984, 1000, 56);
    const cells = [['距離 d', `${d.toFixed(1)} m`, c.mode !== 'zoom'], ['焦距 f', `${mm.toFixed(0)} mm`, c.mode !== 'dolly'], ['f ÷ d', `${(fp / d).toFixed(0)} px/m`, false]];
    cells.forEach(([k, v, live], i) => {
      const x = 62 + i * 330, on = live && c.moving;
      text(ctx, k, x, 1021, { size: 20, family: F.tc, color: P, alpha: 0.6 });
      text(ctx, v, x + 92, 1022, { size: 26, family: F.mono, weight: 500, color: P, alpha: on ? 1 : 0.85 });
      if (on) { ctx.fillStyle = P; ctx.fillRect(x + 92, 1030, 110, 3); }
    });
  },
});
