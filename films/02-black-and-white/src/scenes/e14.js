/* 14 布料 — 3D Verlet cloth in wind: wireframe → shaded; pins released one by one; last pin lets go. */
function tag(ctx, i, zh, en, a) {
  text(ctx, String(i).padStart(2, '0'), 60, 86, { size: 20, family: F.mono, weight: 500, alpha: 0.5 * a });
  text(ctx, zh, 100, 88, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 116 + w, 86, { size: 18, family: F.mono, spacing: 3, alpha: 0.5 * a });
}
const HZ = 60, NX = 46, NY = 34, SP = 16, ITER = 6, DAMP = 0.992, GRAV = 900, FOC = 1500;
const CX = 540, CY = 560, TOPY = -360;
/* pins: column → release time */
const PINS = [[0, 18.6], [15, 10], [30, 8], [45, 12]];
const WMAX = 440, windAt = t => t < 4 ? 110 : t < 8 ? lerp(110, 300, ease(E.inOutCubic, 4, 5, t)) : t < 14 ? 300 : lerp(300, WMAX, ease(E.inOutCubic, 14, 15, t));
let X, Y, Z, PX, PY, PZ, PIN, CON, lay, lx, order;
const NP = NX * NY, id = (i, j) => j * NX + i;
const proj = (x, y, z) => { const s = FOC / (FOC + z); return [CX + x * s, CY + y * s, s]; };
const S = M.def({
  id: 'e14', num: 14, ch: 2, title: '布料', en: 'CLOTH (VERLET)', dur: 20, ground: 'dark',
  prompt: '黑底做一塊 46×34 點的 3D 布，四個圖釘掛在上緣，風從畫面外吹來。先用線框顯示質點與約束，再換成依法線明暗的白布；8、10、12 秒依序拔掉三個圖釘，布只剩一角在強風中翻飛，最後一根也放開，布被吹走。',
  how: ['Verlet：x += (x − x_prev)·0.992 + a·dt²，60 Hz', '結構＋斜向距離約束，每步迭代 6 次', '風力沿每個面的法線施加；明暗 = |n·L|'],
  practice: '把迭代次數改成 1，看布怎麼變得像橡皮。',
  cues: [{ t: 4.5, type: 'whoosh', dur: 1.2 }, { t: 8, type: 'pop' }, { t: 10, type: 'pop' }, { t: 12, type: 'pop' }, { t: 14, type: 'whoosh', dur: 1.5 }, { t: 18.6, type: 'pop' }, { t: 18.7, type: 'whoosh', dur: 1 }],
  init() {
    lay = makeCanvas(SW, SH); lx = lay.getContext('2d', { willReadFrequently: true });
    const c = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      if (i < NX - 1) c.push(id(i, j), id(i + 1, j), SP);
      if (j < NY - 1) c.push(id(i, j), id(i, j + 1), SP);
      if (i < NX - 1 && j < NY - 1) { c.push(id(i, j), id(i + 1, j + 1), SP * Math.SQRT2); c.push(id(i + 1, j), id(i, j + 1), SP * Math.SQRT2); }
    }
    CON = new Float32Array(c);
    order = new Uint16Array((NX - 1) * (NY - 1)).map((_, k) => k);
  },
  reset() {
    X = new Float32Array(NP); Y = new Float32Array(NP); Z = new Float32Array(NP); PIN = new Uint8Array(NP);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const k = id(i, j); X[k] = (i - (NX - 1) / 2) * SP; Y[k] = TOPY + j * SP * 0.97; Z[k] = j * 3; }
    PX = X.slice(); PY = Y.slice(); PZ = Z.slice();
    for (const [c] of PINS) PIN[id(c, 0)] = 1;
  },
  frame(ctx, t) {
    M.sim(S, t, (dt, n, st) => {
      const tt = st + dt, W = windAt(tt);
      for (const [c, rt] of PINS) if (tt >= rt) PIN[id(c, 0)] = 0;
      // forces: gravity + wind along face normals
      const AX = new Float32Array(NP), AY = new Float32Array(NP).fill(GRAV), AZ = new Float32Array(NP);
      for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
        const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1);
        const ux = X[d] - X[a], uy = Y[d] - Y[a], uz = Z[d] - Z[a], vx = X[c] - X[b], vy = Y[c] - Y[b], vz = Z[c] - Z[b];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        const gust = 0.55 + 0.9 * (noise(i * 0.12 - tt * 1.3, j * 0.12, tt * 0.4) + 0.5);
        const wx = W * gust, wy = -W * 0.06 * gust, wz = W * 0.4 * gust;
        const f = (nx * wx + ny * wy + nz * wz) * 2.2;
        for (const k of [a, b, c, d]) { AX[k] += nx * f; AY[k] += ny * f; AZ[k] += nz * f; }
      }
      const dt2 = dt * dt;
      for (let k = 0; k < NP; k++) {
        if (PIN[k]) continue;
        const x = X[k], y = Y[k], z = Z[k];
        X[k] += (x - PX[k]) * DAMP + AX[k] * dt2; Y[k] += (y - PY[k]) * DAMP + AY[k] * dt2; Z[k] += (z - PZ[k]) * DAMP + AZ[k] * dt2;
        PX[k] = x; PY[k] = y; PZ[k] = z;
      }
      for (let it = 0; it < ITER; it++) for (let q = 0; q < CON.length; q += 3) {
        const a = CON[q], b = CON[q + 1], r = CON[q + 2];
        const dx = X[b] - X[a], dy = Y[b] - Y[a], dz = Z[b] - Z[a], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const pa = PIN[a], pb = PIN[b]; if (pa && pb) continue;
        const k = (d - r) / d, wa = pa ? 0 : pb ? 1 : 0.5, wb = pb ? 0 : pa ? 1 : 0.5;
        X[a] += dx * k * wa; Y[a] += dy * k * wa; Z[a] += dz * k * wa; X[b] -= dx * k * wb; Y[b] -= dy * k * wb; Z[b] -= dz * k * wb;
      }
    }, HZ);
    /* project */
    const sx = new Float32Array(NP), sy = new Float32Array(NP);
    for (let k = 0; k < NP; k++) { const p = proj(X[k], Y[k], Z[k]); sx[k] = p[0]; sy[k] = p[1]; }
    const wire = 1 - ease(E.inOutCubic, 4, 5.5, t);
    lx.clearRect(0, 0, SW, SH);
    /* shaded cloth: quads back-to-front, two-sided |n·L|, woven stripes */
    if (wire < 1) {
      const zq = new Float32Array(order.length);
      for (let j = 0, q = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++, q++) { const a = id(i, j), d = id(i + 1, j + 1); zq[q] = Z[a] + Z[d]; }
      const ord = Array.from(order).sort((p, q) => zq[q] - zq[p]);
      const Lx = -0.32, Ly = -0.4, Lz = -0.86;
      // smoothed vertex normals → per-vertex shade
      const VN = new Float32Array(NP * 3);
      for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
        const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1);
        const ux = X[d] - X[a], uy = Y[d] - Y[a], uz = Z[d] - Z[a], vx = X[c] - X[b], vy = Y[c] - Y[b], vz = Z[c] - Z[b];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        for (const k of [a, b, c, d]) { VN[k * 3] += nx; VN[k * 3 + 1] += ny; VN[k * 3 + 2] += nz; }
      }
      const sh = new Float32Array(NP);
      for (let k = 0; k < NP; k++) { const nx = VN[k * 3], ny = VN[k * 3 + 1], nz = VN[k * 3 + 2], l = Math.hypot(nx, ny, nz) || 1; sh[k] = 0.08 + 0.92 * Math.pow(Math.abs((nx * Lx + ny * Ly + nz * Lz) / l), 1.5); }
      for (const q of ord) {
        const i = q % (NX - 1), j = (q / (NX - 1)) | 0, a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1);
        const v = (sh[a] + sh[b] + sh[c] + sh[d]) / 4;
        const c8 = Math.round(lerp(11, 242, v)), col = `rgb(${c8},${c8},${c8})`;
        lx.fillStyle = col; lx.strokeStyle = col; lx.lineWidth = 1;
        lx.beginPath(); lx.moveTo(sx[a], sy[a]); lx.lineTo(sx[b], sy[b]); lx.lineTo(sx[d], sy[d]); lx.lineTo(sx[c], sy[c]); lx.closePath(); lx.fill(); lx.stroke();
        // pinstripe seams every 5th column, drawn with the quad so depth order holds
        if (i % 5 === 2) { lx.strokeStyle = `rgba(11,11,11,${0.25 + 0.35 * v})`; lx.lineWidth = 1.6; lx.beginPath(); lx.moveTo((sx[a] + sx[b]) / 2, (sy[a] + sy[b]) / 2); lx.lineTo((sx[c] + sx[d]) / 2, (sy[c] + sy[d]) / 2); lx.stroke(); }
      }
    }
    if (wire < 1) { ctx.save(); ctx.globalAlpha = 1 - wire; ctx.drawImage(lay, 0, 0); ctx.restore(); lx.clearRect(0, 0, SW, SH); }
    /* wireframe: constraints + particles */
    if (wire > 0) {
      lx.strokeStyle = fg(0.55); lx.lineWidth = 1.2; lx.beginPath();
      for (let q = 0; q < CON.length; q += 3) { if (CON[q + 2] > SP + 1) continue; const a = CON[q], b = CON[q + 1]; lx.moveTo(sx[a], sy[a]); lx.lineTo(sx[b], sy[b]); }
      lx.stroke();
      lx.strokeStyle = fg(0.18); lx.beginPath();
      for (let q = 0; q < CON.length; q += 3) { if (CON[q + 2] < SP + 1) continue; const a = CON[q], b = CON[q + 1]; lx.moveTo(sx[a], sy[a]); lx.lineTo(sx[b], sy[b]); }
      lx.stroke();
      lx.fillStyle = fg(1); lx.beginPath();
      for (let k = 0; k < NP; k++) { lx.moveTo(sx[k] + 2.6, sy[k]); lx.arc(sx[k], sy[k], 2.6, 0, TAU); }
      lx.fill();
      ctx.save(); ctx.globalAlpha = wire; ctx.drawImage(lay, 0, 0); ctx.restore();
    }
    /* pins */
    for (const [c, rt] of PINS) {
      const k = id(c, 0), held = t < rt, r = ease(E.outCubic, rt, rt + 0.5, t);
      const [px, py] = held ? [sx[k], sy[k]] : proj((c - (NX - 1) / 2) * SP, TOPY, 0);
      if (held) {
        ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.fill();
        ctx.fillStyle = bg(1); ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = fg(0.6); ctx.fillRect(px - 1, py - 40, 2, 30);
      } else if (r < 1) {
        ctx.strokeStyle = fg(1 - r); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 10 + r * 40, 0, TAU); ctx.stroke();
      }
    }
    /* tag + readouts */
    const ph = t < 4.5 ? 0 : t < 8 ? 1 : t < 14 ? 2 : 3, T0 = [0, 4.5, 8, 14];
    const tags = [['質點與約束', 'PARTICLES & STICKS'], ['法線明暗', 'SHADED · WIND'], ['拔掉圖釘', 'RELEASE PINS'], ['強風', 'GALE']];
    tag(ctx, ph + 1, tags[ph][0], tags[ph][1], ph === 0 ? 1 : ease(E.outCubic, T0[ph], T0[ph] + 0.3, t));
    text(ctx, 'x += (x − x_prev)·0.992 + a·dt²', 60, 990, { size: 24, family: F.mono, weight: 500 });
    const held = PINS.filter(([, rt]) => t < rt).length;
    text(ctx, `${NP} 點 · 約束 ×${ITER} · ${HZ} Hz · 圖釘 ${held}`, 60, 1030, { size: 22, family: F.tc, alpha: 0.6 });
    const W = windAt(t); text(ctx, '風', 840, 1030, { size: 22, family: F.tc, alpha: 0.6 });
    ctx.fillStyle = fg(0.2); ctx.fillRect(876, 1016, 144, 10); ctx.fillStyle = fg(1); ctx.fillRect(876, 1016, 144 * W / WMAX, 10);
  },
});
