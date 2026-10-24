/* 02 動態字體 — the word MOTION, drawn from exact variable-font outlines (Archivo, wdth 62–125 × wght 100–900).
   Each letter breathes along the width axis on the beat; within a row the three phases are 120° apart, so the
   row keeps its measure while the letters trade width. Finale: the camera flies through the counter of the O. */
const INK = '#0e0e11', BONE = '#f2eee6', ACC = '#ff4a1c', DIMC = [242, 238, 230];
const ROWS = [['M', 'O', 'T'], ['I', 'O', 'N']];
const PH = [0, 2 / 3, 4 / 3, 1 / 3, 1, 5 / 3];          // phase offsets (× π) per letter
const MEAS = W - 168, X0 = 84;                         // full measure inside the 84 px margins
const FLY = 4.2, FREEZE = 4.0;                         // camera push starts; breathing freezes
const SNAP = bezierEase(.75, 0, .18, 1);               // per-beat move: hold, then a decisive glide
const dim = a => `rgba(${DIMC[0]},${DIMC[1]},${DIMC[2]},${a})`;

/* letter pose (wdth, wght) for letter index i at time t */
function pose(i, t) {
  const te = Math.min(t, FREEZE);
  const b = (te - i * 0.045) / BEAT;
  const sb = Math.floor(b) + SNAP(clamp(fract(b) / 0.72));
  const w = 0.5 - 0.5 * Math.cos((sb * 0.5 + PH[i]) * Math.PI);  // 0 = narrow, 1 = wide
  let wd = 62 + 63 * w, wg = lerp(880, 260, w);                    // narrow → heavy, wide → light: even colour
  // entry: everything starts condensed & hairline, unfolds over the first beat
  const e = ease(E.outExpo, 0.04 + i * 0.03, 0.75 + i * 0.03, t);
  wd = lerp(62, wd, e); wg = lerp(100, wg, e);
  // finale: the O we fly through opens wide & light (biggest counter); others relax to mid
  const f = ease(E.inOutCubic, 3.85, 4.5, t);
  if (i === 4) { wd = lerp(wd, 125, f); wg = lerp(wg, 330, f); }
  return { wd, wg };
}

/* trace one contour (c ≥ 0) or all (c = -1) of a glyph */
function trace(ctx, gl, x, y, s, c = -1) {
  const P_ = gl.pts; let k = 0, ci = -1, on = false;
  const X = i => x + P_[i * 2] * s, Y = i => y - P_[i * 2 + 1] * s;
  for (let o = 0; o < gl.ops.length; o++) {
    const op = gl.ops[o], cnt = gl.n[o];
    if (op === 'M') { ci++; on = c < 0 || ci === c; if (on) ctx.moveTo(X(k), Y(k)); k++; }
    else if (op === 'L') { if (on) ctx.lineTo(X(k), Y(k)); k++; }
    else if (op === 'Q') {
      if (on) for (let q = 0; q < cnt - 1; q++) {
        const ox = X(k + q), oy = Y(k + q);
        const last = q === cnt - 2;
        ctx.quadraticCurveTo(ox, oy, last ? X(k + cnt - 1) : (ox + X(k + q + 1)) / 2, last ? Y(k + cnt - 1) : (oy + Y(k + q + 1)) / 2);
      }
      k += cnt;
    } else if (op === 'C') { if (on) ctx.bezierCurveTo(X(k), Y(k), X(k + 1), Y(k + 1), X(k + 2), Y(k + 2)); k += 3; }
    else if (op === 'Z') { if (on) ctx.closePath(); }
  }
}
function inkX(gl) { let a = 1e9, b = -1e9; for (let k = 0; k < gl.pts.length; k += 2) { a = Math.min(a, gl.pts[k]); b = Math.max(b, gl.pts[k]); } return [a, b]; }
/* bbox centre of contour c in font units */
function contourCentre(gl, c) {
  let k = 0, ci = -1, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let o = 0; o < gl.ops.length; o++) {
    const op = gl.ops[o], cnt = op === 'Q' ? gl.n[o] : op === 'C' ? 3 : op === 'Z' ? 0 : 1;
    if (op === 'M') ci++;
    if (ci === c) for (let q = 0; q < cnt; q++) { const px = gl.pts[(k + q) * 2], py = gl.pts[(k + q) * 2 + 1]; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    k += cnt;
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0];
}

