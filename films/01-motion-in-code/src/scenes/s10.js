/* 10 反應擴散 — Gray–Scott on a 512×910 grid, ping-pong render targets (half-float, or RGBA8 with
   16-bit packing when float targets are unavailable). Seeded by 「生長」 drawn with NotoTCBlack.
   Fixed-step: M.sim at 30 Hz, each step runs ITER iterations of a 9-point-Laplacian update. */
const GW = 512, GH = 910, HZ10 = 30;
const FEED = 0.0545, KILL = 0.062;
const iterAt = n => 16 + Math.min(16, n >> 2);       // speeds up as it spreads (deterministic in step index)
const PACKDEFS = pk => pk ? '#define PACKED 1\n' : '';
const IO10 = `
#ifdef PACKED
vec2 dec(vec4 c){ return vec2(c.r*255./256.+c.g/256., c.b*255./256.+c.a/256.); }
vec4 enc(vec2 v){ v=clamp(v,0.,.9999); vec2 hi=floor(v*256.)/256.; vec2 lo=fract(v*256.); return vec4(hi.x*256./255., lo.x, hi.y*256./255., lo.y); }
#else
vec2 dec(vec4 c){ return c.rg; }
vec4 enc(vec2 v){ return vec4(v,0.,1.); }
#endif
`;
const STEP10 = `in vec2 vUv; out vec4 o; uniform vec2 uRes;
uniform sampler2D uS; uniform float uF, uK, uTime;
__IO__
vec2 at(ivec2 p){ p=clamp(p, ivec2(0), ivec2(uRes)-1); return dec(texelFetch(uS,p,0)); }
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);
  vec2 c=at(p);
  vec2 l=-c
    +.2*(at(p+ivec2(1,0))+at(p-ivec2(1,0))+at(p+ivec2(0,1))+at(p-ivec2(0,1)))
    +.05*(at(p+ivec2(1,1))+at(p+ivec2(-1,1))+at(p+ivec2(1,-1))+at(p+ivec2(-1,-1)));
  // gentle spatial variation of f/k: corals in the middle, finer labyrinth toward the edges
  vec2 q=gl_FragCoord.xy/uRes;
  float n=vnoise(vec3(q*vec2(3.,5.3),1.7))-.5;
  float edge=smoothstep(.25,.62,length((q-.5)*vec2(1.,1.6)));
  float f=uF+.006*n-.0035*edge, k=uK+.0012*n+.0004*edge;
  float u=c.x, v=c.y, uvv=u*v*v;
  u+=1.0*l.x-uvv+f*(1.-u);
  v+=.5*l.y+uvv-(k+f)*v;
  o=enc(clamp(vec2(u,v),0.,1.));
}`;
const SEED10 = `in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform sampler2D uMask;
__IO__
void main(){
  float m=texture(uMask,vUv).r;
  float h=hash21(floor(gl_FragCoord.xy));
  float v=m>.5? .25+.25*h : 0.;
  float u=m>.5? .5 : 1.;
  o=enc(vec2(u,v));
}`;
const SHOW10 = `in vec2 vUv; out vec4 o; uniform vec2 uRes, uGrid;
uniform sampler2D uS, uMask; uniform float uT;
__IO__
float V(vec2 uv){
  vec2 g=uv*uGrid-.5; ivec2 i=ivec2(floor(g)); vec2 f=fract(g);
  ivec2 mx=ivec2(uGrid)-1;
  float a=dec(texelFetch(uS,clamp(i,ivec2(0),mx),0)).y, b=dec(texelFetch(uS,clamp(i+ivec2(1,0),ivec2(0),mx),0)).y;
  float c=dec(texelFetch(uS,clamp(i+ivec2(0,1),ivec2(0),mx),0)).y, d=dec(texelFetch(uS,clamp(i+ivec2(1,1),ivec2(0),mx),0)).y;
  f=f*f*(3.-2.*f);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
void main(){
  vec2 uv=vUv, px=1./uGrid;
  float v=V(uv);
  float vx=V(uv+vec2(px.x*.75,0.))-V(uv-vec2(px.x*.75,0.));
  float vy=V(uv+vec2(0.,px.y*.75))-V(uv-vec2(0.,px.y*.75));
  vec3 n=normalize(vec3(-vx*9.,-vy*9.,.35));
  vec3 L=normalize(vec3(-.55,.7,.6));
  float dif=clamp(dot(n,L),0.,1.), spec=pow(clamp(dot(reflect(-L,n),vec3(0,0,1)),0.,1.),24.);
  float s=smoothstep(.08,.36,v);
  // palette: abyssal teal ground → coral body → cream crest
  vec2 q=(uv-.5)*vec2(1.,1.777);
  vec3 ground=mix(vec3(.018,.085,.092), vec3(.006,.035,.045), smoothstep(0.,1.,length(q)));
  vec3 coral=mix(vec3(.80,.22,.16), vec3(1.,.47,.30), smoothstep(.25,.45,v));
  vec3 cream=vec3(1.,.90,.76);
  vec3 col=mix(ground, coral, s);
  col=mix(col, cream, smoothstep(.29,.43,v)*.55);
  // light: ground gets a soft shadow at the base of every ridge, ridges get emboss + gloss
  float sh=clamp(1.-(vx*-.55+vy*.7)*-6.,.55,1.25);
  col*=mix(sh*.9, .45+.85*dif, s);
  col+=spec*s*vec3(1.,.92,.82)*.35;
  // faint memory of the seed characters
  float m=texture(uMask,uv).r;
  col+=vec3(.9,.95,.9)*m*.05*(1.-s);
  col*=1.-.5*smoothstep(.5,1.15,length(q*vec2(1.15,.85)));
  col*=1.-.55*smoothstep(.79,.95,uv.y)-.4*smoothstep(.2,.06,uv.y);
  o=vec4(toSRGB(col*1.05)+(hash21(gl_FragCoord.xy+uT)-.5)/255.,1.);
}`;

