/* 34 柔和陰影與環境光遮蔽 — white matte objects on a white sweep; the sun moves, penumbra k and AO are the knobs. */
const FS34 = `
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uT, uK, uAO, uSplit, uAz, uEl;
float sdCap(vec3 p, float h, float r){ p.y -= clamp(p.y, 0., h); return length(p) - r; }
float obj(vec3 p){
  float d = length(p - vec3(-0.95, -0.52, 0.25)) - 0.48;                       // sphere on the floor
  vec3 q = p - vec3(0.55, -0.42, -0.35); q.xz *= rot(0.6);
  d = min(d, sdBox(q, vec3(.30, .58, .30)) - .04);                              // standing block
  vec3 c = p - vec3(0.35, -0.86, 0.8); c.xz *= rot(0.3);
  d = min(d, sdTorus(c, vec2(.38, .14)));                                        // ring lying down
  d = min(d, sdCap(p - vec3(-0.25, -1.0, -0.95), 1.55, 0.045));                  // thin rod: penumbra grows with distance
  d = min(d, length(p - vec3(1.05, 0.2 + 0.12*sin(uT*1.6), 0.8)) - 0.24);     // floating ball: shadow detached
  return d;
}
float map(vec3 p){ return min(obj(p), p.y + 1.0); }
vec3 nrm(vec3 p){ const vec2 e = vec2(1.,-1.)*.0015;
  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx)); }
float shadow(vec3 ro, vec3 rd, float k){ float r = 1., t = .02;
  for (int i = 0; i < 30; i++){
    float h = obj(ro + rd*t);
    r = min(r, k*h/t);
    t += clamp(h, .015, .25); if (r < .001 || t > 6.) break; }
  r = clamp(r, 0., 1.); return r*r*(3. - 2.*r); }
float ao(vec3 p, vec3 n){ float o = 0., s = 1.;
  for (int i = 1; i <= 5; i++){ float h = .02 + .08*float(i); o += (h - map(p + n*h))*s; s *= .75; } return clamp(1. - 1.3*o, 0.25, 1.); }
void main(){
  vec2 uv = vUv*2. - 1.;
  vec3 ro = vec3(2.9, 2.35, 3.6), ta = vec3(-0.1, -0.55, 0.05);
  vec3 f = normalize(ta - ro), r = normalize(cross(f, vec3(0,1,0))), u = cross(r, f);
  vec3 rd = normalize(uv.x*r + uv.y*u + 2.6*f);
  float px = 2.0/(uRes.y*2.6);
  float t = 0., d = 0., mr = 1e9, mt = 0.; bool hit = false;
  for (int i = 0; i < 80; i++){ vec3 p = ro + rd*t; float dO = obj(p); d = min(dO, p.y + 1.);
    float rr = dO/(t*px); if (rr < mr){ mr = rr; mt = t; }
    if (d < .001*t){ hit = true; break; } t += d; if (t > 16.) break; }
  vec3 L = normalize(vec3(cos(uAz)*cos(uEl), sin(uEl), sin(uAz)*cos(uEl)));
  float sky = 0.93;
  float col = sky;
  if (hit){
    vec3 p = ro + rd*t, n = nrm(p);
    bool isObj = obj(p) < p.y + 1. - 1e-4;
    // AA: if the ray just grazed an object, shade the closest-approach point with partial coverage
    float sh = shadow(p + n*.003, L, uK);
    float oc = mix(1., ao(p, n), uAO);
    float alb = isObj ? 0.84 : 0.80;
    float dif = max(dot(n, L), 0.)*sh;
    float amb = (0.55 + 0.45*n.y)*oc;
    float bounce = clamp(-n.y, 0., 1.)*0.25*oc;
    float ex = min(1.12, 0.95/(0.8*(0.95*max(L.y, 0.1) + 0.42)));
    float lit = ex*alb*(0.95*dif + 0.42*amb + bounce);
    if (vUv.x < uSplit) lit = 0.97*oc;                 // AO-only pass
    col = lit;
    col = mix(col, sky, smoothstep(7., 13., t));        // seamless white sweep
    if (!isObj && mr < 1.){ vec3 pc = ro + rd*mt; vec3 nc = nrm(pc);
      float l2 = min(1.12, 0.95/(0.8*(0.95*max(L.y, 0.1) + 0.42)))*0.86*(0.95*max(dot(nc, L), 0.) + 0.42*(0.55 + 0.45*nc.y));
      if (vUv.x < uSplit) l2 = 0.97*mix(1., ao(pc, nc), uAO);
      col = mix(l2, col, clamp(mr, 0., 1.)); }
  }
  col = col*1.12/(1. + 0.12*col);
  col = pow(clamp(col, 0., 1.), 1./2.2);
  col *= 1. - 0.06*dot(uv, uv);
  col += (hash21(vUv*uRes + fract(uT*7.)*100.) - .5)*0.025;
  o = vec4(vec3(col), 1.);
}`;
/* schedule (bars): k 64 → 16 → 4, AO on at 12, split view 12–15, payoff sweep 15–20 */
function kAt(t) {
  const io = E.inOutCubic;
  if (t < 4) return 64;
  if (t < 8) return lerp(64, 16, ease(io, 3.8, 4.4, t));
  if (t < 12) return lerp(16, 4, ease(io, 7.8, 8.4, t));
  return lerp(4, 12, ease(io, 11.8, 12.4, t));
}
let prog;
const BOARD = t => t < 4 ? ['k = 64', '硬陰影：邊緣像刀切'] : t < 8 ? ['k = 16', '半影出現：離接觸點越遠越柔'] : t < 12 ? ['k = 4', '大面光源：陰影化成一片霧'] : t < 15 ? ['AO', '左：環境光遮蔽單獨一層'] : ['k = 12 · AO', '太陽壓低橫掃，影子拉長跟著轉'];
M.def({
  id: 'e34', num: 34, ch: 5, title: '柔和陰影與環境光遮蔽', en: 'SOFT SHADOWS & AO', dur: 20, ground: 'light',
  prompt: '白色無縫背景上放白色霧面物體：球、方柱、圓環、細桿、懸浮小球。太陽繞場景移動；陰影柔度 k 每 4 秒從 64、16 到 4，標出數值；再用左右分割畫面單獨顯示 AO；最後太陽壓低、橫掃過場景，高調白棚攝影質感。',
  how: ['陰影射線朝太陽步進，取 min(k·h/t) 當半影', 'k 越小半影越寬；離接觸點越遠影子越柔', 'AO：沿法線取 5 點，比較距離場算遮蔽程度'],
  practice: '把太陽高度降到 5°，觀察影子拉長與變柔。',
  cues: [{ t: 0.1, type: 'whoosh', dur: 0.5, v: 0.3 }, { t: 4, type: 'tick' }, { t: 8, type: 'tick' }, { t: 12, type: 'pop' }, { t: 15, type: 'bell', i: 4, v: 0.4, dec: 3 }],
  init() { prog = G.prog(FS34); },
  frame(ctx, t) {
    const k = kAt(t), ao = ease(E.inOutCubic, 11.8, 12.3, t);
    const sp = t >= 12 && t < 15 ? ease(E.outCubic, 12, 12.6, t) * (1 - ease(E.inCubic, 14.4, 15, t)) * 0.5 : 0;
    // sun: slow azimuth drift, then a low sweep in the payoff
    const az = -2.2 + Math.min(t, 15) * 0.14 - ease(E.inOutSine, 15, 20, t) * 2.5;
    const el = lerp(0.85, 0.42, ease(E.inOutSine, 14.5, 17, t));
    G.size(0.6);
    G.draw(prog, { uT: t, uK: k, uAO: ao, uSplit: sp, uAz: az, uEl: el });
    G.blit(ctx);
    // --- overlay (ink is black on the light ground) ---
    const [big, zh] = BOARD(t), la = Math.min(1, ...[4, 8, 12, 15].map(b => clamp(Math.abs(t - b) / 0.2))) * ease(E.outCubic, 0.1, 0.5, t);
    text(ctx, big, 48, 86, { size: 36, family: F.mono, weight: 500, alpha: la });
    text(ctx, zh, 48, 130, { size: 26, family: F.tc, color: g(.3), alpha: la });
    if (sp > 0.01) {
      const x = SW * sp;
      ctx.fillStyle = fg(0.85); ctx.fillRect(x - 1, 0, 2, SH);
      text(ctx, 'AO ONLY', x - 20, SH - 120, { size: 20, family: F.mono, weight: 500, align: 'right', alpha: sp * 2 });
      text(ctx, 'BEAUTY', x + 20, SH - 120, { size: 20, family: F.mono, weight: 500, alpha: sp * 2 });
    }
    // sun dial (top-right): azimuth on a ring, elevation as a radius
    const cx = SW - 130, cy = 130, R = 76;
    ctx.save(); ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, TAU); ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]);
    const rr = R * (1 - el / (Math.PI / 2)), sx = cx + Math.cos(az) * rr, sy = cy + Math.sin(az) * rr;
    ctx.strokeStyle = fg(0.8); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(sx, sy, 9, 0, TAU); ctx.fill();
    ctx.restore();
    text(ctx, `SUN  el ${(el * 180 / Math.PI).toFixed(0)}°`, cx, cy + R + 34, { size: 19, family: F.mono, align: 'center', color: g(.3) });
    // readouts (bottom)
    const y = SH - 52;
    text(ctx, `penumbra k  ${k.toFixed(1).padStart(4)}`, 48, y, { size: 22, family: F.mono, weight: 500 });
    // k bar: log scale 2..64
    const bx = 48, bw = 300, f = clamp(Math.log(k / 2) / Math.log(32));
    ctx.fillStyle = fg(0.2); ctx.fillRect(bx, y + 16, bw, 3); ctx.fillStyle = fg(1); ctx.fillRect(bx, y + 16, bw * f, 3);
    text(ctx, `AO ${ao > 0.5 ? 'ON ' : 'OFF'}`, SW - 48, y, { size: 22, family: F.mono, weight: 500, align: 'right' });
  },
});
