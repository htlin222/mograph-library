/* 12 剛體物理 — a pile of CLAUDE letters as matter.js rigid bodies, 240 Hz fixed step.
   Beats: drop & settle → heavy ball smash → see-saw floor flick → gravity reverses, all float away.
   The cue times for the impact and the landings are measured by running the same simulation once at load. */
const HZ = 240, FS = 168, BR = 84;                                  // glyph font size (px)
const GROUND_Y = 1440, PIV_X = 540;
const T_BALL = 1.45, T_TILT = 4.0, T_REV = 5.8;
const BLUE = '#1c2fb4', BLUE_D = '#13207f', BONE = '#f3efe6', CORAL = '#ff5a3c', INK = '#0e0f13';
// Archivo wght 800 bounding boxes (font units /1000): x0, y0, x1, y1
const BB = { C: [45, -12, 709, 699], L: [75, 0, 603, 687], A: [8, 0, 739, 687], U: [73, -12, 710, 687], D: [75, 0, 710, 687], E: [77, 0, 651, 687] };
const WORD = 'CLAUDE', ROWS = 4;
const { Engine, Bodies, Body, Composite, Events } = Matter;

function tiltAngle(t) {   // see-saw: flick down to the right, hold, ease back a little
  const a = -0.36 * E.outBack(clamp((t - T_TILT) / 0.24)) + 0.16 * E.inOutCubic(clamp((t - T_TILT - 0.7) / 0.9));
  return t < T_TILT ? 0 : a;
}

function build(st) {
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1;
  const r = rng(12);
  const ground = Bodies.rectangle(PIV_X, GROUND_Y + 20, 1010, 40, { isStatic: true, friction: 0.7, restitution: 0.05, label: 'ground' });
  const letters = [];
  const s = FS / 1000;
  for (let k = 0; k < ROWS; k++) {
    let x = 160 + r.range(-30, 40) + (k % 2) * 30;
    for (let c = 0; c < WORD.length; c++) {
      const ch = WORD[c], [x0, y0, x1, y1] = BB[ch], w = (x1 - x0) * s, h = (y1 - y0) * s;
      const cy = -10 - k * 240 - c * 22 * (k % 2 ? -1 : 1) + r.range(-20, 20);
      const b = Bodies.rectangle(x + w / 2, cy, w, h, { friction: 0.55, frictionStatic: 0.9, restitution: 0.12, density: 0.0016, chamfer: { radius: 3 }, label: 'L' });
      Body.setAngle(b, r.range(-0.18, 0.18));
      Body.setVelocity(b, { x: r.range(-0.4, 0.4), y: 9 + k * 1.0 });
      b.ch = ch; b.ox = -(x0 + x1) / 2 * s; b.oy = (y0 + y1) / 2 * s; b.w = w; b.h = h; b.row = k; b.hist = [];
      letters.push(b); x += w + 14 + r.range(-6, 6);
    }
  }
  const walls = [-30, W + 30].map(x => Bodies.rectangle(x, 400, 60, 3200, { isStatic: true, friction: 0.2, label: 'wall' }));
  Composite.add(engine.world, [ground, ...walls, ...letters]);
  const ball = Bodies.circle(600, -200, BR, { density: 0.04, restitution: 0.15, friction: 0.3, frictionAir: 0, label: 'ball' });
  ball.hist = [];
  Object.assign(st, { engine, ground, letters, ball, ballIn: false, hitT: null, thuds: [], landed: new Set() });
  Events.on(engine, 'collisionStart', ev => {
    for (const p of ev.pairs) {
      const a = p.bodyA, b = p.bodyB;
      if ((a === ball || b === ball) && st.hitT === null) st.hitT = st.now;
      if (st.now > 0.25) for (const q of [a, b]) if (q.label === 'L' && !st.landed.has(q.id) && (a.label === 'ground' || b.label === 'ground' || st.landed.has((q === a ? b : a).id))) { st.landed.add(q.id); st.thuds.push(st.now); }
    }
  });
}
function step(st, n) {
  const t = n / HZ; st.now = t;
  if (!st.ballIn && t >= T_BALL) { Composite.add(st.engine.world, st.ball); Body.setVelocity(st.ball, { x: -0.6, y: 16 }); st.ballIn = true; }
  if (t >= T_TILT) Body.setAngle(st.ground, tiltAngle(t), true);
  if (t >= T_REV && st.engine.gravity.y > 0) { st.engine.gravity.y = -1; for (const b of [...st.letters, st.ball]) { b.frictionAir = 0.002; } }
  Engine.update(st.engine, 1000 / HZ);
  if (n % 8 === 0) for (const b of [...st.letters, st.ball]) { b.hist.push([b.position.x, b.position.y, b.angle]); if (b.hist.length > 5) b.hist.shift(); }
}

