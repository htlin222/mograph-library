/* 38 體積光 — screen-space god rays: occlusion mask → radial blur toward the light (GPU Gems 3 style). */
const OCC38 = `
uniform float uT, uRot, uTilt, uSlots;
uniform vec2 uC;
// slotted wheel seen at a tilt: 1 = solid
float solid(vec2 p){
  vec2 q = (p - uC)*0.78; q.y /= cos(uTilt); q *= rot(uRot);
  float r = length(q), a = atan(q.y, q.x);
  float s = step(r, .40);
  float slot = step(fract(a/TAU*uSlots + .25), .46) * step(.13, r) * step(r, .345);
  float ring = step(.375, r) * step(r, .385);
  s *= 1. - max(slot, ring);
  s *= step(.045, r);
  return s;
}`;
const FS38A = `
in vec2 vUv; out vec4 o;
uniform vec2 uL; ${OCC38}
void main(){
  vec2 p = vUv*2. - 1.;
  vec2 d = p - uL;
  float light = 2.2*exp(-dot(d, d)*90.) + 0.5*exp(-dot(d, d)*16.) + 0.03*exp(-dot(d, d)*2.);
  float dust = 0.55 + 0.45*fbm3(vec3(p*3.5, uT*0.25));
  o = vec4(vec3(light*dust*(1. - solid(p))), 1.);
}`;
const FS38B = `
in vec2 vUv; out vec4 o;
uniform vec2 uRes, uL; uniform sampler2D uMask;
uniform float uN, uDecay, uDensity, uWeight, uExpo, uShowMask; ${OCC38}
void main(){
  vec2 uv = vUv, lp = uL*.5 + .5;
  vec2 dlt = (uv - lp)*uDensity/uN;
  vec2 c = uv; float illum = 1., sum = 0.;
  for (int i = 0; i < 128; i++){
    if (float(i) >= uN) break;
    c -= dlt;
    sum += texture(uMask, c).r*illum*uWeight;
    illum *= uDecay;
  }
  vec2 p = uv*2. - 1.;
  float s = solid(p);
  float direct = texture(uMask, uv).r;
  float col = sum*uExpo + direct*0.5;
  // the occluder face: deep black with a faint top-light falloff
  col = mix(col, 0.012 + 0.02*(1. - length(p - uC)), s*(1. - uShowMask));
  col = mix(col, direct, uShowMask);
  col = 1. - exp(-col*1.1);                             // filmic shoulder
  col = pow(clamp(col, 0., 1.), 1./1.8);
  col += (hash21(uv*uRes + fract(uT*7.)*100.) - .5)*0.03;
  o = vec4(vec3(col), 1.);
}`;
let pA, pB, mask;
const MS = 320;
M.def({
  id: 'e38', num: 38, ch: 5, title: '體積光', en: 'GOD RAYS', dur: 20, ground: 'dark',
  prompt: '黑色空間裡，一個開了十二道槽的金屬輪盤在亮光前慢慢轉，光束穿過槽縫射向鏡頭、帶著浮塵。先顯示第一步的遮擋遮罩，再把取樣數 8、24、96 與衰減 0.90 到 0.985 逐段切換並標數值；最後光源繞到輪盤後方，光束掃過整個畫面。',
  how: ['第一步：只畫光源與黑色遮擋物到小緩衝區', '第二步：每個像素朝光源取樣 N 次，逐次乘衰減', '光源加 fBm 浮塵；N 太少會出現階梯條紋'],
  practice: '讓兩個光源各自做徑向模糊，再相加。',
  cues: [{ t: 0.1, type: 'riser', t1: 1.5, v: 0.35 }, { t: 3, type: 'glitch', v: 0.3 }, { t: 6, type: 'tick' }, { t: 7.3, type: 'tick' }, { t: 8.6, type: 'tick' }, { t: 10, type: 'whoosh', dur: 0.6 }, { t: 14, type: 'impact', v: 0.6 }],
  init() { pA = G.prog(FS38A); pB = G.prog(FS38B); mask = G.target(MS, MS); },
  frame(ctx, t) {
    const io = E.inOutCubic;
    const showMask = ease(io, 3, 3.3, t) * (1 - ease(io, 5.7, 6, t));
    const N = t < 6 ? 96 : t < 7.3 ? 8 : t < 8.6 ? 24 : 96;
    const decay = t < 10 ? 0.965 : t < 12 ? 0.90 : t < 14 ? 0.985 : 0.975;
    const orb = ease(E.inOutSine, 14, 20, t);
    const oa = 0.9 - orb * TAU * 0.75, orr = 0.06 + Math.sin(orb * Math.PI) * 0.36;
    const L = [Math.cos(oa) * orr + Math.sin(t * 0.5) * 0.03, 0.02 + Math.sin(oa) * orr + Math.cos(t * 0.4) * 0.03];
    const C = [0.0, 0.02];
    const U = { uT: t, uRot: t * 0.35 + ease(io, 14, 20, t) * 1.5, uTilt: 0.35 + Math.sin(t * 0.3) * 0.25, uSlots: 12, uC: C, uL: L };
    G.draw(pA, U, mask);
    G.size(0.5);
    G.draw(pB, Object.assign({}, U, { uMask: mask, uN: N, uDecay: Math.pow(decay, 96 / N), uDensity: 0.95, uWeight: 3.2 / N, uExpo: 1.0, uShowMask: showMask }));
    G.blit(ctx);
    // --- overlay ---
    const lbl = t < 3 ? ['god rays', '光從槽縫射出，空氣裡看得見光'] : t < 6 ? ['pass 1 · occlusion mask', '只有光源與黑色遮擋物'] : t < 10 ? [`pass 2 · N = ${N}`, N < 96 ? '取樣太少：出現一圈圈階梯' : '取樣足夠：光束平滑'] : t < 14 ? [`decay = ${decay}`, decay < 0.95 ? '衰減快：光束短' : '衰減慢：光束長'] : ['light orbits', '光源繞到輪盤後方'];
    const la = Math.min(1, ...[3, 6, 7.3, 8.6, 10, 12, 14].map(q => clamp(Math.abs(t - q) / 0.2))) * ease(E.outCubic, 0.1, 0.5, t);
    text(ctx, lbl[0], 48, 84, { size: 34, family: F.mono, weight: 500, color: P, alpha: la });
    text(ctx, lbl[1], 48, 128, { size: 26, family: F.tc, color: g(.72), alpha: la });
    // sampling schematic during pass 2: one pixel's march toward the light
    const sa = ease(E.outCubic, 6, 6.4, t) * (1 - ease(E.inCubic, 9.6, 10, t));
    if (sa > 0) {
      const lx = (L[0] * 0.5 + 0.5) * SW, ly = (1 - (L[1] * 0.5 + 0.5)) * SH, px = SW * 0.84, py = SH * 0.8;
      ctx.save(); ctx.globalAlpha = sa;
      ctx.strokeStyle = g(1, 0.5); ctx.setLineDash([2, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lx, ly); ctx.stroke(); ctx.setLineDash([]);
      const n = Math.min(N, 24);
      for (let i = 1; i <= n; i++) { const f = i / n * 0.95; ctx.fillStyle = g(1, Math.pow(decay, i * N / n) * 0.9 + 0.1); ctx.beginPath(); ctx.arc(lerp(px, lx, f), lerp(py, ly, f), 4, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = P; ctx.lineWidth = 2; ctx.strokeRect(px - 9, py - 9, 18, 18);
      text(ctx, 'pixel', px, py + 40, { size: 19, family: F.mono, color: P, align: 'center' });
      ctx.restore();
    }
    const y = SH - 56;
    [['N', String(N)], ['decay', decay.toFixed(3)], ['density', '0.95'], ['slots', '12']].forEach(([k, v], i) => {
      const x = 48 + i * 250;
      text(ctx, k, x, y, { size: 19, family: F.mono, color: g(.55) });
      text(ctx, v, x, y + 30, { size: 24, family: F.mono, weight: 500, color: P });
    });
  },
});
