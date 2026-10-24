/* 05 節奏網格 — a Bauhaus tile grid driven by the beat. On every beat each tile turns 90° with a snappy
   overshoot; the turn travels across the grid as a diagonal wave (delay = (row + col) × step). Colours swap
   at the snap. In the last bars the rows squash flat one by one (scaleY → line) until only lines remain. */
const CREAM = '#ebe3d0', RED = '#d6402a', YEL = '#f0b411', BLU = '#1f4fa3', BLK = '#17171b';
const PAL = [CREAM, RED, YEL, BLU, BLK];
const COLS = 6, ROWS = 7, TS = 152, GX = (W - COLS * TS) / 2, GY = 462;
const STEP = 0.032;                                   // stagger per (row + col)
const TURN = bezierEase(.3, 1.6, .45, 1);             // snappy turn with overshoot
const COL0 = 4.45, COLD = 0.15, COLLEN = 0.52;        // collapse: start, per-row delay, duration
const LINE = 8;                                       // final line thickness (px)

const r = rng(505);
const TILES = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  TILES.push({ x, y, motif: Math.floor(r() * 6), rot0: Math.floor(r() * 4), dir: r() < .5 ? 1 : -1, seed: Math.floor(r() * 1e6), every: r() < .75 ? 1 : 2 });
}
/* colour pair for tile at beat-count n (deterministic) */
function colours(T, n) {
  const q = rng(T.seed + n * 7919); q(); q();
  const bg = Math.floor(q() * 5); let fg = Math.floor(q() * 4);
  if (fg >= bg) fg++;
  // keep the ground mostly cream / light so the page reads as a printed poster
  return q() < .45 ? [0, bg === 0 ? fg : bg] : [bg, fg];
}
function motif(ctx, m, c) {
  const h = TS / 2; ctx.fillStyle = c; ctx.beginPath();
  if (m === 0) { ctx.moveTo(-h, -h); ctx.arc(-h, -h, TS, 0, Math.PI / 2); ctx.closePath(); }               // quarter circle
  else if (m === 1) { ctx.arc(0, h, h, Math.PI, TAU); ctx.closePath(); }                                      // half circle
  else if (m === 2) { ctx.moveTo(-h, -h); ctx.lineTo(h, -h); ctx.lineTo(-h, h); ctx.closePath(); }            // triangle
  else if (m === 3) { ctx.rect(-h, -h, h, h); ctx.rect(0, 0, h, h); }                                          // checker square
  else if (m === 4) { ctx.arc(0, 0, h * 0.62, 0, TAU); }                                                       // circle
  else { ctx.moveTo(-h, h); ctx.arc(-h, h, h, -Math.PI / 2, 0); ctx.closePath(); ctx.moveTo(h, -h); ctx.arc(h, -h, h, Math.PI / 2, Math.PI); ctx.closePath(); } // two quarters
  ctx.fill();
}

M.def({
  id: 's05', num: '05', title: '節奏網格', en: 'RHYTHM GRID', dur: 6, hud: 'dark',
  tags: ['Bauhaus 磚格 · 每拍旋轉 90°', 'stagger = 列 × 行 延遲', 'rows → lines (scaleY → 0)'],
  cues: Array.from({ length: ROWS }, (_, i) => ({ t: COL0 + i * COLD + 0.18, type: 'tick', v: 0.5 })),
  frame(ctx, t, s) {
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
    // paper tone: soft fibre bands
    const pg = ctx.createLinearGradient(0, 0, 0, H);
    pg.addColorStop(0, 'rgba(120,90,40,.06)'); pg.addColorStop(.5, 'rgba(255,255,255,.05)'); pg.addColorStop(1, 'rgba(120,90,40,.08)');
    ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);

    const gA = ease(E.outExpo, 0, 0.5, t);
    // construction lines
    ctx.fillStyle = rgba(BLK, .14 * gA);
    for (let i = 0; i <= COLS; i++) ctx.fillRect(GX + i * TS - .5, GY - 40, 1, ROWS * TS + 80);
    for (let j = 0; j <= ROWS; j++) ctx.fillRect(GX - 40, GY + j * TS - .5, COLS * TS + 80, 1);

    for (const T of TILES) {
      const d = (T.x + T.y) * STEP;
      const lt = t - d;                                       // tile-local time
      // entry: tiles pop in on the first beat with the same wave
      const pin = spring(lt + 0.06, 420, 24);
      if (pin <= 0.001) continue;
      // beat count and turn progress (turn takes 0.28 s after each beat)
      const b = Math.max(0, lt) / BEAT, n = Math.floor(b), ph = (b - n) * BEAT;
      const turns = Math.floor(n / T.every) + (n % T.every === T.every - 1 ? TURN(clamp(ph / 0.28)) : 0);
      const ang = (T.rot0 + T.dir * turns) * Math.PI / 2;
      const swap = n % T.every === T.every - 1 && ph > 0.1 ? n + 1 : n;   // colours change mid-turn
      const [bi, fi] = colours(T, Math.floor(swap / T.every));
      // collapse
      const cu = (t - COL0 - T.y * COLD) / COLLEN;
      let sy = 1;
      if (cu > 0) { const k = spring(cu * COLLEN, 260, 14); sy = Math.max(LINE / TS * 0.35, lerp(1, LINE / TS, k)); }
      const cx = GX + T.x * TS + TS / 2, cy = GY + T.y * TS + TS / 2;
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(pin, pin * sy);
      ctx.beginPath(); ctx.rect(-TS / 2 + .5, -TS / 2, TS - 1, TS); ctx.clip();
      ctx.fillStyle = PAL[bi]; ctx.fillRect(-TS / 2, -TS / 2, TS, TS);
      ctx.rotate(ang);
      motif(ctx, T.motif, PAL[fi]);
      // as the row flattens, the tile resolves into a single solid bar of its accent colour
      if (cu > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(cx, cy); ctx.scale(pin, pin * sy);
        ctx.fillStyle = rgba(PAL[fi === 0 ? bi : fi], E.outCubic(clamp(cu * 1.6))); ctx.fillRect(-TS / 2, -TS / 2, TS, TS); }
      ctx.restore();
    }

    // beat meter under the grid
    const by = GY + ROWS * TS + 58, bt = t / BEAT, inBar = Math.floor(bt) % 4, bar = Math.floor(t / BAR);
    const mA = ease(E.outCubic, 0.2, 0.7, t) * (1 - ease(E.inCubic, 5.4, 5.85, t));
    for (let i = 0; i < 4; i++) {
      const on = i === inBar, pulse = on ? 1 - E.outCubic(clamp(fract(bt) / 0.4)) : 0;
      ctx.fillStyle = rgba(on ? RED : BLK, (on ? 1 : .25) * mA);
      const sz = 16 + pulse * 8;
      ctx.fillRect(GX + i * 30 + (16 - sz) / 2, by - 8 - sz / 2, sz, sz);
    }
    text(ctx, `bar ${bar + 1} · beat ${inBar + 1}/4`, GX + 132, by, { size: 21, family: F.mono, weight: 500, color: BLK, alpha: mA * .8 });
    text(ctx, `t − (r + c) × ${STEP.toFixed(3)}s`, GX + COLS * TS, by, { size: 21, family: F.mono, color: BLK, alpha: mA * .5, align: 'right' });
    grain(ctx, 0.05, s.frame);
  },
});
