/* 07 液態玻璃 — clear-glass metaballs over an in-shader background (mesh gradient + stripes + type).
   Per pixel: sphere-trace the glass, march through it to the exit, then for 7 wavelengths refract with a
   Cauchy IOR n(λ), hit the background plane and weight each sample by CIE 1931 x̄ȳz̄ → linear sRGB
   (normalised so white stays white). Fresnel reflection of a soft studio, rim highlights, inner shadow. */
const lin7 = h => hex(h).map(v => Math.pow(v / 255, 2.2));

const FS7 = `
in vec2 vUv; out vec4 o; uniform vec2 uRes;
uniform vec4 uS0, uS1, uS2, uS3; uniform vec4 uCap; uniform float uK, uT, uZs;
uniform sampler2D uType; uniform vec2 uTypeOff;
uniform vec3 cA, cB, cC, cD, cE;
const float ZB = -.32;   // background plane

// 2D field (screen units). Glass is a height field over it: a dome profile of edge radius RE.
float sd2(vec2 p, vec4 s){ return s.w<.003 ? 1e3 : length(p-s.xy)-s.w; }
float cap2(vec2 p){ if(uCap.w<.003) return 1e3; vec2 q=p-uCap.xy; q.x-=clamp(q.x,-uCap.z,uCap.z); return length(q)-uCap.w; }
float map2(vec2 p){
  float d=sd2(p,uS0);
  d=smin(d,sd2(p,uS1),uK); d=smin(d,sd2(p,uS2),uK); d=smin(d,sd2(p,uS3),uK); d=smin(d,cap2(p),uK);
  return d;
}
// ---- background, in the plane's own coordinates q (same frame as the screen: y −1..1)
vec3 bg(vec2 q){
  float a=uRes.x/uRes.y;
  vec2 u=q;
  vec3 c=mix(cA, cB, smoothstep(-1.1,1.1,u.y));
  vec2 m1=vec2(-.32+.06*sin(uT*.7), .38+.05*cos(uT*.5)), m2=vec2(.42, -.25+.08*sin(uT*.6)), m3=vec2(.05, -.85), m4=vec2(.45,.85);
  c+=cC*exp(-dot(u-m1,u-m1)*6.)*.55;
  c+=cD*exp(-dot(u-m2,u-m2)*5.)*.6;
  c+=cE*exp(-dot(u-m3,u-m3)*4.)*.35;
  c+=cD*.25*exp(-dot(u-m4,u-m4)*6.);
  // fine diagonal stripes
  float st=fract((u.x+u.y*.6)*34.+uT*.15);
  float sw=fwidth((u.x+u.y*.6)*34.)*1.2;
  float line=smoothstep(.5-sw,.5,st)-smoothstep(.5+.09,.5+.09+sw,st);
  c=mix(c, c*1.5+.02, line*.4);
  // typography
  vec2 tuv=vec2(u.x/(a*2.)+.5, u.y*.5+.5)+uTypeOff;
  vec4 ty=texture(uType, tuv);
  c=mix(c, vec3(.86,.84,.80), ty.a*.88);
  return c;
}
vec3 bgRay(vec3 p, vec3 d){
  float s=(ZB-p.z)/min(d.z,-.05);
  return bg(p.xy+d.xy*s);
}
vec3 env(vec3 r){
  // soft studio: overhead softbox + side strip + warm floor bounce
  float top=smoothstep(.2,.9,r.y)*smoothstep(-.95,-.2,r.z*0.+r.x*.3-0.);
  vec3 c=bg(r.xy*.6)*.7;
  c+=vec3(1.)*1.6*smoothstep(.55,.95,r.y)*smoothstep(.2,.7,r.z);
  c+=vec3(1.,.95,.9)*1.2*smoothstep(.8,.98,-r.x*.8+r.y*.6);
  c+=cC*.25*smoothstep(-.2,-.8,r.y);
  return c;
}
float ior(float l){ float um=l*.001; return 1.385+.0115/(um*um); }

void main(){
  vec2 p=(gl_FragCoord.xy*2.-uRes)/uRes.y;
  float px=2./uRes.y;
  float d=map2(p);
  // soft drop shadow (offset down-right) and a warm caustic focus inside it
  float sd=map2(p-vec2(.03,-.05));
  vec3 base=bg(p);
  base*=1.-.38*smoothstep(.14,-.05,sd);
  vec3 col=base;
  if(d<px){
    vec2 e=vec2(px*.75,0.);
    vec2 gd=vec2(map2(p+e.xy)-map2(p-e.xy), map2(p+e.yx)-map2(p-e.yx))/(2.*e.x);
    gd/=max(length(gd),1e-4);
    float RE=uZs;                       // edge radius of the dome
    float x=clamp(-d/RE,0.,1.);         // 0 at the rim → 1 on the plateau
    float u=1.-x;
    float h=RE*sqrt(max(1.-u*u,0.));    // circular profile
    float dh=u/max(sqrt(max(1.-u*u,0.)),.04);   // dh/d(-d)
    vec3 n=normalize(vec3(gd*dh,1.));
    float th=h*1.6+.004;                // glass thickness at this point
    float gap=.14;                      // air gap to the backdrop
    vec3 rd=vec3(0,0,-1);
    vec3 acc=vec3(0), wsum=vec3(0);
    for(int i=0;i<7;i++){
      float l=400.+50.*float(i);
      float ni=ior(l);
      vec3 a=refract(rd,n,1./ni);
      vec3 b=refract(a,vec3(0,0,1),ni);
      if(dot(b,b)<.01) b=vec3(-a.xy,a.z);
      vec2 q=p+a.xy/max(-a.z,.08)*th+b.xy/max(-b.z,.08)*gap;
      vec3 w=max(xyz2rgb(cieXYZ(l)),0.);
      acc+=w*bg(q); wsum+=w;
    }
    vec3 tr=acc/wsum;
    float edge=1.-n.z;
    // tint, inner shadow (opposite the light), slight lift on the plateau
    vec2 ld=normalize(vec2(-.62,.78));
    tr*=vec3(.97,.98,1.02);
    tr*=1.-.35*smoothstep(.0,.6,edge)*clamp(.5-.6*dot(gd,ld),0.,1.);
    tr+=.03*x;
    float F=.04+.96*pow(edge,5.);
    vec3 rf=env(reflect(rd,n));
    vec3 g=mix(tr,rf,clamp(F,0.,.85));
    // crisp edge highlights: bright sliver toward the light, fainter counter-rim
    float rimW=smoothstep(.0,-1.2*px,d)*smoothstep(-5.*px,-1.5*px,d);
    float rimL=pow(max(dot(gd,ld),0.),1.5), rimC=.45*pow(max(-dot(gd,ld),0.),2.);
    g+=vec3(1.,.98,.95)*(rimL+rimC)*rimW*1.1;
    g+=vec3(1.)*pow(max(dot(n,normalize(vec3(-.45,.6,.66))),0.),90.)*.9;
    float cov=clamp(.5-d/px,0.,1.);
    col=mix(base,g,cov);
  }
  // HUD bands
  col*=mix(1.,.5,smoothstep(.6,.95,p.y))*mix(1.,.55,smoothstep(-.62,-.9,p.y));
  col=aces(col*1.05);
  o=vec4(toSRGB(col),1.);
}`;

