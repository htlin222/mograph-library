/* 04 黏土 3D — a flat 2D disc inflates (z-scale 0→1, lighting weight 0→1) into a ray-marched clay ball,
   which splits into three blobs (smooth-min, k animated) that hop and stack into a settled cairn.
   Shading: warm key + cool fill + rim, penumbra soft shadows (k=10), 5-tap AO, fingerprint displacement. */
const lin = h => hex(h).map(v => Math.pow(v / 255, 2.2));
const BG = '#e6d9c6', C0 = '#c25a38', C1 = '#e9a37c', C2 = '#3a54ad';
const FOC = 2.4;

const FS = `
in vec2 vUv; out vec4 o; uniform vec2 uRes;
uniform vec3 uRo, uTa; uniform float uF;
uniform vec4 uB0, uB1, uB2; uniform vec3 uSq;
uniform float uZ, uL, uK, uRev, uT;
uniform vec3 uC0, uC1, uC2, uBg, uBgs, uC0s;

float sdEll(vec3 p, vec3 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.)/max(k1,1e-4); }
float blob(vec3 p, vec4 b, float sq){
  if(b.w<.002) return 1e3;
  float s=1.+sq; vec3 r=b.w*vec3(sqrt(s),1./s,sqrt(s)); r.z*=uZ;
  return sdEll(p-b.xyz, r);
}
vec3 dists(vec3 p){ return vec3(blob(p,uB0,uSq.x), blob(p,uB1,uSq.y), blob(p,uB2,uSq.z)); }
float print1(vec3 q, vec3 c, float f){
  vec3 d=q-c; float r=length(d);
  float w=vnoise(q*4.+c*7.)*2.2;
  return sin(r*f+w)*exp(-r*r*7.);
}
float disp1(vec3 p, vec4 b){
  vec3 q=(p-b.xyz)/max(b.w,.1);
  float fp=print1(q,vec3(-.45,.55,.7),150.)+print1(q,vec3(.6,.25,.75),130.)+print1(q,vec3(.1,.9,-.4),140.)+.7*print1(q,vec3(-.2,-.1,.98),120.);
  return fp*.0011 + (vnoise(q*7.)-.5)*.012;
}
float disp(vec3 p, vec3 d){
  // fingerprints pressed into each blob (in its own frame, so they ride with it), blended across the necks
  vec3 w=exp(-18.*max(d-min(d.x,min(d.y,d.z)),0.)); w*=step(.002,vec3(uB0.w,uB1.w,uB2.w)); w/=max(w.x+w.y+w.z,1e-4);
  float r=0.;
  if(w.x>.01) r+=w.x*disp1(p,uB0);
  if(w.y>.01) r+=w.y*disp1(p,uB1);
  if(w.z>.01) r+=w.z*disp1(p,uB2);
  return (r+(vnoise(p*29.)-.5)*.003)*uL;
}
float map(vec3 p){
  vec3 d=dists(p);
  float k=max(uK,1e-4);
  return smin(smin(d.x,d.y,k),d.z,k)-.004*uL;
}
// detailed field (fingerprints + grit) only used for the final refine and normals
float mapD(vec3 p){
  vec3 d=dists(p);
  float k=max(uK,1e-4);
  return smin(smin(d.x,d.y,k),d.z,k)+disp(p,d);
}
vec3 nrm(vec3 p){
  const vec2 e=vec2(.0015,-.0015);
  return normalize(e.xyy*mapD(p+e.xyy)+e.yyx*mapD(p+e.yyx)+e.yxy*mapD(p+e.yxy)+e.xxx*mapD(p+e.xxx));
}
float shadow(vec3 ro, vec3 rd){
  float res=1., t=.02;
  for(int i=0;i<28;i++){
    float h=map(ro+rd*t);
    res=min(res,10.*h/t);
    t+=clamp(h,.03,.35);
    if(res<.002||t>7.) break;
  }
  res=clamp(res,0.,1.); return res*res*(3.-2.*res);
}
float ao(vec3 p, vec3 n){
  float occ=0., sc=1.;
  for(int i=0;i<5;i++){ float h=.02+.11*float(i); occ+=(h-map(p+n*h))*sc; sc*=.75; }
  return clamp(1.-2.2*occ,0.,1.);
}
vec3 tone(vec3 c){ return 1.-exp(-c*1.05); }

void main(){
  vec2 p=(gl_FragCoord.xy*2.-uRes)/uRes.y;
  vec3 cw=normalize(uTa-uRo), cu=normalize(cross(cw,vec3(0,1,0))), cv=cross(cu,cw);
  vec3 rd=normalize(p.x*cu+p.y*cv+uF*cw), ro=uRo;
  vec3 kD=normalize(vec3(-.62,.95,.55)), fD=normalize(vec3(.85,.25,.45)), rD=normalize(vec3(.35,.45,-1.));
  vec3 kC=vec3(1.,.83,.66)*2.35, fC=vec3(.55,.68,.95)*.55, rC=vec3(1.,.92,.82)*.9;

  float tG = rd.y<0. ? -ro.y/rd.y : 1e4;
  float t=.5, hit=0.;
  float tMax=min(tG,22.);
  float px=2./uRes.y/uF, cov=0., tc=0.;
  for(int i=0;i<80;i++){
    float d=map(ro+rd*t);
    if(d<.0008*t){ hit=1.; break; }
    float cv=clamp(.5-d/(px*t)*.85,0.,1.); if(cv>cov){ cov=cv; tc=t; }
    t+=d*.95;
    if(t>tMax) break;
  }
  float tHit=t;
  // backdrop: cyclorama gradient (flat oat in 2D mode)
  vec3 bgFlat=uBgs;
  vec3 bgLit=uBg*(1.02+.08*p.y)*(1.-.10*dot(p*vec2(1.,.6),p*vec2(1.,.6)));
  vec3 lit, flt=bgFlat;
  float aFlat=0.;
  vec3 sc=vec3(0); float aS=hit>.5?1.:cov;
  if(aS>0.){
    float ts=hit>.5?tHit:tc;
    if(hit>.5){ for(int j=0;j<4;j++) ts+=mapD(ro+rd*ts)*.8; }
    vec3 pos=ro+rd*ts, n=nrm(pos);
    vec3 d=dists(pos);
    vec3 w=exp(-14.*max(d,0.)); w.y*=uRev; w.z*=uRev; w/=(w.x+w.y+w.z);
    vec3 alb=uC0*w.x+uC1*w.y+uC2*w.z;
    float sh=shadow(pos+n*.01,kD), oc=ao(pos,n);
    float dk=dot(n,kD), wrap=clamp((dk+.3)/1.3,0.,1.);
    vec3 sss=alb*alb*1.6*clamp((dk+.55)/1.55,0.,1.)*(1.-clamp(dk,0.,1.));   // warm light bleed at the terminator
    vec3 c=alb*kC*wrap*mix(.18,1.,sh) + sss*kC*.35*mix(.4,1.,sh);
    c+=alb*fC*clamp(dot(n,fD)*.5+.5,0.,1.)*oc;
    c+=alb*uBg*(.35+.25*n.y)*oc;                                // sky/bounce from the oat room
    c+=alb*vec3(.9,.6,.45)*.25*clamp(-n.y,0.,1.)*oc;              // ground bounce
    float fr=pow(1.-clamp(dot(n,-rd),0.,1.),3.);
    c+=rC*fr*.55*oc*clamp(dot(n,rD)*.5+.6,0.,1.);                 // rim
    vec3 h=normalize(kD-rd); c+=kC*.06*pow(clamp(dot(n,h),0.,1.),22.)*sh*(.3+.7*fr+.3);
    sc=toSRGB(tone(c));
  }
  if(hit>.5){ lit=sc; }
  else if(tG<22.){
    vec3 pos=ro+rd*tG; vec3 n=vec3(0,1,0);
    float sh=shadow(pos+n*.005,kD);
    float oc=1.; { float o2=0., sc=1.; for(int i=0;i<5;i++){ float hh=.03+.16*float(i); o2+=(hh-map(pos+n*hh))*sc; sc*=.7; } oc=clamp(1.-1.6*o2,0.,1.); }
    vec3 g=uBg*mix(vec3(.66,.6,.62),vec3(1.04,1.,.96),sh)*mix(.55,1.,oc);
    float fog=1.-exp(-max(tG-6.,0.)*.11);
    lit=toSRGB(mix(g,bgLit,fog));
  } else lit=toSRGB(bgLit);
  if(hit<.5) lit=mix(lit,sc,aS);
  flt=mix(bgFlat,uC0s,aS);
  vec3 col=mix(flt,lit,uL);
  o=vec4(col,1.);
}`;

