/* 10 雜訊 — random vs Perlin (1D) → 2D field → fBm octaves → ridge-line payoff. */
function tag(ctx, i, zh, en, a) {
  text(ctx, String(i).padStart(2, '0'), 60, 86, { size: 20, family: F.mono, weight: 500, alpha: 0.5 * a });
  text(ctx, zh, 100, 88, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 116 + w, 86, { size: 18, family: F.mono, spacing: 3, alpha: 0.5 * a });
}
const win = (t, a, b, f = 0.3) => Math.min(ease(E.outCubic, a, a + f, t), 1 - ease(E.inCubic, b - f, b, t));
const hash = i => { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const N = (x, y, z) => noise(x, y, z);
/* octave i alone: freq 2^i, amp 0.5^i */
const oct = (i, x, y, z) => N(x * (1 << i) + i * 17.3, y * (1 << i) + i * 5.1, z) / (1 << i);
const FR = 200, S3 = 2.2, RN = 80, RX = 118, RS = 0.11;   // fBm buffer res & scale, ridge rows
let big, cum, thumbs, ridge;
const tone = v => clamp(0.5 + v * 1.25);
function post(v) { return Math.round(v * 9) / 9; }  // 10 deliberate grey steps (topographic look)

M.def({
  id: 'e10', num: 10, ch: 2, title: '雜訊', en: 'PERLIN NOISE', dur: 20, ground: 'dark',
  prompt: '黑底白線教 Perlin 雜訊：上下對照純亂數與平滑雜訊並標出格點斜率；再展開成 2D 灰階場，掃描線對應下方剖面；然後每秒疊一層八度（頻率×2、振幅×½）共六層；結尾用 fBm 切片做 46 條起伏的山脊線往前流動。',
  how: ['格點放隨機梯度，6t⁵−15t⁴+10t³ 平滑內插', 'fBm：Σ noise(x·2ⁱ)/2ⁱ，一秒加一層到 6 層', '山脊線：每列一條 fBm 剖面，由後往前填底遮擋'],
  practice: '把 gain 從 0.5 改成 0.7，看細節怎麼變粗糙。',
  cues: [{ t: 4, type: 'whoosh', dur: 0.6 }, { t: 6, type: 'tick' }, ...[0, 1, 2, 3, 4, 5].map(i => ({ t: 8 + i, type: 'pop', v: 0.35 + i * 0.05 })), { t: 14, type: 'whoosh', dur: 1 }],
  init() {
    const toCanvas = (w, h, val) => { const c = makeCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
      for (let j = 0, p = 0; j < h; j++) for (let i = 0; i < w; i++, p += 4) { const v = Math.round(lerp(11, 242, val(i, j))); d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
      x.putImageData(im, 0, 0);
      const g2 = makeCanvas(w, h); g2.getContext('2d').drawImage(c, 0, 0); return g2; };   // fresh GPU-backed copy: no per-frame re-upload
    // 2D field: one octave over [0,5]² at 100 px per unit (zoomed by drawImage)
    big = toCanvas(500, 500, (i, j) => post(tone(oct(0, i / 100, j / 100, 0))));
    // fBm layers over [0,S3]²
    const L = []; for (let o = 0; o < 6; o++) { const a = new Float32Array(FR * FR); for (let j = 0, k = 0; j < FR; j++) for (let i = 0; i < FR; i++, k++) a[k] = oct(o, i / FR * S3, j / FR * S3, 0); L.push(a); }
    const acc = new Float32Array(FR * FR);
    cum = []; thumbs = [];
    for (let o = 0; o < 6; o++) {
      for (let k = 0; k < acc.length; k++) acc[k] += L[o][k];
      cum.push(toCanvas(FR, FR, (i, j) => post(tone(acc[j * FR + i]))));
      thumbs.push(toCanvas(64, 64, (i, j) => tone(L[o][Math.floor(j * FR / 64) * FR + Math.floor(i * FR / 64)] * (1 << o) * 0.8)));
    }
    // ridge rows: profile k at row coordinate k·RS, RX samples
    ridge = []; for (let k = 0; k < RN; k++) { const a = new Float32Array(RX); for (let i = 0; i < RX; i++) a[i] = noise.fbm(i / (RX - 1) * 3.2 + 7, (k - RN + 46) * RS, 2.7, 5); ridge.push(a); }
  },
  frame(ctx, t) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    /* ---------- 1. random vs noise (0–4) ---------- */
    let a = win(t, -1, 4.1);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      tag(ctx, 1, '亂數 vs 雜訊', 'RANDOM vs NOISE', 1);
      const x0 = 60, x1 = 1020, scr = t * 0.8;
      // white noise
      const y1 = 300, A1 = 120;
      text(ctx, 'Math.random()', x0, y1 - 150, { size: 22, family: F.mono, alpha: 0.55 });
      ctx.fillStyle = fg(0.15); ctx.fillRect(x0, y1, x1 - x0, 1);
      ctx.strokeStyle = fg(0.8); ctx.lineWidth = 2; ctx.beginPath();
      const st = 12, off = scr * 120, i0 = Math.floor(off / st);
      for (let k = 0; k * st <= x1 - x0 + st; k++) { const x = x0 + k * st - (off % st); const v = hash(i0 + k) - 0.5; k ? ctx.lineTo(x, y1 - v * 2 * A1) : ctx.moveTo(x, y1 - v * 2 * A1); }
      ctx.stroke();
      // Perlin 1D
      const y2 = 700, A2 = 330, cell = 120;
      text(ctx, 'noise(x)', x0, y2 - 190, { size: 22, family: F.mono, alpha: 0.55 });
      ctx.fillStyle = fg(0.15); ctx.fillRect(x0, y2, x1 - x0, 1);
      const X = x => x / cell + scr;
      // lattice: ticks + gradient slopes
      for (let k = Math.ceil(X(0)); k <= X(x1 - x0); k++) {
        const x = x0 + (k - scr) * cell, d = (N(k + 0.01, 0, 0) - N(k - 0.01, 0, 0)) / 0.02 * A2 / cell;
        ctx.fillStyle = fg(0.25); ctx.fillRect(x - 0.5, y2 - 170, 1, 340);
        ctx.strokeStyle = fg(0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 34, y2 + d * 34); ctx.lineTo(x + 34, y2 - d * 34); ctx.stroke();
        ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(x, y2, 6, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = fg(1); ctx.lineWidth = 4; ctx.beginPath();
      for (let x = 0; x <= x1 - x0; x += 4) { const y = y2 - N(X(x), 0, 0) * A2; x ? ctx.lineTo(x0 + x, y) : ctx.moveTo(x0, y); }
      ctx.stroke();
      text(ctx, '每個格點一個隨機斜率 → 中間平滑內插', x0, 960, { size: 28, family: F.tc });
      text(ctx, 'fade(t) = 6t⁵ − 15t⁴ + 10t³', x0, 1006, { size: 22, family: F.mono, alpha: 0.55 });
      ctx.restore();
    }
    /* ---------- 2/3. 2D field & fBm (4–14) ---------- */
    a = win(t, 4.0, 13.9, 0.2);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      const fb = t >= 7.9, nOct = fb ? clamp(Math.floor(t - 8) + 1, 1, 6) : 1;
      const s = fb ? S3 : lerp(1.6, 4.2, ease(E.inOutCubic, 6, 6.8, t)), ox = fb ? 0 : 0.05 * (t - 4), oy = fb ? 0 : 0.03 * (t - 4);
      if (fb) tag(ctx, 3, '分形布朗運動', 'fBm · OCTAVES', 1); else tag(ctx, 2, '二維雜訊場', '2D FIELD', 1);
      // field geometry: centered while 2D, shifts right for the octave column
      const sh = ease(E.inOutCubic, 7.6, 8.2, t), size = 600, fx = lerp(240, 400, sh), fy = 130;
      ctx.imageSmoothingEnabled = true;
      if (!fb) ctx.drawImage(big, ox * 100, oy * 100, s * 100, s * 100, fx, fy, size, size);
      else {
        ctx.drawImage(cum[nOct - 1], fx, fy, size, size);
        const k = ease(E.outCubic, 8 + nOct - 1, 8.4 + nOct - 1, t);
        if (nOct > 1 && k < 1) { ctx.globalAlpha = a * (1 - k); ctx.drawImage(cum[nOct - 2], fx, fy, size, size); ctx.globalAlpha = a; }
      }
      ctx.strokeStyle = fg(0.5); ctx.lineWidth = 1; ctx.strokeRect(fx - 0.5, fy - 0.5, size + 1, size + 1);
      // scan row
      const row = 0.62, ry = fy + size * row;
      ctx.fillStyle = fg(1); ctx.fillRect(fx - 14, ry - 1.5, size + 28, 3);
      // profile below
      const py = 835, pA = 70;
      ctx.fillStyle = fg(0.15); ctx.fillRect(fx, py, size, 1);
      ctx.strokeStyle = fg(1); ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const u = ox + i / 300 * s, v = oy + row * s; let n = 0; for (let o = 0; o < nOct; o++) n += oct(o, u, v, 0); const x = fx + size * i / 300, y = py - clamp(n * pA * 1.6, -125, 125); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.setLineDash([3, 6]); ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx - 14, ry); ctx.lineTo(fx - 14, py); ctx.stroke(); ctx.setLineDash([]);
      if (!fb) {
        text(ctx, 'noise(x·s, y·s, t)', 60, 1000, { size: 26, family: F.mono, weight: 500 });
        text(ctx, `s = ${s.toFixed(1)}`, 1020, 1000, { size: 44, family: F.latin, weight: 800, align: 'right' });
        text(ctx, s < 3 ? '頻率低 → 大塊起伏' : '頻率高 → 細碎起伏', 60, 1038, { size: 22, family: F.tc, alpha: 0.6 });
      } else {
        // octave column
        for (let o = 0; o < 6; o++) {
          const on = o < nOct, ty = 130 + o * 102, tx = 60, ts = 88;
          const k = ease(E.outBack, 8 + o, 8.35 + o, t);
          ctx.save(); ctx.globalAlpha *= on ? 1 : 0.22;
          const sc = on ? lerp(0.7, 1, k) : 1;
          ctx.translate(tx + ts / 2, ty + ts / 2); ctx.scale(sc, sc); ctx.drawImage(thumbs[o], -ts / 2, -ts / 2, ts, ts); ctx.restore();
          text(ctx, `×${1 << o}`, tx + ts + 18, ty + 36, { size: 24, family: F.mono, weight: 500, alpha: on ? 1 : 0.3 });
          text(ctx, `a ${(1 / (1 << o)).toFixed(o > 2 ? 3 : 2)}`, tx + ts + 18, ty + 66, { size: 18, family: F.mono, alpha: on ? 0.55 : 0.2 });
          if (on && o > 0) text(ctx, '+', tx + ts / 2, ty - 1, { size: 22, family: F.mono, align: 'center', alpha: 0.5 });
        }
        text(ctx, 'Σ noise(p·2ⁱ) / 2ⁱ', 400, 1000, { size: 26, family: F.mono, weight: 500 });
        text(ctx, `${nOct}`, 1020, 1030, { size: 96, family: F.latin, weight: 800, align: 'right' });
        text(ctx, 'OCTAVES', 1020 - 70 - (nOct > 9 ? 40 : 0), 1030, { size: 18, family: F.mono, align: 'right', alpha: 0.55, spacing: 3 });
        text(ctx, 'lacunarity 2 · gain 0.5', 400, 1038, { size: 20, family: F.mono, alpha: 0.55 });
      }
      ctx.restore();
    }
    /* ---------- 4. ridge lines (14–20) ---------- */
    a = ease(E.outCubic, 13.9, 14.2, t);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      tag(ctx, 4, '山脊線', 'fBm SLICES', 1);
      const L = 46, x0 = 150, x1 = 930, top = 250, gap = 15, flow = (t - 14) * 0.9, rise = ease(E.outCubic, 14, 15.6, t);
      for (let i = 0; i < L; i++) {
        const y0 = top + i * gap, rf = i + RN - 47 - flow * 2.2, r0 = Math.floor(rf), fr = rf - r0, A = ridge[r0], B = ridge[r0 + 1];
        const pts = [];
        for (let k = 0; k < RX; k++) {
          const u = k / (RX - 1), x = lerp(x0, x1, u), env = Math.pow(Math.sin(Math.PI * u), 3) * 0.85 + 0.15 * Math.sin(Math.PI * u);
          const n = lerp(A[k], B[k], fr);
          pts.push(x, y0 - Math.max(0, n + 0.12) * env * 360 * rise);
        }
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
        ctx.fillStyle = bg(1); ctx.lineTo(x1, y0 + 30); ctx.lineTo(x0, y0 + 30); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
        ctx.strokeStyle = fg(1); ctx.lineWidth = 2.2; ctx.stroke();
      }
      text(ctx, 'fbm(x, row − t), 5 octaves', 60, 1030, { size: 22, family: F.mono, alpha: 0.55 });
      text(ctx, '46 LINES', 1020, 1030, { size: 22, family: F.mono, align: 'right', alpha: 0.55 });
      ctx.restore();
    }
  },
});