/* ---- choreography: positions in screen units (y −1..1, x −0.5625..0.5625) ---- */
const PILL = 3.0;
function rig7(t) {
  const mergeA = ease(E.inOutCubic, 0.0, 1.9, t);
  // four droplets swirl in from the edges and coalesce
  const S = [];
  const seeds = [[-0.48, 0.55, 0.15], [0.5, 0.35, 0.12], [-0.38, -0.5, 0.13], [0.42, -0.55, 0.17]];
  const hub = [0, 0.02];
  for (let i = 0; i < 4; i++) {
    const [sx, sy, r] = seeds[i];
    const ang = (1 - mergeA) * (1.1 + i * 0.15) * (i % 2 ? -1 : 1);
    const c = Math.cos(ang), s = Math.sin(ang);
    let x = (sx * c - sy * s) * (1 - mergeA) + hub[0] * mergeA, y = (sx * s + sy * c) * (1 - mergeA) + hub[1] * mergeA;
    // after merging the four cores wobble inside the mass
    const wob = smooth(1.5, 2.2, t) * (1 - smooth(PILL - 0.4, PILL + 0.2, t));
    x += wob * 0.09 * Math.sin(t * 5 + i * 1.7); y += wob * 0.07 * Math.cos(t * 4.3 + i * 2.3);
    S.push([x, y, 0, r]);
  }
  // pill forms: cores flatten onto a horizontal capsule
  const pf = ease(E.outBack, PILL - 0.5, PILL + 0.35, t);
  const pfc = clamp(pf, 0, 1.2);
  const glide = ease(E.inOutSine, PILL + 0.4, 6, t);
  const capY = lerp(0.02, -0.05, glide) + 0.012 * Math.sin(t * 2.2);
  const halfL = 0.26 * pfc, capR = 0.17 * clamp(pf * 1.4);
  // ending: a droplet buds off the right end and drifts up
  const bud = ease(E.inOutCubic, 4.4, 5.9, t);
  for (let i = 0; i < 4; i++) {
    const tx = -halfL + (2 * halfL) * (i / 3), sc = 1 - smooth(PILL - 0.4, PILL + 0.35, t);
    S[i][0] = lerp(S[i][0], tx, smooth(PILL - 0.5, PILL + 0.1, t));
    S[i][1] = lerp(S[i][1], capY, smooth(PILL - 0.5, PILL + 0.1, t));
    S[i][3] *= sc;
  }
  // last core becomes the bud
  S[3][3] = lerp(S[3][3], 0.095, smooth(4.2, 4.8, t));
  S[3][0] = lerp(S[3][0], 0.33, smooth(4.2, 4.9, t)) + 0.0 * bud;
  S[3][1] = lerp(S[3][1], capY, 1) + 0.36 * bud;
  S[3][0] += 0.03 * bud;
  const k = lerp(0.13, 0.09, smooth(PILL - 0.3, PILL + 0.3, t));
  return { S, cap: [0, capY, halfL, capR], k };
}

