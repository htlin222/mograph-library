/* 64 分割畫面 — one world (a pendulum wave) seen through panels. Each panel = clip rect + its own camera
   (zoom, focus, mirror) + its own time offset Δt. Panels split, slide on beats, scramble and recombine. */
const NP = 15, PIV = 120, LEN = 620, AMP = 0.45, TC = 24, N0 = 12;
const DEP = [0.4, -0.22];                                 // screen direction of the swing (oblique depth)
function balls(t) {
  const out = [];
  for (let i = 0; i < NP; i++) {
    const th = AMP * Math.cos(TAU * t * (N0 + i) / TC), s = Math.sin(th) * LEN;
    const px = 160 + i * 54;
    out.push({ i, px, x: px + s * DEP[0], y: PIV + Math.cos(th) * LEN + s * DEP[1], z: Math.sin(th), th });
  }
  return out;
}
function world(ctx, t) {
  ctx.fillStyle = P; ctx.fillRect(-3000, -3000, 7080, 7080);
  ctx.fillStyle = g(0.86); ctx.fillRect(-3000, 900, 7080, 3000);
  ctx.fillStyle = g(0.55); ctx.fillRect(-3000, 900, 7080, 2);
  const B = balls(t);
  ctx.fillStyle = g(0, 0.16);
  for (const b of B) { ctx.beginPath(); ctx.ellipse(b.x + 30, 935 + b.z * 30, 34, 8, 0, 0, TAU); ctx.fill(); }
  // frame: bar on two posts
  ctx.fillStyle = K; ctx.fillRect(70, PIV - 12, 940, 12); ctx.fillRect(70, PIV - 12, 10, 900 - PIV + 12); ctx.fillRect(1000, PIV - 12, 10, 900 - PIV + 12);
  B.sort((a, b) => a.z - b.z);
  for (const b of B) {
    ctx.strokeStyle = g(0, 0.75); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(b.px, PIV); ctx.lineTo(b.x, b.y); ctx.stroke();
    // short motion ghost
    const th2 = AMP * Math.cos(TAU * (t - 0.06) * (N0 + b.i) / TC), s2 = Math.sin(th2) * LEN;
    const r = 30 * (1 + 0.25 * b.z);
    ctx.fillStyle = g(0, 0.18); ctx.beginPath(); ctx.arc(b.px + s2 * DEP[0], PIV + Math.cos(th2) * LEN + s2 * DEP[1], r, 0, TAU); ctx.fill();
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = P; ctx.beginPath(); ctx.arc(b.x - r * 0.32, b.y - r * 0.32, r * 0.16, 0, TAU); ctx.fill();
  }
}
/* top view: the wave as it really is (x = row, y = swing) */
function worldTop(ctx, t) {
  ctx.fillStyle = P; ctx.fillRect(-3000, -3000, 7080, 7080);
  ctx.strokeStyle = g(0, 0.25); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(90, 540); ctx.lineTo(990, 540); ctx.stroke();
  const B = balls(t);
  ctx.strokeStyle = g(0, 0.5); ctx.beginPath(); B.forEach((b, k) => { const y = 540 + Math.sin(b.th) * LEN * 0.9; k ? ctx.lineTo(b.px, y) : ctx.moveTo(b.px, y); }); ctx.stroke();
  ctx.fillStyle = K; for (const b of B) { ctx.beginPath(); ctx.arc(b.px, 540 + Math.sin(b.th) * LEN * 0.9, 28, 0, TAU); ctx.fill(); }
}
/* draw one panel: rect + camera (z zoom, fx/fy focus, mirror) + Δt */
function panel(ctx, t, p) {
  ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.scale(p.z * (p.mirror ? -1 : 1), p.z); ctx.translate(-p.fx, -p.fy);
  (p.top ? worldTop : world)(ctx, t + (p.dt || 0));
  ctx.restore();
  if (p.tag) {
    font(ctx, 18, F.mono, 500); const w = ctx.measureText(p.tag).width + 16;
    ctx.fillStyle = K; ctx.fillRect(p.x + 12, p.y + 12, w, 26);
    text(ctx, p.tag, p.x + 20, p.y + 31, { size: 18, family: F.mono, weight: 500, color: P });
  }
}
const cellOf = (x, y, w, h) => ({ x, y, w, h, z: 1, fx: x + w / 2, fy: y + h / 2 });
/* 4×4 slide moves on beats: [time, 'r'|'c', index, dir] — then undone in reverse */
const MOVES0 = [['r', 1, 1], ['c', 2, 1], ['r', 3, -1], ['c', 0, -1]];
const MOVES = [...MOVES0, ...MOVES0.slice().reverse().map(([k, i, d]) => [k, i, -d])].map((m, j) => [12.25 + j * 0.5, ...m]);

