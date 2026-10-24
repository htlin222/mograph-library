/* 03 形狀變形 — polar-coordinate morph. Every shape is r(θ) sampled at 360 angles; the morph is a sum of
   damped-spring step responses on those radii (so overshoot extrapolates past the target shape).
   Printed as a risograph: three ink plates, each on its own spring, misregistered and multiplied. */
const N = 360, CX = 540, CY = 850, RAD = 262;
const PAPER = '#f0ebdf', INK = '#24222a';
const MORPH = [1.0, 2.0, 3.0, 4.0];                  // half-bar downbeats
const ROT = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2];   // cumulative twist per shape
const NAMES = ['CIRCLE', 'SQUARE', 'TRIANGLE', 'STAR', 'CIRCLE'];
const PLATES = [   // back → front; each plate is its own damped spring (k stiffness, c damping)
  { name: 'YELLOW', ink: '#ffe14a', k: 70, c: 6.5, off: [16, 12], kind: 'solid', sc: 1.04 },
  { name: 'F.PINK', ink: '#ff4fa3', k: 170, c: 11, off: [-9, -5], kind: 'solid', sc: 1.0 },
  { name: 'BLUE', ink: '#1f6fd0', k: 110, c: 8, off: [7, -13], kind: 'tone', sc: 1.0 },
];
PLATES.forEach(p => p.z = p.c / (2 * Math.sqrt(p.k)));

