/* 20 融合球 — 2D metaballs on the GPU: field f = Σ r²/d², threshold T, iso-lines, cross-section graph. */
const NB = 12;
let PR = null, BL = [];
const FS = `
uniform float uB[${NB * 3}]; uniform float uN, uT, uIso, uFill, uEdge, uInner, uGy, uGline;
in vec2 vUv; out vec4 o;
void main(){
  vec2 p = vec2(vUv.x, 1. - vUv.y) * 1080.;
  float f = 0.;
  for (int i = 0; i < ${NB}; i++) { if (float(i) >= uN) break; vec2 d = p - vec2(uB[i * 3], uB[i * 3 + 1]); float r = uB[i * 3 + 2]; f += r * r / (dot(d, d) + 1.); }
  float w = min(fwidth(f), uT * .5);          // clamp: near a centre f explodes and fwidth would grey the fill
  float inside = smoothstep(uT - w, uT + w, f);
  float col = 0.;
  // iso-lines of the field (log-spaced), faint
  float L = log2(max(f, 1e-4)) * 4.;
  float lw = fwidth(L);
  float dI = min(fract(L), 1. - fract(L));
  float iso = 1. - smoothstep(lw * .6, lw * 1.6, dI);
  col += uIso * iso * .5 * (1. - smoothstep(1.6, 3.2, f)) * smoothstep(135., 175., p.y);
  // threshold outline
  float edge = 1. - smoothstep(w * 1.2, w * 2.6, abs(f - uT));
  col = max(col, uEdge * edge);
  // fill
  col = mix(col, 1., inside * uFill);
  // inner contour line (black, inside the goo)
  float T2 = uT * 1.9; float w2 = min(fwidth(f), uT * .5);
  float inner = 1. - smoothstep(w2 * 1.0, w2 * 2.4, abs(f - T2));
  col = mix(col, 0., inner * uInner * uFill);
  float T3 = uT * 4.2;
  float inner2 = 1. - smoothstep(w2 * 1.0, w2 * 2.4, abs(f - T3));
  col = mix(col, 0., inner2 * uInner * uFill);
  // the sampled cross-section line
  float gl = (1. - smoothstep(.8, 1.8, abs(p.y - uGy))) * uGline * step(mod(p.x, 14.), 8.);
  col = mix(col, 1. - col, gl * .9);
  o = vec4(vec3(col * .949 + .043), 1.);
}`;
const TSEQ = [1, 0.75, 0.55, 0.42, 0.6, 1.0, 1.6, 2.3];
function thr(t) {
  if (t < 8) return 1;
  if (t >= 12) return lerp(2.3, 1, ease(E.inOutCubic, 12, 13, t));
  const b = Math.floor((t - 8) / 0.5), u = (t - 8) / 0.5 - b;
  const a = b === 0 ? 1 : TSEQ[b - 1];
  return lerp(a, TSEQ[b], E.outCubic(clamp(u / 0.6)));
}
function blobs(t) {
  const out = [];
  if (t < 4) {
    const d = 70 + 190 * (0.5 + 0.5 * Math.cos(Math.PI * t / 2 + 0.6));
    out.push([540 - d, 420, 118], [540 + d, 420, 92]);
  } else if (t < 8) {
    const u = t - 4;
    for (let i = 0; i < 3; i++) { const a = u * 0.9 + i * TAU / 3, rr = 150 + 60 * Math.sin(u * 1.3 + i * 2); out.push([540 + rr * Math.cos(a), 420 + rr * 0.8 * Math.sin(a), [110, 85, 70][i]]); }
  } else {
    const k = t < 12 ? 4 : NB;
    for (let i = 0; i < k; i++) {
      const b = BL[i], u = t - 8;
      const grow = i < 4 ? 1 : ease(E.outBack, 12 + (i - 4) * 0.25, 12.6 + (i - 4) * 0.25, t);
      const spread = lerp(1, 1.25, ease(E.inOutCubic, 12, 14.5, t)), cy = lerp(420, 540, ease(E.inOutCubic, 12.5, 14.5, t));
      out.push([540 + spread * b.ax * Math.sin(u * b.fx + b.px), cy + spread * b.ay * Math.cos(u * b.fy + b.py), b.r * Math.max(0, grow)]);
    }
  }
  return out;
}
const S = M.def({
  id: 'e20', num: 20, ch: 3, title: '融合球', en: 'METABALLS', dur: 20, ground: 'dark',
  prompt: '黑底白色黏液球：先兩顆球靠近，中間自己長出橋再斷開；再顯示場的等高線；接著門檻值 T 每拍改一次（0.4 到 2.3），看形狀變胖變瘦；最後 12 顆球像熔岩燈般融合分裂，內部有兩圈黑色等值線。下方即時畫出剖面的場強曲線。',
  how: ['每個像素算場 f = Σ r²/d²，f > T 塗白（GPU 著色器）', 'fwidth(f) 做抗鋸齒邊；等高線取 log2(f) 的小數', '內圈黑線 = 再畫 f = 1.9T 與 4.2T 兩條等值線'],
  practice: '把 r²/d² 改成 (1−d²/R²)³，比較邊緣軟硬。',
  cues: [{ t: 0.05, type: 'whoosh', dur: 0.8, v: 0.3 }, { t: 4, type: 'pop', v: 0.5 }, ...TSEQ.map((_, i) => ({ t: 8 + i * 0.5, type: 'tick', v: 0.5 })),
    ...Array.from({ length: 8 }, (_, i) => ({ t: 12 + i * 0.25, type: 'pop', v: 0.35 })), { t: 16, type: 'bell', i: 2, v: 0.4, dec: 4 }],
  init() {
    PR = G.prog(FS);
    const r = rng(2020); BL = [];
    const base = [[0, 0, 120], [0, 0, 95], [0, 0, 80], [0, 0, 70]];
    for (let i = 0; i < NB; i++) BL.push({ ax: r.range(120, 300), ay: r.range(90, 240), fx: r.range(0.5, 1.3) * (r() < 0.5 ? -1 : 1), fy: r.range(0.4, 1.1), px: r.range(0, TAU), py: r.range(0, TAU), r: i < 4 ? base[i][2] : r.range(45, 95) });
  },
  frame(ctx, t) {
    const bs = blobs(t), T = thr(t);
    const ph = t < 4 ? 0 : t < 8 ? 1 : t < 12 ? 2 : t < 14 ? 3 : 4;
    const gy = ph === 0 ? 420 : 420;
    const graphA = 1 - ease(E.inOutCubic, 12.5, 13.5, t);
    const flat = new Float32Array(NB * 3); bs.forEach((b, i) => { flat[i * 3] = b[0]; flat[i * 3 + 1] = b[1]; flat[i * 3 + 2] = b[2]; });
    G.size(0.6);
    G.draw(PR, {
      uB: flat, uN: bs.length, uT: T,
      uIso: ph === 1 ? ease(E.outCubic, 4, 4.6, t) * (1 - ease(E.inCubic, 7.4, 8, t)) : 0,
      uFill: ph === 1 ? 1 - ease(E.outCubic, 4, 4.5, t) + ease(E.inCubic, 7.4, 8, t) : 1,
      uEdge: ph === 1 ? 1 : 0, uInner: ease(E.inOutCubic, 14.2, 15.5, t), uGy: gy, uGline: graphA * (ph === 1 ? 0 : 0.0),
    });
    G.blit(ctx);
    const la = (a) => ease(E.outCubic, a, a + 0.4, t);
    const lbl = [['01', 'TWO BLOBS', '兩顆靠近：場相加，中間長出橋'], ['02', 'FIELD f = Σ r²/d²', '場的等高線；粗線就是 f = T'], ['03', `THRESHOLD  T = ${T.toFixed(2)}`, '門檻每拍改一次：低 = 胖、高 = 瘦'], ['04', 'SPLIT & MERGE', '多加 8 顆球'], ['05', 'LAVA', '12 顆 · 內圈 f = 1.9T、4.2T']][ph];
    const at = [0, 4, 8, 12, 14][ph];
    text(ctx, lbl[0], 48, 72, { size: 22, family: F.mono, weight: 500, alpha: 0.5 * la(at) });
    text(ctx, lbl[1], 92, 72, { size: 22, family: F.mono, weight: 500, spacing: 2, alpha: la(at) });
    text(ctx, lbl[2], 48, 112, { size: 26, family: F.tc, alpha: 0.8 * la(at) });
    // centres + radius circles (teaching overlay)
    const ov = 1 - ease(E.inOutCubic, 12, 13, t);
    if (ov > 0) {
      ctx.save(); ctx.globalAlpha = ov; ctx.globalCompositeOperation = 'difference';
      bs.forEach(b => {
        ctx.setLineDash([3, 7]); ctx.strokeStyle = P; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(b[0], b[1], b[2], 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = P; ctx.fillRect(b[0] - 8, b[1] - 1, 16, 2); ctx.fillRect(b[0] - 1, b[1] - 8, 2, 16);
      });
      // sampled row marker
      ctx.strokeStyle = g(1, 0.45); ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(60, gy); ctx.lineTo(1020, gy); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    // cross-section graph f(x) along y = gy
    if (graphA > 0) {
      const gx = 80, gw = 920, gb = 1010, gh = 170, sy = v => gb - (v / (v + 1)) * gh * 1.0;
      ctx.save(); ctx.globalAlpha = graphA;
      ctx.fillStyle = bg(1); ctx.fillRect(0, gb - gh - 36, SW, SH);
      ctx.fillStyle = fg(0.35); ctx.fillRect(gx, gb, gw, 1.5);
      // filled area above threshold
      const n = 230, fv = new Float32Array(n + 1);
      for (let i = 0; i <= n; i++) { const x = gx + gw * i / n; let f = 0; for (const b of bs) { const dx = x - b[0], dy = gy - b[1]; f += b[2] * b[2] / (dx * dx + dy * dy + 1); } fv[i] = f; }
      ctx.fillStyle = fg(1);
      for (let i = 0; i < n; i++) if (fv[i] > T) { const x = gx + gw * i / n; ctx.fillRect(x, gb + 6, gw / n + 0.6, 12); }
      ctx.strokeStyle = fg(1); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = gx + gw * i / n; i ? ctx.lineTo(x, sy(fv[i])) : ctx.moveTo(x, sy(fv[i])); }
      ctx.stroke();
      ctx.strokeStyle = fg(0.8); ctx.lineWidth = 1.5; ctx.setLineDash([10, 6]); ctx.beginPath(); ctx.moveTo(gx, sy(T)); ctx.lineTo(gx + gw, sy(T)); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, `T = ${T.toFixed(2)}`, gx + gw, sy(T) - 10, { size: 20, family: F.mono, align: 'right' });
      text(ctx, 'f(x)  刻度 f/(f+1)', gx, gb - gh - 8, { size: 20, family: F.mono, alpha: 0.7 });
      text(ctx, '粗條 = f > T → 白', gx + 300, gb - gh - 8, { size: 20, family: F.tc, alpha: 0.6 });
      ctx.restore();
    }
  },
});
void S;
