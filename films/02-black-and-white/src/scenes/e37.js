/* 37 點雲 — sphere → torus knot, all made of points; depth sets dot size and tone; halftone-like lighting. */
const N37 = 6000;
const SPH = new Float32Array(N37 * 3), KN = new Float32Array(N37 * 3), TB = new Float32Array(N37 * 3), TN = new Float32Array(N37 * 3), DLY = new Float32Array(N37);
const X = new Float32Array(N37), Y = new Float32Array(N37), Z = new Float32Array(N37), RS = new Float32Array(N37), IDX = new Uint16Array(N37);
function knot(phi, p = 2, q = 3) { const r = Math.cos(q * phi) + 2.2; return [r * Math.cos(p * phi) * 0.42, -Math.sin(q * phi) * 0.6, r * Math.sin(p * phi) * 0.42]; }
let CC = null;
const cpuCtx = () => CC || (CC = makeCanvas(SW, SH).getContext('2d', { willReadFrequently: true }));
const S37 = M.def({
  id: 'e37', num: 37, ch: 5, title: '點雲', en: 'POINT CLOUD', dur: 20, ground: 'light',
  prompt: '白紙上用 6000 個黑點組成 3D 物體並旋轉：先是均勻分布的球，點的大小與深淺隨距離變化；再關掉深度提示對比一次；然後點交錯飛成 (2,3) 環面結，最後鋪成結的管狀表面，背光面的點變大變黑，像網點印刷。',
  how: ['斐波那契球面均勻取 6000 點，每格旋轉＋透視投影', '依 z 由遠到近排序繪製；半徑 ∝ 1/z²，遠點變淡', '換形：每點延遲 i/N×0.6 秒；表面點大小＝1−光照'],
  practice: '把球換成 (3,7) 環面結，比較點的疏密。',
  cues: [{ t: 0.1, type: 'whoosh', dur: 0.6, v: 0.3 }, { t: 4, type: 'tick' }, { t: 6, type: 'pop' }, { t: 8, type: 'whoosh', dur: 1.0 }, { t: 12, type: 'tick' }, { t: 14, type: 'riser', t1: 15.4, v: 0.3 }, { t: 15.4, type: 'impact', v: 0.5 }],
  init() {
    const r = rng(37), ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N37; i++) {
      const y = 1 - 2 * (i + 0.5) / N37, rr = Math.sqrt(1 - y * y), th = i * ga;
      SPH.set([Math.cos(th) * rr * 1.25, y * 1.25, Math.sin(th) * rr * 1.25], i * 3);
      // knot as a fuzzy line: gaussian jitter around the curve
      const ph = r() * TAU, c = knot(ph);
      KN.set([c[0] + r.gauss() * 0.05, c[1] + r.gauss() * 0.05, c[2] + r.gauss() * 0.05], i * 3);
      // knot as a tube surface (with normals for lighting)
      const ph2 = (Math.floor(i / 25) / 240) * TAU, v = ((i % 25) / 25 + Math.floor(i / 25) * 0.5 / 25) * TAU, a = knot(ph2), b = knot(ph2 + 1e-3);
      let T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const tl = Math.hypot(...T); T = T.map(x => x / tl);
      const rl = Math.hypot(a[0], a[2]), ref = [a[0] / rl * 0.924, 0, a[2] / rl * 0.924];   // nearest point on the core ring
      let Nn = [a[0] - ref[0], a[1], a[2] - ref[2]]; const dn = Nn[0] * T[0] + Nn[1] * T[1] + Nn[2] * T[2];
      Nn = [Nn[0] - T[0] * dn, Nn[1] - T[1] * dn, Nn[2] - T[2] * dn]; const nl = Math.hypot(...Nn); Nn = Nn.map(x => x / nl);
      const B = [T[1] * Nn[2] - T[2] * Nn[1], T[2] * Nn[0] - T[0] * Nn[2], T[0] * Nn[1] - T[1] * Nn[0]];
      const cv = Math.cos(v), sv = Math.sin(v), R = 0.2;
      const n = [Nn[0] * cv + B[0] * sv, Nn[1] * cv + B[1] * sv, Nn[2] * cv + B[2] * sv];
      TB.set([a[0] + n[0] * R, a[1] + n[1] * R, a[2] + n[2] * R], i * 3); TN.set(n, i * 3);
      DLY[i] = r() * 0.25 + (i / N37) * 0.6;
    }
  },
  // drawn into a CPU-backed canvas (willReadFrequently): software raster of thousands of strokes is far cheaper than SwiftShader
  frame(stage, t) { const ctx = cpuCtx(); ctx.fillStyle = bg(1); ctx.fillRect(0, 0, SW, SH); this.draw(ctx, t); stage.drawImage(ctx.canvas, 0, 0); },
  draw(ctx, t) {
    const io = E.inOutCubic;
    const cue = t < 4 ? 1 : t < 6 ? 1 - ease(io, 4, 4.3, t) : ease(io, 6, 6.3, t);       // depth cues on/off
    const yaw = t * 0.55 + ease(io, 14, 20, t) * 1.2, pitch = 0.38 + Math.sin(t * 0.4) * 0.12;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const camD = 4.4 - ease(io, 14, 18, t) * 0.3, FOC = 1000, CX = SW / 2, CY = SH / 2 + 20;
    const L = [-0.5, 0.7, 0.5]; const ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    const surf = ease(io, 15, 16, t);
    for (let i = 0; i < N37; i++) {
      const k = i * 3;
      const m1 = ease(io, 8 + DLY[i], 9.4 + DLY[i], t), m2 = ease(io, 14.2 + DLY[i], 15.4 + DLY[i], t);
      let px = lerp(SPH[k], KN[k], m1), py = lerp(SPH[k + 1], KN[k + 1], m1), pz = lerp(SPH[k + 2], KN[k + 2], m1);
      if (t > 12 && t < 15.6) {             // noise displacement interlude
        const a = ease(io, 12, 12.6, t) * (1 - ease(io, 14, 14.6, t)) * 0.28;
        if (a > 0) { px += a * noise(px * 2, py * 2, t * 0.8); py += a * noise(py * 2 + 7, pz * 2, t * 0.8); pz += a * noise(pz * 2 + 3, px * 2, t * 0.8); }
      }
      px = lerp(px, TB[k], m2); py = lerp(py, TB[k + 1], m2); pz = lerp(pz, TB[k + 2], m2);
      // rotate (yaw about y, pitch about x)
      const x1 = px * cy + pz * sy, z1 = -px * sy + pz * cy;
      const y2 = py * cp - z1 * sp, z2 = py * sp + z1 * cp;
      const zc = camD - z2;
      X[i] = CX + x1 * FOC / zc; Y[i] = CY - y2 * FOC / zc;
      Z[i] = zc;
      // shading on the tube surface: dot grows where light is low (halftone logic)
      let shade = 0.5;
      if (m2 > 0) {
        const nx0 = TN[k], ny0 = TN[k + 1], nz0 = TN[k + 2];
        const nx = nx0 * cy + nz0 * sy, nz1 = -nx0 * sy + nz0 * cy, ny = ny0 * cp - nz1 * sp, nz = ny0 * sp + nz1 * cp;
        shade = lerp(0.5, clamp(0.5 - 0.5 * (nx * L[0] + ny * L[1] + nz * L[2])), surf);
      }
      RS[i] = shade;
      IDX[i] = i;
    }
    IDX.sort((a, b) => Z[b] - Z[a]);
    // draw far → near in tone buckets (bucket order follows depth order)
    const NB = 10, zmin = camD - 1.3, zmax = camD + 1.3;
    let b = -1;
    for (let j = 0; j < N37; j++) {
      const i = IDX[j];
      const dz = clamp((Z[i] - zmin) / (zmax - zmin));       // 0 near … 1 far
      const nb = Math.min(NB - 1, Math.floor((1 - dz) * NB));
      if (nb !== b) { if (b >= 0) ctx.fill(); b = nb; ctx.beginPath(); const tone = lerp(0.62, 0.0, (b + 0.5) / NB); ctx.fillStyle = g(lerp(0.0, tone, cue)); }
      const base = 2.1 * 4.2 / Z[i];
      const r = lerp(1.6, base * base * 0.55 + 0.4, cue) * lerp(1, 0.15 + 1.5 * RS[i], surf);
      if (r < 0.35) continue;
      ctx.moveTo(X[i] + r, Y[i]); ctx.arc(X[i], Y[i], r, 0, TAU);
    }
    if (b >= 0) ctx.fill();
    // --- overlay ---
    const lbl = t < 4 ? ['fibonacci sphere', '6000 點，大小與深淺隨距離'] : t < 6 ? ['depth cue OFF', '同樣大小同樣黑：分不出前後'] : t < 8 ? ['depth cue ON', 'r ∝ 1/z²，遠點變淡'] : t < 12 ? ['torus knot (2, 3)', '每點延遲出發，交錯飛向新位置'] : t < 14 ? ['+ noise', '用雜訊推動每一點'] : ['tube surface', '背光的點變大：像網點印刷'];
    const la = Math.min(1, ...[4, 6, 8, 12, 14].map(q => clamp(Math.abs(t - q) / 0.2))) * ease(E.outCubic, 0.1, 0.5, t);
    text(ctx, lbl[0], 48, 84, { size: 34, family: F.mono, weight: 500, alpha: la });
    text(ctx, lbl[1], 48, 128, { size: 26, family: F.tc, color: g(.3), alpha: la });
    text(ctx, `N ${N37}`, SW - 48, 84, { size: 20, family: F.mono, align: 'right', color: g(.3) });
    text(ctx, 'sort z: far → near', SW - 48, 116, { size: 20, family: F.mono, align: 'right', color: g(.3) });
    // depth legend: dot sizes far → near
    const lx = 48, ly = SH - 60;
    text(ctx, 'far', lx, ly + 7, { size: 19, family: F.mono, color: g(.35) });
    for (let i = 0; i < 7; i++) { const zz = lerp(zmax, zmin, i / 6), rr = lerp(1.6, (2.1 * 4.2 / zz) ** 2 * 0.55 + 0.4, cue); ctx.fillStyle = g(lerp(0, lerp(0.62, 0, i / 6), cue)); ctx.beginPath(); ctx.arc(lx + 70 + i * 34, ly, rr, 0, TAU); ctx.fill(); }
    text(ctx, 'near', lx + 70 + 6 * 34 + 22, ly + 7, { size: 19, family: F.mono, color: g(.35) });
  },
});
