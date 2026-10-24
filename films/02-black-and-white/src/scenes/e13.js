/* 13 剛體物理 — matter.js at 240 Hz: boxes & circles rain, letters (box colliders) drop, a heavy ball smashes,
   gravity flips, then gravity rotates a full turn and everything tumbles. */
function tag(ctx, i, zh, en, a) {
  text(ctx, String(i).padStart(2, '0'), 60, 86, { size: 20, family: F.mono, weight: 500, alpha: 0.5 * a });
  text(ctx, zh, 100, 88, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 116 + w, 86, { size: 18, family: F.mono, spacing: 3, alpha: 0.5 * a });
}
const HZ = 240, BX0 = 60, BY0 = 130, BX1 = 1020, BY1 = 950, WORD = 'MATTER';
const GS = 0.0019;
/* gravity direction (angle, 90° = down) as a pure function of time */
function gAng(t) {
  if (t < 12) return Math.PI / 2;
  if (t < 14) return lerp(Math.PI / 2, -Math.PI / 2, ease(E.inOutCubic, 12, 12.35, t));
  return -Math.PI / 2 - TAU * 1.5 * ease(E.inOutSine, 14.2, 17.6, t);     // −90° → … → down again
}
const BALL_T = 9.5;
let eng, bodies, spawns, glyph = {};
const S = M.def({
  id: 'e13', num: 13, ch: 2, title: '剛體物理', en: 'RIGID BODIES', dur: 20, ground: 'light',
  prompt: '用 matter.js 以 240 Hz 固定步長模擬：方塊和圓先落下堆疊，6 秒掉下 MATTER 六個字母（碰撞體用方框並畫出虛線），9.5 秒一顆重球從左側高速撞進堆裡；12 秒重力反轉，14 秒起重力轉一圈半，所有東西在盒子裡翻滾。黑白。',
  how: ['Engine.update 每步 1/240 秒，畫面每格跑 8 步', '字母用矩形碰撞體，渲染形狀不等於碰撞形狀', 'engine.gravity 的 x、y 隨時間旋轉，盒子當牆'],
  practice: '把恢復係數從 0.2 調到 0.9，看堆疊會不會塌。',
  cues: [{ t: 6, type: 'tick' }, { t: 9.75, type: 'impact', v: 0.8 }, { t: 12, type: 'whoosh', dur: 0.5 }, { t: 12.45, type: 'thud', v: 0.9 }, { t: 14.2, type: 'riser', t1: 16 }],
  init() {
    for (const ch of new Set(WORD)) {
      const gl = glyphAt(ch, 100, 820), sc = 0.2; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < gl.pts.length; i += 2) { x0 = Math.min(x0, gl.pts[i]); x1 = Math.max(x1, gl.pts[i]); y0 = Math.min(y0, gl.pts[i + 1]); y1 = Math.max(y1, gl.pts[i + 1]); }
      glyph[ch] = { gl, sc, w: (x1 - x0) * sc, h: (y1 - y0) * sc, ox: -(x0 + x1) / 2 * sc, oy: (y0 + y1) / 2 * sc };
    }
  },
  reset() {
    const { Engine, Bodies, Composite } = Matter;
    eng = Engine.create({ enableSleeping: false }); eng.gravity.scale = GS; eng.positionIterations = 8; eng.velocityIterations = 6;
    const wall = (x, y, w, h) => Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.5 });
    Composite.add(eng.world, [wall((BX0 + BX1) / 2, BY1 + 100, 2000, 200), wall((BX0 + BX1) / 2, BY0 - 100, 2000, 200), wall(BX0 - 100, 540, 200, 2000), wall(BX1 + 100, 540, 200, 2000)]);
    bodies = []; spawns = [];
    const r = rng(1313);
    for (let i = 0; i < 30; i++) {
      const kind = r() < 0.5 ? 'box' : 'circ', st = r.int(0, 2);
      spawns.push({ t: i < 6 ? 0 : 0.2 + i * 0.16, kind, st, x: r.range(BX0 + 80, BX1 - 80), y: i < 6 ? r.range(BY0 + 60, BY0 + 380) : BY0 + 50, s: kind === 'box' ? r.range(48, 96) : r.range(24, 46), a: r.range(-0.6, 0.6), w: r.range(0.9, 1.6) });
    }
    [...WORD].forEach((ch, i) => spawns.push({ t: 6 + i * 0.25, kind: 'glyph', ch, x: 190 + i * 140, y: BY0 + 90, a: (i % 2 ? 1 : -1) * 0.15 }));
    spawns.push({ t: BALL_T, kind: 'ball', x: BX0 + 75, y: BY1 - 260, s: 70 });
    spawns.sort((a, b) => a.t - b.t);
  },
  frame(ctx, t) {
    const { Engine, Bodies, Body, Composite } = Matter;
    M.sim(S, t, (dt, n, st) => {
      const tt = st + dt;
      while (spawns.length && spawns[0].t <= tt) {
        const sp = spawns.shift(); let b;
        const o = { restitution: 0.2, friction: 0.4, frictionAir: 0.004 };
        if (sp.kind === 'box') b = Bodies.rectangle(sp.x, sp.y, sp.s * sp.w, sp.s, o);
        else if (sp.kind === 'circ') b = Bodies.circle(sp.x, sp.y, sp.s, o);
        else if (sp.kind === 'glyph') { const gd = glyph[sp.ch]; b = Bodies.rectangle(sp.x, sp.y, gd.w, gd.h, o); }
        else { b = Bodies.circle(sp.x, sp.y, sp.s, Object.assign({}, o, { density: 0.02, restitution: 0.3 })); }
        Body.setAngle(b, sp.a || 0);
        if (sp.kind === 'ball') Body.setVelocity(b, { x: 34, y: -6 });
        b.sp = sp; Composite.add(eng.world, b); bodies.push(b);
      }
      const a = gAng(tt); eng.gravity.x = Math.cos(a); eng.gravity.y = Math.sin(a);
      Engine.update(eng, 1000 / HZ);
    }, HZ);
    /* box */
    ctx.strokeStyle = fg(1); ctx.lineWidth = 3; ctx.strokeRect(BX0 - 1.5, BY0 - 1.5, BX1 - BX0 + 3, BY1 - BY0 + 3);
    /* bodies */
    const colA = ease(E.outCubic, 6, 6.5, t) * (1 - ease(E.inCubic, 11, 12, t));
    for (const b of bodies) {
      const sp = b.sp, k = ease(E.outBack, sp.t, sp.t + 0.18, t);
      ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
      if (sp.kind === 'box') {
        const w = sp.s * sp.w, h = sp.s;
        if (sp.st === 0) { ctx.fillStyle = fg(1); ctx.fillRect(-w / 2, -h / 2, w, h); }
        else if (sp.st === 1) { ctx.strokeStyle = fg(1); ctx.lineWidth = 5; ctx.strokeRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5); }
        else { ctx.fillStyle = g(0.62); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = fg(1); ctx.lineWidth = 2; ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2); }
      } else if (sp.kind === 'circ') {
        const r = sp.s;
        if (sp.st === 0) { ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.fillStyle = bg(1); ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.18, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = sp.st === 2 ? g(0.62) : bg(1); ctx.beginPath(); ctx.arc(0, 0, r - 2.5, 0, TAU); ctx.fill(); ctx.strokeStyle = fg(1); ctx.lineWidth = 5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r - 2, 0); ctx.lineWidth = 4; ctx.stroke(); }
      } else if (sp.kind === 'glyph') {
        const gd = glyph[sp.ch];
        ctx.fillStyle = fg(1); ctx.beginPath(); traceGlyph(ctx, gd.gl, gd.ox, gd.oy, gd.sc); ctx.fill();
        if (colA > 0) { ctx.setLineDash([6, 6]); ctx.strokeStyle = fg(0.7 * colA); ctx.lineWidth = 2; ctx.strokeRect(-gd.w / 2, -gd.h / 2, gd.w, gd.h); ctx.setLineDash([]); }
      } else {
        const r = sp.s; ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = bg(1); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * 0.62, 0); ctx.lineTo(r * 0.62, 0); ctx.stroke();
      }
      ctx.restore();
    }
    /* ball velocity streak before impact */
    if (t > BALL_T - 0.4 && t < BALL_T + 0.6) {
      const ba = 1 - ease(E.inCubic, BALL_T + 0.2, BALL_T + 0.6, t);
      if (t < BALL_T) { const k = ease(E.outCubic, BALL_T - 0.4, BALL_T, t); text(ctx, '重球 density × 20', BX0 + 30, BY1 - 360, { size: 22, family: F.tc, alpha: k }); ctx.fillStyle = fg(k); ctx.fillRect(BX0 + 30, BY1 - 345, 220 * k, 3); }
      else text(ctx, '重球 density × 20', BX0 + 30, BY1 - 360, { size: 22, family: F.tc, alpha: ba });
    }
    if (colA > 0) text(ctx, '虛線 = 碰撞體（矩形）', BX1 - 24, BY0 + 46, { size: 22, family: F.tc, align: 'right', alpha: colA * 0.8 });
    /* gravity dial */
    const ga = gAng(t), dx = 960, dy = 72;
    ctx.strokeStyle = fg(0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx, dy, 34, 0, TAU); ctx.stroke();
    ctx.strokeStyle = fg(1); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(dx - Math.cos(ga) * 18, dy - Math.sin(ga) * 18); ctx.lineTo(dx + Math.cos(ga) * 22, dy + Math.sin(ga) * 22); ctx.stroke();
    ctx.fillStyle = fg(1); ctx.beginPath(); const hx = dx + Math.cos(ga) * 32, hy = dy + Math.sin(ga) * 32;
    ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(ga) * 14 - Math.sin(ga) * 9, hy - Math.sin(ga) * 14 + Math.cos(ga) * 9); ctx.lineTo(hx - Math.cos(ga) * 14 + Math.sin(ga) * 9, hy - Math.sin(ga) * 14 - Math.cos(ga) * 9); ctx.fill();
    text(ctx, 'g', dx - 56, dy + 8, { size: 28, family: F.mono, weight: 500, align: 'right' });
    /* tag + readouts */
    const ph = t < 6 ? 0 : t < BALL_T ? 1 : t < 12 ? 2 : t < 14 ? 3 : 4, T0 = [0, 6, BALL_T, 12, 14];
    const tags = [['落下與堆疊', 'FALL & STACK'], ['字母碰撞體', 'COLLIDERS'], ['重球撞擊', 'IMPACT'], ['重力反轉', 'GRAVITY FLIP'], ['重力旋轉', 'ROTATING GRAVITY']];
    tag(ctx, ph + 1, tags[ph][0], tags[ph][1], ph === 0 ? 1 : ease(E.outCubic, T0[ph], T0[ph] + 0.3, t));
    text(ctx, `240 Hz · ${bodies.length} bodies · restitution 0.2 · friction 0.4`, 60, 1000, { size: 22, family: F.mono, alpha: 0.6 });
    const f2 = v => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
    text(ctx, `g = (${f2(Math.cos(ga))}, ${f2(Math.sin(ga))})`, 60, 1036, { size: 22, family: F.mono, weight: 500 });
    text(ctx, `step ${S.sim ? S.sim.n : 0}`, 1020, 1036, { size: 22, family: F.mono, align: 'right', alpha: 0.6 });
  },
});