/* lay out both rows: each row is fitted to the full measure */
function layout(t) {
  const rows = []; let idx = 0, total = 0;
  for (const R of ROWS) {
    const gs = R.map(ch => { const p = pose(idx, t); const g = glyphAt(ch, p.wd, p.wg); g.ch = ch; g.i = idx++; g.p = p; g.ink = inkX(g); return g; });
    const track = 18;
    let raw = -gs[0].ink[0];
    gs.forEach((g, j) => { raw += j < gs.length - 1 ? g.adv + track : g.ink[1]; });
    const s = MEAS / raw;
    rows.push({ gs, s, track }); total += 700 * s;
  }
  const gap = 64;
  let y = 440 + (740 - total - gap) / 2;               // centre the block in y 440..1180
  for (const r of rows) {
    r.top = y; r.base = y + 700 * r.s; y = r.base + gap;
    let x = X0 - r.gs[0].ink[0] * r.s;
    for (const g of r.gs) { g.x = x; g.y = r.base; g.s = r.s; x += (g.adv + r.track) * r.s; }
  }
  return rows;
}

M.def({
  id: 's02', num: '02', title: '動態字體', en: 'VARIABLE TYPE', dur: 6,
  tags: ['Archivo variable · wdth 62 ↔ 125', 'glyph outlines 雙線性內插', 'camera → through the “O”'],
  cues: [{ t: FLY, type: 'riser', t1: 5.9, v: 0.55 }, { t: 5.62, type: 'reverse', t1: 6.0, v: 0.5 }],
  frame(ctx, t, s) {
    const rows = layout(t);
    const O = rows[1].gs[1];
    const [ocx, ocy, ow, oh] = contourCentre(O, 1);
    const cx = O.x + ocx * O.s, cy = O.y - ocy * O.s;              // counter centre on screen (before camera)

    /* camera: exponential push about the counter centre, which drifts to frame centre */
    const u = clamp((t - FLY) / (s.dur - FLY));
    const k = Math.pow(90, Math.pow(u, 2.2));
    const m = E.inOutCubic(clamp(u * 1.35));
    const tx = lerp(cx, W / 2, m), ty = lerp(cy, H / 2, m);
    const cam = (x, y) => [tx + (x - cx) * k, ty + (y - cy) * k];
    const uiA = 1 - ease(E.inCubic, FLY, FLY + 0.45, t);           // readouts leave as we push

    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    // faint baseline grid of the type area
    ctx.save(); ctx.globalAlpha = uiA;
    ctx.fillStyle = dim(.035);
    for (let y = 420; y < 1620; y += 24) ctx.fillRect(0, y, W, 1);
    ctx.restore();

    /* ---- world (camera) space ---- */
    ctx.save();
    ctx.setTransform(k, 0, 0, k, tx - cx * k, ty - cy * k);
    // specimen guides: baseline / cap height / per-letter advance boxes
    const gA = uiA * ease(E.outCubic, 0.1, 0.6, t);
    const hl = 1 / k;
    rows.forEach((r, ri) => {
      ctx.fillStyle = dim(.22 * gA);
      ctx.fillRect(0, r.base, W * ease(E.outExpo, 0.05 + ri * .1, 0.9, t), hl);
      ctx.fillRect(0, r.base - 688 * r.s, W * ease(E.outExpo, 0.1 + ri * .1, 0.95, t), hl);
      ctx.fillStyle = dim(.10 * gA);
      ctx.fillRect(0, r.base - 500 * r.s, W, hl);                          // x-height-ish reference
      r.gs.forEach(g => {
        const x0 = g.x + g.ink[0] * g.s, x1 = g.x + g.ink[1] * g.s;
        ctx.fillStyle = dim(.16 * gA);
        ctx.fillRect(x0, r.base - 688 * r.s - 14, hl, 14); ctx.fillRect(x1, r.base - 688 * r.s - 14, hl, 14);
        ctx.fillRect(x0, r.base + 6, x1 - x0, hl * 2);
        text(ctx, `${g.p.wd.toFixed(1)}`, x0, r.base + 30, { size: 19, family: F.mono, weight: 500, color: g.i === 4 && t > 3.9 ? ACC : dim(.75), alpha: gA });
        if (x1 - x0 > 150) text(ctx, `${Math.round(g.p.wg)}`, x1, r.base + 30, { size: 19, family: F.mono, color: dim(.4), alpha: gA, align: 'right' });
      });
    });

    // letters (entry: rise through a row mask with a stagger)
    rows.forEach((r, ri) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(-10, r.top - 30, W + 20, r.base - r.top + 46); ctx.clip();
      r.gs.forEach((g, j) => {
        const e = spring(t - 0.02 - g.i * 0.05, 210, 22);
        const dy = (1 - e) * 700 * r.s * 1.08;
        if (g.i === 4) {
          // the O: counter filled with the next colour as we approach it
          // iris: a disc of the next colour opens from the counter centre, clipped to the counter
          const ir = ease(E.outCubic, FLY - 0.35, FLY + 0.35, t);
          if (ir > 0) {
            ctx.save(); ctx.beginPath(); trace(ctx, g, g.x, g.y + dy, g.s, 1); ctx.clip();
            ctx.beginPath(); ctx.arc(cx, cy + dy, ir * Math.max(ow, oh) * g.s * 0.75, 0, TAU);
            ctx.fillStyle = ACC; ctx.fill(); ctx.restore();
          }
        }
        ctx.beginPath(); trace(ctx, g, g.x, g.y + dy, g.s);
        ctx.fillStyle = g.i === 4 ? rgba(mixc(BONE, '#ffffff', 0)) : BONE;
        ctx.fill('nonzero');
      });
      ctx.restore();
    });
    ctx.restore();

    /* ---- axis panel (screen space) ---- */
    if (uiA > 0.001) {
      ctx.save();
      const pA = ease(E.outCubic, 0.2, 0.8, t) * uiA;
      ctx.globalAlpha = pA; ctx.translate(0, (1 - uiA) * 60 + (1 - ease(E.outCubic, 0.2, 0.8, t)) * 30);
      const py = 1290, rowH = 44, tx0 = 168, tx1 = 846;
      text(ctx, 'AXIS', X0, py, { size: 19, family: F.mono, weight: 500, color: dim(.8), spacing: 4 });
      text(ctx, 'wdth', tx0, py, { size: 19, family: F.mono, color: dim(.5) });
      text(ctx, 'wght', W - X0, py, { size: 19, family: F.mono, color: dim(.5), align: 'right' });
      const wx = v => lerp(tx0, tx1, (v - 62) / 63);
      ['62', '75', '100', '125'].forEach(v => {
        const x = wx(+v);
        text(ctx, v, x, py + 26, { size: 15, family: F.mono, color: dim(.35), align: v === '62' ? 'left' : v === '125' ? 'right' : 'center' });
      });
      let i = 0;
      rows.forEach(r => r.gs.forEach(g => {
        const y = py + 64 + i * rowH, a = ease(E.outCubic, 0.25 + i * 0.05, 0.8 + i * 0.05, t);
        ctx.globalAlpha = pA * a;
        text(ctx, g.ch, X0, y + 8, { size: 26, family: F.latin, weight: 800, color: g.i === 4 ? ACC : BONE });
        // track with instance ticks
        ctx.fillStyle = dim(.22); ctx.fillRect(tx0, y, tx1 - tx0, 2);
        [62, 75, 100, 125].forEach(v => ctx.fillRect(wx(v) - 1, y - 6, 2, 14));
        const x = wx(g.p.wd);
        ctx.fillStyle = g.i === 4 ? ACC : BONE; ctx.fillRect(tx0, y, x - tx0, 2);
        ctx.beginPath(); ctx.arc(x, y + 1, 8, 0, TAU); ctx.fill();
        text(ctx, g.p.wd.toFixed(1).padStart(5, '0'), x, y - 14, { size: 15, family: F.mono, color: dim(.7), align: 'center' });
        // weight: a short bar
        const wb = (g.p.wg - 100) / 800;
        ctx.fillStyle = dim(.18); ctx.fillRect(W - X0 - 104, y - 1, 104, 4);
        ctx.fillStyle = dim(.8); ctx.fillRect(W - X0 - 104, y - 1, 104 * wb, 4);
        text(ctx, String(Math.round(g.p.wg)), W - X0, y + 24, { size: 15, family: F.mono, color: dim(.5), align: 'right' });
        i++;
      }));
      ctx.restore();
    }

    // end on a clean field of the next colour
    const endA = ease(E.inQuad, 5.55, 5.8, t);
    if (endA > 0) { ctx.fillStyle = rgba(ACC, endA); ctx.fillRect(0, 0, W, H); }
    grain(ctx, 0.04, s.frame);
  },
});
