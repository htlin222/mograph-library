/* 01 時距與間距 — three balls, same drop, different timing & spacing.
   Motion model (checked frame by frame with tools/motioncheck.mjs):
   · one deterministic 1 kHz simulation per ball (gravity + quadratic air drag + restitution), run once
   · every contact is retimed onto an exact frame, so the squash frame is always the frame that touches the ground
   · squash / stretch is one continuous function of the distance to the nearest contact — never a mode switch
   · a bounce lower than 2 px ends the motion (no sub-pixel chatter); all balls rest before the cycle restarts,
     and the replay is an eased lift back to the top, not a teleport */
const GROUND = 860, CYCLE = 4, LIFT = 0.45, DROP = 600, CW = 2 / 30;   // contact window: the frames on either side of contact are neutral
/* Real-world scale: the drop is 1.00 m, so 600 px = 1 m and every ball falls with the same g = 9.81 m/s².
   Heavy and light land together in vacuum; what tells the materials apart is restitution and air drag (measured
   values, see docs/physics-reference.md). Drag is quadratic, a = −g − (g / v_t²)·v|v|, from the terminal speed v_t. */
const PX_PER_M = DROP / 1.0, G = 9.81 * PX_PER_M;
const BALLS = [
  { key: 'rubber', name: '橡膠球', en: 'RUBBER', r: 62, e: 0.78, vt: 0, S: 0.22, Q: 0.26, note: 'e 0.78（實測）' },           // Super Ball on granite (Cross)
  { key: 'bowling', name: '保齡球', en: 'BOWLING', r: 74, e: 0.15, vt: 0, S: 0.03, Q: 0.07, note: 'e ≈ 0.15（估計）' },       // no published floor value
  { key: 'balloon', name: '氣球', en: 'BALLOON', r: 70, e: 0.5, vt: 1.3, S: 0.02, Q: 0.22, note: '終端速度 1.3 m/s' },        // latex balloon drop labs
].map(b => ({ ...b, g: G, drag: b.vt ? G / Math.pow(b.vt * PX_PER_M, 2) : 0 }));
/* simulate once: samples of height h (px above ground) and velocity v (px/s, up +) every ms; contacts [time, impact speed] */
function simulate(b) {
  const dt = 0.001, H = [], V = [], C = []; let h = DROP, v = 0, rest = false;
  for (let i = 0; i <= (CYCLE - LIFT) * 1000; i++) {
    H.push(h); V.push(v);
    if (rest) continue;
    v += (-b.g - b.drag * v * Math.abs(v)) * dt; h += v * dt;
    if (h <= 0 && v < 0) {
      const impact = -v; h = 0; v = impact * b.e; C.push([(i + 1) * dt, impact]);
      if (v * v / (2 * b.g) < 2) { v = 0; rest = true; }          // next bounce would be < 2 px: stop
    }
  }
  // retime: each contact moves to the nearest frame; display time u maps piecewise-linearly onto sim time
  const K = [[0, 0]];
  for (const [tc] of C) { let ru = Math.round(tc * 30) / 30; if (ru <= K[K.length - 1][0]) ru = K[K.length - 1][0] + 1 / 30; K.push([ru, tc]); }
  const vmax = Math.max(...C.map(c => c[1]));
  return { H, V, C, K, vmax, first: K[1][0] };
}
for (const b of BALLS) b.sim = simulate(b);
const toSim = (K, u) => {
  for (let i = 1; i < K.length; i++) if (u <= K[i][0]) { const [u0, s0] = K[i - 1], [u1, s1] = K[i]; return s0 + (s1 - s0) * (u - u0) / (u1 - u0); }
  const [ul, sl] = K[K.length - 1]; return sl + (u - ul);
};
/* state at cycle time u: height, velocity, squash/stretch, and the replay lift */
function ballAt(u, b) {
  const S = b.sim, s = Math.min(toSim(S.K, u) * 1000, S.H.length - 1.001), i = Math.floor(s), f = s - i;
  let h = S.H[i] + (S.H[i + 1] - S.H[i]) * f; const v = S.V[i] + (S.V[i + 1] - S.V[i]) * f;
  let d = 1e9, sp = 0;
  S.K.forEach(([ku], k) => { if (k && Math.abs(u - ku) < d) { d = Math.abs(u - ku); sp = S.C[k - 1][1] / S.vmax; } });
  const stretch = b.S * Math.min(1, Math.abs(v) / S.vmax);
  let e = lerp(-b.Q * sp, stretch, smooth(0, CW, d));                // −: squash at contact, +: stretch in flight
  const lift = ease(E.inOutCubic, CYCLE - LIFT, CYCLE, u);
  if (lift > 0) { h = lerp(h, DROP, lift); e *= 1 - lift; }
  const sy = 1 + e;
  return { h, v, sy, sx: 1 / sy, lift, landed: u >= S.first };
}

