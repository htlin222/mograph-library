/* 01 時間感 — bouncing ball: squash & stretch, onion skin, spacing marks, live graph editor.
   Motion is analytic: projectile arcs with restitution e. Every landing is a cue for the music. */
const GROUND = 1010, R0 = 56, X0 = 150, VX = 150;
const H0 = 470;                       // drop height (px)
const TD = 0.75;                      // time to first impact
const G_ = 2 * H0 / (TD * TD);        // gravity px/s²
const REST = 0.6;                     // restitution
const ANT0 = 4.35, LAUNCH = 4.85;     // anticipation start, takeoff
// landing times and per-arc launch speed
const LAND = [TD]; const V = [G_ * TD];
while (LAND.length < 14) { const v = V[V.length - 1] * REST; V.push(v); LAND.push(LAND[LAND.length - 1] + 2 * v / G_); }
const SETTLE = LAND[LAND.length - 1];

/* state at time t: center x,y, velocity, squash */
function ball(t) {
  let x = X0 + VX * Math.min(t, SETTLE) * 1 + (t > SETTLE ? VX * 0.6 * (1 - Math.exp(-(t - SETTLE) * 2)) / 2 : 0);
  let y, vy;
  if (t < TD) { y = GROUND - R0 - H0 + 0.5 * G_ * t * t; vy = G_ * t; }
  else if (t < SETTLE) {
    let i = 0; while (i < LAND.length - 1 && t >= LAND[i + 1]) i++;
    const tt = t - LAND[i], v = V[i + 1];
    y = GROUND - R0 - (v * tt - 0.5 * G_ * tt * tt); vy = -(v - G_ * tt);
  } else { y = GROUND - R0; vy = 0; }
  // contact squash: peaks at each landing, scaled by impact speed
  let squash = 0;
  for (let i = 0; i < LAND.length; i++) {
    const d = t - LAND[i]; const amp = 0.42 * Math.min(1, V[i] / V[0]);
    if (d > -0.035 && d < 0.09) squash = Math.max(squash, amp * (d < 0 ? (1 + d / 0.035) : Math.exp(-d * 34) * Math.cos(d * 40)));
  }
  // anticipation & launch
  if (t > ANT0) {
    const a = E.inOutCubic(clamp((t - ANT0) / (LAUNCH - ANT0)));
    squash = Math.max(squash, 0.45 * a);
    if (t > LAUNCH) {
      const u = t - LAUNCH; squash = 0;
      y = GROUND - R0 - (2600 * u * u + 900 * u); vy = -(5200 * u + 900);
      x += 260 * u * u;
    }
  }
  return { x, y, vx: VX * (t < SETTLE ? 1 : Math.exp(-(t - SETTLE) * 2)), vy, squash };
}
function drawBall(ctx, b, t, o = {}) {
  const sp = Math.hypot(b.vx, b.vy);
  const stretch = o.ghost ? 0 : clamp(sp / 2400, 0, 0.32);
  const ang = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x, b.y + (b.squash > 0 ? R0 * b.squash * 0.5 : 0));
  // stretch along velocity, squash against the ground — area preserved
  if (b.squash > 0.001) ctx.scale(1 + b.squash, 1 / (1 + b.squash));
  else { ctx.rotate(ang); ctx.scale(1 + stretch, 1 / (1 + stretch)); ctx.rotate(-ang); }
  ctx.beginPath(); ctx.arc(0, 0, R0, 0, TAU);
  if (o.ghost) { ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.stroke(); }
  else {
    const g = ctx.createRadialGradient(-R0 * 0.35, -R0 * 0.4, R0 * 0.1, 0, 0, R0 * 1.1);
    g.addColorStop(0, '#ff8a6e'); g.addColorStop(1, P.coral); ctx.fillStyle = g; ctx.fill();
    // rotation stripe (ω = v / r)
    ctx.save(); ctx.clip(); ctx.rotate((b.x - X0) / R0);
    ctx.fillStyle = 'rgba(16,17,20,.85)'; ctx.fillRect(-R0, -5, R0 * 2, 10); ctx.restore();
  }
  ctx.restore();
}