M.def({
  id: 's10', num: '10', title: '反應擴散', en: 'REACTION–DIFFUSION', dur: 6, hud: 'light',
  tags: ['Gray–Scott · 512×910 grid', 'f = 0.0545  k = 0.062', '從「生長」兩字長出珊瑚紋理'],
  init() {
    const pk = !G.floatOK, io = PACKDEFS(pk) + IO10;
    this.pk = pk;
    this.pStep = G.prog(STEP10.replace('__IO__', io));
    this.pSeed = G.prog(SEED10.replace('__IO__', io));
    this.pShow = G.prog(SHOW10.replace('__IO__', io));
    this.A = G.target(GW, GH, { float: true, nearest: true });
    this.B = G.target(GW, GH, { float: true, nearest: true });
    // seed mask: 「生長」 stacked vertically, centred in the safe zone
    const c = makeCanvas(GW, GH), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, GW, GH);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${Math.round(GW * 0.56)}px ${F.tcBlack}`;
    g.fillText('生', GW / 2, GH * 0.37); g.fillText('長', GW / 2, GH * 0.64);
    this.mask = G.texFrom(c);
  },
  reset() {
    G.draw(this.pSeed, { uMask: this.mask }, this.A);
    this.cur = this.A; this.nxt = this.B;
    this.iterate(60);                          // a few frames of pre-roll so t=0 already moves
  },
  iterate(n) {
    for (let i = 0; i < n; i++) {
      G.draw(this.pStep, { uS: this.cur, uF: FEED, uK: KILL }, this.nxt);
      const tmp = this.cur; this.cur = this.nxt; this.nxt = tmp;
    }
  },
  frame(ctx, t, s) {
    G.size(1);
    // M.sim caps steps per call; loop so a cold jump to late t (stills) still reaches it exactly
    const step = (dt, n) => this.iterate(iterAt(n));
    do { M.sim(this, t, step, HZ10); } while (this.sim.t + 1 / HZ10 <= t + 1e-9);
    G.draw(this.pShow, { uS: this.cur, uMask: this.mask, uGrid: [GW, GH], uT: t });
    G.blit(ctx);
    grain(ctx, 0.04, s.frame);
  },
});
