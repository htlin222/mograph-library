/* 01 時距與間距 — three balls, same drop, different timing & spacing.
   Reference scene: shows the contract (M.def fields, stage-local drawing, cues). */
const GROUND = 860, CYCLE = 4;                    // stage-local ground line; one drop per 2 bars
const BALLS = [
  { key: 'rubber', name: '橡膠球', en: 'RUBBER', r: 62, g: 2600, e: 0.72, squash: 0.35 },
  { key: 'bowling', name: '保齡球', en: 'BOWLING', r: 74, g: 3600, e: 0.14, squash: 0.06 },
  { key: 'balloon', name: '氣球', en: 'BALLOON', r: 70, g: 520, e: 0.45, squash: 0.18 },
];
const DROP = 600;                                  // drop height in px
/* height above the ground at time u after release: piecewise parabolas with restitution e */
function bounce(u, b) {
  let v = Math.sqrt(2 * b.g * DROP), t0 = Math.sqrt(2 * DROP / b.g), land = [t0];
  if (u < t0) return { h: DROP - 0.5 * b.g * u * u, vy: b.g * u, land, hit: 0 };
  let start = t0, vv = v * b.e;
  for (let k = 0; k < 12; k++) {
    const dur = 2 * vv / b.g;
    if (u < start + dur) { const tt = u - start; return { h: vv * tt - 0.5 * b.g * tt * tt, vy: -(vv - b.g * tt), land, hit: u - land[land.length - 1] }; }
    start += dur; land.push(start); vv *= b.e; if (vv < 30) break;
  }
  return { h: 0, vy: 0, land, hit: u - land[land.length - 1] };
}
M.def({
  id: 'e01', num: 1, ch: 1, title: '時距與間距', en: 'TIMING & SPACING', dur: 20, ground: 'dark',
  prompt: '三顆球從同一高度落下：橡膠球、保齡球、氣球。不准改造型，只准改時距與間距，讓觀眾光看動作就分得出材質；每顆球留下每一格的位置點。',
  how: ['重力與恢復係數不同：橡膠 0.72、保齡球 0.14、氣球重力極小', '每格畫一個點：點越密越慢，點越疏越快', '每 2 小節（4 秒）重播一次，落地瞬間依材質壓扁'],
  practice: '只改時距，做出「緊張」與「慵懶」兩種走路。',
  cues: [0, 4, 8, 12, 16].flatMap(c => [{ t: c + Math.sqrt(2 * DROP / BALLS[1].g), type: 'thud', v: 0.9 }, { t: c + Math.sqrt(2 * DROP / BALLS[0].g), type: 'pop', v: 0.6 }]),
  frame(ctx, t, s) {
    const cyc = Math.floor(t / CYCLE), u = t - cyc * CYCLE;
    // ground and columns
    ctx.fillStyle = fg(0.9); ctx.fillRect(60, GROUND, SW - 120, 2);
    BALLS.forEach((b, i) => {
      const cx = 180 + i * 360, top = GROUND - DROP - b.r;
      // column label
      text(ctx, b.name, cx, 120, { size: 40, family: F.tcBlack, weight: 900, align: 'center' });
      text(ctx, b.en, cx, 156, { size: 18, family: F.mono, align: 'center', alpha: 0.55, spacing: 4 });
      // spacing marks: one dot per frame of this cycle, appear after the first cycle
      const reveal = ease(E.outCubic, 3.6, 4.4, t);
      if (reveal > 0) {
        for (let f = 0; f / FPS <= u; f++) {
          const q = bounce(f / FPS, b), y = GROUND - b.r - q.h;
          ctx.fillStyle = fg(0.75 * reveal);
          ctx.fillRect(cx + 110 - 3, y - 3, 6, 6);
        }
        // frame ruler beside the spacing dots
        ctx.fillStyle = fg(0.25 * reveal); ctx.fillRect(cx + 110, top + b.r, 1, DROP);
      }
      // the ball: stretch along velocity in the air, squash on contact (area preserved)
      const q = bounce(u, b), y = GROUND - b.r - q.h;
      let sx = 1, sy = 1;
      if (q.hit >= 0 && q.hit < 0.08 && q.land.length) { const k = b.squash * Math.exp(-q.hit * 40) * Math.cos(q.hit * 35); sx = 1 + k; sy = 1 / (1 + k); }
      else { const st = clamp(Math.abs(q.vy) / 6000, 0, b.squash * 0.8); sy = 1 + st; sx = 1 / (1 + st); }
      // shadow
      const hh = clamp(q.h / DROP);
      ctx.fillStyle = fg(0.25 * (1 - hh)); ctx.beginPath(); ctx.ellipse(cx, GROUND + 8, b.r * (1.1 - hh * 0.5), 6, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(cx, GROUND - (GROUND - y) * 1 + (1 - sy) * b.r); ctx.scale(sx, sy);
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU);
      if (b.key === 'rubber') { ctx.fillStyle = fg(1); ctx.fill(); }
      else if (b.key === 'bowling') { ctx.fillStyle = fg(1); ctx.fill(); ctx.fillStyle = bg(1); [[-18, -26], [6, -34], [-2, -10]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy, 8, 0, TAU); ctx.fill(); }); }
      else { ctx.strokeStyle = fg(1); ctx.lineWidth = 5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, b.r); ctx.quadraticCurveTo(12, b.r + 26, -2, b.r + 54); ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
      // readout
      const land = q.land[0];
      text(ctx, `落地 ${land.toFixed(2)}s · e ${b.e}`, cx, GROUND + 60, { size: 20, family: F.mono, align: 'center', alpha: 0.6 });
    });
    // timeline scrubber under the stage: cycle progress in frames
    const fx = 60, fw = SW - 120, fy = 1000;
    for (let f = 0; f <= CYCLE * FPS; f += 1) { const x = fx + fw * f / (CYCLE * FPS); ctx.fillStyle = fg(f % 30 === 0 ? 0.8 : f % 5 === 0 ? 0.4 : 0.15); ctx.fillRect(x, fy, 1.5, f % 30 === 0 ? 22 : f % 5 === 0 ? 12 : 6); }
    ctx.fillStyle = fg(1); ctx.fillRect(fx + fw * u / CYCLE - 1.5, fy - 10, 3, 42);
    text(ctx, `f ${String(Math.floor(u * FPS)).padStart(3, '0')} / ${CYCLE * FPS}`, fx, fy + 54, { size: 18, family: F.mono, alpha: 0.6 });
  },
});
