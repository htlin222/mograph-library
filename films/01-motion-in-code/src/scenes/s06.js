/* 06 流動線條 — 58 ridge lines, Perlin fBm displacement, painter's algorithm occlusion.
   The word "flow" is rasterised to a mask and added as a raised plateau; it surfaces mid-scene and
   erodes back into noise (threshold swept against a noise field). */
const NL = 58, X0 = 96, X1 = 984, NS = 222;            // lines, field x-range, samples per line
const Y0 = 640, Y1 = 1520;                              // base y of back / front line
const BG = '#0f1012', CREAM = '#efe7d4', ACC = '#ff6a3d', ACC_I = 41;
const PLAT = 30;
const nz = makeNoise(23), nz2 = makeNoise(71);
let MASK = null;                                        // Float32Array NL×NS, blurred word coverage
const baseY = i => Y0 + (Y1 - Y0) * Math.pow(i / (NL - 1), 1.12);
const sx = j => X0 + (X1 - X0) * j / (NS - 1);
const ys = new Float32Array(NS), wv = new Float32Array(NS);

/* word presence: rises 1.1→2.6, holds, erodes 3.9→5.4 */
const wordAmt = t => smooth(1.0, 2.6, t) * (1 - smooth(3.9, 5.4, t));

function lineY(i, t, out, outW) {
  const by = baseY(i), d = i / (NL - 1);
  const intro = E.outCubic(clamp((t - 0.02 * (NL - 1 - i) * 0.35) / 0.9));       // front lines wake first
  const outro = 1 - E.inCubic(clamp((t - 5.0 - (1 - d) * 0.5) / 0.8));            // back lines settle first
  const amp = (96 + 26 * d) * intro * outro, wa = wordAmt(t);
  const thr = lerp(1.25, 0.42, wa);
  for (let j = 0; j < NS; j++) {
    const x = sx(j), u = (x - 540) / 444;
    const env = Math.exp(-u * u * 2.6);                                            // centre-weighted, like a pulsar plot
    const n = nz.fbm(x * 0.0058 + t * 0.07, i * 0.21 - t * 0.33, t * 0.18, 4);
    let ridge = Math.max(0, n * 1.7 + 0.12); ridge = ridge * ridge * 1.6 + 0.05 * Math.abs(nz2(x * 0.03, i * 0.7, t));
    // word mesa: mask coverage eroded by a noise threshold
    const m = MASK[i * NS + j], e = nz2(x * 0.012, i * 0.33, 4.1 + t * 0.6) * 0.38;
    const w = smooth(thr - 0.12, thr + 0.12, m * 1.18 + e * (1 - m * 0.5));
    let disp = env * ridge * amp * (1 - w * 0.9) + w * PLAT * outro * intro + w * env * ridge * 6;
    out[j] = by - disp; outW[j] = w;
  }
}