M.def({
  id: 's01', num: '01', title: '時間感', en: 'TIMING', dur: 6,
  tags: ['squash & stretch · 體積守恆', 'onion skin · 間距標記 @30fps', 'graph editor · y(t) 即時描繪'],
  cues: LAND.slice(0, 7).map((t, i) => ({ t, type: 'bell', i: (i * 2) % 5, v: 0.75 * Math.pow(0.8, i), pan: -0.6 + i * 0.2, dec: 1.6 }))
    .concat([{ t: LAUNCH, type: 'bell', midi: 93, v: 0.6, dec: 2.4 }, { t: ANT0, type: 'riser', t1: LAUNCH, v: 0.5 }]),
  frame(ctx, t, s) {
    ctx.fillStyle = '#0f1013'; ctx.fillRect(0, 0, W, H);
    // workspace grid
    ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
    for (let x = 0.5; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 420); ctx.lineTo(x, 1100); ctx.stroke(); }
    for (let y = 420.5; y < 1100; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // ground + frame ruler
    ctx.fillStyle = 'rgba(241,239,233,.8)'; ctx.fillRect(0, GROUND, W * ease(E.outExpo, 0, 0.8, t), 2);
    for (let f = 0; f <= 180; f++) {
      const x = X0 + VX * Math.min(f / 30, SETTLE);
      if (f / 30 > t || f / 30 > SETTLE) break;
      ctx.fillStyle = f % 5 ? 'rgba(241,239,233,.25)' : 'rgba(241,239,233,.6)';
      ctx.fillRect(x, GROUND + 10, 1.5, f % 5 ? 8 : 16);
    }
    // spacing marks: centre of mass every frame (dense near apex = slow, sparse near ground = fast)
    const tEnd = Math.min(t, LAUNCH + 0.4);
    ctx.fillStyle = P.amber;
    for (let f = 0; f / 30 <= tEnd; f++) {
      const b = ball(f / 30); if (b.y < 380) continue;
      const age = t - f / 30, a = 0.25 + 0.75 * Math.exp(-age * 0.6);
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(b.x, b.y, f % 5 ? 3 : 5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // onion skin: 6 ghosts, 2 frames apart, cooling from coral to bone
    for (let k = 6; k >= 1; k--) {
      const tg = t - k * 2 / 30; if (tg < 0) continue;
      const b = ball(tg); ctx.globalAlpha = 0.55 * (1 - k / 7);
      drawBall(ctx, b, tg, { ghost: true, color: rgba(mixc(P.coral, P.bone, k / 6)) });
    }
    ctx.globalAlpha = 1;
    const b = ball(t);
    // contact shadow
    const hgt = clamp((GROUND - R0 - b.y) / 600);
    ctx.save(); ctx.globalAlpha = 0.5 * (1 - hgt); ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(b.x, GROUND + 3, R0 * (1.1 - hgt * 0.5) * (1 + b.squash), 7, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (t > 0.02) drawBall(ctx, b, t);
    // readout next to the ball
    const sp = Math.hypot(b.vx, b.vy);
    if (b.y > 420) {
      text(ctx, `v ${sp.toFixed(0).padStart(4)} px/s`, Math.min(b.x + 80, W - 300), Math.max(b.y - 60, 470), { size: 22, family: F.mono, color: 'rgba(241,239,233,.7)' });
      if (b.squash > 0.02) text(ctx, `squash ${(b.squash * 100).toFixed(0)}%`, Math.min(b.x + 80, W - 300), Math.max(b.y - 30, 500), { size: 22, family: F.mono, color: P.amber });
    }

    /* ---- graph editor ---- */
    const gx = 84, gy = 1170, gw = W - 168, gh = 400;
    const pa = ease(E.outCubic, 0.15, 0.7, t);
    ctx.save(); ctx.globalAlpha = pa; ctx.translate(0, (1 - pa) * 40);
    ctx.fillStyle = '#16171b'; ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 12; i++) { const x = gx + gw * i / 12 + .5; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); }
    for (let i = 0; i <= 4; i++) { const y = gy + gh * i / 4 + .5; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
    text(ctx, 'GRAPH EDITOR', gx + 18, gy + 34, { size: 20, family: F.mono, weight: 500, color: 'rgba(241,239,233,.75)', spacing: 3 });
    text(ctx, '— height  ┄ speed', gx + gw - 18, gy + 34, { size: 20, family: F.mono, color: 'rgba(241,239,233,.45)', align: 'right' });
    for (let i = 0; i <= 6; i++) text(ctx, i + 's', gx + gw * i / 6 + 6, gy + gh - 10, { size: 17, family: F.mono, color: 'rgba(241,239,233,.35)' });
    const T = 6, mapX = tt => gx + gw * tt / T, mapY = y => gy + 70 + (gh - 110) * clamp(1 - (GROUND - R0 - y) / (H0 + 40), -0.3, 1);
    // speed curve (dashed)
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
    ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(58,209,255,.65)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let tt = 0; tt <= Math.min(t, T); tt += 1 / 120) { const q = ball(tt); const yv = gy + gh - 40 - (gh - 110) * clamp(Math.abs(q.vy) / (G_ * TD)); tt === 0 ? ctx.moveTo(mapX(tt), yv) : ctx.lineTo(mapX(tt), yv); }
    ctx.stroke(); ctx.setLineDash([]);
    // height curve
    ctx.strokeStyle = P.coral; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let tt = 0; tt <= Math.min(t, T); tt += 1 / 120) { const q = ball(tt); tt === 0 ? ctx.moveTo(mapX(tt), mapY(q.y)) : ctx.lineTo(mapX(tt), mapY(q.y)); }
    ctx.stroke();
    // keyframes: landings (linear corners) and apexes (flat bezier handles)
    for (let i = 0; i < 7; i++) {
      const lt = LAND[i]; if (lt > t) break;
      const x = mapX(lt), y = mapY(GROUND - R0);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = P.amber; ctx.fillRect(-7, -7, 14, 14); ctx.restore();
      const at = lt + V[i + 1] / G_; if (at > t || i > 4) continue;
      const ax = mapX(at), ay = mapY(GROUND - R0 - V[i + 1] * V[i + 1] / (2 * G_)), hl = (mapX(LAND[i + 1]) - x) * 0.33;
      ctx.strokeStyle = 'rgba(241,239,233,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax - hl, ay); ctx.lineTo(ax + hl, ay); ctx.stroke();
      ctx.fillStyle = '#f1efe9'; [ax - hl, ax + hl].forEach(hx => { ctx.beginPath(); ctx.arc(hx, ay, 5, 0, TAU); ctx.fill(); });
      ctx.fillStyle = P.amber; ctx.beginPath(); ctx.arc(ax, ay, 6.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // playhead
    const px = mapX(Math.min(t, T));
    ctx.fillStyle = '#f1efe9'; ctx.fillRect(px - 1, gy, 2, gh);
    text(ctx, `${t.toFixed(2)}s  f${String(Math.floor(t * 30)).padStart(3, '0')}`, Math.min(px + 10, gx + gw - 170), gy + 64, { size: 20, family: F.mono, color: '#f1efe9' });
    ctx.restore();
    grain(ctx, 0.04, s.frame);
  },
});
