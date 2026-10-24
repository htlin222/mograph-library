/* 11 著色器風格化 — one ray-marched SDF (a twisted square-section torus) rendered once per frame into a
   half-res target, then re-interpreted by five post-process styles that switch on the bar line
   (every 2 beats) with a wipe: Bayer 8×8 1-bit · 45° halftone · ASCII glyph atlas · pixel sort · riso. */
const SW = [1.0, 2.0, 3.0, 4.0, 5.0];          // switch times (2 beats apart); last one opens the split view
const WIPE = 0.28;
const NAMES = ['BAYER 8×8 · 1-BIT', 'HALFTONE · 45° AM SCREEN', 'ASCII · 16-GLYPH DENSITY RAMP', 'PIXEL SORT · COLUMN SPANS', 'RISOGRAPH · 3 INKS, MISREGISTERED'];
const SHORT = ['BAYER', 'HALFTONE', 'ASCII', 'PIXELSORT', 'RISO'];
const NG = 16;

const SDF11 = `in vec2 vUv; out vec4 o; uniform vec2 uRes; uniform float uT, uA, uB;
float map(vec3 p){
  p.xz*=rot(uA); p.yz*=rot(uB);
  float a=atan(p.z,p.x);
  vec2 q=vec2(length(p.xz)-1.0, p.y);
  q*=rot(a*1.5+uT*.9);
  vec2 b=abs(q)-vec2(.30,.30);
  float d=length(max(b,0.))+min(max(b.x,b.y),0.)-.07;
  // engraved grooves along the faces
  d+=.012*smoothstep(.6,1.,sin(a*48.))*step(.0,-d+.02);
  return d*.62;
}
vec3 nrm(vec3 p){ const vec2 e=vec2(.0015,-.0015);
  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx)); }
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*2.;
  uv.y-=.02;
  vec3 ro=vec3(0.,0.,5.3), rd=normalize(vec3(uv,-1.62));
  // background: cool graphite with a warm floor bloom under the object
  vec3 bg=mix(vec3(.030,.032,.038), vec3(.012,.013,.017), clamp(uv.y*.5+.5,0.,1.));
  bg+=vec3(.05,.045,.06)*exp(-dot(uv,uv)*1.2);
  float t=0., d=1.; bool hit=false;
  // bounding sphere skip
  float bs=-dot(ro,rd), bd=dot(ro,ro)-bs*bs;
  if(bd<1.6*1.6){
    t=max(bs-sqrt(1.6*1.6-bd),0.);
    for(int i=0;i<72;i++){ d=map(ro+rd*t); if(d<.0012){hit=true;break;} t+=d; if(t>7.) break; }
  }
  vec3 col=bg; float m=0.;
  if(hit){
    vec3 p=ro+rd*t, n=nrm(p);
    vec3 L=normalize(vec3(-.6,.75,.55)), V=-rd, Hh=normalize(L+V);
    float dif=clamp(dot(n,L),0.,1.);
    float ao=clamp(map(p+n*.12)/.12*.62+.38,0.,1.);
    float spec=pow(clamp(dot(n,Hh),0.,1.),48.);
    float rim=pow(1.-clamp(dot(n,V),0.,1.),3.);
    vec3 base=vec3(.78,.74,.70);
    col=base*(.06+.95*dif)*ao + vec3(1.)*spec*.9 + vec3(.35,.55,1.)*rim*.55*ao;
    col+=vec3(.25,.18,.12)*clamp(-n.y,0.,1.)*.25;   // floor bounce
    m=1.;
  }
  col=aces(col*1.15);
  o=vec4(toSRGB(col), m);
}`;

