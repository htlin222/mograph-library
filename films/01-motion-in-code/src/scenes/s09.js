/* 09 二十萬粒子 — 200,000 GL points. Every particle's position is a pure function of (gl_VertexID, t),
   solved in the vertex shader each frame: dust → "5.5" (Canvas2D text mask, uploaded once) →
   (3,5) torus knot → stardust (radial burst + ABC-flow drift + twinkle). No per-frame CPU work. */
const N9 = 200000;
const BOOM = 4.0;
const VS9 = `#version 300 es
precision highp float; precision highp int;
layout(location=0) in vec2 aText;
uniform float uT, uBoom, uAsp;
uniform vec2 uRot; uniform float uDist, uScale;
out vec3 vCol; out float vA;
uint pcg(uint v){ uint s=v*747796405u+2891336453u; uint w=((s>>((s>>28u)+4u))^s)*277803737u; return (w>>22u)^w; }
float h1(uint id, uint k){ return float(pcg(id*7u+k))/4294967295.; }
vec3 sph(float a, float b){ float z=a*2.-1., r=sqrt(max(0.,1.-z*z)), p=b*6.2831853; return vec3(r*cos(p), r*sin(p), z); }
float eo(float x){ x=clamp(x,0.,1.); return 1.-pow(2.,-10.*x); }
float eio(float x){ x=clamp(x,0.,1.); return x<.5?4.*x*x*x:1.-pow(-2.*x+2.,3.)/2.; }
vec3 knot(float u, out vec3 T){
  float ph=u*6.2831853; const float p=3., q=5.;
  float r=cos(q*ph)+2.;
  vec3 c=vec3(r*cos(p*ph), r*sin(p*ph), -sin(q*ph))*.36;
  float dr=-q*sin(q*ph);
  T=normalize(vec3(dr*cos(p*ph)-r*p*sin(p*ph), dr*sin(p*ph)+r*p*cos(p*ph), -q*cos(q*ph)));
  return c;
}
vec3 abc(vec3 p){ return vec3(sin(1.7*p.z)+.8*cos(1.3*p.y), sin(1.3*p.x)+.8*cos(1.7*p.z), sin(1.5*p.y)+.8*cos(1.1*p.x)); }
void main(){
  uint id=uint(gl_VertexID);
  float u=float(gl_VertexID)/${N9}.;          // text samples are sorted by x, so u sweeps left → right
  float r0=h1(id,1u), r1=h1(id,2u), r2=h1(id,3u), r3=h1(id,4u), r4=h1(id,5u), r5=h1(id,6u);
  // 1 · dust → text
  vec3 txt=vec3(aText, (r2-.5)*.06);
  vec3 scat=sph(r0,r1)*(.9+1.9*pow(r3,.7));
  scat.xy=mat2(cos(uT*.8),-sin(uT*.8),sin(uT*.8),cos(uT*.8))*scat.xy;
  float a0=eo((uT+.12-r4*.45)/1.0);
  vec3 pos=mix(scat, txt, a0);
  // shimmer on the letters
  pos.z+=.025*sin(uT*3.+aText.x*4.+r1*6.28)*(1.-a0*.5);
  // 2 · text → torus knot (left-to-right wave, arcing through z)
  vec3 T; vec3 kc=knot(u+.0007*(r5-.5), T);
  vec3 B=normalize(cross(T, normalize(kc+vec3(0.,0.,.001)))); vec3 Nn=cross(B,T);
  float ang=r0*6.2831853, rad=.062*sqrt(r1)+.004;
  vec3 kp=kc+(Nn*cos(ang)+B*sin(ang))*rad;
  float m0=1.55+u*.9+r4*.18;
  float m=eio((uT-m0)/1.0);
  vec3 arc=normalize(vec3(sin(u*17.), cos(u*11.), sin(u*23.+1.)))*.55*sin(3.14159*m);
  pos=mix(pos, kp, m)+arc;
  // breathing / tightening before the burst
  float pre=smoothstep(BOOM_-.7, BOOM_, uT);
  pos*=1.-.12*pre*m;
  // 3 · stardust
  float e=max(uT-uBoom,0.);
  float on=step(uBoom,uT);
  vec3 dir=normalize(normalize(kp+1e-4)*.9+sph(r2,r3)*.45);
  float sp=.12+3.4*pow(r5,3.2);
  float k=1.5;
  vec3 burst=dir*sp*(1.-exp(-k*e))/k;
  vec3 q=kp*(1.-.12)+burst;
  vec3 drift=abc(q*1.4+r4)*.16*e*e*.5+abc(q*3.1)*.05*e;
  pos=mix(pos, q+drift, on);
  // camera
  vec3 p=pos;
  p.xz=mat2(cos(uRot.y),-sin(uRot.y),sin(uRot.y),cos(uRot.y))*p.xz;
  p.yz=mat2(cos(uRot.x),-sin(uRot.x),sin(uRot.x),cos(uRot.x))*p.yz;
  float zc=uDist-p.z;
  vec2 sc=p.xy*uScale/zc;                  // px from centre
  gl_Position=vec4(sc.x/540., sc.y/960., 0., 1.);
  if(zc<.15) gl_Position=vec4(9.,9.,0.,1.);
  float near=clamp(uDist/zc,.4,3.);
  // colour: cool-white core, violet in depth; stardust picks violet / cyan / amber
  float depth=clamp(.5-p.z*.6,0.,1.);
  vec3 core=mix(vec3(1.,1.,1.06), vec3(.48,.36,1.05), smoothstep(.15,.95,depth));
  core=mix(core, vec3(.62,.5,1.1), m*r1*.6);
  vec3 dust= r3<.34? vec3(.58,.38,1.25) : r3<.62? vec3(.2,.8,1.2) : r3<.82? vec3(1.35,.6,.18) : vec3(1.05,1.,.95);
  float dm=on*smoothstep(0.,1.,e*sp*.8+e*.3);
  vCol=mix(core, dust, dm);
  float tw=.55+.45*sin(uT*(5.+9.*r2)+r1*40.);
  tw=mix(1., tw*tw*1.5, on*smoothstep(.2,1.,e));
  float flash=on*exp(-e*7.)*1.4;
  vA=(.26+.08*r5)*tw*(1.+flash)*mix(1.,near*near*.9,dm)*mix(.75,1.,a0)*(1.25-.5*r1*m*(1.-on))*mix(1.25,.85,depth);
  float big=step(.996,r4)*on;   // a few brighter sparks
  gl_PointSize=clamp((1.7+1.3*r2*dm+big*3.)*sqrt(near),1.,7.);
  vA*=1.+big*2.;
}`;
const FS9 = `#version 300 es
precision highp float;
in vec3 vCol; in float vA; out vec4 o;
void main(){ vec2 d=gl_PointCoord-.5; float r=dot(d,d)*4.; float a=exp(-r*2.6)*smoothstep(1.,.6,r); o=vec4(vCol*vA*a,1.); }`;
const COMP9 = `in vec2 vUv; out vec4 o;
uniform sampler2D uAcc; uniform float uT, uBoom, uFade; uniform vec2 uRes;
void main(){
  vec2 uv=vUv, q=(uv-.5)*vec2(1.,1.777);
  // deep navy ground, slightly lifted around the subject
  vec3 bg=mix(vec3(.022,.028,.058), vec3(.005,.006,.014), smoothstep(.0,.95,length(q)));
  bg+=vec3(.05,.035,.11)*exp(-dot(q,q)*5.)*(.6+.4*smoothstep(uBoom,uBoom+1.,uT));
  vec3 acc=texture(uAcc,uv).rgb;
  // tiny halation: neighbours, cheap 4-tap
  vec2 px=1./uRes;
  vec3 hal=(texture(uAcc,uv+px*vec2(3,0)).rgb+texture(uAcc,uv-px*vec2(3,0)).rgb+texture(uAcc,uv+px*vec2(0,3)).rgb+texture(uAcc,uv-px*vec2(0,3)).rgb)*.25;
  acc+=hal*vec3(.35,.3,.5)*.5;
  vec3 c=bg+(vec3(1.)-exp(-acc*1.35));
  float e=uT-uBoom; c+=vec3(.55,.5,.75)*exp(-max(e,0.)*9.)*step(0.,e)*.18;
  c*=1.-.55*smoothstep(.55,1.15,length(q*vec2(1.1,.9)));
  c*=1.-.45*(smoothstep(.80,.97,uv.y)+smoothstep(.2,.06,uv.y));   // quiet HUD bands
  c*=uFade;
  o=vec4(c+(hash21(gl_FragCoord.xy+fract(uT)*91.)-.5)/255.,1.);
}`;