/* r(θ) of a convex/star polygon: nearest ray–edge intersection */
function polyR(verts) {
  const r = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const th = i / N * TAU, dx = Math.cos(th), dy = Math.sin(th); let best = 1e9;
    for (let j = 0; j < verts.length; j++) {
      const [ax, ay] = verts[j], [bx, by] = verts[(j + 1) % verts.length], ex = bx - ax, ey = by - ay;
      const det = -dx * ey + ex * dy; if (Math.abs(det) < 1e-9) continue;
      const s = (-ax * ey + ex * ay) / det, u = (dx * ay - dy * ax) / det;
      if (u >= -1e-6 && u <= 1 + 1e-6 && s > 0) best = Math.min(best, s);
    }
    r[i] = best;
  }
  return r;
}
const ngon = (n, R, a0, inner = 0) => {
  const v = [], m = inner ? n * 2 : n;
  for (let i = 0; i < m; i++) { const a = a0 + i / m * TAU, rr = inner && i % 2 ? inner : R; v.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  return v;
};
// shapes are pre-rotated by −ROT so that after the twist they read upright
const SH = [
  new Float32Array(N).fill(1),
  polyR(ngon(4, 0.86 * Math.SQRT2, Math.PI / 4 - ROT[1])),
  polyR(ngon(3, 1.32, -Math.PI / 2 - ROT[2])),
  polyR(ngon(5, 1.36, -Math.PI / 2 - ROT[3], 0.58)),
  new Float32Array(N).fill(1),
];

/* state of one plate at time t: radii + twist + scale */
function plateState(p, t, out) {
  const w = MORPH.map(t0 => spring(t - t0, p.k, p.c));
  for (let i = 0; i < N; i++) {
    let r = SH[0][i];
    for (let m = 0; m < MORPH.length; m++) r += (SH[m + 1][i] - SH[m][i]) * w[m];
    out[i] = r;
  }
  let rot = 0; for (let m = 0; m < MORPH.length; m++) rot += (ROT[m + 1] - ROT[m]) * w[m];
  const pop = spring(t + 0.02, p.k * 0.8, p.c * 0.8);
  // registration: plates drift apart while morphing, kiss into register at 5.0
  const reg = 1 - spring(t - 5.0, 90, 9) * 0.92;
  return { r: out, rot, sc: pop * p.sc, reg };
}
function shapePath(ctx, st, cx, cy, R) {
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU + st.rot, rr = Math.max(0, st.r[i]) * R * st.sc;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

let plateC, plateX, mask, bufs, tone, echo;
const PY0 = 300, PH = 1360;   // plate canvases only cover the printed band
M.def({
  id: 's03', num: '03', title: '形狀變形', en: 'SHAPE MORPH', dur: 6, hud: 'dark',
  tags: ['polar r(θ) 內插 · 360 samples', 'damped spring k=170 c=11 · ζ=0.42', 'riso 錯位色版 · multiply'],
  cues: [{ t: 0.0, type: 'bell', i: 0, v: 0.5 }].concat(MORPH.map((t, i) => ({ t, type: 'bell', i: [2, 4, 1, 3][i], v: 0.65, pan: [-.4, .4, -.2, .2][i], dec: 1.4 })),
    [{ t: 5.0, type: 'bell', i: 0, v: 0.45, dec: 3 }]),
  init() {
    plateC = makeCanvas(W, PH); plateX = plateC.getContext('2d');
    bufs = PLATES.map(() => new Float32Array(N));
    tone = makeCanvas(W, PH); echo = makeCanvas(W, PH);
    { const g = tone.getContext('2d'); g.fillStyle = PLATES[2].ink;
      const cell = 14, ang = 15 * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang), ext = 900, cy = CY - PY0;
      for (let v = -ext; v <= ext; v += cell) for (let u = -ext; u <= ext; u += cell) {
        const x = CX + u * ca - v * sa, y = cy + u * sa + v * ca; if (x < -20 || x > W + 20 || y < -20 || y > PH + 20) continue;
        const d = clamp(0.03 + 0.5 * smooth(-420, 460, (y - cy) + (x - CX) * 0.35));
        const rr = cell * 0.56 * Math.sqrt(d); if (rr < 0.6) continue;
        g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      } }
    { const g = echo.getContext('2d'); g.fillStyle = PLATES[0].ink; const cell = 22;
      for (let y = 420; y < 1620; y += cell) for (let x = (Math.floor(y / cell) % 2) * cell / 2; x < W; x += cell) {
        const d = Math.hypot(x - CX, (y - CY) * 0.9) / 760, a = clamp(0.62 - d) * 0.9;
        if (a < 0.04) continue; g.beginPath(); g.arc(x, y - PY0, cell * 0.5 * Math.sqrt(a), 0, TAU); g.fill();
      } }
    // ink texture: mottled coverage + dropouts, at half res, larger than the frame so plates can shift it
    const mw = 600, mh = 1020, m = makeCanvas(mw, mh), g = m.getContext('2d'), id = g.createImageData(mw, mh), r = rng(33), nz = makeNoise(5);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const n = nz.fbm(x * 0.02, y * 0.02, 0, 3), f = nz(x * 0.35, y * 0.09, 3.3);
      let a = 0.86 + n * 0.32 + f * 0.06 + (r() - 0.5) * 0.16;
      if (r() < 0.006) a *= 0.25;
      const o = (y * mw + x) * 4; id.data[o] = id.data[o + 1] = id.data[o + 2] = 0; id.data[o + 3] = clamp(a) * 255;
    }
    g.putImageData(id, 0, 0);
    mask = makeCanvas(1200, 2040); const mg = mask.getContext('2d'); mg.imageSmoothingEnabled = true; mg.drawImage(m, 0, 0, 1200, 2040);
  },
  frame(ctx, t, s) {
    // paper: warm stock with faint fibre
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    const pg = ctx.createRadialGradient(CX, CY, 200, CX, CY, 1300);
    pg.addColorStop(0, 'rgba(255,253,246,.55)'); pg.addColorStop(1, 'rgba(160,140,110,.16)');
    ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);

    const st = PLATES.map((p, i) => plateState(p, t, bufs[i]));
    // ---- plates: draw into plate canvas, knock out with ink texture, multiply onto paper
    PLATES.forEach((p, pi) => {
      const S = st[pi], g = plateX;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, PH); g.translate(0, -PY0);
      const ox = p.off[0] * (0.35 + 0.65 * S.reg), oy = p.off[1] * (0.35 + 0.65 * S.reg);
      const cx = CX + ox, cy = CY + oy;
      g.fillStyle = p.ink;
      if (p.kind === 'solid') { shapePath(g, S, cx, cy, RAD); g.fill(); }
      else {
        // halftone screen (pre-rendered, fixed to the page like a real riso screen) clipped to the contour
        g.save(); shapePath(g, S, cx, cy, RAD); g.clip(); g.drawImage(tone, 0, PY0); g.restore();
        g.lineWidth = 3; g.strokeStyle = p.ink; shapePath(g, S, cx, cy, RAD); g.stroke();
      }
      if (pi === 0) g.drawImage(echo, 0, PY0);
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in';
      g.drawImage(mask, -40 - pi * 23, -40 - PY0 - pi * 37);
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(plateC, 0, PY0); ctx.restore();
    });

    // ---- key line (ink): the 360 polar samples of the pink plate + sweep
    const K = st[1], kp = PLATES[1];
    const kx = CX + kp.off[0] * (0.35 + 0.65 * K.reg), ky = CY + kp.off[1] * (0.35 + 0.65 * K.reg);
    const sweep = (t * 0.9 + 0.15) % 1 * TAU;
    ctx.save();
    const showA = ease(E.outCubic, 0.2, 0.7, t);
    ctx.globalAlpha = showA;
    ctx.fillStyle = INK;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU + K.rot, rr = Math.max(0, K.r[i]) * RAD * K.sc + 26;
      const big = i % 30 === 0;
      ctx.fillRect(kx + Math.cos(a) * rr - 1, ky + Math.sin(a) * rr - 1, big ? 3 : 2, big ? 3 : 2);
    }
    // radial tick ring (θ reference) at fixed radius
    ctx.strokeStyle = 'rgba(36,34,42,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CX, CY, 455, 0, TAU); ctx.stroke();
    for (let d = 0; d < 360; d += 5) {
      const a = d * Math.PI / 180, l = d % 90 === 0 ? 18 : d % 30 === 0 ? 10 : 5;
      ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * 455, CY + Math.sin(a) * 455); ctx.lineTo(CX + Math.cos(a) * (455 - l), CY + Math.sin(a) * (455 - l)); ctx.stroke();
    }
    // sweep ray: θ → sample → plot
    const si = Math.floor(sweep / TAU * N) % N, sa = sweep + K.rot, sr = Math.max(0, K.r[si]) * RAD * K.sc;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx + Math.cos(sa) * 455, ky + Math.sin(sa) * 455); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(kx + Math.cos(sa) * sr, ky + Math.sin(sa) * sr, 7, 0, TAU); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(kx, ky, 4, 0, TAU); ctx.fill();
    text(ctx, `θ ${String(Math.round(sweep * 180 / Math.PI)).padStart(3, '0')}°  r ${(K.r[si] * K.sc).toFixed(3)}`,
      clamp(CX + Math.cos(sa) * 478, 260, W - 260), clamp(CY + Math.sin(sa) * 478 + 8, 580, 1300), { size: 20, family: F.mono, color: INK, align: Math.cos(sa) > 0 ? 'left' : 'right', alpha: 0.85 });
    ctx.restore();

    // ---- spring readout + step-response scope (top)
    const ra = ease(E.outCubic, 0.25, 0.8, t);
    ctx.save(); ctx.globalAlpha = ra;
    PLATES.slice().reverse().forEach((p, j) => {
      const y = 452 + j * 36;
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = p.ink; ctx.fillRect(84, y - 17, 22, 22); ctx.restore();
      text(ctx, `${p.name.padEnd(7)} k=${String(p.k).padStart(3)}  c=${String(p.c).padStart(4)}  ζ=${p.z.toFixed(2)}`, 120, y, { size: 21, family: F.mono, color: INK, alpha: 0.85 });
    });
    // scope: x(τ) since the last morph, per plate
    const last = MORPH.filter(m => m <= t).pop(), tau = last === undefined ? t : t - last;
    const gx = 690, gy = 420, gw = 306, gh = 110, T = 1.0, toY = v => gy + gh - 18 - v * (gh - 40);
    ctx.strokeStyle = 'rgba(36,34,42,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, toY(0)); ctx.lineTo(gx + gw, toY(0)); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(gx, toY(1)); ctx.lineTo(gx + gw, toY(1)); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, '1.0', gx - 8, toY(1) + 6, { size: 15, family: F.mono, color: INK, align: 'right', alpha: .6 });
    text(ctx, 'x(τ)', gx - 8, toY(0) + 6, { size: 15, family: F.mono, color: INK, align: 'right', alpha: .6 });
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    PLATES.forEach(p => {
      ctx.strokeStyle = p.ink; ctx.lineWidth = 3; ctx.beginPath();
      for (let q = 0; q <= 60; q++) { const tt = q / 60 * Math.min(tau, T); const x = gx + tt / T * gw, y = toY(spring(tt, p.k, p.c)); q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    });
    ctx.restore();
    const ph = gx + Math.min(tau, T) / T * gw;
    ctx.fillStyle = INK; ctx.fillRect(ph, gy + 8, 1.5, gh - 20);
    text(ctx, `τ ${tau.toFixed(2)}s`, gx + gw, gy + gh + 14, { size: 16, family: F.mono, color: INK, align: 'right', alpha: .7 });
    ctx.restore();

    // ---- shape label
    const mi = MORPH.filter(m => m <= t).length;
    const lab = mi === 0 ? NAMES[0] : `${NAMES[mi - 1]} → ${NAMES[mi]}`;
    text(ctx, lab, CX, 1345, { size: 24, family: F.mono, weight: 500, color: INK, align: 'center', spacing: 6, alpha: 0.85 * ra });

    // ---- polar plot r(θ), unwrapped
    const px = 84, py = 1385, pw = W - 168, phh = 170, rMax = 1.6;
    const mapX = th => px + th / TAU * pw, mapY = r => py + phh - clamp(r / rMax, -0.1, 1.1) * phh;
    ctx.save(); ctx.globalAlpha = ra;
    ctx.strokeStyle = 'rgba(36,34,42,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py + phh + .5); ctx.lineTo(px + pw, py + phh + .5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + .5, py); ctx.lineTo(px + .5, py + phh); ctx.stroke();
    ['0', 'π/2', 'π', '3π/2', '2π'].forEach((l, i) => {
      const x = px + pw * i / 4; ctx.fillStyle = 'rgba(36,34,42,.5)'; ctx.fillRect(x, py + phh, 1, 8);
      text(ctx, l, x, py + phh + 30, { size: 17, family: F.mono, color: INK, align: i === 0 ? 'left' : i === 4 ? 'right' : 'center', alpha: .6 });
    });
    text(ctx, 'r(θ)', px + 10, py + 6, { size: 19, family: F.mono, weight: 500, color: INK, alpha: .8 });
    text(ctx, 'N = 360', px + pw, py + 6, { size: 17, family: F.mono, color: INK, align: 'right', alpha: .55 });
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    // target (dashed blue), yellow & pink plate curves (filled pink)
    const tgt = SH[mi];
    ctx.strokeStyle = PLATES[2].ink; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath();
    for (let i = 0; i <= N; i++) { const x = mapX(i / N * TAU), y = mapY(tgt[i % N]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    [0, 1].forEach(pi => {
      const R_ = st[pi].r, sc = st[pi].sc;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const x = mapX(i / N * TAU), y = mapY(R_[i % N] * sc); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      if (pi === 1) { ctx.lineTo(px + pw, py + phh); ctx.lineTo(px, py + phh); ctx.closePath(); ctx.fillStyle = 'rgba(255,79,163,.28)'; ctx.fill(); }
      else { ctx.strokeStyle = PLATES[0].ink; ctx.lineWidth = 3; ctx.stroke(); }
    });
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const x = mapX(i / N * TAU), y = mapY(K.r[i % N] * K.sc); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = PLATES[1].ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    // playhead at sweep θ
    const sx = mapX(sweep);
    ctx.fillStyle = INK; ctx.fillRect(sx - .75, py - 4, 1.5, phh + 4);
    ctx.beginPath(); ctx.arc(sx, mapY(K.r[si] * K.sc), 5, 0, TAU); ctx.fill();
    ctx.restore();

    grain(ctx, 0.05, s.frame);
  },
});