// measure cue times by a dry run (same code path → same numbers)
const PRE = {}; build(PRE);
for (let n = 0; n < HZ * 2.6; n++) step(PRE, n);
const HIT = PRE.hitT || 2.0;
const THUDS = []; PRE.thuds.forEach(t => { if (t < 1.6 && !THUDS.some(u => Math.abs(u - t) < 0.12)) THUDS.push(t); });

function drawLetter(ctx, b, x, y, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = col; ctx.fillText(b.ch, b.ox, b.oy); ctx.restore();
}

M.def({
  id: 's12', num: '12', title: '剛體物理', en: 'RIGID BODIES', dur: 8, hud: 'light',
  tags: ['matter.js · 240 Hz fixed step', 'impulse · friction · restitution', 'gravity → −g'],
  cues: [{ t: HIT, type: 'impact', v: 1 }, { t: T_TILT, type: 'clap', v: 0.8 },
    { t: 5.0, type: 'riser', t1: T_REV, v: 0.8 }, { t: T_REV, type: 'reverse', t1: 7.4 }, { t: T_REV, type: 'bell', i: 4, v: 0.6, dec: 3.5 }]
    .concat(THUDS.slice(0, 6).map((t, i) => ({ t, type: 'thud', v: 0.5 - i * 0.05 }))),
  reset() { this.st = {}; build(this.st); },
  frame(ctx, t, s) {
    const S = this;
    // M.sim catches up ≤4 s per call; loop so random-access jumps (stills, seeking) land on the same state
    do M.sim(S, t, (dt, n) => step(S.st, n), HZ); while (S.sim.t + 1 / HZ <= t + 1e-9);
    const st = S.st;

    // ground: deep cobalt with a soft light pool
    ctx.fillStyle = BLUE; ctx.fillRect(0, 0, W, H);
    const lg = ctx.createRadialGradient(540, 980, 100, 540, 1000, 1250);
    lg.addColorStop(0, 'rgba(70,95,255,.35)'); lg.addColorStop(1, 'rgba(8,12,60,.55)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    // faint measuring grid
    ctx.fillStyle = 'rgba(243,239,230,.07)';
    for (let y = 420; y < 1620; y += 60) for (let x = 60; x < W; x += 60) ctx.fillRect(x - 1, y - 1, 2, 2);

    const ang = st.ground.angle, gp = st.ground.position;
    font(ctx, FS, F.latin, 800); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';

    // see-saw fulcrum
    ctx.fillStyle = BLUE_D;
    ctx.beginPath(); ctx.moveTo(PIV_X, GROUND_Y + 40); ctx.lineTo(PIV_X - 70, GROUND_Y + 170); ctx.lineTo(PIV_X + 70, GROUND_Y + 170); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(243,239,230,.25)'; ctx.fillRect(84, GROUND_Y + 170, W - 168, 2);

    // shadows (flat offset, print-like)
    const SH = [14, 16];
    ctx.save(); ctx.translate(SH[0], SH[1]);
    for (const b of st.letters) drawLetter(ctx, b, b.position.x, b.position.y, b.angle, BLUE_D);
    if (st.ballIn) { ctx.fillStyle = BLUE_D; ctx.beginPath(); ctx.arc(st.ball.position.x, st.ball.position.y, BR, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(gp.x, gp.y); ctx.rotate(ang); ctx.fillStyle = BLUE_D; ctx.fillRect(-505, -20, 1010, 40); ctx.restore();
    ctx.restore();

    // motion trails: earlier samples, only for fast bodies
    for (const b of st.letters) {
      const v = Math.hypot(b.velocity.x, b.velocity.y);
      if (v < 4 || !b.hist.length) continue;
      const a = clamp((v - 4) / 14) * 0.14;
      b.hist.forEach((h, i) => { ctx.globalAlpha = a * (i + 1) / b.hist.length; drawLetter(ctx, b, h[0], h[1], h[2], BONE); });
    }
    if (st.ballIn) st.ball.hist.forEach((h, i) => { ctx.globalAlpha = 0.12 * (i + 1) / st.ball.hist.length; ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(h[0], h[1], BR, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;

    // floor plank
    ctx.save(); ctx.translate(gp.x, gp.y); ctx.rotate(ang);
    ctx.fillStyle = BONE; ctx.fillRect(-505, -20, 1010, 40);
    ctx.fillStyle = BLUE;
    for (let x = -480; x <= 480; x += 40) ctx.fillRect(x - 1, 6, 2, x % 200 === 0 ? 14 : 7);
    ctx.restore();
    ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(PIV_X, GROUND_Y + 20, 8, 0, TAU); ctx.fill();

    // letters: row 2 is the coral accent row
    for (const b of st.letters) drawLetter(ctx, b, b.position.x, b.position.y, b.angle, b.row === 2 ? CORAL : BONE);

    // the heavy ball
    if (st.ballIn) {
      const p = st.ball.position;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x, p.y, BR, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(st.ball.angle);
      ctx.strokeStyle = 'rgba(243,239,230,.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-BR, 0); ctx.lineTo(BR, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke();
      ctx.restore();
      text(ctx, 'ρ ×25', p.x + BR + 16, p.y + 8, { size: 20, family: F.mono, color: 'rgba(243,239,230,.7)' });
    }
    // impact ring
    if (t > HIT && t < HIT + 0.6) {
      const u = (t - HIT) / 0.6, bp = st.ball.position;
      ctx.strokeStyle = rgba(BONE, 0.7 * (1 - u)); ctx.lineWidth = 3 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(bp.x, bp.y + 60, 100 + 340 * E.outCubic(u), 0, TAU); ctx.stroke();
    }

    // readout
    const up = t >= T_REV;
    const ra = ease(E.outCubic, 0.3, 0.9, t);
    const nb = st.letters.length + (st.ballIn ? 1 : 0) + 1;
    text(ctx, `dt = 1/240 s · bodies: ${nb} · g = 9.81 ${up ? '↑' : '↓'}`, 84, 470, { size: 22, family: F.mono, weight: 500, color: up ? CORAL : 'rgba(243,239,230,.8)', alpha: ra });
    text(ctx, `step ${String(S.sim.n).padStart(4, '0')} · floor θ ${(ang * 180 / Math.PI).toFixed(1).padStart(5)}°`, 84, 504, { size: 20, family: F.mono, color: 'rgba(243,239,230,.5)', alpha: ra });
    // riser: gravity arrow flips
    const ga = ease(E.outCubic, 0.4, 1.0, t);
    ctx.save(); ctx.globalAlpha = ga; ctx.translate(980, 600);
    const flip = E.inOutCubic(clamp((t - 5.3) / 0.5));
    ctx.rotate(Math.PI * flip);
    ctx.strokeStyle = up ? CORAL : BONE; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, 26); ctx.lineTo(12, 26); ctx.lineTo(0, 48); ctx.closePath(); ctx.fill();
    ctx.restore();
    text(ctx, 'g', 952, 610, { size: 22, family: F.mono, color: 'rgba(243,239,230,.7)', alpha: ga, align: 'right' });

    // HUD bands
    const hb = ctx.createLinearGradient(0, 1580, 0, H); hb.addColorStop(0, 'rgba(10,16,70,0)'); hb.addColorStop(1, 'rgba(10,16,70,.55)');
    ctx.fillStyle = hb; ctx.fillRect(0, 1580, W, H - 1580);
    const ht = ctx.createLinearGradient(0, 0, 0, 420); ht.addColorStop(0, 'rgba(10,16,70,.45)'); ht.addColorStop(1, 'rgba(10,16,70,0)');
    ctx.fillStyle = ht; ctx.fillRect(0, 0, W, 420);
    grain(ctx, 0.05, s.frame);
  },
});
