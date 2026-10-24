/* 05 預備、跟隨與重疊 — a block character crouches, jumps, lands; its antenna and tail are angular-spring
   chains that lag behind (overlap / follow-through). Compare without anticipation, without follow-through;
   payoff: a somersault with antenna onion skins. Dark ground. */
const GROUND = 810, CYC = 4;
const T_CROUCH = 0.55, T_LAUNCH = 1.2, AIR = 0.9, T_LAND = T_LAUNCH + AIR;

/* body pose for cycle time u; v = { antic, flip, H }.
   Every channel (height, squash, lean, spin) is continuous in time — no value jumps between frames:
   · the stretch happens on the ground during a 3-frame push-off, so the body leaves the floor already long
   · landing starts from the in-air shape and its squash/settle is a damped spring that begins at that value
   (verified with tools/motioncheck.mjs and the per-frame probe in the commit that introduced this) */
const PUSH = 0.14;                                         // push-off: ~4 frames, feet still on the ground
const breath = u => 1 + 0.015 * Math.sin(u * TAU * 1.5) * (1 - smooth(T_CROUCH - 0.25, T_CROUCH, u));
function airPose(p, v) {                                   // p = 0…1 through the flight
  const s0 = v.antic ? 0.26 : 0.1, l0 = v.antic ? 0.12 : 0.04;
  return {
    sy: 1 + s0 * Math.exp(-p * 7) + 0.08 * smooth(0.55, 1, p),          // launch stretch decays, falling stretch builds
    lean: l0 * Math.exp(-p * 5) - 0.06 * smooth(0.6, 1, p),
  };
}
function pose(u, v) {
  let h = 0, sy = 1, lean = 0, spin = 0;
  const crouchSy = v.antic ? 0.8 : 1, crouchLean = v.antic ? -0.1 : 0;
  if (u < T_LAUNCH - PUSH) {                                // idle → crouch (eased, then held)
    const c = v.antic ? ease(E.inOutCubic, T_CROUCH, T_LAUNCH - PUSH - 0.08, u) : 0;
    sy = lerp(breath(u), crouchSy, c); lean = crouchLean * c;
  } else if (u < T_LAUNCH) {                                // push-off: crouch → launch shape, on the ground
    const k = smooth(T_LAUNCH - PUSH, T_LAUNCH, u), A = airPose(0, v);
    sy = lerp(crouchSy, A.sy, k); lean = lerp(crouchLean, A.lean, k);
  } else if (u < T_LAND) {                                  // flight
    const p = (u - T_LAUNCH) / AIR, A = airPose(p, v);
    h = v.H * 4 * p * (1 - p); sy = A.sy; lean = A.lean;
    if (v.flip) spin = -TAU * E.inOutCubic(clamp((p - 0.08) / 0.8));
  } else {                                                  // landing: damped spring from the arrival shape
    const tt = u - T_LAND, A = airPose(1, v), w = 14, dk = Math.exp(-6 * tt);
    const x0 = A.sy - 1;                                    // arrives stretched, impact drives it into a squash
    sy = 1 + dk * (x0 * Math.cos(w * tt) - (0.42 + x0 * 6 / w) * Math.sin(w * tt));
    lean = Math.exp(-5 * tt) * (A.lean * Math.cos(12 * tt) + 0.06 * Math.sin(12 * tt));
  }
  return { h, sx: Math.pow(sy, -0.4), sy, lean, spin };       // keep some volume
}

/* instances: who is on stage, where, and which variant at time t */
const INST = [
  { key: 'A', x: 540, sc: 1.3, vis: t => (t < 4.2 ? 1 - ease(E.inCubic, 3.8, 4.15, t) : 0) + ease(E.outCubic, 11.9, 12.4, t),
    v: t => ({ antic: true, rigid: false, flip: t >= 16, H: t >= 16 ? 300 : 250 }) },
  { key: 'L', x: 290, sc: 1.0, vis: t => ease(E.outCubic, 4, 4.4, t) * (1 - ease(E.inCubic, 11.6, 12, t)),
    v: t => ({ antic: t >= 8, rigid: t >= 8, flip: false, H: 250 }) },
  { key: 'R', x: 790, sc: 1.0, vis: t => ease(E.outCubic, 4, 4.4, t) * (1 - ease(E.inCubic, 11.6, 12, t)),
    v: t => ({ antic: true, rigid: false, flip: false, H: 250 }) },
];
const BW = 200, BH = 190;