/* ---- choreography (all analytic in t) ---- */
const hopC = (t, t0, t1, a, b, hgt) => { const u = clamp((t - t0) / (t1 - t0)); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + hgt * 4 * u * (1 - u), lerp(a[2], b[2], u)]; };
const land = (t, tl, A) => t < tl ? 0 : A * Math.exp(-(t - tl) * 7.5) * Math.sin((t - tl) * 21);
const antic = (t, t0, A) => A * smooth(t0 - 0.28, t0 - 0.02, t) * (t < t0 ? 1 : Math.exp(-(t - t0) * 30));
function rig(t) {
  // b0 — the original ball
  let r0 = lerp(1, 0.8, ease(E.outCubic, 2.1, 2.7, t));
  let sq0 = antic(t, 2.1, 0.2) - 0.14 * Math.sin(Math.PI * clamp((t - 2.1) / 0.3)) + land(t, 4.05, 0.07) + land(t, 4.75, 0.04);
  const ry0 = r0 / (1 + sq0);
  const b0 = [0, ry0, 0, r0];
  // b1 — splits right, then hops onto b0
  const r1 = 0.62 * ease(E.outCubic, 2.1, 2.55, t);
  const P1a = [1.15, 0.62, 0.35], P1b = [0, 1.52 + 0.62, 0];
  let c1, sq1;
  if (t < 3.4) {
    c1 = hopC(t, 2.1, 2.85, [0, 1, 0], P1a, 1.0);
    sq1 = (t < 2.85 ? -0.12 * Math.sin(Math.PI * clamp((t - 2.1) / 0.75)) : land(t, 2.85, 0.3)) + antic(t, 3.4, 0.22);
  } else {
    c1 = hopC(t, 3.4, 4.05, P1a, P1b, 0.9);
    sq1 = (t < 4.05 ? -0.14 * Math.sin(Math.PI * clamp((t - 3.4) / 0.65)) : land(t, 4.05, 0.3) + land(t, 4.75, 0.08)) + antic(t, 3.4, 0.22);
  }
  // b2 — splits left, then hops onto b1
  const r2 = 0.45 * ease(E.outCubic, 2.15, 2.6, t);
  const P2a = [-1.2, 0.45, 0.55], P2b = [0, P1b[1] + 0.62 - 0.08 + 0.45, 0];
  let c2, sq2;
  if (t < 4.1) {
    c2 = hopC(t, 2.15, 2.95, [0, 1, 0], P2a, 1.3);
    sq2 = (t < 2.95 ? -0.12 * Math.sin(Math.PI * clamp((t - 2.15) / 0.8)) : land(t, 2.95, 0.32)) + antic(t, 4.1, 0.24);
  } else {
    c2 = hopC(t, 4.1, 4.75, P2a, P2b, 0.8);
    sq2 = (t < 4.75 ? -0.14 * Math.sin(Math.PI * clamp((t - 4.1) / 0.65)) : land(t, 4.75, 0.34)) + antic(t, 4.1, 0.24);
  }
  // keep resting blobs' bottoms planted while they squash
  const plant = (c, r, sq, resting) => resting ? [c[0], c[1] - r + r / (1 + sq), c[2]] : c;
  const rest1 = (t >= 2.85 && t < 3.4) || t >= 4.05, rest2 = (t >= 2.95 && t < 4.1) || t >= 4.75;
  c1 = plant(c1, 0.62, sq1, rest1 || (t > 3.1 && t < 3.4));
  c2 = plant(c2, 0.45, sq2, rest2 || (t > 3.8 && t < 4.1));
  // smooth-min radius: fat while splitting (necks), tight fillet once settled
  const k = 0.55 * smooth(2.05, 2.2, t) * (1 - smooth(2.45, 3.0, t)) + 0.19 * smooth(2.6, 3.0, t);
  return { b0, b1: [...c1, r1], b2: [...c2, r2], sq: [sq0, sq1, sq2], k };
}
function cam(t) {
  const el = lerp(0, 0.34, ease(E.inOutCubic, 0.7, 2.6, t)) + 0.05 * ease(E.inOutSine, 3, 6, t);
  const az = 0.42 * ease(E.inOutSine, 0.8, 6.4, t) - 0.12 * ease(E.inOutSine, 0.8, 2.4, t);
  const ty = lerp(1, 1.62, ease(E.inOutCubic, 3.2, 5.2, t)) - 0.12 * ease(E.inOutSine, 1.0, 2.4, t) * (1 - ease(E.inOutCubic, 3.2, 5.2, t));
  const D = 9.2 + 1.3 * ease(E.inOutCubic, 3.0, 5.4, t);
  const ta = [0, ty, 0];
  return { ro: [ta[0] + D * Math.sin(az) * Math.cos(el), ta[1] + D * Math.sin(el), ta[2] + D * Math.cos(az) * Math.cos(el)], ta };
}

