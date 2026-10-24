/* 08 光線步進 — sphere-traced flight through an infinite lattice (domain repetition) of iridescent struts
   and tori. Each hit is shaded with thin-film interference (Airy reflectance of a film of index n_f and
   thickness d on a dark substrate), evaluated at 16 wavelengths and integrated through CIE 1931 → sRGB. */
const FS8 = `
in vec2 vUv; out vec4 o; uniform vec2 uRes;
uniform float uZ, uRoll, uT, uFov, uDT;
const float CELL=2.6;

float sdRBox(vec3 p, vec3 b, float r){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r; }
vec2 map(vec3 p){
  // domain repetition: one object per cell (some cells empty); camera flies down a cell-corner channel
  vec3 id=floor(p/CELL+.5);
  vec3 q=p-CELL*id;
  float h=hash21(id.xy*1.7+id.z*7.13);
  float h2=hash21(id.yz*3.1+id.x*1.3);
  vec3 r=q; r.xz*=rot(uT*.7+h*6.28); r.xy*=rot(uT*.45+h2*6.28);
  float d;
  float s=.75+.35*h2;
  if(h>.62) d=sdRBox(r,vec3(.15)*s,.09*s);
  else if(h>.22) d=sdTorus(r.xzy,vec2(.3,.075)*s);
  else d=length(r)-.2*s;
  // hair-thin struts along x and y: the lattice itself
  float sx=length(q.yz)-.02, sy=length(q.xz)-.02;
  float st=min(sx,sy);
  float m=d<st?1.:0.;
  return vec2(min(min(d,st), CELL*.5), h+m*2.);
}
vec3 nrm(vec3 p){ const vec2 e=vec2(.0015,-.0015);
  return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x); }

// thin-film reflectance at wavelength l (nm): air | film n1, thickness d | substrate n2 (+ i k2)
float film(float l, float cosi, float d, float n1, float n2){
  float sini2=1.-cosi*cosi;
  float cost=sqrt(max(1.-sini2/(n1*n1),0.));
  float r12=(cosi-n1*cost)/(cosi+n1*cost);           // s-ish average (normal-incidence form w/ cos)
  float cos3=sqrt(max(1.-sini2/(n2*n2),0.));
  float r23=(n1*cost-n2*cos3)/(n1*cost+n2*cos3);
  float ph=4.*PI*n1*d*cost/l;
  float a=r12*r12+r23*r23+2.*r12*r23*cos(ph);
  float b=1.+r12*r12*r23*r23+2.*r12*r23*cos(ph);
  return a/b;
}
vec3 iridescence(float cosi, float d){
  vec3 acc=vec3(0), wn=vec3(0);
  for(int i=0;i<16;i++){
    float l=385.+22.*float(i);
    vec3 w=xyz2rgb(cieXYZ(l));
    acc+=w*film(l,cosi,d,1.38,2.2);
    wn+=w;
  }
  return max(acc/wn,0.);
}
vec3 env(vec3 R){
  // dark studio: soft overhead box, thin horizon strip, faint dome
  float g=smoothstep(-.4,1.,R.y);
  float sb=smoothstep(.55,.9,R.y);
  float strip=exp(-pow((R.y+.02)*10.,2.));
  float side=pow(clamp(abs(R.x),0.,1.),6.);
  return vec3(.16,.17,.24)*(.4+g)+vec3(1.)*1.9*sb+vec3(1.)*.7*strip+vec3(.6,.7,1.)*.45*side;
}
void main(){
  vec2 p=(gl_FragCoord.xy*2.-uRes)/uRes.y;
  p*=rot(uRoll);
  vec3 ro=vec3(CELL*.5+.12*sin(uT*.7), CELL*.5+.1*cos(uT*.5), -uZ);
  vec3 rd=normalize(vec3(p*uFov,-1.));
  rd.yz*=rot(.05*sin(uT*.4)); rd.xz*=rot(.06*sin(uT*.33));
  float t=.05; vec2 h=vec2(0); float hit=0.;
  for(int i=0;i<96;i++){
    h=map(ro+rd*t);
    if(h.x<.0006*t){ hit=1.; break; }
    t+=h.x*.9;
    if(t>40.) break;
  }
  vec3 fogC=vec3(.010,.011,.022);
  vec3 col=fogC;
  if(hit>.5){
    vec3 pos=ro+rd*t, n=nrm(pos);
    float cosi=clamp(dot(n,-rd),0.,1.);
        // film thickness (nm) drifts across the surface like a draining soap film
    float d=260.+480.*vnoise(pos*1.1+vec3(0,uT*.3,0))+70.*vnoise(pos*3.7);
    vec3 Rf=iridescence(cosi,d);
    vec3 R=reflect(rd,n);
    float isObj=step(1.5,h.y);
    col=Rf*env(R)*mix(.9,2.6,isObj);
    col+=vec3(.012,.013,.02)*(.5+.5*n.y);
    float ao=clamp(map(pos+n*.12).x/.12,0.,1.);
    col*=.4+.6*ao;
    col=mix(fogC,col,exp(-t*mix(.2,.11,isObj)));
  }
  // vanishing point bloom
  col+=vec3(.15,.2,.45)*.08*exp(-dot(p,p)*6.);
  col*=1.+uDT*.25*smoothstep(.4,1.3,length(p));
  col=aces(col*1.2);
  float v=(1.-.4*dot(p*vec2(.8,.6),p*vec2(.8,.6)));
  vec2 sp=(gl_FragCoord.xy*2.-uRes)/uRes.y;
  v*=mix(1.,.45,smoothstep(.55,.95,sp.y))*mix(1.,.5,smoothstep(-.55,-.85,sp.y));
  o=vec4(toSRGB(col*v),1.);
}`;
/* flight: z(t) with accelerating velocity, ends in a surge */
const vel = t => 1.2 + 2.2 * t * t / 6 + 14 * Math.pow(clamp((t - 4.4) / 1.6), 3);
const zAt = t => { let z = 0; const n = Math.max(1, Math.ceil(t * 60)); for (let i = 0; i < n; i++) z += vel((i + 0.5) * t / n) * t / n; return z; };

M.def({
  id: 's08', num: '08', title: '光線步進', en: 'RAY MARCHING', dur: 6, hud: 'light',
  tags: ['thin-film interference · 16 波長', 'domain repetition · 無限晶格', 'sphere tracing · 96 steps'],
  cues: [{ t: 3.6, type: 'riser', t1: 5.9, v: 0.6 }, { t: 0.0, type: 'bell', i: 2, v: 0.4, dec: 3 }],
  init() { this.pr = G.prog(FS8); },
  frame(ctx, t, s) {
    G.size(0.55);
    const z = zAt(t), v = vel(t);
    G.draw(this.pr, {
      uZ: z, uRoll: 0.12 * Math.sin(t * 0.6) + 0.5 * E.inCubic(clamp((t - 4.2) / 1.8)), uT: t,
      uFov: 0.62 - 0.12 * ease(E.inCubic, 4.4, 6, t), uDT: clamp((v - 1.2) / 10),
    });
    G.blit(ctx);
    // telemetry
    const a = smooth(0.2, 0.7, t) * (1 - smooth(5.6, 5.95, t));
    text(ctx, `z ${z.toFixed(2).padStart(7)}   v ${v.toFixed(2)} u/s   cell ${Math.floor(z / 2.6)}`, 84, 1560, { size: 24, family: F.mono, weight: 500, color: 'rgba(240,238,232,.6)', alpha: a, spacing: 1 });
    grain(ctx, 0.05, s.frame);
  },
});