function frameOf(I, t) {
  const u = t % CYC, v = I.v(t), P = pose(u, v), sc = I.sc;
  const bw = BW * sc, bh = BH * sc;
  const X = I.x, Y = GROUND - P.h * sc;
  const cy = -bh * P.sy / 2;
  /* local (unscaled body units, origin bottom-centre) → world */
  const world = (lx, ly) => {
    let px = lx * P.sx, py = ly * P.sy;
    let qx = px, qy = py - cy; const cs = Math.cos(P.spin), sn = Math.sin(P.spin);
    [qx, qy] = [qx * cs - qy * sn, qx * sn + qy * cs]; qy += cy;
    const cl = Math.cos(P.lean), sl = Math.sin(P.lean);
    return [X + qx * cl - qy * sl, Y + qx * sl + qy * cl];
  };
  const ang = P.lean + P.spin;
  return { P, v, sc, bw, bh, X, Y, cy, world, ang };
}

/* chains in body-local terms. Each segment is an angular spring hinged on its parent (not free Verlet points):
   it is pulled toward its parent's angle (segment 0: toward the body), damped relative to the parent, and pushed by
   the inertia of its moving pivot — so the follow-through is one smooth wave down the chain, with no zigzag and no
   stretching. f = natural frequency (Hz), z = damping ratio, both softer toward the tip. */
const CH = {
  ant: { n: 6, len: 24, at: [0.12, -1], dir: [0.15, -1], f: 3.6, z: 0.4, g: 0, bend: 0.55 },
  tail: { n: 6, len: 18, at: [-0.46, -0.22], dir: [-1, -0.7], f: 3.0, z: 0.45, g: 120, bend: 0.45 },
};
const restAng = c => Math.atan2(c.dir[1], c.dir[0]);
const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));
const SIM_HZ = 240, W_MAX = 18, INERTIA = 0.4, A_SMOOTH = 0.25; // stylised inertia; pivot acceleration low-passed (~4 steps)
function chainState(I, Fm, key) {
  const c = CH[key], L = c.len * I.sc, a = Fm.world(c.at[0] * BW * I.sc, c.at[1] * BH * I.sc), phi = restAng(c) + Fm.ang;
  return { phi: Array(c.n - 1).fill(phi), w: Array(c.n - 1).fill(0), base: a, vb: [0, 0], L,
    pts: [...Array(c.n)].map((_, i) => ({ x: a[0] + Math.cos(phi) * L * i, y: a[1] + Math.sin(phi) * L * i })) };
}