M.def({
  id: 's09', num: '09', title: '二十萬粒子', en: '200,000 PARTICLES', dur: 6, hud: 'light',
  tags: ['200,000 particles · gl_VertexID', '每一格位置皆在 GPU 上解析計算', '“5.5” → torus knot (p,q) → stardust'],
  cues: [{ t: BOOM, type: 'impact' }, { t: BOOM - 1.0, type: 'riser', t1: BOOM, v: 0.5 }],
  init() {
    const gl = G.gl;
    // text mask → 200k samples, sorted by x
    const cw = 1400, ch = 640, c = makeCanvas(cw, ch), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.font = '800 560px "Archivo"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const tw = g.measureText('5.5').width;
    g.fillText('5.5', cw / 2, ch / 2 + 200);
    const d = g.getImageData(0, 0, cw, ch).data, on = [];
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 128) { on.push(y * cw + x); minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const r = rng(909), pts = new Float32Array(N9 * 2), ord = new Uint32Array(N9), xs = new Float32Array(N9), ys = new Float32Array(N9);
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, sc = 2.45 / (maxx - minx);
    for (let i = 0; i < N9; i++) {
      const k = on[(r() * on.length) | 0];
      xs[i] = ((k % cw) + r() - cx) * sc; ys[i] = -(((k / cw) | 0) + r() - cy) * sc; ord[i] = i;
    }
    ord.sort((a, b) => xs[a] - xs[b]);
    for (let i = 0; i < N9; i++) { pts[i * 2] = xs[ord[i]]; pts[i * 2 + 1] = ys[ord[i]]; }
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    // particle program (custom VS)
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('s09 shader: ' + gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS9.replace(/BOOM_/g, BOOM.toFixed(2)))); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS9));
    gl.bindAttribLocation(p, 0, 'aText'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('s09 link: ' + gl.getProgramInfoLog(p));
    const locs = {}; this.pp = { p, loc: n => (n in locs) ? locs[n] : (locs[n] = gl.getUniformLocation(p, n)) };
    this.comp = G.prog(COMP9);
  },
  frame(ctx, t, s) {
    const gl = G.gl, [w, h] = G.size(1);
    if (!this.acc || this.acc.w !== w || this.acc.h !== h) this.acc = G.target(w, h, { float: true });
    // camera: gentle drift on the text, turning to show the knot's depth, then a push into the dust
    const ry = -0.22 + 0.10 * t + 0.55 * E.inOutCubic(clamp((t - 1.6) / 2.2)) + 0.25 * Math.max(0, t - BOOM);
    const rx = 0.10 * Math.sin(t * 0.7) + 0.55 * E.inOutCubic(clamp((t - 1.8) / 2.0)) - 0.1 * Math.max(0, t - BOOM);
    const dist = 4.2 - 0.25 * ease(E.outCubic, 0, 1.2, t) - 1.1 * ease(E.inOutSine, BOOM - 0.1, 6, t);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.acc.fb); gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.pp.p);
    G.set(this.pp, { uT: t, uBoom: BOOM, uRot: [rx, ry], uDist: dist, uScale: 1480 });
    gl.bindVertexArray(this.vao); gl.drawArrays(gl.POINTS, 0, N9); gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    G.draw(this.comp, { uAcc: this.acc, uT: t, uBoom: BOOM, uFade: 1 - 0.35 * ease(E.inCubic, 5.3, 6, t) });
    G.blit(ctx);
    grain(ctx, 0.04, s.frame);
  },
});
