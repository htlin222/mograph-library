/* 04 擠壓與伸展 — rigid vs squash & stretch with onion skins; the area rule (sx·sy = 1) vs a wrong
   squash; payoff: a Marey-style chronophotograph of one decaying bounce across the stage. Light ground. */
const TB = 1.0;                                  // lane bounce period (lands on every second beat)
const SA = 0.38, QA = 0.42, CW = 0.06;             // stretch amount, squash amount, contact window (s)

/* deformation e (>0 stretch along motion, <0 squash) blended continuously into the contact window */
function deform(d, speed, S = SA, Q = QA) {      // d = time distance to nearest contact, speed 0..1
  const w = smooth(0, CW, d);
  return lerp(-Q * speed, S * speed, w);
}
function wrapHalf(a) { return ((a + Math.PI / 2) % Math.PI + Math.PI) % Math.PI - Math.PI / 2; }

/* periodic lane bounce: x wraps, height parabola, returns centre / scale / rotation */
function laneBall(t, ground, r, H, vx, soft, area = true) {
  const p = fract(t / TB), x = -70 + ((t * vx + 220) % 1220 + 1220) % 1220;
  const h = H * 4 * p * (1 - p), vyUp = H * 4 * (1 - 2 * p) / TB, v0 = H * 4 / TB;
  const d = Math.min(p, 1 - p) * TB;
  const e = soft ? deform(d, Math.abs(vyUp) / v0 * (d < CW ? 1 : 1)) : 0;
  const a = Math.atan2(-vyUp, vx), rot = wrapHalf(a - Math.PI / 2) * smooth(0, CW * 2, d);
  const sy = 1 + e, sx = area ? 1 / sy : 1;
  return { x, y: ground - h - r * sy, sx, sy, rot, h };
}

/* payoff physics: drop from height, restitution 0.62, constant drift */
const PG = 1500, PE = 0.7, PH = 600, PVX = 140, PX0 = 110, PGROUND = 900, PR = 46;
const LAND = (() => { const L = []; let t = Math.sqrt(2 * PH / PG), v = Math.sqrt(2 * PG * PH); L.push([t, v]); v *= PE;
  while (v > 90 && t < 7) { t += 2 * v / PG; L.push([t, v]); v *= PE; } return L; })();
const V0 = Math.sqrt(2 * PG * PH);
function marey(u) {
  let h, vy;
  if (u < LAND[0][0]) { h = PH - 0.5 * PG * u * u; vy = -PG * u; }
  else {
    let i = 0; while (i < LAND.length - 1 && u >= LAND[i + 1][0]) i++;
    const tt = u - LAND[i][0], v = LAND[i][1] * PE;
    if (i === LAND.length - 1) { h = 0; vy = 0; }
    else { h = Math.max(0, v * tt - 0.5 * PG * tt * tt); vy = v - PG * tt; }
  }
  // nearest contact and its impact speed
  let d = 1e9, sp = 0;
  for (const [lt, lv] of LAND) { const dd = Math.abs(u - lt); if (dd < d) { d = dd; sp = lv / V0; } }
  const e = d < CW ? deform(d, sp) : SA * Math.abs(vy) / V0;
  const a = Math.atan2(-vy, PVX), rot = wrapHalf(a - Math.PI / 2) * smooth(0, CW * 2, d);
  const sy = 1 + e;
  return { x: PX0 + PVX * u, y: PGROUND - h - PR * sy, sx: 1 / sy, sy, rot, h };
}

function ball(ctx, b, r, mode, a = 1) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.scale(b.sx, b.sy);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
  if (mode === 'fill') { ctx.fillStyle = fg(a); ctx.fill(); }
  else { ctx.restore(); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.beginPath(); ctx.ellipse(0, 0, r * b.sx, r * b.sy, 0, 0, TAU); ctx.strokeStyle = fg(a); ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.restore();
}