M.def({
  id: 'e64', num: 64, ch: 8, title: '分割畫面', en: 'SPLIT SCREEN', dur: 20, ground: 'dark',
  prompt: '同一組 15 顆單擺波（週期各不同）用分割畫面重看：先一分為二成全景／特寫，再三條橫幅各差 0.4 秒，再 2×2 四機位（含鏡像與俯視），最後 4×4 格每拍滑動一行打亂、再滑回並合併成一張全畫面。間隙 10px，黑白。',
  how: ['每格 = clip 矩形 + 自己的相機（縮放、焦點、鏡像）+ Δt', '單擺 i 的週期 = 24 ÷ (12+i) 秒，24 秒後全部對齊', '4×4 格內容 = 全畫面的對應區塊；滑動時排列置換'],
  practice: '同一段影片做三格分割，每格延遲 0.2 秒。',
  cues: [{ t: 1.5, type: 'whoosh', dur: 0.6 }, { t: 4, type: 'whoosh', dur: 0.6 }, { t: 8, type: 'whoosh', dur: 0.6 }, { t: 12, type: 'impact', v: 0.4 }]
    .concat(MOVES.map(([t]) => ({ t, type: 'tick' })), [{ t: 16, type: 'riser', t1: 17 }, { t: 17, type: 'bell', i: 0, v: 0.4 }]),
  frame(ctx, t) {
    ctx.fillStyle = K; ctx.fillRect(0, 0, SW, SH);
    const GAP = 10;
    let label, sub;
    if (t < 4) {
      // full frame → split in two: WIDE | CLOSE
      const k = ease(E.inOutCubic, 1.5, 2.2, t), zk = ease(E.inOutCubic, 2.0, 3.0, t);
      const half = 540 - GAP / 2 * k;
      const B = balls(t)[7];
      panel(ctx, t, { x: 0, y: 0, w: half, h: 1080, z: lerp(1, 0.5, zk), fx: lerp(half / 2, 540, zk), fy: 540, tag: k > 0.5 ? 'A · WIDE' : '' });
      panel(ctx, t, { x: 1080 - half, y: 0, w: half, h: 1080, z: lerp(1, 2.2, zk), fx: lerp(1080 - half / 2, B.x, zk), fy: lerp(540, B.y - 40, zk), tag: k > 0.5 ? 'B · CLOSE ×2.2' : '' });
      label = k < 0.5 ? '全畫面' : '一分為二'; sub = k < 0.5 ? 'ONE FRAME · 15 PENDULUMS' : 'WIDE / CLOSE · SAME TIME';
    } else if (t < 8) {
      // three strips, each Δt later: the wave becomes a time comparison
      const h = (1080 - GAP * 2) / 3;
      for (let i = 0; i < 3; i++) {
        const k = ease(E.outExpo, 4 + i * 0.12, 4.7 + i * 0.12, t), dir = i % 2 ? 1 : -1;
        panel(ctx, t, { x: dir * (1 - k) * 1080, y: i * (h + GAP), w: 1080, h, z: 1, fx: 540, fy: 640, dt: -i * 0.4, tag: `Δt −${(i * 0.4).toFixed(1)} s` });
      }
      label = '三條時間差'; sub = 'Δt = 0 / 0.4 / 0.8 s';
    } else if (t < 12) {
      // 2×2 multicam
      const w = (1080 - GAP) / 2, B = balls(t)[3];
      const cams = [
        { z: 0.5, fx: 540, fy: 560, tag: 'WIDE' },
        { z: 2.0, fx: B.x, fy: B.y - 30, tag: 'CLOSE · #4' },
        { z: 0.5, fx: 540, fy: 560, mirror: true, dt: -1, tag: 'MIRROR · Δt −1s' },
        { z: 0.5, fx: 540, fy: 540, top: true, tag: 'TOP VIEW' },
      ];
      cams.forEach((c, i) => {
        const col = i % 2, row = (i / 2) | 0, k = ease(E.outBack, 8 + i * 0.25, 8.6 + i * 0.25, t);
        const x = col * (w + GAP), y = row * (w + GAP);
        const ox = (col ? 1 : -1) * (1 - k) * 600, oy = (row ? 1 : -1) * (1 - k) * 600;
        panel(ctx, t, Object.assign({ x: x + ox, y: y + oy, w, h: w }, c));
      });
      label = '2×2 四機位'; sub = 'WIDE · CLOSE · MIRROR · TOP';
    } else {
      // 4×4: cells of ONE image; rows/columns slide on beats (permutation), then the gaps close
      const gap = t < 16 ? GAP * ease(E.outCubic, 12, 12.4, t) : GAP * (1 - ease(E.inOutCubic, 16.2, 17.2, t));
      const n = 4, cw = (1080 - gap * (n - 1)) / n, step = cw + gap;
      // replay moves to get the permutation + current animation
      let perm = [...Array(16).keys()], anim = null;
      for (const [tm, kind, idx, dir] of MOVES) {
        if (t < tm) break;
        const u = ease(E.outBack, tm, tm + 0.35, t);
        if (u < 1) { anim = { kind, idx, dir, u }; break; }
        const np = perm.slice();
        for (let j = 0; j < n; j++) {
          if (kind === 'r') np[idx * n + ((j + dir + n) % n)] = perm[idx * n + j];
          else np[((j + dir + n) % n) * n + idx] = perm[j * n + idx];
        }
        perm = np;
      }
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const src = perm[r * n + c], sr = (src / n) | 0, sc = src % n;
        const view = { z: 1, fx: sc * 270 + 135, fy: sr * 270 + 135 };       // the source cell of the full 1080 frame
        let dx = 0, dy = 0;
        if (anim && anim.kind === 'r' && anim.idx === r) dx = anim.dir * anim.u * step;
        if (anim && anim.kind === 'c' && anim.idx === c) dy = anim.dir * anim.u * step;
        const draw = (ox, oy) => panel(ctx, t, Object.assign({ x: c * step + dx + ox, y: r * step + dy + oy, w: cw, h: cw }, view));
        draw(0, 0);
        if (dx) draw(-Math.sign(dx) * n * step, 0);                         // wrap-around copy
        if (dy) draw(0, -Math.sign(dy) * n * step);
      }
      const scr = perm.some((v, i) => v !== i) || anim;
      if (t < 16) { label = scr ? '16 格 · 每拍滑動' : '16 格 · 同一張畫面'; sub = `GRID 4×4 · GAP ${gap.toFixed(0)} px`; }
      else { label = '合併'; sub = `RECOMBINE · GAP ${gap.toFixed(1)} px`; }
    }
    // label box
    const la = t > 18.6 ? 1 - ease(E.inCubic, 18.6, 19.4, t) : 1;
    if (la > 0) {
      ctx.save(); ctx.globalAlpha = la;
      font(ctx, 36, F.tcBlack, 900); const w1 = ctx.measureText(label).width; font(ctx, 17, F.mono, 500); const w2 = ctx.measureText(sub).width + 2 * 17 * 0.12;
      const bw = Math.max(w1, w2 + 30) + 40;
      ctx.fillStyle = K; ctx.fillRect(40, 940, bw, 100);
      text(ctx, label, 60, 990, { size: 36, family: F.tcBlack, weight: 900, color: P });
      text(ctx, sub, 61, 1022, { size: 18, family: F.mono, weight: 500, color: P, spacing: 2, alpha: 0.75 });
      ctx.restore();
    }
  },
});
