/* 43 圓填充 — grow-until-touch circle packing around the glyph 圓, precomputed as a deterministic event list. */
const BX0 = 70, BY0 = 110, BX1 = 1010, BY1 = 1010;
const GAP = 3, V = 110;                         // px gap between circles, growth speed px/s
const MR = 2;                                   // mask resolution divisor (540×540 mask of the stage)
let CIR = [];                                   // {x, y, born, rf, inside}
let SDF = null;                                 // signed distance (px, stage units) to the glyph edge: + inside
const phaseOf = t => t < 5 ? 0 : t < 10 ? 1 : t < 14 ? 2 : 3;
const PH = [{ rmax: 150, tries: 1, label: '大圓先佔位' }, { rmax: 64, tries: 6, label: '中圓填縫' }, { rmax: 26, tries: 40, label: '小圓塞滿' }, { rmax: 11, tries: 90, label: '細點收邊' }];

/* exact 1-D squared distance transform (Felzenszwalb & Huttenlocher) */
function edt1(f, n) {
  const d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s;
    while (true) { const p = v[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k]) { k--; if (k < 0) { k = 0; break; } } else break; }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + f[v[k]]; }
  return d;
}
function edt2(isSeed, w, h) {
  const INF = 1e12, out = new Float64Array(w * h), col = new Float64Array(h);
  for (let i = 0; i < w * h; i++) out[i] = isSeed[i] ? 0 : INF;
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) col[y] = out[y * w + x]; const d = edt1(col, h); for (let y = 0; y < h; y++) out[y * w + x] = d[y]; }
  const row = new Float64Array(w);
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) row[x] = out[y * w + x]; const d = edt1(row, w); for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]); }
  return out;
}
const sdAt = (x, y) => { const w = SW / MR, i = clamp(Math.round(x / MR), 0, w - 1), j = clamp(Math.round(y / MR), 0, w - 1); return SDF[j * w + i]; };
const rAt = (c, t) => t < c.born ? -1 : Math.min(V * (t - c.born), c.rf);

