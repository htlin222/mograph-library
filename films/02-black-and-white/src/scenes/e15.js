/* 15 反應擴散 — Gray–Scott on the GPU (ping-pong targets), feed/kill morph: spots → maze → coral → radial map. */
function tag(ctx, i, zh, en, a) {
  text(ctx, String(i).padStart(2, '0'), 60, 86, { size: 20, family: F.mono, weight: 500, alpha: 0.5 * a });
  text(ctx, zh, 100, 88, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 116 + w, 86, { size: 18, family: F.mono, spacing: 3, alpha: 0.5 * a });
}
const RW = 220, RH = 188, SPF = 36, HZ = 30 * SPF;           // sim grid, steps per frame
const FX = 60, FY = 130, FW = 960, FH = 822;                  // field rectangle on stage
const PRE = [{ n: '斑點', en: 'SPOTS', F: 0.0367, k: 0.0649 }, { n: '迷宮', en: 'MAZE', F: 0.029, k: 0.057 }, { n: '珊瑚', en: 'CORAL', F: 0.0545, k: 0.062 }];
const T1 = 5, T2 = 10, T3 = 14, PREFER_FLOAT = false;
function params(t) {
  let F = PRE[0].F, k = PRE[0].k;
  for (const [i, tt] of [[1, T1], [2, T2]]) { const e = ease(E.inOutCubic, tt, tt + 0.6, t); F = lerp(F, PRE[i].F, e); k = lerp(k, PRE[i].k, e); }
  return [F, k, ease(E.inOutCubic, T3, T3 + 1.2, t)];
}
const IO = `
uniform sampler2D uS; uniform vec2 uRes;
#ifdef PACKED
vec2 enc1(float v){ v = clamp(v, 0., .99998); float h = floor(v*255.)/255.; return vec2(h, (v-h)*255.); }
vec4 enc(vec2 s){ return vec4(enc1(s.x), enc1(s.y)); }
vec2 get(vec2 uv){ vec4 t = texture(uS, uv); return vec2(t.r + t.g/255., t.b + t.a/255.); }
#else
vec4 enc(vec2 s){ return vec4(s, 0., 1.); }
vec2 get(vec2 uv){ return texture(uS, uv).rg; }
#endif
`;
const STEP = `${IO}
uniform vec3 uP;                 // F, k, radial-map amount
in vec2 vUv; out vec4 o;
void main(){
  vec2 e = 1. / uRes, s = get(vUv);
  // 3×3 Laplacian (.2 edges, .05 corners), nearest + repeat wrap = torus
  vec2 L = .2 * (get(vUv + vec2(e.x, 0.)) + get(vUv - vec2(e.x, 0.)) + get(vUv + vec2(0., e.y)) + get(vUv - vec2(0., e.y)))
         + .05 * (get(vUv + e) + get(vUv - e) + get(vUv + vec2(e.x, -e.y)) + get(vUv + vec2(-e.x, e.y))) - s;
  // radial parameter map: coral at the centre → maze → spots at the rim
  vec2 q = (vUv - .5) * vec2(uRes.x/uRes.y, 1.);
  float r = clamp(length(q) / .62, 0., 1.) * 2.;
  vec2 m = r < 1. ? mix(vec2(${PRE[2].F}, ${PRE[2].k}), vec2(${PRE[1].F}, ${PRE[1].k}), smoothstep(0.,1.,r))
                  : mix(vec2(${PRE[1].F}, ${PRE[1].k}), vec2(${PRE[0].F}, ${PRE[0].k}), smoothstep(1.,2.,r));
  vec2 P = mix(uP.xy, m, uP.z);
  float uvv = s.x * s.y * s.y;
  vec2 n = s + vec2(1.0 * L.x - uvv + P.x * (1. - s.x), .5 * L.y + uvv - (P.x + P.y) * s.y);
  o = enc(clamp(n, 0., 1.));
}`;
const SEED = `${IO}
uniform float uMode;             // 0: scattered dots + ring, 1: one small centre seed
in vec2 vUv; out vec4 o;
void main(){
  vec2 p = vUv * uRes;
  float v = 0.;
  if (uMode > .5) { v = step(length(p - uRes * .5), 5.) * (.9 + .1 * hash21(p)); o = enc(vec2(1. - .5*v, v * .7)); return; }
  for (int i = 0; i < 14; i++) {
    vec2 c = vec2(hash11(float(i) * 1.37 + .11), hash11(float(i) * 2.91 + .73)) * uRes * vec2(.84, .8) + uRes * vec2(.08, .1);
    v = max(v, step(length(p - c), 2.5 + 2.5 * hash11(float(i) + .3)));
  }
  float r = length((p - uRes*.5) * vec2(1., 1.));
  v = max(v, step(abs(r - 26.), 2.6));
  v *= .9 + .1 * hash21(p);
  o = enc(vec2(1. - .5*v, v * .7));
}`;
const SHOW = `${IO}
uniform float uInk;
in vec2 vUv; out vec4 o;
float V(vec2 uv){
  vec2 p = uv * uRes - .5, i = floor(p), f = p - i, e = 1. / uRes, b = (i + .5) * e;
  return mix(mix(get(b).y, get(b + vec2(e.x, 0.)).y, f.x), mix(get(b + vec2(0., e.y)).y, get(b + e).y, f.x), f.y);
}
void main(){
  float v = V(vUv);
  float w = fwidth(v) * .75 + 1e-4;
  float paper = ${(242 / 255).toFixed(4)}, ink = ${(11 / 255).toFixed(4)};
  float halo = smoothstep(.05, .16, v) * .35;
  float c = mix(paper, .62, halo);
  c = mix(c, ink, smoothstep(uInk - w, uInk + w, v));
  o = vec4(vec3(c), 1.);
}`;
let A, Bt, pStep, pSeed, pShow, cur, packed;
const S = M.def({
  id: 'e15', num: 15, ch: 2, title: '反應擴散', en: 'REACTION–DIFFUSION', dur: 20, ground: 'light',
  prompt: '在 GPU 上跑 Gray–Scott 反應擴散，白紙黑墨。從幾個墨點開始，每段改 feed 與 kill：先是會分裂的斑點，5 秒變迷宮條紋；10 秒清空只留中心一點長出珊瑚；14 秒改成從中心向外的參數地圖，生長前緣一路變成迷宮再變斑點。角落畫 F–k 小地圖。',
  how: ['兩張貼圖 ping-pong，每格 36 步，16 位元打包', '3×3 拉普拉斯擴散 Du 1、Dv 0.5，UV² 反應', 'F/k：斑點 .037/.065、迷宮 .029/.057、珊瑚 .055/.062'],
  practice: '把 kill 每秒加 0.001，記下圖樣在哪一刻改變。',
  cues: [{ t: T1, type: 'tick' }, { t: T2, type: 'tick' }, { t: T3, type: 'bell', i: 3, v: 0.45 }],
  init() {
    // G.floatOK is checked, but on SwiftShader half-float targets measured ~2.5× slower than RGBA8 and have
    // only 11-bit mantissa; 16-bit fixed point packed into RGBA8 is both faster and more precise here.
    packed = !(G.floatOK && PREFER_FLOAT);
    const hdr = packed ? '#define PACKED\n' : '';
    pStep = G.prog(hdr + STEP); pSeed = G.prog(hdr + SEED); pShow = G.prog(hdr + SHOW);
    const o = { float: !packed, nearest: true, repeat: true };
    A = G.target(RW, RH, o); Bt = G.target(RW, RH, o);
  },
  reset() { G.gl.disable(G.gl.DITHER); G.draw(pSeed, { uMode: 0 }, A); cur = A; },
  frame(ctx, t) {
    const gl = G.gl; gl.disable(gl.DITHER);          // dithering would corrupt the packed low bytes
    M.sim(S, t, (dt, n, st) => {
      const [F, k, m] = params(st + dt), nx = cur === A ? Bt : A;
      if (st < T2 && st + dt >= T2) { G.draw(pSeed, { uMode: 1 }, nx); cur = nx; return; }   // wipe, reseed the centre
      G.draw(pStep, { uS: cur, uP: [F, k, m] }, nx); cur = nx;
    }, HZ);
    G.size(0.75);
    G.draw(pShow, { uS: cur, uRes: [RW, RH], uInk: 0.24 });
    G.blit(ctx, FX, FY, FW, FH);
    gl.enable(gl.DITHER);
    ctx.strokeStyle = fg(1); ctx.lineWidth = 2; ctx.strokeRect(FX - 1, FY - 1, FW + 2, FH + 2);
    /* tag */
    const [F, k, m] = params(t);
    const ph = t < T1 ? 0 : t < T2 ? 1 : t < T3 ? 2 : 3, T0 = [0, T1, T2, T3];
    const tags = [['斑點分裂', 'SPOTS · MITOSIS'], ['迷宮條紋', 'STRIPES · MAZE'], ['珊瑚生長', 'CORAL · RESEEDED'], ['參數地圖', 'RADIAL F–k MAP']];
    tag(ctx, ph + 1, tags[ph][0], tags[ph][1], ph === 0 ? 1 : ease(E.outCubic, T0[ph], T0[ph] + 0.3, t));
    text(ctx, `${packed ? 'RGBA8×2' : 'RGBA16F'} · ${RW}×${RH} · ${SPF} steps/frame`, 1020, 86, { size: 18, family: F.mono, align: 'right', alpha: 0.5 });
    /* readouts */
    text(ctx, `F ${F.toFixed(4)}   k ${k.toFixed(4)}`, 60, 1000, { size: 30, family: F.mono, weight: 500 });
    text(ctx, ph === 3 ? '中心 → 外圈：珊瑚 → 迷宮 → 斑點' : 'feed 補充 U · kill 移除 V', 60, 1036, { size: 22, family: F.tc, alpha: 0.6 });
    /* F–k mini map (bottom-right of the stage, under the field) */
    const mx = 730, my = 968, mw = 290, mh = 64, kx = kk => mx + (kk - 0.054) / (0.068 - 0.054) * mw, fy = ff => my + mh - (ff - 0.022) / (0.062 - 0.022) * mh;
    ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh);
    PRE.forEach(p => { ctx.fillStyle = fg(0.45); ctx.beginPath(); ctx.arc(kx(p.k), fy(p.F), 4, 0, TAU); ctx.fill(); text(ctx, p.n, kx(p.k) + 8, fy(p.F) + 7, { size: 18, family: F.tc, alpha: 0.65 }); });
    if (m < 0.99) { ctx.globalAlpha = 1 - m; ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(kx(k), fy(F), 8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (m > 0) { ctx.strokeStyle = fg(m); ctx.lineWidth = 3; ctx.beginPath(); PRE.forEach((p, i) => i ? ctx.lineTo(kx(p.k), fy(p.F)) : ctx.moveTo(kx(p.k), fy(p.F))); ctx.stroke(); }
    text(ctx, 'F ↑', mx - 10, my + 18, { size: 18, family: F.mono, align: 'right', alpha: 0.5 });
    text(ctx, 'k →', mx - 10, my + mh - 2, { size: 18, family: F.mono, align: 'right', alpha: 0.5 });
  },
});