M.def({
  id: 'e01', num: 1, ch: 1, title: '時距與間距', en: 'TIMING & SPACING', dur: 20, ground: 'dark',
  prompt: '三顆球從同一高度落下：橡膠球、保齡球、氣球。不准改造型，只准改時距與間距，讓觀眾光看動作就分得出材質；每顆球留下每一格的位置點。',
  how: ['同樣 1 m、同樣 g 9.81：輕重同時落地，差在反彈與阻力', '實測：Super Ball e 0.78；氣球終端速度 1.3 m/s', '著地那一格才壓扁；彈不到 2 px 就停，全部停穩才重播'],
  practice: '只改時距，做出「緊張」與「慵懶」兩種走路。',
  cues: [0, 4, 8, 12, 16].flatMap(c => [{ t: c + BALLS[1].sim.first, type: 'thud', v: 0.9 }, { t: c + BALLS[0].sim.first, type: 'pop', v: 0.6 }]),
  frame(ctx, t, s) {
    const cyc = Math.floor(t / CYCLE), u = t - cyc * CYCLE;
    // ground and columns
    ctx.fillStyle = fg(0.9); ctx.fillRect(60, GROUND, SW - 120, 2);
    // real-world scale: the drop is one metre
    ctx.fillStyle = fg(0.35); ctx.fillRect(28, GROUND - DROP, 1, DROP); ctx.fillRect(22, GROUND - DROP, 13, 1); ctx.fillRect(22, GROUND - 1, 13, 1);
    ctx.save(); ctx.translate(18, GROUND - DROP / 2); ctx.rotate(-Math.PI / 2);
    text(ctx, '1.00 m · g 9.81 m/s²', 0, 0, { size: 16, family: F.mono, align: 'center', alpha: 0.5 }); ctx.restore();
    BALLS.forEach((b, i) => {
      const cx = 180 + i * 360, top = GROUND - DROP - b.r;
      // column label
      text(ctx, b.name, cx, 120, { size: 40, family: F.tcBlack, weight: 900, align: 'center' });
      text(ctx, b.en, cx, 156, { size: 18, family: F.mono, align: 'center', alpha: 0.55, spacing: 4 });
      // spacing marks: one dot per frame of this cycle, from the second cycle on; they fade during the replay lift
      const now = ballAt(u, b);
      const reveal = ease(E.outCubic, CYCLE, CYCLE + 0.4, t) * (1 - now.lift);
      if (reveal > 0.001) {
        for (let f = 0; f / FPS <= Math.min(u, CYCLE - LIFT); f++) {
          const y = GROUND - b.r - ballAt(f / FPS, b).h;
          ctx.fillStyle = fg(0.75 * reveal);
          ctx.fillRect(cx + 110 - 3, y - 3, 6, 6);
        }
        // frame ruler beside the spacing dots
        ctx.fillStyle = fg(0.25 * reveal); ctx.fillRect(cx + 110, top + b.r, 1, DROP);
      }
      // the ball: bottom stays at height h; sy < 1 squash (contact frame), sy > 1 stretch (flight), area kept
      const y = GROUND - b.r - now.h, hh = clamp(now.h / DROP);
      ctx.fillStyle = fg(0.25 * (1 - hh)); ctx.beginPath(); ctx.ellipse(cx, GROUND + 8, b.r * (1.1 - hh * 0.5), 6, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(cx, y + (1 - now.sy) * b.r); ctx.scale(now.sx, now.sy);
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU);
      if (b.key === 'rubber') { ctx.fillStyle = fg(1); ctx.fill(); }
      else if (b.key === 'bowling') { ctx.fillStyle = fg(1); ctx.fill(); ctx.fillStyle = bg(1); [[-18, -26], [6, -34], [-2, -10]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy, 8, 0, TAU); ctx.fill(); }); }
      else { ctx.strokeStyle = fg(1); ctx.lineWidth = 5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, b.r); ctx.quadraticCurveTo(12, b.r + 26, -2, b.r + 54); ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
      // readout
      text(ctx, `落地 ${b.sim.first.toFixed(2)}s · ${b.note}`, cx, GROUND + 60, { size: 20, family: F.mono, align: 'center', alpha: 0.6 });
    });
    // timeline scrubber under the stage: cycle progress in frames
    const fx = 60, fw = SW - 120, fy = 1000;
    for (let f = 0; f <= CYCLE * FPS; f += 1) { const x = fx + fw * f / (CYCLE * FPS); ctx.fillStyle = fg(f % 30 === 0 ? 0.8 : f % 5 === 0 ? 0.4 : 0.15); ctx.fillRect(x, fy, 1.5, f % 30 === 0 ? 22 : f % 5 === 0 ? 12 : 6); }
    ctx.fillStyle = fg(1); ctx.fillRect(fx + fw * u / CYCLE - 1.5, fy - 10, 3, 42);
    text(ctx, `f ${String(Math.floor(u * FPS)).padStart(3, '0')} / ${CYCLE * FPS}`, fx, fy + 54, { size: 18, family: F.mono, alpha: 0.6 });
  },
});
