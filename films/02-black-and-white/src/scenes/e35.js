/* 35 無限晶格 — domain repetition: one cell, p = mod(p + c/2, c) − c/2, flown through with fog to black. */
const FS35 = `
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uT, uZ, uMorph, uTw, uRoll, uLook;
uniform vec3 uC;
vec3 rep(vec3 p, vec3 c){ return p - c*floor(p/c + .5); }
float cell(vec3 q){
  float a = sdBox(q, vec3(.34)) - .06;                               // A: a rounded cube per cell
  if (uMorph <= 0.) return a;
  float w = .05;                                                      // B: three beams + a node sphere
  float b = min(min(sdBox(q, vec3(9., w, w)), sdBox(q, vec3(w, 9., w))), sdBox(q, vec3(w, w, 9.)));
  b = smin(b, length(q) - .2, .1);
  return mix(a, b, uMorph);
}
float map(vec3 p){
  p.xy *= rot(p.z*uTw);
  return cell(rep(p, uC));
}
void main(){
  vec2 uv = vUv*2. - 1.;
  vec3 ro = vec3(1.2, 1.2, 4.2 - uZ);
  ro.xy = ro.xy*rot(ro.z*uTw);                                        // ride the twist: stay in the gap between beams
  vec3 fw = normalize(mix(vec3(0., 0., -1.), normalize(vec3(0.) - vec3(1.2, 1.2, 4.2)), uLook));
  vec3 r = normalize(cross(fw, vec3(sin(uRoll), cos(uRoll), 0.))), u = cross(r, fw);
  vec3 rd = normalize(uv.x*r + uv.y*u + 1.7*fw);
  float t = 0.; bool hit = false; int it = 0;
  for (int i = 0; i < 96; i++){ float d = map(ro + rd*t); if (d < .0015*t){ hit = true; break; } t += d*0.85; it = i; if (t > 30.) break; }
  float col = 0.;
  if (hit){
    vec3 p = ro + rd*t;
    const vec2 e = vec2(1.,-1.)*.002;
    vec3 n = normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));
    vec3 L = normalize(vec3(.5, .8, .3));
    float dif = max(dot(n, L), 0.), head = max(dot(n, -rd), 0.);
    float spe = pow(max(dot(reflect(rd, n), L), 0.), 30.);
    float occ = 1. - float(it)/96.;
    col = (0.06 + 0.55*dif + 0.35*head*head + 0.6*spe)*(0.35 + 0.65*occ);
    col *= exp(-0.2*t);                                                // fog to black
  }
  col += 0.025*exp(-dot(uv, uv)*2.);                                   // faint depth haze in the centre
  col = pow(clamp(col, 0., 1.), 1./2.2);
  col += (hash21(vUv*uRes + fract(uT*7.)*100.) - .5)*0.03;
  o = vec4(vec3(col), 1.);
}`;
const BIG = 400, CELL = 2.4;
let prog;
M.def({
  id: 'e35', num: 35, ch: 5, title: '無限晶格', en: 'DOMAIN REPETITION', dur: 20, ground: 'dark',
  prompt: '先只畫一顆圓角方塊。接著用取模把空間切成格子：先沿 x 複製、再加上 y、再加上 z，每 2 秒一軸並標出公式；然後鏡頭往前飛穿無限晶格、霧淡到全黑，格子換成梁柱節點，最後整個空間沿 z 扭轉。',
  how: ['p = mod(p + c/2, c) − c/2：一個格子畫無限次', '週期 c 從 400 縮到 2.4，複本從遠方湧入', '霧 exp(−0.2d) 淡到黑；空間扭轉 rot(z·0.045)'],
  practice: '只在 x 軸重複，再加 rot(id) 讓每格方向不同。',
  cues: [{ t: 0.1, type: 'bell', i: 0, v: 0.4, dec: 2 }, { t: 2, type: 'whoosh', dur: 0.6 }, { t: 4, type: 'whoosh', dur: 0.6 }, { t: 6, type: 'whoosh', dur: 0.6 }, { t: 8, type: 'riser', t1: 10, v: 0.3 }, { t: 10, type: 'impact', v: 0.5 }, { t: 14, type: 'impact', v: 0.6 }],
  init() { prog = G.prog(FS35); },
  frame(ctx, t) {
    const io = E.inOutCubic;
    const ax = i => Math.exp(lerp(Math.log(BIG), Math.log(CELL), ease(io, 2 + i * 2 - 0.4, 2 + i * 2 + 0.6, t)));
    const C = [ax(0), ax(1), ax(2)];
    // camera: hold on the single cell, then dolly forward through the lattice (speed eased in)
    const sp = u => u <= 0 ? 0 : u * u / 2;           // integral of a linear ramp
    const z = 2.2 * (sp(clamp((t - 7.2) / 2.0)) * 2.0 + Math.max(0, t - 9.2)) + ease(E.inOutSine, 0, 7, t) * 0.8;
    const look = 1 - ease(io, 6.6, 9.5, t);
    const morph = ease(io, 9.8, 10.6, t), tw = 0.045 * ease(io, 13.8, 16, t);
    const roll = ease(E.inOutSine, 14, 20, t) * 0.9;
    G.size(0.6);
    G.draw(prog, { uT: t, uZ: z, uC: C, uMorph: morph, uTw: tw, uRoll: roll, uLook: look });
    G.blit(ctx);
    // --- overlay --- (soft dark bands keep the readouts legible over the lattice)
    for (const [y0, y1] of [[0, 190], [SH, SH - 210]]) { const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(0, Math.min(y0, y1), SW, Math.abs(y1 - y0)); }
    const a0 = ease(E.outCubic, 0.1, 0.6, t);
    text(ctx, 'p = mod(p + c/2, c) − c/2', 48, 84, { size: 30, family: F.mono, weight: 500, color: P, alpha: a0 });
    const lbl = t < 2 ? '一個格子：只有一顆方塊' : t < 4 ? '沿 x 軸重複' : t < 6 ? '加上 y 軸：一面牆' : t < 10 ? '加上 z 軸：無限晶格，飛進去' : t < 14 ? '換掉格子內容：梁柱＋節點' : '空間沿 z 扭轉：rot(p.z · 0.045)';
    const la = Math.min(1, ...[2, 4, 6, 10, 14].map(b => clamp(Math.abs(t - b) / 0.2)));
    text(ctx, lbl, 48, 128, { size: 26, family: F.tc, color: g(.72), alpha: a0 * la });
    // per-axis period readout
    ['x', 'y', 'z'].forEach((n, i) => {
      const y = SH - 140 + i * 36, on = C[i] < 50;
      const v = C[i] > 99 ? '∞' : C[i].toFixed(1);
      text(ctx, `c.${n}`, 48, y, { size: 22, family: F.mono, weight: 500, color: P, alpha: on ? 1 : 0.45 });
      ctx.fillStyle = g(1, 0.18); ctx.fillRect(110, y - 8, 220, 2);
      const f = clamp(1 - Math.log(C[i] / CELL) / Math.log(BIG / CELL));
      ctx.fillStyle = P; ctx.fillRect(110, y - 9, 220 * f, 4);
      text(ctx, v, 350, y, { size: 22, family: F.mono, color: P, alpha: on ? 1 : 0.45 });
    });
    const fogA = ease(E.outCubic, 6.2, 7, t);
    text(ctx, `fog  exp(−0.2 · d)`, SW - 48, SH - 104, { size: 22, family: F.mono, color: g(.7), align: 'right', alpha: fogA });
    text(ctx, `z  ${(-z).toFixed(1).padStart(6)}`, SW - 48, SH - 68, { size: 22, family: F.mono, color: P, align: 'right', alpha: fogA });
  },
});
