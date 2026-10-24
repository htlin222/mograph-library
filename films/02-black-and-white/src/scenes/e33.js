/* 33 SDF 與平滑聯集 — ray-marched primitives merging with smin; k is the only knob. */
const FS33 = `
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uT, uK, uMix, uCam; uniform vec4 uD[7]; uniform vec3 uPa, uPb, uPc; uniform vec4 uM1, uM2, uM3;
float smk(float a, float b, float k){ k = max(k, 1e-4); return smin(a, b, k); }
float sceneA(vec3 p, float k){                                         // all motion precomputed in JS (uniforms)
  float d = length(p - uPa) - 0.52;
  vec3 q = p - uPb; q.xz *= mat2(uM1); q.xy *= mat2(uM2);
  d = smk(d, sdBox(q, vec3(.33)) - .05, k);
  vec3 c = p - uPc; c.yz *= mat2(uM3);
  d = smk(d, sdTorus(c, vec2(.46,.12)), k);
  return d;
}
float sceneB(vec3 p, float k){
  float d = length(p - vec3(0., 0.02, 0.)) - 0.5;
  for (int i = 0; i < 7; i++){ vec4 c = uD[i]; d = smk(d, length(p - c.xyz) - c.w, k); }
  return d;
}
float obj(vec3 p){
  float bnd = length(p - vec3(0., 0.1, 0.)) - 1.9;
  if (bnd > 0.3) return bnd;
  if (uMix <= 0.) return sceneA(p, uK);
  if (uMix >= 1.) return sceneB(p, uK);
  return mix(sceneA(p, uK), sceneB(p, uK), uMix);
}
float map(vec3 p){ return min(obj(p), p.y + 1.0); }
vec2 bsphere(vec3 ro, vec3 rd);
float shadow(vec3 ro, vec3 rd){ float r = 1., t = .03;
  vec2 bs = bsphere(ro, rd); if (bs.y < 0.) return 1.;            // shadow ray never reaches the objects
  t = max(t, bs.x);
  for (int i = 0; i < 18; i++){ float h = obj(ro + rd*t); r = min(r, 9.*h/t); t += clamp(h, .03, .3); if (r < .002 || t > 5.) break; }
  return clamp(r, 0., 1.); }
float ao(vec3 p, vec3 n){ float o = 0., s = 1.;
  for (int i = 1; i <= 4; i++){ float h = .05 + .09*float(i); o += (h - map(p + n*h))*s; s *= .7; } return clamp(1. - 1.6*o, 0., 1.); }
vec3 nrmO(vec3 p){ vec3 n = vec3(0.);            // tetrahedral normal in a loop: one obj() call site keeps the shader small
  for (int i = 0; i < 4; i++){ vec3 e = .5773*(2.*vec3(float(((i + 3)>>1)&1), float((i>>1)&1), float(i&1)) - 1.); n += e*obj(p + e*.0015); }
  return normalize(n); }
const vec3 BC = vec3(0., 0.1, 0.); const float BR = 2.15;
vec2 bsphere(vec3 ro, vec3 rd){ vec3 oc = ro - BC; float b = dot(oc, rd), c = dot(oc, oc) - BR*BR, h = b*b - c;
  if (h < 0.) return vec2(-1.); h = sqrt(h); return vec2(max(-b - h, 0.), -b + h); }
const vec3 L = vec3(-0.4825, 0.8334, 0.3948), L2 = vec3(0.6362, 0.2969, -0.6786);
float shadeObj(vec3 n, vec3 rd, float sh, float oc){
  float dif = max(dot(n, L), 0.)*sh;
  float back = pow(max(dot(n, L2), 0.), 2.);
  float fr = pow(1. - max(dot(n, -rd), 0.), 4.);
  float spe = pow(max(dot(reflect(rd, n), L), 0.), 48.)*sh;
  return 0.78*(1.05*dif + 0.10*(0.5 + 0.5*n.y)*oc) + 0.55*back*oc + 0.28*fr*oc + 0.7*spe;
}
void main(){
  vec2 uv = (vUv*2. - 1.);
  float a = uCam;
  vec3 ro = vec3(sin(a)*4.3, 0.75, cos(a)*4.3), ta = vec3(0., -0.08, 0.);
  vec3 f = normalize(ta - ro), r = normalize(cross(f, vec3(0,1,0))), u = cross(r, f);
  vec3 rd = normalize(uv.x*r + uv.y*u + 2.15*f);
  float px = 2.0/(uRes.y*2.15);
  // analytic floor + bounding sphere: only rays that can touch the objects are marched
  float tf = rd.y < 0. ? (-1. - ro.y)/rd.y : 1e9;
  vec2 bs = bsphere(ro, rd);
  float t = max(bs.x, 0.), mr = 1e9, mt = 0.; bool hit = false;
  if (bs.y > 0.){
    float tEnd = min(bs.y, tf);
    for (int i = 0; i < 80; i++){
      float dO = obj(ro + rd*t);
      float rr = dO/(t*px); if (rr < mr){ mr = rr; mt = t; }
      if (dO < .0012*t) { hit = true; break; } t += dO; if (t > tEnd) break; }
  }
  float bgc = 0.0015 + 0.009*exp(-dot(uv - vec2(0., .25), uv - vec2(0., .25))*1.4);
  float col = bgc, w = hit ? 1. : 1. - clamp(mr, 0., 1.);   // w < 1: silhouette AA from the ray's closest approach
  vec3 ps = ro + rd*(hit ? t : mt), pf = ro + rd*tf;
  bool needF = !hit && tf < 1e8;
  vec3 nO = w > 0. ? nrmO(ps) : vec3(0, 1, 0);
  float shO = 1., aoO = 1., shF = 1., aoF = 1.;
  for (int k = 0; k < 2; k++){                              // one call site each for shadow() and ao()
    bool isF = k == 1;
    if (isF ? !needF : w <= 0.) continue;
    vec3 p = isF ? pf : ps, n = isF ? vec3(0, 1, 0) : nO;
    float sh = shadow(p + n*.004, L), oc = ao(p, n);
    if (isF){ shF = sh; aoF = oc; } else { shO = sh; aoO = oc; }
  }
  if (needF){
    float pool = exp(-dot(pf.xz, pf.xz)*0.35);
    col = (0.002 + 0.03*pool*(0.15 + 0.85*shF))*aoF;
    col = mix(col, bgc, smoothstep(4., 10., tf));
  }
  if (w > 0.) col = mix(col, shadeObj(nO, rd, shO, aoO), w);
  col *= 1. - 0.35*dot(uv, uv)*0.5;
  col = pow(clamp(col, 0., 1.), 1./2.2);
  col += (hash21(vUv*uRes + fract(uT*7.)*100.) - .5)*0.03;
  o = vec4(vec3(col), 1.);
}`;
/* k schedule — changes land on bars */
function kAt(t) {
  const io = E.inOutCubic;
  if (t < 12) return t < 6 ? lerp(0, 0.2, ease(io, 3.8, 4.3, t)) : lerp(0.2, 0.5, ease(io, 7.8, 8.3, t));
  if (t < 14) return t < 12.5 ? lerp(0.5, 0, ease(io, 12, 12.5, t)) : lerp(0, 1, ease(E.inOutSine, 12.5, 13.8, t));
  return lerp(1, 0.42, ease(io, 13.9, 14.5, t));
}
const LABEL = t => t < 4 ? ['min(a, b)', '硬聯集：交界是尖銳的折痕'] : t < 8 ? ['smin  k = 0.20', '小 k：只在接觸處倒圓角'] : t < 12 ? ['smin  k = 0.50', '大 k：遠遠就開始互相吸引'] : t < 14 ? ['k : 0 → 1', '掃過 k，看圓角的半徑成長'] : ['smin  k = 0.42', '七滴水銀，繞行、相融、分離'];
let prog;
const DR = new Float32Array(28);
function drops(T, U) {        // droplet centres + radii for the payoff, set as a vec4[7] uniform (program state persists)
  for (let i = 0; i < 7; i++) {
    const ph = T * 0.75 + i * TAU / 7, r = 0.82 + 0.42 * Math.sin(T * 1.4 + i * 2.3);
    DR.set([Math.cos(ph) * r, 0.05 + Math.sin(ph * 2 + i) * 0.38, Math.sin(ph) * r, 0.17 + 0.06 * fract(i * 0.618)], i * 4);
  }
  G.gl.useProgram(prog.p); G.gl.uniform4fv(prog.loc('uD'), DR);
  return U;
}
M.def({
  id: 'e33', num: 33, ch: 5, title: 'SDF 與平滑聯集', en: 'SDF · SMOOTH UNION', dur: 20, ground: 'dark',
  prompt: '用光線步進畫三個物體：球、圓角方塊、甜甜圈，在黑色攝影棚裡互相穿過。只改一個參數：平滑聯集 smin 的 k，0、0.2、0.5 每 4 秒換一次並標示，再從 0 掃到 1；最後七顆水銀滴繞中心融合又分離，霧面白、柔光。',
  how: ['每個形狀寫成距離函數 SDF，球體追蹤 80 步', 'smin：h=clamp(.5+.5(b−a)/k)，減去 k·h(1−h)', '主光柔和陰影＋逆光輪廓＋四次取樣 AO，0.5 倍解析度'],
  practice: '把 smin 換成 max(a, −b)，做出挖洞的差集。',
  cues: [{ t: 0.1, type: 'whoosh', dur: 0.6, v: 0.4 }, { t: 4, type: 'pop' }, { t: 8, type: 'pop' }, { t: 12, type: 'riser', t1: 14, v: 0.4 }, { t: 14, type: 'impact', v: 0.6 }],
  init() { prog = G.prog(FS33); },
  frame(ctx, t) {
    const k = kAt(t), mix = ease(E.inOutCubic, 13.4, 14.6, t);
    G.size(0.5);
    const T = t + 1.2, R = a => [Math.cos(a), -Math.sin(a), Math.sin(a), Math.cos(a)];
    G.draw(prog, drops(T, { uPa: [Math.sin(T * 1.05) * 0.82, 0.05, 0], uPb: [-Math.sin(T * 1.05) * 0.82, 0.12, 0.05], uPc: [0, 0.15 + Math.cos(T * 0.85) * 0.72, Math.sin(T * 0.85) * 0.25], uM1: R(T * 0.6), uM2: R(T * 0.45), uM3: R(1.25 + 0.3 * Math.sin(T * 0.5)), uT: T, uK: k, uMix: mix, uCam: 0.35 + Math.sin(t * 0.18) * 0.35 + ease(E.inOutSine, 14, 20, t) * 0.5 }));
    G.blit(ctx);
    // --- teaching overlay ---
    const [code, zh] = LABEL(t), la = Math.min(1, ...[4, 8, 12, 14].map(b => clamp(Math.abs(t - b) / 0.2))) * ease(E.outCubic, 0.1, 0.5, t);
    text(ctx, code, 48, 84, { size: 34, family: F.mono, weight: 500, color: P, alpha: la });
    text(ctx, zh, 48, 128, { size: 26, family: F.tc, color: g(.72), alpha: la });
    // inset: d1, d2, min vs smin
    const bx = 712, by = 52, bw = 320, bh = 176;
    ctx.save();
    ctx.strokeStyle = g(1, 0.22); ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
    const X = x => bx + 16 + (x + 1) / 2 * (bw - 32), Y = y => by + bh - 30 - y * 150;
    const d1 = x => Math.abs(x + 0.42) * 0.9, d2 = x => Math.abs(x - 0.42) * 0.9;
    const sm = (a, b, kk) => { kk = Math.max(kk, 1e-4); const h = clamp(0.5 + 0.5 * (b - a) / kk); return lerp(b, a, h) - kk * h * (1 - h); };
    const line = (fn, w, col, dash) => { ctx.beginPath(); for (let i = 0; i <= 120; i++) { const x = -1 + i / 60, y = fn(x); i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); } ctx.lineWidth = w; ctx.strokeStyle = col; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); };
    ctx.beginPath(); ctx.rect(bx + 1, by + 1, bw - 2, bh - 2); ctx.clip();
    line(d1, 1.5, g(1, 0.3), [4, 5]); line(d2, 1.5, g(1, 0.3), [4, 5]);
    line(x => Math.min(d1(x), d2(x)), 1.5, g(1, 0.5));
    line(x => sm(d1(x), d2(x), k), 3.5, P);
    ctx.fillStyle = g(1, 0.2); ctx.fillRect(bx + 16, Y(0), bw - 32, 1);
    ctx.restore();
    text(ctx, 'a, b — min — smin', bx, by + bh + 30, { size: 18, family: F.mono, color: g(.6) });
    // k slider
    const sx = 48, sy = 980, sw = 560;
    ctx.fillStyle = g(1, 0.25); ctx.fillRect(sx, sy, sw, 2);
    for (let i = 0; i <= 10; i++) ctx.fillRect(sx + sw * i / 10 - 0.5, sy - (i % 5 ? 6 : 12), 1, i % 5 ? 6 : 12);
    const kx = sx + sw * clamp(k);
    ctx.fillStyle = P; ctx.fillRect(sx, sy - 1, kx - sx, 4);
    ctx.beginPath(); ctx.arc(kx, sy + 1, 11, 0, TAU); ctx.fill();
    text(ctx, 'k', sx, sy - 26, { size: 22, family: F.mono, weight: 500, color: P });
    text(ctx, k.toFixed(2), kx, sy + 44, { size: 22, family: F.mono, weight: 500, color: P, align: 'center' });
    text(ctx, 'h = clamp(.5 + .5(b−a)/k, 0, 1)', SW - 48, sy - 12, { size: 19, family: F.mono, color: g(.62), align: 'right' });
    text(ctx, 'd = mix(b, a, h) − k·h(1−h)', SW - 48, sy + 20, { size: 19, family: F.mono, color: g(.62), align: 'right' });
  },
});