const S = M.def({
  id: 'e43', num: 43, ch: 6, title: '圓填充', en: 'CIRCLE PACKING', dur: 20, ground: 'light',
  prompt: '在方框裡隨機丟點，每個點長成圓、碰到別的圓或「圓」字邊界就停。先放 150px 大圓，再換中圓、小圓、細點填縫；字內的圓塗黑、字外只畫細線，讓字從圓裡浮出來。',
  how: ['每格隨機試點：落在既有圓內就拒絕', '圓以 110 px/s 長大，距離 < 半徑和 + 3 就停', '字的邊界用距離轉換 EDT：半徑不得超過 |SDF|'],
  practice: '把試點改成沿螺線依序放，圖樣會變怎樣？',
  cues: [{ t: 5, type: 'bell', i: 1 }, { t: 10, type: 'bell', i: 3 }, { t: 14, type: 'bell', i: 4 }, { t: 12, type: 'riser', t1: 17 }, { t: 17, type: 'impact', v: 0.6 }],
  init() {
    // glyph mask → signed distance field
    const w = SW / MR;
    const m = mask(w, w, (x, W_) => { x.fillStyle = '#000'; x.fillRect(0, 0, W_, W_); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; font(x, 840 / MR, F.tcBlack, 900); x.fillText('圓', 540 / MR, 570 / MR); });
    const ins = new Uint8Array(w * w), out = new Uint8Array(w * w);
    for (let i = 0; i < w * w; i++) { const v = m.data[i * 4] > 127; ins[i] = v; out[i] = !v; }
    const dIn = edt2(out, w, w), dOut = edt2(ins, w, w);   // distance to nearest outside / inside pixel
    SDF = new Float32Array(w * w);
    for (let i = 0; i < w * w; i++) SDF[i] = (ins[i] ? dIn[i] - 0.5 : -(dOut[i] - 0.5)) * MR;
    // growth simulation at 60 Hz until 19 s
    const r = rng(4303), dt = 1 / 60, grow = [];
    CIR = [];
    for (let n = 0; n * dt < 19; n++) {
      const t = n * dt, ph = PH[phaseOf(t)];
      for (let a = 0; a < ph.tries; a++) {
        if (r() > 0.5 && ph.tries === 1) continue;
        const x = r.range(BX0, BX1), y = r.range(BY0, BY1);
        const wall = Math.min(x - BX0, BX1 - x, y - BY0, BY1 - y, Math.abs(sdAt(x, y))) - GAP;
        if (wall < 2.5) continue;
        let ok = true;
        for (const c of CIR) { const rc = Math.min(V * (t - c.born), c.rf); if ((c.x - x) ** 2 + (c.y - y) ** 2 < (rc + GAP + 1.5) ** 2) { ok = false; break; } }
        if (!ok) continue;
        const c = { x, y, born: t, rf: Math.min(ph.rmax, wall), inside: sdAt(x, y) > 0 };
        CIR.push(c); grow.push(c);
      }
      // grow: a growing circle that would touch anything at t+dt freezes at its radius at t
      const t1 = t + dt, stop = new Set();
      for (const c of grow) {
        const rc = Math.min(V * (t1 - c.born), c.rf);
        for (const o of CIR) {
          if (o === c) continue;
          const ro = Math.min(V * (t1 - o.born), o.rf);
          if ((o.x - c.x) ** 2 + (o.y - c.y) ** 2 < (rc + ro + GAP) ** 2) { stop.add(c); if (grow.includes(o)) stop.add(o); }
        }
      }
      for (const c of stop) c.rf = Math.max(1.5, Math.min(c.rf, V * (t - c.born)));
      for (let i = grow.length - 1; i >= 0; i--) if (stop.has(grow[i]) || V * (t1 - grow[i].born) >= grow[i].rf) grow.splice(i, 1);
    }
  },
  frame(ctx, t) {
    const lab = (s, x, y, o = {}) => text(ctx, s, x, y, Object.assign({ size: 20, family: F.mono, weight: 500, spacing: 2 }, o));
    const fin = ease(E.inOutCubic, 17, 18.5, t);
    let N = 0, G = 0;
    const solid = new Path2D(), line = new Path2D(), live = new Path2D(), ripple = [];
    for (const c of CIR) {
      const r = rAt(c, t); if (r < 0) break;
      N++;
      if (r < c.rf - 1e-6) { G++; live.moveTo(c.x + r, c.y); live.arc(c.x, c.y, Math.max(r, 0.5), 0, TAU); continue; }
      const p = c.inside ? solid : line; p.moveTo(c.x + r, c.y); p.arc(c.x, c.y, r, 0, TAU);
      const since = t - (c.born + c.rf / V);
      if (since < 0.35 && c.rf > 14) ripple.push([c, since]);
    }
    ctx.fillStyle = K; ctx.fill(solid);
    ctx.strokeStyle = g(lerp(0, 0.55, fin)); ctx.lineWidth = lerp(1.8, 1.4, fin); ctx.stroke(line);
    ctx.strokeStyle = K; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]); ctx.stroke(live); ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    for (const [c, s] of ripple) { ctx.strokeStyle = fg(0.6 * (1 - s / 0.35)); ctx.beginPath(); ctx.arc(c.x, c.y, c.rf + 4 + s * 40, 0, TAU); ctx.stroke(); }
    // frame + readouts
    ctx.strokeStyle = fg(0.9); ctx.lineWidth = 2; ctx.strokeRect(BX0 - 1, BY0 - 1, BX1 - BX0 + 2, BY1 - BY0 + 2);
    const ph = PH[phaseOf(Math.min(t, 18.9))], a = ease(E.outCubic, 0.1, 0.6, t);
    lab(`N = ${String(N).padStart(4)}   生長中 ${String(G).padStart(2)}`, BX0, 76, { alpha: a });
    lab(`r ≤ ${ph.rmax}px · 試點 ${ph.tries * 60}/s`, BX1, 76, { alpha: a, align: 'right' });
    const legend = t < 17 ? `${['①', '②', '③', '④'][phaseOf(t)]} ${ph.label}   ┅ 生長中   ● 字內   ○ 字外` : '字 = 只把字內的圓塗黑';
    lab(legend, BX0, 1042, { alpha: a * 0.75, family: F.tc, size: 22, spacing: 1 });
  },
});
