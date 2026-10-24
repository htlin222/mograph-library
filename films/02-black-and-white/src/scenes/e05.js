/* 05 預備、跟隨與重疊 — a block character crouches, jumps, lands; its antenna and tail are Verlet
   chains that lag behind (overlap / follow-through). Compare without anticipation, without follow-through;
   payoff: a somersault with antenna onion skins. Dark ground. */
const GROUND = 810, CYC = 4;
const T_CROUCH = 0.55, T_LAUNCH = 1.2, AIR = 0.9, T_LAND = T_LAUNCH + AIR;

/* body pose for cycle time u; v = { antic, flip, H } */
function pose(u, v) {
  let h = 0, sy = 1, lean = 0, spin = 0;
  sy = 1 + 0.015 * Math.sin(u * TAU * 1.5);
  if (v.antic && u >= T_CROUCH && u < T_LAUNCH) {
    const c = ease(E.inOutCubic, T_CROUCH, T_LAUNCH - 0.1, u);
    sy = lerp(1, 0.8, c); lean = -0.1 * c;
  }
  if (u >= T_LAUNCH && u < T_LAND) {
    const p = (u - T_LAUNCH) / AIR;
    h = v.H * 4 * p * (1 - p);
    sy = 1 + (v.antic ? 0.32 : 0.12) * Math.exp(-p * 9) + 0.1 * smooth(0.75, 1, p);
    lean = (v.antic ? 0.12 : 0.04) * Math.exp(-p * 5) - 0.06 * smooth(0.6, 1, p);
    if (v.flip) spin = -TAU * E.inOutCubic(clamp((p - 0.08) / 0.8));
  }
  if (u >= T_LAND) {
    const tt = u - T_LAND;
    sy = 1 - 0.3 * Math.exp(-6 * tt) * Math.cos(14 * tt);
    lean = 0.06 * Math.exp(-5 * tt) * Math.sin(12 * tt);
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

const CH = {                                   // chains in body-local terms
  ant: { n: 6, len: 24, at: [0.12, -1], dir: [0.15, -1], k: 0.1 },
  tail: { n: 6, len: 18, at: [-0.46, -0.22], dir: [-1, -0.7], k: 0.07 },
};
function restDir(c, ang) { const l = Math.hypot(c.dir[0], c.dir[1]), dx = c.dir[0] / l, dy = c.dir[1] / l; return [dx * Math.cos(ang) - dy * Math.sin(ang), dx * Math.sin(ang) + dy * Math.cos(ang)]; }

const S = M.def({
  id: 'e05', num: 5, ch: 1, title: '預備、跟隨與重疊', en: 'ANTICIPATION & FOLLOW-THROUGH', dur: 20, ground: 'dark',
  prompt: '一個方塊角色每 4 秒跳一次：先蹲 0.6 秒蓄力、後仰，起跳拉長，落地壓扁再回彈；頭上天線、身後尾巴用彈簧鏈延遲跟隨。並排比較「沒有預備」和「沒有跟隨」，最後空翻一圈，畫出天線尖端的軌跡。黑底白色角色。',
  how: ['身體 = 手寫關鍵姿勢：蹲 sy 0.8 → 拉長 1.32 → 壓扁 0.7', '天線、尾巴：Verlet 鏈 + 跟隨領導者長度約束，120 Hz', '每節往靜止方向回拉 k ≈ 0.1，越靠末端越晚到 = 重疊'],
  practice: '讓角色停下時，天線比身體晚 3 格才靜止。',
  cues: [0, 4, 8, 12, 16].flatMap(c => [{ t: c + T_LAUNCH, type: 'whoosh', dur: 0.35, v: 0.45 }, { t: c + T_LAND, type: 'thud', v: 0.8 }]),

  reset() {
    this.st = INST.map(I => {
      const F0 = frameOf(I, 0), o = {};
      for (const key in CH) {
        const c = CH[key], a = F0.world(c.at[0] * BW * I.sc, c.at[1] * BH * I.sc), d = restDir(c, F0.ang);
        o[key] = [...Array(c.n)].map((_, i) => { const x = a[0] + d[0] * c.len * I.sc * i, y = a[1] + d[1] * c.len * I.sc * i; return { x, y, px: x, py: y }; });
      }
      o.hist = []; return o;
    });
  },
  step(dt, n, T) {
    INST.forEach((I, ii) => {
      const Fm = frameOf(I, T), o = this.st[ii];
      for (const key in CH) {
        const c = CH[key], pts = o[key], L = c.len * I.sc;
        const a = Fm.world(c.at[0] * BW * I.sc, c.at[1] * BH * I.sc), d = restDir(c, Fm.ang);
        pts[0].x = a[0]; pts[0].y = a[1];
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i];
          const vx = (p.x - p.px) * 0.975, vy = (p.y - p.py) * 0.975;
          p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 500 * dt * dt;
          // pull toward the rest pose relative to its parent (softer toward the tip)
          const k = c.k * (1 - 0.45 * i / pts.length);
          const tx = pts[i - 1].x + d[0] * L, ty = pts[i - 1].y + d[1] * L;
          p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
        }
        for (let i = 1; i < pts.length; i++) {          // follow-the-leader length constraint
          const p = pts[i], q = pts[i - 1], dx = p.x - q.x, dy = p.y - q.y, l = Math.hypot(dx, dy) || 1;
          p.x = q.x + dx / l * L; p.y = q.y + dy / l * L;
        }
      }
      if (n % 2 === 0) { const tp = o.ant[o.ant.length - 1]; o.hist.push([tp.x, tp.y]); if (o.hist.length > 24) o.hist.shift(); }
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
      if (!rigid) return o[key].map(p => [p.x, p.y]);
      const a = Fm.world(c.at[0] * BW * sc, c.at[1] * BH * sc), d = restDir(c, Fm.ang);
      return [...Array(c.n)].map((_, i) => [a[0] + d[0] * c.len * sc * i, a[1] + d[1] * c.len * sc * i]);
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
    M.sim(S, t, (dt, n, T) => this.step(dt, n, T), 120);
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
