/* 40 卡通著色與描邊 — N·L quantised into bands, SDF near-miss outlines, then screen-space hatching. */
const FS40 = `
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uT, uBands, uSmooth, uLine, uHatch, uRot;
const vec3 LD = vec3(-0.4238, 0.8005, 0.4238);
float obj(vec3 p){
  p.xz *= rot(uRot);
  float d = length(p) - .62;                                               // planet
  vec3 q = p; q.xy *= rot(.42); q.yz *= rot(.18);
  d = min(d, sdTorus(q, vec2(1.0, .085)));                                  // ring
  vec3 m = p - vec3(cos(uT*1.2)*1.25, .5 + .15*sin(uT*.9), sin(uT*1.2)*1.25);
  d = min(d, length(m) - .2);                                               // moon
  return d;
}
float map(vec3 p){ return min(obj(p), p.y + 1.25); }
vec3 nrm(vec3 p){ const vec2 e = vec2(1.,-1.)*.0015;
  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx)); }
float hardShadow(vec3 ro){ float t = .03;
  for (int i = 0; i < 28; i++){ float h = obj(ro + LD*t); if (h < .002) return 0.; t += h; if (t > 5.) break; } return 1.; }
float band(float x){                                                        // quantise 0..1 into N tones
  float q = (min(floor(x*uBands), uBands - 1.) + .5)/uBands;
  return mix(q, x, uSmooth);
}
float hatch(vec2 px, float dark){                                          // ink coverage of screen-space hatching
  vec2 a = vec2(px.x + px.y, px.x - px.y)*0.7071/7.5;
  float l1 = abs(fract(a.x) - .5)*2., l2 = abs(fract(a.y) - .5)*2.;
  float w1 = clamp(dark*1.6, 0., 1.)*.75, w2 = clamp(dark*1.6 - .8, 0., 1.)*.75;
  float f1 = fwidth(a.x)*2., f2 = fwidth(a.y)*2.;
  float i1 = 1. - smoothstep(w1 - f1, w1 + f1, l1);
  float i2 = 1. - smoothstep(w2 - f2, w2 + f2, l2);
  return max(i1*step(.02, w1), i2*step(.02, w2));
}
void main(){
  vec2 uv = vUv*2. - 1.;
  vec3 ro = vec3(0., 0.75, 4.6), ta = vec3(0., -0.32, 0.);
  vec3 f = normalize(ta - ro), r = normalize(cross(f, vec3(0,1,0))), u = cross(r, f);
  vec3 rd = normalize(uv.x*r + uv.y*u + 2.55*f);
  float px = 2.0/(uRes.y*2.55);
  // march; remember the deepest local minimum of d/(t·px) that the ray passed (= near-miss of an edge)
  float t = 0., d = 1e9, pd = 1e9, pt = 0., mr = 1e9, mt = 0.; bool hit = false;
  for (int i = 0; i < 90; i++){
    d = obj(ro + rd*t);
    if (d > pd && pd/(pt*px) < mr){ mr = pd/(pt*px); mt = pt; }
    if (d < .001*t){ hit = true; break; }
    float dg = min(d, (ro + rd*t).y + 1.25);
    pd = d; pt = t; t += dg; if (t > 14.) break;
    if (dg < .001*t){ break; }                                                // landed on the ground
  }
  if (!hit && d < .02 && t < 14.) hit = true;                               // ran out of steps while grazing a surface: count it as a hit (no white specks)
  vec3 p = ro + rd*t;
  bool onObj = hit;
  float paper = 0.955, col = paper, dark = 0.;
  if (onObj){
    vec3 n = nrm(p);
    float ndl = max(dot(n, LD), 0.)*hardShadow(p + n*.004);
    float tone = band(clamp(ndl*0.85 + 0.15, 0., 1.));
    float spec = step(.965, max(dot(reflect(rd, n), LD), 0.))*(1. - uSmooth);
    col = mix(0.06, 0.97, tone);
    col = max(col, spec);
    dark = 1. - tone;
  } else if (p.y < -1.2){
    float sh = hardShadow(p + vec3(0., .004, 0.));
    float tone = mix(band(0.15), 0.12, uSmooth);
    if (sh < .5){ col = mix(paper, mix(0.06, 0.97, tone), 0.55); dark = (1. - tone)*0.6; }
  }
  // hatching replaces flat tones in the payoff: ink density follows the band value
  if (uHatch > 0. && dark > 0.){
    float ink = hatch(gl_FragCoord.xy, clamp((dark - .22)/.78, 0., 1.));
    col = mix(col, mix(paper, 0.05, ink), uHatch);
  }
  // outlines: silhouette (ray missed or hit far behind) + inner edges where an object occludes another
  float W = uLine;
  if (W > 0.){
    bool edge = !onObj || (t - mt) > 0.25;
    if (edge && mr < W){ float a = 1. - smoothstep(W - 1., W, mr); col = mix(col, 0.04, a); }
    if (onObj){ vec3 n = nrm(p); float rim = 1. - abs(dot(n, -rd)); col = mix(col, 0.04, smoothstep(.93, .97, rim)*step(.5, W)); }
  }
  col = pow(clamp(col, 0., 1.), 1./1.25);
  col += (hash21(vUv*uRes + fract(uT*7.)*100.) - .5)*0.02;
  o = vec4(vec3(col), 1.);
}`;
let prog;
const PH = t => t < 3 ? ['toon · 3 bands', '光照量化成三階，加上墨線'] : t < 5 ? ['lambert', '平滑明暗：沒有色階、沒有線'] : t < 7 ? ['2 bands', '只剩亮與暗兩階'] : t < 9 ? ['3 bands', '加入中間調'] : t < 11 ? ['4 bands', '色階越多越接近寫實'] : t < 14 ? ['outline', '距離場擦邊＝描邊；寬度逐拍加粗'] : ['hatching', '暗部改成交叉排線，像銅版畫'];
M.def({
  id: 'e40', num: 40, ch: 5, title: '卡通著色與描邊', en: 'TOON SHADING & OUTLINE', dur: 20, ground: 'light',
  prompt: '白紙上一顆帶光環的行星與一顆小衛星在轉，做成卡通著色：先比較平滑明暗與 2、3、4 階色調，每 2 秒切換並畫出明暗對應曲線；接著墨線從 1 px 加粗到 6 px；最後暗部改成交叉排線，像銅版畫，純黑墨白紙。',
  how: ['tone = floor(N·L × 階數) / 階數：明暗量化', '描邊：光線擦過物體的最近距離 < 寬度就上墨', '排線：依暗度調整 45° 線寬，最暗再疊一層交叉線'],
  practice: '把高光改成一顆硬邊白點，做出漫畫的反光。',
  cues: [{ t: 0.1, type: 'pop' }, { t: 3, type: 'whoosh', dur: 0.4 }, { t: 5, type: 'tick' }, { t: 7, type: 'tick' }, { t: 9, type: 'tick' }, { t: 11, type: 'clap' }, { t: 12, type: 'clap' }, { t: 13, type: 'clap' }, { t: 14, type: 'impact', v: 0.5 }],
  init() { prog = G.prog(FS40); },
  frame(ctx, t) {
    const io = E.inOutCubic;
    const bands = t < 3 ? 3 : t < 7 ? 2 : t < 9 ? 3 : t < 11 ? 4 : 3;
    const sm = t >= 3 && t < 5 ? ease(io, 3, 3.3, t) * (1 - ease(io, 4.7, 5, t)) : 0;
    const line = t < 3 ? 3 : t < 5 ? lerp(3, 0, ease(io, 3, 3.3, t)) : t < 11 ? lerp(0, 3, ease(io, 4.7, 5, t)) : t < 14 ? [1.2, 3, 6][Math.min(2, Math.floor(t - 11))] : 3.5;
    const hatch = ease(io, 14, 14.8, t);
    G.size(0.6);
    G.draw(prog, { uT: t, uBands: bands, uSmooth: sm, uLine: line * 0.6, uHatch: hatch, uRot: t * 0.5 });
    G.blit(ctx);
    // --- overlay ---
    const [a, b] = PH(t), la = Math.min(1, ...[3, 5, 7, 9, 11, 14].map(q => clamp(Math.abs(t - q) / 0.2))) * ease(E.outCubic, 0.1, 0.5, t);
    text(ctx, a, 48, 84, { size: 34, family: F.mono, weight: 500, alpha: la });
    text(ctx, b, 48, 128, { size: 26, family: F.tc, color: g(.3), alpha: la });
    // transfer curve inset: N·L (x) → tone (y)
    const bx = SW - 268, by = 40, bw = 220, bh = 140;
    ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
    ctx.beginPath();
    for (let i = 0; i <= 110; i++) {
      const x = i / 110, xx = x * 0.85 + 0.15, q = (Math.min(bands - 1, Math.floor(xx * bands)) + 0.5) / bands, y = lerp(q, xx, sm);
      const X = bx + x * bw, Y = by + bh - y * bh; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.strokeStyle = fg(1); ctx.lineWidth = 3; ctx.stroke();
    text(ctx, 'N·L →', bx - 10, by + bh, { size: 19, family: F.mono, align: 'right', color: g(.35) });
    text(ctx, 'tone', bx - 10, by + 18, { size: 19, family: F.mono, align: 'right', color: g(.35) });
    text(ctx, `line ${line.toFixed(1)} px`, 48, SH - 52, { size: 22, family: F.mono, weight: 500 });
    ctx.fillStyle = fg(1); ctx.fillRect(250, SH - 60, 120, Math.max(0.5, line));
    text(ctx, `bands ${sm > 0.5 ? '∞' : bands}`, SW - 48, SH - 52, { size: 22, family: F.mono, weight: 500, align: 'right' });
  },
});