const POST11 = `in vec2 vUv; out vec4 o; uniform vec2 uRes;
uniform sampler2D uSrc, uAtlas; uniform float uT, uCur, uPrev, uWipe, uSplit;
float lum(vec3 c){ return clamp((dot(c, vec3(.299,.587,.114))-.2)/.8,0.,1.); }
vec4 src(vec2 fc){ return texture(uSrc, fc/uRes); }
float lumO(vec4 s){ return lum(s.rgb)*mix(.3,1.,s.a); }
float bayer8(ivec2 p){
  int x=p.x&7, y=p.y&7, v=0;
  int xr=x^y;
  // bit-interleave (x^y, y) reversed → classic 8×8 Bayer index
  v = ((xr&1)<<5)|((y&1)<<4)|((xr&2)<<2)|((y&2)<<1)|((xr&4)>>1)|((y&4)>>2);
  return (float(v)+.5)/64.;
}
const vec3 INK=vec3(.055,.06,.075), BONE=vec3(.94,.925,.89);
vec3 sDither(vec2 fc, float S){
  float px=3.*S; vec2 c=floor(fc/px);
  float l=lumO(src((c+.5)*px));
  l=pow(l,1.15)*1.08;
  return l>bayer8(ivec2(c)) ? BONE : vec3(.10,.11,.20);
}
vec3 sHalftone(vec2 fc, float S){
  float cell=17.*S;
  mat2 R=rot(.785398), Ri=rot(-.785398);
  vec2 r=R*fc;
  vec3 col=vec3(.07,.06,.065);
  // 4 nearest cells so big dots can overlap their neighbours
  for(int j=0;j<2;j++) for(int i=0;i<2;i++){
    vec2 cc=floor(r/cell-.5)+vec2(i,j);
    vec2 ctr=(cc+.5)*cell;
    float l=lumO(src(Ri*ctr));
    float rad=sqrt(clamp(l*1.1,0.,1.))*cell*.72;
    float dd=length(r-ctr);
    float a=smoothstep(rad+.8*S, rad-.8*S, dd);
    vec3 ink=mix(vec3(1.,.55,.18), vec3(1.,.9,.72), smoothstep(.55,.95,l));
    col=mix(col, ink, a);
  }
  return col;
}
vec3 sAscii(vec2 fc, float S){
  vec2 cs=vec2(13.,22.)*S;
  vec2 c=floor(fc/cs), f=fract(fc/cs);
  float l=lumO(src((c+.5)*cs));
  float gi=floor(clamp(pow(l,1.25)*1.05,0.,.999)*${NG}.);
  vec2 auv=vec2((gi+f.x)/${NG}., f.y);
  float g=texture(uAtlas, auv).r;
  vec3 ink=mix(vec3(.18,.85,.62), vec3(.92,1.,.95), smoothstep(.6,1.,l));
  return mix(vec3(.02,.04,.036), ink, g*(.5+.5*smoothstep(.0,.2,l))*1.15);
}
vec3 sSort(vec2 fc, float S){
  float th=.42+.08*sin(uT*2.1);
  vec4 s0=src(fc); float l0=lum(s0.rgb);
  vec3 base=s0.rgb*vec3(.55,.45,.6);
  if(l0<th) return base*.8;
  // walk up the column to the start of the bright span, average along the way (≈ sorted smear)
  vec3 acc=s0.rgb; float n=1., mx=l0; vec3 cmx=s0.rgb;
  float stepPx=5.*S;
  for(int k=1;k<56;k++){
    vec4 s=src(fc+vec2(0.,float(k)*stepPx));
    float l=lum(s.rgb); if(l<th) break;
    acc+=s.rgb; n+=1.; if(l>mx){mx=l; cmx=s.rgb;}
  }
  vec3 avg=acc/n;
  float f=clamp(n/40.,0.,1.);
  vec3 c=mix(cmx, avg, .55);
  // hot grade: span heads read amber, long tails cool to rose
  vec3 hot=mix(vec3(1.,.72,.38), vec3(1.,.38,.45), f);
  return c*hot*1.15 + vec3(.04,.02,.03);
}
vec3 sRiso(vec2 fc, float S){
  vec3 paper=vec3(.085,.08,.095);
  vec3 pink=vec3(1.,.28,.55), blue=vec3(.16,.38,1.), yel=vec3(1.,.85,.25);
  float grainA=hash21(floor(fc/(2.*S))), grainB=hash21(floor(fc/(2.*S))+17.3);
  float paperTex=vnoise(vec3(fc/(9.*S),1.))*.5+vnoise(vec3(fc/(3.*S),2.))*.5;
  vec4 a=src(fc+vec2(7.,-4.)*S), b=src(fc+vec2(-5.,6.)*S), c=src(fc+vec2(1.,-9.)*S);
  float la=lum(a.rgb), lb=lum(b.rgb), lc=lum(c.rgb);
  float cp=smoothstep(.25,.85,la);                     // pink: mid/highlights
  float cb=b.a*smoothstep(.75,.2,lb)*.85+(1.-b.a)*.1;  // blue: object shadows + a whisper of ground
  float cy=smoothstep(.75,.98,lc);                     // yellow: speculars
  float ip=step(grainA*.9+paperTex*.25, cp), ib=step(grainB*.9+paperTex*.25, cb), iy=step(hash21(fc*.7+3.)*.9+.1, cy);
  vec3 col=paper;
  col=1.-(1.-col)*(1.-pink*ip*.92);
  col=1.-(1.-col)*(1.-blue*ib*.8);
  col=1.-(1.-col)*(1.-yel*iy*.8);
  // overprint: where pink and blue overlap, the inks go purple-dark
  col=mix(col, vec3(.42,.16,.55), ip*ib*.55);
  return col*(.9+.12*paperTex);
}
vec3 styleAt(float i, vec2 fc, float S){
  if(i<-.5) return src(fc).rgb;
  if(i<.5) return sDither(fc,S);
  if(i<1.5) return sHalftone(fc,S);
  if(i<2.5) return sAscii(fc,S);
  if(i<3.5) return sSort(fc,S);
  return sRiso(fc,S);
}
void main(){
  vec2 fc=gl_FragCoord.xy; float S=uRes.x/1080.;
  float yTop=uRes.y-fc.y;                // px from top
  float st=yTop<uWipe ? uCur : uPrev;
  vec3 c;
  if(uSplit>.5 && yTop<uWipe){
    float band=floor(fc.x/(uRes.x/5.));
    c=styleAt(band, fc, S);
    float bx=fract(fc.x/(uRes.x/5.));
    c*=1.-.6*step(bx, 1.5/(uRes.x/5.))*step(.5,band);
  } else c=styleAt(st, fc, S);
  vec2 q=vUv-.5;
  c*=1.-.35*smoothstep(.45,.85,length(q*vec2(1.,1.6)));
  c*=1.-.45*smoothstep(.80,.96,vUv.y)-.35*smoothstep(.2,.06,vUv.y);
  o=vec4(c,1.);
}`;