M.def({
  id: 's06', num: '06', title: '流動線條', en: 'FLOW LINES', dur: 6, hud: 'light',
  tags: ['58 lines · Perlin fBm', 'painter’s algorithm 遮擋', '“flow” 藏在山脊之間'],
  cues: [{ t: 1.0, type: 'riser', t1: 2.5, v: 0.4 }, { t: 2.5, type: 'bell', i: 0, v: 0.6, dec: 3 }, { t: 3.0, type: 'bell', i: 2, v: 0.4, pan: 0.4 },
    { t: 3.9, type: 'reverse', t1: 5.0 }],
  init() {
    // rasterise "flow" in field coordinates, blur, sample at each (line, sample)
    const c = makeCanvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.filter = 'blur(4px)'; g.fillStyle = '#fff';
    font(g, 400, F.latin, 800); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.letterSpacing = '-10px';
    g.fillText('flow', 532, 1290);
    g.filter = 'none';
    const id = g.getImageData(0, 0, W, H).data;
    MASK = new Float32Array(NL * NS);
    for (let i = 0; i < NL; i++) for (let j = 0; j < NS; j++) {
      const x = Math.round(sx(j)), y = Math.round(baseY(i));
      MASK[i * NS + j] = id[(y * W + x) * 4] / 255;
    }
  },
  frame(ctx, t, s) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(540, 1020, 60, 540, 1020, 1150);
    bg.addColorStop(0, '#1b1a1a'); bg.addColorStop(1, '#0c0d0f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // gentle camera drift: slow dolly + tilt
    ctx.save();
    const cz = 1 + 0.035 * E.inOutSine(clamp(t / 6)), cr = Math.sin(t * 0.45) * 0.008;
    ctx.translate(540, 1030); ctx.rotate(cr); ctx.scale(cz, cz); ctx.translate(-540 + Math.sin(t * 0.6) * 10, -1030 - t * 4);

    for (let i = 0; i < NL; i++) {                 // back (top) → front (bottom)
      lineY(i, t, ys, wv);
      const d = i / (NL - 1);
      // occluder: fill the area under the line with the ground
      ctx.beginPath(); ctx.moveTo(sx(0) - 40, ys[0]);
      for (let j = 0; j < NS; j++) ctx.lineTo(sx(j), ys[j]);
      ctx.lineTo(sx(NS - 1) + 40, ys[NS - 1]); const ob = baseY(i) + 6; ctx.lineTo(sx(NS - 1) + 40, ob); ctx.lineTo(sx(0) - 40, ob); ctx.closePath();   // displacement is upward only, so occluding down to the base line suffices
      ctx.fillStyle = bg; ctx.fill();
      // plateau face: a warm lit band under the raised segments, so the word reads as a surface
      const gap = (Y1 - Y0) / NL;
      ctx.beginPath(); let any = false;
      for (let j = 0; j < NS - 1; j++) {
        if (Math.min(wv[j], wv[j + 1]) < 0.5) continue; any = true;
        ctx.rect(sx(j), Math.max(ys[j], ys[j + 1]), sx(j + 1) - sx(j) + 0.6, gap * 1.3);
      }
      if (any) { ctx.fillStyle = rgba('#e9dcc0', 0.13 * (0.5 + 0.5 * d)); ctx.fill(); }
      // stroke: depth fades the back rows; the word plateau runs brighter
      const acc = i === ACC_I;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = acc ? 3.4 : 2.0 + d * 1.0;
      ctx.strokeStyle = acc ? ACC : rgba(CREAM, 0.42 + 0.5 * d);
      ctx.beginPath(); ctx.moveTo(sx(0), ys[0]);
      for (let j = 1; j < NS; j++) ctx.lineTo(sx(j), ys[j]);
      ctx.stroke();
      // word segments highlighted
      if (!acc) {
        ctx.strokeStyle = rgba('#fff6e2', 0.9); ctx.lineWidth = 3.0 + d;
        let open = false; ctx.beginPath();
        for (let j = 0; j < NS; j++) {
          if (wv[j] > 0.5) { open ? ctx.lineTo(sx(j), ys[j]) : ctx.moveTo(sx(j), ys[j]); open = true; } else open = false;
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    // readout
    const ra = ease(E.outCubic, 0.3, 0.9, t) * (1 - ease(E.inCubic, 5.5, 5.95, t));
    const wa = wordAmt(t);
    text(ctx, `fbm(x·0.0058, i·0.21 − 0.33t, 0.18t) · 4 oct`, 84, 470, { size: 21, family: F.mono, color: 'rgba(239,231,212,.55)', alpha: ra });
    text(ctx, `mask “flow” · plateau ${(wa * PLAT).toFixed(0).padStart(2)} px`, 84, 502, { size: 21, family: F.mono, color: wa > 0.05 ? ACC : 'rgba(239,231,212,.55)', alpha: ra });
    // line index ticks on the right edge
    ctx.save(); ctx.globalAlpha = ra * 0.6;
    for (let i = 0; i < NL; i += 1) {
      const y = baseY(i);
      ctx.fillStyle = i === ACC_I ? ACC : 'rgba(239,231,212,.5)';
      ctx.fillRect(1012, y, i % 10 === 0 ? 18 : 8, 1.5);
      if (i % 10 === 0 || i === NL - 1) text(ctx, String(i + 1).padStart(2, '0'), 1062, y + 6, { size: 16, family: F.mono, color: 'rgba(239,231,212,.6)', align: 'right' });
    }
    ctx.restore();

    // HUD bands
    const hb = ctx.createLinearGradient(0, 1560, 0, H); hb.addColorStop(0, 'rgba(12,13,15,0)'); hb.addColorStop(0.3, 'rgba(12,13,15,.8)'); hb.addColorStop(1, 'rgba(12,13,15,.9)');
    ctx.fillStyle = hb; ctx.fillRect(0, 1560, W, H - 1560);
    vignette(ctx, 0.4);
    grain(ctx, 0.05, s.frame);
  },
});