M.def({
  id: 's07', num: '07', title: '液態玻璃', en: 'LIQUID GLASS', dur: 6, hud: 'light',
  tags: ['SDF metaballs · smooth-min', 'refraction · Fresnel · 內陰影', '7 波長色散 (CIE 1931)'],
  cues: [
    { t: 1.75, type: 'bell', i: 1, v: 0.45, pan: -0.2, dec: 2.5 },
    { t: PILL, type: 'impact', v: 0.55 }, { t: PILL, type: 'bell', i: 3, v: 0.55, dec: 3 },
    { t: 5.0, type: 'bell', i: 4, v: 0.4, pan: 0.4, dec: 2.2 },
  ],
  init() {
    this.pr = G.prog(FS7);
    // typographic layer (drawn once, sampled & refracted in-shader)
    const c = makeCanvas(1080, 1920), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    const rows = [['LIQUID', 1, 640], ['GLASS', 0, 870], ['液態玻璃', 1, 1110], ['GLASS', 0, 1350]];
    rows.forEach(([w, fill, y], i) => {
      if (/[A-Z]/.test(w)) { g.font = `900 250px ${F.latin}`; g.letterSpacing = '-6px'; } else { g.font = `900 200px ${F.tcBlack}`; g.letterSpacing = '6px'; }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (fill) g.fillText(w, 540, y);
      else { g.lineWidth = 3; g.strokeText(w, 540, y); }
    });
    g.font = `500 22px ${F.mono}`; g.letterSpacing = '5px'; g.textAlign = 'left';
    ['n(λ) = A + B/λ²', 'λ 400 → 700 nm', 'Fresnel · Schlick'].forEach((m, i) => g.fillText(m, 96, 755 + i * 240));
    g.textAlign = 'right'; ['7 samples', 'CIE 1931 x̄ȳz̄', 'k 0.13'].forEach((m, i) => g.fillText(m, 984, 755 + i * 240));
    this.type = G.texFrom(c);
  },
  frame(ctx, t, s) {
    G.size(0.6);
    const R = rig7(t);
    G.draw(this.pr, {
      uS0: R.S[0], uS1: R.S[1], uS2: R.S[2], uS3: R.S[3], uCap: R.cap, uK: R.k, uT: t, uZs: 0.11,
      uType: this.type, uTypeOff: [0, 0.006 * t],
      cA: lin7('#0a0d1c'), cB: lin7('#14102a'), cC: lin7('#ff5a3c'), cD: lin7('#3a6bff'), cE: lin7('#ffb000'),
    });
    G.blit(ctx);
    grain(ctx, 0.04, s.frame);
  },
});