const S = M.def({
  id: 'e05', num: 5, ch: 1, title: '預備、跟隨與重疊', en: 'ANTICIPATION & FOLLOW-THROUGH', dur: 20, ground: 'dark',
  prompt: '一個方塊角色每 4 秒跳一次：先蹲 0.6 秒蓄力、後仰，起跳拉長，落地壓扁再回彈；頭上天線、身後尾巴用彈簧鏈延遲跟隨。並排比較「沒有預備」和「沒有跟隨」，最後空翻一圈，畫出天線尖端的軌跡。黑底白色角色。',
  how: ['身體 = 連續的姿勢曲線：蹲 0.8 → 地面蹬伸 1.26 → 落地彈簧壓扁 0.76', '天線、尾巴：每節是掛在上一節的角彈簧，受支點加速度推動，240 Hz', '越靠末端越軟（3 Hz、阻尼 0.32），越晚到 = 重疊'],
  practice: '讓角色停下時，天線比身體晚 3 格才靜止。',
  cues: [0, 4, 8, 12, 16].flatMap(c => [{ t: c + T_LAUNCH, type: 'whoosh', dur: 0.35, v: 0.45 }, { t: c + T_LAND, type: 'thud', v: 0.8 }]),

  reset() {
    this.st = INST.map(I => {
      const F0 = frameOf(I, 0), o = { ang: F0.ang, hist: [] };
      for (const key in CH) o[key] = chainState(I, F0, key);
      return o;
    });
  },
  step(dt, n, T) {
    INST.forEach((I, ii) => {
      const Fm = frameOf(I, T + dt), o = this.st[ii];
      const wBody = wrapPi(Fm.ang - o.ang) / dt; o.ang = Fm.ang;
      for (const key in CH) {
        const c = CH[key], C = o[key], L = C.L, m = C.phi.length;
        // pivot of segment 0 = the attachment point on the body; its acceleration drives the whole chain
        const base = Fm.world(c.at[0] * BW * I.sc, c.at[1] * BH * I.sc);
        const vb = [(base[0] - C.base[0]) / dt, (base[1] - C.base[1]) / dt];
        // the body's launch / landing is a velocity step: low-pass its acceleration so it reads as a shove, not a spike
        C.ab = C.ab || [0, 0];
        C.ab = [lerp(C.ab[0], (vb[0] - C.vb[0]) / dt, A_SMOOTH), lerp(C.ab[1], (vb[1] - C.vb[1]) / dt, A_SMOOTH)];
        let A = [C.ab[0] * INERTIA, C.ab[1] * INERTIA];
        C.base = base; C.vb = vb;
        let parentPhi = restAng(c) + Fm.ang, parentW = wBody;
        for (let i = 0; i < m; i++) {
          const soft = 1 - 0.45 * i / m, wn = TAU * c.f * soft, k = wn * wn, cd = 2 * c.z * wn;
          const dx = Math.cos(C.phi[i]), dy = Math.sin(C.phi[i]);
          const inertial = -(dx * A[1] - dy * A[0]) / L + c.g * dx / L;          // pivot acceleration + gravity
          const acc = -k * wrapPi(C.phi[i] - parentPhi) - cd * (C.w[i] - parentW) + inertial;
          C.w[i] = clamp(C.w[i] + acc * dt, -W_MAX, W_MAX);
          C.phi[i] += C.w[i] * dt;
          const rel = wrapPi(C.phi[i] - parentPhi);                                // joint limit: bends, never coils
          if (Math.abs(rel) > c.bend) { C.phi[i] = parentPhi + Math.sign(rel) * c.bend; C.w[i] = parentW; }
          // acceleration of the next pivot (tip of this segment): A + angular (tangential + centripetal) terms
          const nx = Math.cos(C.phi[i]), ny = Math.sin(C.phi[i]);
          A = [A[0] + L * (-ny * acc - nx * C.w[i] * C.w[i]), A[1] + L * (nx * acc - ny * C.w[i] * C.w[i])];
          parentPhi = C.phi[i]; parentW = C.w[i];
        }
        let x = base[0], y = base[1]; C.pts[0].x = x; C.pts[0].y = y;
        for (let i = 0; i < m; i++) { x += Math.cos(C.phi[i]) * L; y += Math.sin(C.phi[i]) * L; C.pts[i + 1].x = x; C.pts[i + 1].y = y; }
      }
      if (n % 4 === 0) { const tp = o.ant.pts[o.ant.pts.length - 1]; o.hist.push([tp.x, tp.y]); if (o.hist.length > 24) o.hist.shift(); }
    });
  },

  drawChar(ctx, I, o, t, A) {
    const Fm = frameOf(I, t), P = Fm.P, sc = I.sc, rigid = Fm.v.rigid;
    ctx.save(); ctx.globalAlpha *= A;
    // shadow
    const hh = clamp(P.h / 300);
    ctx.fillStyle = fg(0.16 * (1 - hh * 0.7)); ctx.beginPath(); ctx.ellipse(I.x, GROUND + 10, Fm.bw * (0.62 - hh * 0.25), 7, 0, 0, TAU); ctx.fill();
    // chains (rigid variant: drawn straight along the rest direction)
    const chainPts = key => {
      const c = CH[key];
      if (!rigid) return o[key].pts.map(p => [p.x, p.y]);
      const a = Fm.world(c.at[0] * BW * sc, c.at[1] * BH * sc), phi = restAng(c) + Fm.ang;
      return [...Array(c.n)].map((_, i) => [a[0] + Math.cos(phi) * c.len * sc * i, a[1] + Math.sin(phi) * c.len * sc * i]);
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = fg(1); ctx.fillStyle = fg(1);
    const tail = chainPts('tail');
    for (let i = 1; i < tail.length; i++) {
      ctx.lineWidth = lerp(22, 6, i / tail.length) * sc;
      ctx.beginPath(); ctx.moveTo(tail[i - 1][0], tail[i - 1][1]); ctx.lineTo(tail[i][0], tail[i][1]); ctx.stroke();
    }
    const ant = chainPts('ant');
    ctx.lineWidth = 6 * sc; ctx.beginPath(); ant.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.beginPath(); ctx.arc(ant[ant.length - 1][0], ant[ant.length - 1][1], 15 * sc, 0, TAU); ctx.fill();
    // body
    ctx.save(); ctx.translate(Fm.X, Fm.Y); ctx.rotate(P.lean); ctx.translate(0, Fm.cy); ctx.rotate(P.spin); ctx.translate(0, -Fm.cy); ctx.scale(P.sx, P.sy);
    ctx.fillStyle = fg(1); ctx.beginPath(); ctx.roundRect(-Fm.bw / 2, -Fm.bh, Fm.bw, Fm.bh, 40 * sc); ctx.fill();
    // eye looks up while crouching (anticipation reads in the face too)
    const u = t % CYC, look = Fm.v.antic ? ease(E.inOutCubic, T_CROUCH, T_LAUNCH, u) * (1 - ease(E.outCubic, T_LAUNCH + 0.3, T_LAND, u)) : 0;
    ctx.fillStyle = bg(1);
    ctx.beginPath(); ctx.ellipse(Fm.bw * 0.2, -Fm.bh * 0.6 - look * 10 * sc, 15 * sc, 19 * sc, 0, 0, TAU); ctx.fill();
    ctx.fillRect(Fm.bw * 0.05, -Fm.bh * 0.32, Fm.bw * 0.3, 7 * sc);
    ctx.restore();
    ctx.restore();
  },

  strip(ctx, t, A) {
    const u = t % CYC, x0 = 48, w = 984, y = 960, X = s => x0 + w * s / CYC;
    ctx.save(); ctx.globalAlpha *= A;
    ctx.fillStyle = fg(0.2); ctx.fillRect(x0, y, w, 2);
    const segs = [[T_CROUCH, T_LAUNCH, '預備', 'ANTICIPATION'], [T_LAUNCH, T_LAND, '動作', 'ACTION'], [T_LAND, T_LAND + 0.9, '跟隨', 'FOLLOW-THROUGH']];
    segs.forEach(([a, b, tc, en]) => {
      const on = u >= a && u < b;
      ctx.fillStyle = fg(on ? 1 : 0.3); ctx.fillRect(X(a), y - 6, X(b) - X(a) - 6, on ? 14 : 8);
      text(ctx, tc, X(a), y - 22, { size: 26, family: F.tcBlack, weight: 900, alpha: on ? 1 : 0.4 });
      text(ctx, en, X(a), y + 42, { size: 18, family: F.mono, alpha: on ? 0.8 : 0.35 });
    });
    ctx.fillStyle = fg(1); ctx.fillRect(X(u) - 1.5, y - 18, 3, 36);
    ctx.restore();
  },

  frame(ctx, t) {
    M.sim(S, t, (dt, n, T) => this.step(dt, n, T), SIM_HZ);
    ctx.fillStyle = fg(0.9); ctx.fillRect(40, GROUND, SW - 80, 2);
    // header
    const hdr = t < 4 ? ['一次完整的跳躍', 'CROUCH · JUMP · LAND · SETTLE'] : t < 8 ? ['左：沒有預備', 'NO ANTICIPATION vs FULL'] : t < 12 ? ['左：沒有跟隨', 'RIGID ANTENNA vs SPRING CHAIN'] : t < 16 ? ['重疊：末端最晚到', 'OVERLAPPING ACTION'] : ['空翻：同一套鏈', 'SAME CHAINS, MORE ENERGY'];
    const hk = Math.floor(t / 4), ha = ease(E.outCubic, hk * 4, hk * 4 + 0.4, t);
    text(ctx, hdr[0], 48, 82, { size: 38, family: F.tcBlack, weight: 900, alpha: ha });
    text(ctx, hdr[1], 48, 118, { size: 20, family: F.mono, alpha: 0.55 * ha, spacing: 1 });
    // antenna onion skins in the payoff
    const A = INST[0], oA = this.st[0], skin = ease(E.outCubic, 12.2, 12.8, t);
    if (skin > 0) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // the antenna tip's path over the last 0.4 s: the whip of overlapping action
      const hs = oA.hist, n = hs.length;
      for (let j = 1; j < n; j++) {
        const a = j / n;
        ctx.strokeStyle = fg(0.5 * a * skin); ctx.lineWidth = lerp(1, 10, a) * 1.3;
        ctx.beginPath(); ctx.moveTo(hs[j - 1][0], hs[j - 1][1]); ctx.lineTo(hs[j][0], hs[j][1]); ctx.stroke();
      }
      for (let j = 0; j < n; j += 3) { ctx.fillStyle = fg(0.6 * (j / n) * skin); ctx.beginPath(); ctx.arc(hs[j][0], hs[j][1], 4, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    INST.forEach((I, i) => { const a = clamp(I.vis(t)); if (a > 0.001) this.drawChar(ctx, I, this.st[i], t, a); });
    // compare labels
    const ca = INST[1].vis(t);
    if (ca > 0) {
      const lab = t < 8 ? '無預備' : '無跟隨';
      text(ctx, lab, INST[1].x, GROUND + 70, { size: 30, family: F.tcBlack, weight: 900, align: 'center', alpha: ca });
      text(ctx, t < 8 ? 'jump from rest' : 'antenna glued on', INST[1].x, GROUND + 104, { size: 18, family: F.mono, align: 'center', alpha: 0.5 * ca });
      text(ctx, '完整', INST[2].x, GROUND + 70, { size: 30, family: F.tcBlack, weight: 900, align: 'center', alpha: ca });
      text(ctx, 'crouch + spring chain', INST[2].x, GROUND + 104, { size: 18, family: F.mono, align: 'center', alpha: 0.5 * ca });
    }
    const sa = Math.max(1 - ease(E.inCubic, 3.8, 4.1, t), ease(E.outCubic, 12, 12.4, t));
    if (sa > 0) this.strip(ctx, t, sa);
  },
});