M.def({
  id: 'e04', num: 4, ch: 1, title: '擠壓與伸展', en: 'SQUASH & STRETCH', dur: 20, ground: 'light',
  prompt: '上下兩條跑道，同一顆彈跳球：上面是不變形的剛體，下面落地壓扁、空中沿速度方向拉長，面積守恆，每 2 格留洋蔥皮殘影。再並排比較「面積守恆」與「只壓扁」，最後一顆球跨畫面彈跳衰減成連續攝影。',
  how: ['形變 e 隨速度變大；sy = 1 + e、sx = 1 ÷ sy，面積不變', '橢圓長軸轉向速度方向；著地前後 60 ms 改成壓扁', '殘影 = 把 t − 2k/30 代回同一個 f(t) 重畫'],
  practice: '把壓扁量調到 0.8，看看球什麼時候變成果凍。',
  cues: [1, 2, 3, 4, 5, 6, 7].map(t => ({ t, type: 'pop', v: 0.45 }))
    .concat([9, 10, 11, 12, 13].map(t => ({ t, type: 'thud', v: 0.55 })))
    .concat(LAND.filter(l => l[0] < 5.8).map(l => ({ t: 14 + l[0], type: 'pop', v: 0.3 + 0.5 * l[1] / V0 }))),

  frame(ctx, t) {
    if (t < 8.4) this.lanes(ctx, t, 1 - ease(E.inCubic, 7.8, 8.2, t));
    if (t > 8 && t < 14.4) this.compare(ctx, t, ease(E.outCubic, 8.1, 8.5, t) * (1 - ease(E.inCubic, 13.8, 14.2, t)));
    if (t > 14) this.payoff(ctx, t, ease(E.outCubic, 14, 14.4, t));
  },

  lanes(ctx, t, A) {
    ctx.save(); ctx.globalAlpha = A;
    const lanes = [
      { ground: 470, soft: false, tc: '剛體', en: 'RIGID · sx = sy = 1' },
      { ground: 990, soft: true, tc: '擠壓與伸展', en: 'SQUASH & STRETCH · sx·sy = 1' },
    ];
    const r = 44, H = 230, vx = 240;
    lanes.forEach((L, li) => {
      const top = L.ground - 430;
      text(ctx, L.tc, 48, top + 34, { size: 36, family: F.tcBlack, weight: 900 });
      text(ctx, L.en, 48, top + 66, { size: 20, family: F.mono, alpha: 0.55 });
      ctx.fillStyle = fg(1); ctx.fillRect(40, L.ground, SW - 80, 2);
      // onion skins: every 2 frames, 12 back
      const now = laneBall(t, L.ground, r, H, vx, L.soft);
      for (let k = 12; k >= 1; k--) {
        const tt = t - k * 2 / FPS; if (tt < 0) continue;
        const b = laneBall(tt, L.ground, r, H, vx, L.soft);
        if (Math.abs(b.x - now.x) > 400) continue;
        ball(ctx, b, r, 'line', 0.5 * (1 - k / 13));
      }
      // contact shadow
      const hh = clamp(now.h / H);
      ctx.fillStyle = fg(0.12 * (1 - hh * 0.7)); ctx.beginPath(); ctx.ellipse(now.x, L.ground + 9, r * (1.2 - hh * 0.5), 5, 0, 0, TAU); ctx.fill();
      ball(ctx, now, r, 'fill');
    });
    ctx.restore();
  },

  compare(ctx, t, A) {
    ctx.save(); ctx.globalAlpha = A;
    const ground = 860, r = 72, H = 400;
    const cols = [
      { x: 190, soft: false, area: true, tc: '剛體', en: 'e = 0' },
      { x: 540, soft: true, area: true, tc: '面積守恆', en: 'sx = 1 ÷ sy' },
      { x: 890, soft: true, area: false, tc: '只壓扁', en: 'sx = 1' },
    ];
    text(ctx, '同一個彈跳，三種形變規則', 48, 76, { size: 26, family: F.tc, alpha: 0.7 });
    ctx.fillStyle = fg(1); ctx.fillRect(40, ground, SW - 80, 2);
    cols.forEach((C, i) => {
      const f = tt => { const b = laneBall(tt, ground, r, H, 0, C.soft, C.area); b.x = C.x; return b; };
      text(ctx, C.tc, C.x, 160, { size: 38, family: F.tcBlack, weight: 900, align: 'center' });
      text(ctx, C.en, C.x, 196, { size: 20, family: F.mono, align: 'center', alpha: 0.55 });
      for (let k = 10; k >= 1; k--) ball(ctx, f(t - k * 2 / FPS), r, 'line', 0.4 * (1 - k / 11));
      // the contact frame, held as a dashed silhouette: this is where the rule shows
      const c = f(Math.round(t));
      if (C.soft) { ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = fg(0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c.x, c.y, r * c.sx, r * c.sy, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
      const b = f(t);
      ball(ctx, b, r, 'fill');
      // bounding box + area readout
      const w = 2 * r * b.sx, h = 2 * r * b.sy;
      ctx.setLineDash([4, 5]); ctx.strokeStyle = fg(0.45); ctx.lineWidth = 1;
      ctx.strokeRect(b.x - w / 2, b.y - h / 2, w, h); ctx.setLineDash([]);
      const area = c.sx * c.sy;
      text(ctx, `著地面積 ${Math.round(area * 100)}%`, C.x, ground + 64, { size: 26, family: F.tc, align: 'center', weight: 400 });
      text(ctx, `w ${c.sx.toFixed(2)} × h ${c.sy.toFixed(2)}`, C.x, ground + 100, { size: 20, family: F.mono, align: 'center', alpha: 0.55 });
      // verdict mark
      const mark = i === 2 ? '×' : '○';
      text(ctx, mark, C.x, ground + 160, { size: 40, family: F.tc, align: 'center', alpha: i === 0 ? 0 : 0.9 });
    });
    ctx.restore();
  },

  payoff(ctx, t, A) {
    const u = t - 14;
    ctx.save(); ctx.globalAlpha = A;
    text(ctx, '連續攝影', 48, 82, { size: 36, family: F.tcBlack, weight: 900 });
    text(ctx, 'ONE BALL · A GHOST EVERY 2 FRAMES', 48, 116, { size: 20, family: F.mono, alpha: 0.55, spacing: 1 });
    ctx.fillStyle = fg(1); ctx.fillRect(40, PGROUND, SW - 80, 2);
    // ground ticks at each landing that has happened
    LAND.forEach(([lt, lv], i) => {
      if (lt > u) return;
      const x = PX0 + PVX * lt, a = ease(E.outCubic, lt, lt + 0.3, u);
      ctx.fillStyle = fg(0.6 * a); ctx.fillRect(x - 1, PGROUND + 14, 2, 16);
      if (i < 4) text(ctx, `${(lv / V0).toFixed(2)}`, x, PGROUND + 56, { size: 18, family: F.mono, align: 'center', alpha: 0.5 * a });
    });
    text(ctx, '撞擊速度 →  壓扁量', 1032, PGROUND + 56, { size: 20, family: F.tc, align: 'right', alpha: 0.5 * ease(E.outCubic, 15, 15.5, t) });
    // chronophotograph: all ghosts since the drop
    const nF = Math.floor(u * FPS);
    for (let f = 0; f < nF; f += 2) {
      const age = (nF - f) / FPS;
      ball(ctx, marey(f / FPS), PR, 'line', lerp(0.55, 0.22, clamp(age / 2)));
    }
    const b = marey(u);
    const hh = clamp(b.h / PH);
    ctx.fillStyle = fg(0.12 * (1 - hh * 0.7)); ctx.beginPath(); ctx.ellipse(b.x, PGROUND + 9, PR * (1.2 - hh * 0.5), 5, 0, 0, TAU); ctx.fill();
    ball(ctx, b, PR, 'fill');
    ctx.restore();
  },
});