M.def({
  id: 's11', num: '11', title: '著色器風格化', en: 'SHADER STYLIZATION', dur: 6, hud: 'light',
  tags: ['one SDF object → 5 post-process passes', 'Bayer dither · halftone · ASCII', 'pixel sort · risograph'],
  cues: SW.map(t => ({ t, type: 'tick' })),
  init() {
    this.pSdf = G.prog(SDF11);
    this.pPost = G.prog(POST11.replace(/\$\{NG\}/g, NG));
    // glyph atlas: measure ink density of candidate glyphs, keep NG spread across the ramp
    const cw = 26, ch = 44, cand = " .'`,:;-~_^\"=+<>!*ricoxzvsn7?%$&#@MW08B";
    const tc = makeCanvas(cw, ch), tg = tc.getContext('2d', { willReadFrequently: true });
    const dens = [...cand].map(chr => {
      tg.clearRect(0, 0, cw, ch); tg.fillStyle = '#fff'; tg.font = `500 36px ${F.mono}`; tg.textAlign = 'center'; tg.textBaseline = 'middle';
      tg.fillText(chr, cw / 2, ch / 2 + 2);
      const d = tg.getImageData(0, 0, cw, ch).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i];
      return { chr, s };
    }).sort((a, b) => a.s - b.s);
    const pick = [];
    for (let i = 0; i < NG; i++) { const tgt = dens[0].s + (dens[dens.length - 1].s - dens[0].s) * Math.pow(i / (NG - 1), 1.3); let best = null; for (const d of dens) if (!pick.includes(d) && (!best || Math.abs(d.s - tgt) < Math.abs(best.s - tgt))) best = d; pick.push(best); }
    pick.sort((a, b) => a.s - b.s);
    this.ramp = pick.map(p => p.chr).join('');
    const at = makeCanvas(cw * NG, ch), ag = at.getContext('2d');
    ag.fillStyle = '#000'; ag.fillRect(0, 0, at.width, ch);
    ag.fillStyle = '#fff'; ag.font = `500 36px ${F.mono}`; ag.textAlign = 'center'; ag.textBaseline = 'middle';
    pick.forEach((p, i) => ag.fillText(p.chr, i * cw + cw / 2, ch / 2 + 2));
    this.atlas = G.texFrom(at);
  },
  frame(ctx, t, s) {
    const [w, h] = G.size(1);
    const sw = Math.round(w / 2), sh = Math.round(h / 2);
    if (!this.src || this.src.w !== sw) this.src = G.target(sw, sh);
    const A = 0.55 * t + 0.4, B = 0.95 + 0.18 * Math.sin(t * 0.9);
    G.draw(this.pSdf, { uT: t, uA: A, uB: B }, this.src);
    // which style, which wipe
    let k = -1; for (let i = 0; i < SW.length; i++) if (t >= SW[i]) k = i;
    const t0 = k < 0 ? 0.04 : SW[k];
    const cur = k < 0 ? 0 : Math.min(k + 1, 4), prev = k < 0 ? -1 : k;
    const split = k === SW.length - 1;
    const wp = E.inOutCubic(clamp((t - t0) / WIPE));
    const wipeY = wp * H;
    G.draw(this.pPost, { uSrc: this.src, uAtlas: this.atlas, uT: t, uCur: cur, uPrev: prev, uWipe: wipeY * h / H, uSplit: split ? 1 : 0 });
    G.blit(ctx);
    // wipe line
    if (wp > 0 && wp < 1) {
      ctx.fillStyle = 'rgba(246,244,239,.9)'; ctx.fillRect(0, wipeY - 1, W, 2);
      ctx.fillStyle = 'rgba(246,244,239,.12)'; ctx.fillRect(0, wipeY - 18, W, 16);
    }
    // style label near the object
    const la = ease(E.outCubic, t0 + 0.05, t0 + 0.35, t);
    const ly = 1530;
    ctx.save();
    if (!split) {
      const name = NAMES[cur];
      ctx.globalAlpha = la;
      ctx.fillStyle = 'rgba(8,9,11,.72)';
      font(ctx, 24, F.mono, 500); const tw = ctx.measureText(name).width;
      ctx.fillRect(84, ly - 30, 96 + tw + 26, 44);
      text(ctx, `${String(cur + 1).padStart(2, '0')}/05`, 98, ly, { size: 24, family: F.mono, weight: 500, color: 'rgba(246,244,239,.55)' });
      text(ctx, name, 180, ly, { size: 24, family: F.mono, weight: 500, color: '#f6f4ef', spacing: 0 });
      // beat pips: the next switch is two beats away
      const bt = ((t - t0) / BEAT);
      for (let i = 0; i < 2; i++) { ctx.fillStyle = bt >= i ? '#f6f4ef' : 'rgba(246,244,239,.25)'; ctx.fillRect(84 + i * 18, ly + 28, 12, 4); }
    } else {
      ctx.globalAlpha = la;
      SHORT.forEach((n, i) => {
        const cx = (i + 0.5) * W / 5;
        ctx.fillStyle = 'rgba(8,9,11,.72)'; font(ctx, 19, F.mono, 500); const tw = ctx.measureText(n).width;
        ctx.fillRect(cx - tw / 2 - 9, ly - 24, tw + 18, 34);
        text(ctx, n, cx, ly, { size: 19, family: F.mono, weight: 500, color: '#f6f4ef', align: 'center' });
      });
    }
    if (cur === 2 && !split) text(ctx, `ramp  "${this.ramp}"`, 84, ly + 66, { size: 20, family: F.mono, color: 'rgba(246,244,239,.45)', alpha: la });
    ctx.restore();
    grain(ctx, 0.04, s.frame);
  },
});