M.def({
  id: 's04', num: '04', title: '黏土 3D', en: 'CLAY 3D', dur: 6, hud: 'dark',
  tags: ['SDF ray marching · 2D → 3D 無縫', 'soft shadows k=10 · 5-tap AO', 'smooth-min 融合 k=0.55 → 0.19'],
  cues: [
    { t: 0.0, type: 'bell', i: 0, v: 0.5, dec: 1.4 },
    { t: 0.55, type: 'riser', t1: 1.9, v: 0.35 },
    { t: 2.1, type: 'impact', v: 0.6 },
    { t: 2.85, type: 'thud', v: 0.7 }, { t: 2.95, type: 'bell', i: 2, v: 0.45, pan: -0.4 },
    { t: 4.05, type: 'thud', v: 0.7 }, { t: 4.05, type: 'bell', i: 3, v: 0.5, pan: 0.3 },
    { t: 4.75, type: 'thud', v: 0.8 }, { t: 4.75, type: 'bell', i: 4, v: 0.6, dec: 2.6 },
  ],
  init() { this.pr = G.prog(FS); },
  frame(ctx, t, s) {
    const [gw, gh] = G.size(0.6);
    const R = rig(t), C = cam(t);
    // 2D entrance: the disc pops in with a spring (pure scale, still flat)
    const pop = spring(t + 0.02, 260, 17);
    const b0 = R.b0.slice(); b0[3] *= pop; b0[1] = t < 2 ? 1 : b0[1];
    const zs = 0.025 + 0.975 * ease(E.inOutCubic, 0.45, 1.8, t);
    const L = ease(E.inOutSine, 0.5, 1.85, t);
    G.draw(this.pr, {
      uRo: C.ro, uTa: C.ta, uF: FOC, uB0: b0, uB1: R.b1, uB2: R.b2, uSq: R.sq, uK: R.k,
      uZ: zs, uL: L, uRev: smooth(2.2, 2.9, t), uT: t,
      uC0: lin(C0), uC1: lin(C1), uC2: lin(C2), uBg: lin(BG), uBgs: hex(BG).map(v => v / 255), uC0s: hex(C0).map(v => v / 255),
    });
    G.blit(ctx);

    // design-tool chrome around the flat disc — dissolves as it gains depth
    const ui = (1 - smooth(0.6, 1.3, t)) * smooth(0.04, 0.2, t);
    if (ui > 0.01) {
      const r = FOC / 9.2 * 960 * pop, cx = 540, cy = 960;
      ctx.save(); ctx.globalAlpha = ui;
      ctx.strokeStyle = '#2b4bff'; ctx.lineWidth = 2;
      ctx.strokeRect(cx - r, cy - r, 2 * r, 2 * r);
      ctx.fillStyle = '#f6f4ef';
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
        ctx.fillRect(cx + x * r - 7, cy + y * r - 7, 14, 14); ctx.strokeRect(cx + x * r - 7, cy + y * r - 7, 14, 14);
      }
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 14, cy); ctx.lineTo(cx + 14, cy); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy + 14); ctx.stroke();
      ctx.fillStyle = '#2b4bff'; ctx.fillRect(cx - 74, cy + r + 22, 148, 36);
      text(ctx, `${Math.round(2 * r)} × ${Math.round(2 * r)}`, cx, cy + r + 47, { size: 20, family: F.mono, weight: 500, color: '#f6f4ef', align: 'center' });
      ctx.restore();
    }
    // live readout of the parameters driving the shot
    const ra = smooth(0.3, 0.7, t) * (1 - smooth(5.55, 5.9, t));
    let line = `z-scale ${zs.toFixed(2)}   light ${(L * 100).toFixed(0).padStart(3)}%`;
    if (t > 2.0) line = `smin k ${R.k.toFixed(2)}   blobs ${R.b1[3] > 0.01 ? 3 : 1}`;
    if (t > 4.75) line = `settled   k ${R.k.toFixed(2)}`;
    text(ctx, line, 84, 1560, { size: 24, family: F.mono, weight: 500, color: 'rgba(30,24,20,.62)', alpha: ra, spacing: 1 });
    grain(ctx, 0.05, s.frame);
  },
});
