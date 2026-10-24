/* 39 折射玻璃 — a glass sphere (then a glass blob) refracting a printed backdrop; IOR is the knob. */
const FS39 = `
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uT, uIor, uPat, uBlob, uSlide;
const float BZ = -2.6;
float pat(vec2 q){
  float w = 0.;
  vec2 s = q + vec2(uSlide, 0.);
  float a = sin(s.x*7.);                                         // stripes
  float b = sin(s.x*5.5)*sin(s.y*5.5);                           // checker
  float c = sin(length(q - vec2(0., .05))*9. - uSlide*3.);       // rings
  float d = sin((s.x + s.y)*6.);                                 // diagonal (payoff)
  float v = uPat < 1. ? mix(a, b, uPat) : uPat < 2. ? mix(b, c, uPat - 1.) : mix(c, d, uPat - 2.);
  float fw = fwidth(v)*1.2 + 1e-3;
  return smoothstep(-fw, fw, v);
}
// studio: backdrop print behind, dark room with two soft boxes in front
float env(vec3 ro, vec3 rd){
  if (rd.z < -0.02){ float t = (BZ - ro.z)/rd.z; vec2 q = (ro + rd*t).xy;
    float v = mix(0.06, 0.95, pat(q)); return mix(v, 0.85, smoothstep(5., 9., length(q))); }
  float sb = smoothstep(.25, .2, abs(rd.x + .45))*smoothstep(.35, .3, abs(rd.y - .4));
  sb += smoothstep(.12, .08, abs(rd.x - .55))*smoothstep(.5, .45, abs(rd.y - .1));
  return 0.05 + 2.4*sb;
}
float sdf(vec3 p){
  float s = length(p) - 1.;
  if (uBlob <= 0.) return s;
  vec3 a = vec3(sin(uT*1.1)*.62, cos(uT*.8)*.4, sin(uT*.7)*.3);
  float b = smin(length(p - a) - .78, length(p + a) - .7, .6);
  b = smin(b, length(p - vec3(cos(uT*.9)*.2, sin(uT*1.3)*.65, 0.)) - .56, .5);
  b += 0.04*sin(p.x*5. + uT*2.)*sin(p.y*4. - uT*1.5)*sin(p.z*5.);
  return mix(s, b, uBlob);
}
vec3 nrm(vec3 p){ const vec2 e = vec2(1.,-1.)*.002;
  return normalize(e.xyy*sdf(p+e.xyy)+e.yyx*sdf(p+e.yyx)+e.yxy*sdf(p+e.yxy)+e.xxx*sdf(p+e.xxx)); }
void main(){
  vec2 uv = vUv*2. - 1.;
  vec3 ro = vec3(0., 0., 4.2), rd = normalize(vec3(uv, -2.2));
  float col = env(ro, rd);
  // bounding sphere r 1.35
  float bb = dot(ro, rd), cc = dot(ro, ro) - 1.75*1.75, h = bb*bb - cc;
  if (h > 0.){
    float t = -bb - sqrt(h), tEnd = -bb + sqrt(h); bool hit = false; float mr = 1e9, px = 2./(uRes.y*2.2);
    for (int i = 0; i < 56; i++){ float d = sdf(ro + rd*t); mr = min(mr, d/(t*px)); if (d < .001){ hit = true; break; } t += d; if (t > tEnd) break; }
    if (!hit && mr < 1.) col = mix(col, 0.12, (1. - clamp(mr, 0., 1.))*clamp((uIor - 1.)*4., 0., 1.));   // anti-aliased dark silhouette line
    if (hit){
      vec3 p = ro + rd*t, n = nrm(p);
      float fr = .04 + .96*pow(1. - max(dot(-rd, n), 0.), 5.);
      fr = mix(fr, 0.02, step(uIor, 1.01)*0.9);
      float refl = env(p, reflect(rd, n));
      // into the glass
      vec3 r1 = refract(rd, n, 1./uIor);
      vec3 q = p - n*.004; float ti = 0.;
      for (int i = 0; i < 48; i++){ float d = -sdf(q + r1*ti); ti += max(d, .006); if (d < .001) break; }
      vec3 pe = q + r1*ti, ne = -nrm(pe);
      vec3 r2 = refract(r1, ne, uIor);
      float trans;
      if (dot(r2, r2) < .01) trans = env(pe, reflect(r1, ne))*0.6;   // total internal reflection
      else trans = env(pe, r2);
      trans *= exp(-ti*0.12);                                            // faint absorption
      col = mix(trans, refl, fr);
    }
  }
  col = col/(1. + 0.25*col)*1.2;
  col = pow(clamp(col, 0., 1.), 1./2.2);
  col *= 1. - 0.05*dot(uv, uv);
  col += (hash21(vUv*uRes + fract(uT*7.)*100.) - .5)*0.025;
  o = vec4(vec3(col), 1.);
}`;
/* IOR steps on bars */
const IORS = [[0, 1.52, '1.52', '玻璃'], [2, 1.0, '1.00', '空氣：完全看不見'], [4, 1.33, '1.33', '水'], [6, 1.52, '1.52', '玻璃'], [8, 2.42, '2.42', '鑽石：影像翻轉縮小']];
function iorAt(t) {
  let v = IORS[0][1];
  for (let i = 1; i < IORS.length; i++) v = lerp(v, IORS[i][1], ease(E.inOutCubic, IORS[i][0] - 0.25, IORS[i][0] + 0.25, t));
  return lerp(v, 1.52, ease(E.inOutCubic, 9.75, 10.25, t));
}
let prog;
M.def({
  id: 'e39', num: 39, ch: 5, title: '折射玻璃', en: 'GLASS REFRACTION', dur: 20, ground: 'light',
  prompt: '白色攝影棚裡一顆透明玻璃球，浮在黑白條紋背板前。折射率每 2 秒換一次並標示：空氣 1.00、水 1.33、玻璃 1.52、鑽石 2.42；再把背板換成棋盤與同心圓；最後玻璃球融成會蠕動的玻璃水滴，邊緣有柔光箱的反光。',
  how: ['光線進出各折射一次：refract(rd, n, 1/IOR)', '出射點用負距離場在物體內步進求得；全反射改反射', 'Schlick 菲涅耳混合反射與折射；背板用 fwidth 抗鋸齒'],
  practice: '把 IOR 調成 0.75，做出「空氣泡在水中」的效果。',
  cues: [{ t: 0.1, type: 'bell', i: 3, v: 0.35, dec: 3 }, { t: 2, type: 'tick' }, { t: 4, type: 'tick' }, { t: 6, type: 'tick' }, { t: 8, type: 'pop' }, { t: 10, type: 'whoosh', dur: 0.5 }, { t: 12, type: 'whoosh', dur: 0.5 }, { t: 14, type: 'riser', t1: 15.2, v: 0.3 }, { t: 15.2, type: 'impact', v: 0.5 }],
  init() { prog = G.prog(FS39); },
  frame(ctx, t) {
    const io = E.inOutCubic, ior = iorAt(t);
    const pat = ease(io, 9.8, 10.4, t) + ease(io, 11.8, 12.4, t) + ease(io, 14, 15, t);
    const blob = ease(io, 14.2, 15.4, t);
    G.size(0.6);
    G.draw(prog, { uT: t, uIor: ior, uPat: pat, uBlob: blob, uSlide: t * 0.08 });
    G.blit(ctx);
    // --- overlay: label plate (white card so the type sits cleanly on the print) ---
    let lb = IORS[0]; for (const q of IORS) if (t >= q[0]) lb = q;
    const lbl = t < 10 ? [`IOR ${lb[2]}`, lb[3]] : t < 12 ? ['IOR 1.52 · checker', '換成棋盤：看格線怎麼彎'] : t < 14 ? ['IOR 1.52 · rings', '同心圓：中心被放大'] : ['glass blob', 'SDF 水滴：法線一變，折射就流動'];
    const la = Math.min(1, ...[2, 4, 6, 8, 10, 12, 14].map(q => clamp(Math.abs(t - q) / 0.2))) * ease(E.outCubic, 0.1, 0.5, t);
    ctx.fillStyle = bg(0.92); ctx.fillRect(28, 36, 420, 116);
    text(ctx, lbl[0], 48, 84, { size: 34, family: F.mono, weight: 500, alpha: la });
    text(ctx, lbl[1], 48, 128, { size: 26, family: F.tc, color: g(.3), alpha: la });
    // Snell inset: a ray through a disc with the current IOR (2D, exact)
    const bx = SW - 300, by = 36, bw = 272, bh = 200, cx = bx + bw / 2, cy = by + 100, R = 62;
    ctx.fillStyle = bg(0.92); ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = fg(0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh - 34); ctx.clip();
    ctx.strokeStyle = fg(1); ctx.lineWidth = 2;
    for (const off of [-0.7, -0.35, 0, 0.35, 0.7]) {
      // incoming horizontal ray at height off·R, refract in, refract out
      const y0 = off * R, x0 = -Math.sqrt(R * R - y0 * y0);
      let n = [x0 / R, y0 / R], d = [1, 0];
      const refr = (d, n, eta) => { const c = -(d[0] * n[0] + d[1] * n[1]), k = 1 - eta * eta * (1 - c * c); if (k < 0) return null; const a = eta * c - Math.sqrt(k); return [eta * d[0] + a * n[0], eta * d[1] + a * n[1]]; };
      const d1 = refr(d, n, 1 / ior); if (!d1) continue;
      const bq = x0 * d1[0] + y0 * d1[1], tt = -2 * bq;           // second hit on the circle
      const x1 = x0 + d1[0] * tt, y1 = y0 + d1[1] * tt;
      const d2 = refr(d1, [-x1 / R, -y1 / R], ior) || d1;
      ctx.beginPath(); ctx.moveTo(cx - bw / 2 + 12, cy + y0); ctx.lineTo(cx + x0, cy + y0); ctx.lineTo(cx + x1, cy + y1);
      ctx.lineTo(cx + x1 + d2[0] * 400, cy + y1 + d2[1] * 400); ctx.stroke();
    }
    ctx.restore();
    text(ctx, `n₂/n₁ = ${ior.toFixed(2)}`, cx, by + bh - 14, { size: 19, family: F.mono, align: 'center', color: g(.3) });
  },
});
