/* 49 遞色 DITHERING — one lit 3D scene (analytic spheres + a 0→1 ramp) rendered on the GPU, then reduced to
   1 bit: ordered Bayer 2/4/8 thresholds in a shader, Floyd–Steinberg error diffusion on a 180² CPU grid. */
const S = M.def({
  id: 'e49', num: 49, ch: 7, title: '遞色', en: 'DITHERING', dur: 20, ground: 'dark',
  prompt: '把旋轉光源照亮的 3D 球體場景壓成只有黑白兩色。分割線左邊原圖、右邊 1-bit，依序換 Bayer 2×2、4×4、8×8、Floyd–Steinberg，右上角畫出閾值矩陣，底部放 0→1 灰階條；最後四種切成四格並排對照。',
  how: ['基底：解析球體＋軟陰影先算成灰階 render target', '有序遞色：亮度 > Bayer 矩陣閾值才點亮，GPU 一次算完', '誤差擴散：CPU 逐格量化，誤差按 7/16 3/16 5/16 1/16 分給鄰格'],
  practice: '把 Bayer 換成藍噪聲閾值圖，比較紋理差異。',
  cues: [{ t: 0.1, type: 'whoosh', dur: 0.6 }, { t: 4, type: 'tick' }, { t: 7, type: 'tick' }, { t: 10, type: 'tick' }, { t: 14, type: 'impact', v: 0.5 }, { t: 18, type: 'pop' }],
  init() {
    const gl = G.gl;
    this.base = G.prog(`in vec2 vUv; out vec4 o; uniform float uT;
      vec2 sphI(vec3 ro, vec3 rd, vec4 s){ vec3 oc=ro-s.xyz; float b=dot(oc,rd), c=dot(oc,oc)-s.w*s.w, h=b*b-c; if(h<0.) return vec2(-1.); h=sqrt(h); return vec2(-b-h,-b+h); }
      float sphSh(vec3 ro, vec3 rd, vec4 s, float k){ vec3 oc=ro-s.xyz; float b=dot(oc,rd), c=dot(oc,oc)-s.w*s.w, h=b*b-c;
        float d=sqrt(max(0.,s.w*s.w-h))-s.w, t=-b-sqrt(max(h,0.)); return (t<0.)?1.:smoothstep(0.,1.,2.5*k*d/t); }
      float sphOcc(vec3 p, vec3 n, vec4 s){ vec3 r=s.xyz-p; float l=length(r); return clamp(dot(n,r)*(s.w*s.w)/(l*l*l),0.,1.); }
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        vec2 uv = vUv*2.-1.; uv.y -= .12;
        vec3 ro = vec3(0., .55, 5.2), ta = vec3(0., -.25, 0.);
        vec3 ww = normalize(ta-ro), uu = normalize(cross(ww, vec3(0,1,0))), vv = cross(uu, ww);
        vec3 rd = normalize(uv.x*uu + uv.y*vv + 2.3*ww);
        float a = uT*.9;
        vec4 A = vec4(0., 0., 0., 1.), B = vec4(1.85*cos(a), -.52, 1.85*sin(a), .48);
        float la = uT*.55 + 1.;
        vec3 L = normalize(vec3(1.4*cos(la), 1.25, 1.4*sin(la)+.5));
        float bgv = mix(.0, .035, smoothstep(-.2, 1., uv.y));
        float col = bgv, tmin = 1e9; vec3 pos, nor; int id = 0;
        vec2 hA = sphI(ro, rd, A); if(hA.x>0. && hA.x<tmin){ tmin=hA.x; id=1; }
        vec2 hB = sphI(ro, rd, B); if(hB.x>0. && hB.x<tmin){ tmin=hB.x; id=2; }
        float tp = (-1.-ro.y)/rd.y; if(tp>0. && tp<tmin){ tmin=tp; id=3; }
        if(id>0){
          pos = ro+rd*tmin;
          nor = id==1 ? (pos-A.xyz)/A.w : id==2 ? (pos-B.xyz)/B.w : vec3(0,1,0);
          float dif = max(dot(nor,L),0.);
          float sh = 1.;
          if(id!=1) sh *= sphSh(pos+nor*.001, L, A, 6.);
          if(id!=2) sh *= sphSh(pos+nor*.001, L, B, 6.);
          float ao = 1.;
          if(id!=1) ao -= sphOcc(pos, nor, A);
          if(id!=2) ao -= sphOcc(pos, nor, B);
          ao = clamp(ao, 0., 1.);
          vec3 h = normalize(L-rd);
          float spec = id<3 ? pow(max(dot(nor,h),0.), 50.)*.45 : 0.;
          float alb = id==3 ? .5 : .95;
          col = alb*(dif*sh*.95 + .03*ao*(.6+.4*nor.y)) + spec*sh;
          if(id==3){ col *= exp(-.11*dot(pos.xz-vec2(.3,.4),pos.xz-vec2(.3,.4))); }
          col = pow(clamp(col,0.,1.), 1./2.2);
        } else col = pow(bgv, 1./2.2)*.8;
        // calibration ramp 0→1 under the scene
        if(sp.y>942. && sp.y<990. && sp.x>60. && sp.x<1020.) col = (sp.x-60.)/960.;
        else if(sp.y>926.) col = 0.;
        o = vec4(vec3(col),1.);
      }`);
    this.dith = G.prog(`in vec2 vUv; out vec4 o;
      uniform sampler2D uHi, uLo, uFS; uniform float uN, uSplit, uMode, uQuad;
      float b2(vec2 a){ a=floor(a); return fract(dot(a, vec2(.5, a.y*.75))); }
      float b4(vec2 a){ return b2(.5*a)*.25 + b2(a); }
      float b8(vec2 a){ return b4(.5*a)*.25 + b2(a); }
      void main(){
        vec2 px = vUv*1080.;
        float cs = 1080./uN;
        vec2 cell = floor(px/cs);
        cell.y = uN-1.-floor((1080.-px.y)/cs);          // anchor the grid at the stage top
        float l = texelFetch(uLo, ivec2(clamp(cell,0.,uN-1.)), 0).r;
        float m = uMode;
        if(uQuad>.5) m = px.x<540. ? (px.y>540.?1.:3.) : (px.y>540.?2.:4.);
        float v;
        if(m>3.5) v = texelFetch(uFS, ivec2(clamp(cell,0.,uN-1.)), 0).r;
        else { float th = m<1.5 ? b2(cell)+.125 : m<2.5 ? b4(cell)+1./32. : b8(cell)+1./128.; v = step(th, l); }
        if(px.x < uSplit) v = texture(uHi, vUv).r;
        v = mix(.043, .949, v);
        o = vec4(vec3(v),1.);
      }`);
    this.hi = G.target(540, 540);
    this.lo = { 180: G.target(180, 180, { nearest: true }), 360: G.target(360, 360, { nearest: true }) };
    this.fsTex = {};
    for (const n of [180, 360]) {
      const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, n, n, 0, gl.RED, gl.UNSIGNED_BYTE, null);
      this.fsTex[n] = tx;
    }
    this.px = new Uint8Array(360 * 360 * 4); this.err = new Float32Array(360 * 360); this.out = new Uint8Array(360 * 360);
  },
  /* Floyd–Steinberg, serpentine, top row first (GL row N-1 is the stage top) */
  floyd(n) {
    const gl = G.gl, src = this.px, e = this.err, out = this.out;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lo[n].fb);
    gl.readPixels(0, 0, n, n, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (let i = 0; i < n * n; i++) e[i] = src[i * 4] / 255;
    for (let r = n - 1, k = 0; r >= 0; r--, k++) {
      const ltr = (k & 1) === 0, dir = ltr ? 1 : -1;
      for (let c = ltr ? 0 : n - 1; ltr ? c < n : c >= 0; c += dir) {
        const i = r * n + c, v = e[i], q = v > 0.5 ? 1 : 0, er = v - q;
        out[i] = q * 255;
        const cn = c + dir;
        if (cn >= 0 && cn < n) e[i + dir] += er * 7 / 16;
        if (r > 0) {
          const d = i - n;
          if (c - dir >= 0 && c - dir < n) e[d - dir] += er * 3 / 16;
          e[d] += er * 5 / 16;
          if (cn >= 0 && cn < n) e[d + dir] += er * 1 / 16;
        }
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, this.fsTex[n]);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, n, gl.RED, gl.UNSIGNED_BYTE, out);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  },
  frame(ctx, t) {
    // phases: 0–4 Bayer2 · 4–7 Bayer4 · 7–10 Bayer8 · 10–14 Floyd–Steinberg · 14–18 quad compare · 18–20 FS at 3 px
    const mode = t < 4 ? 1 : t < 7 ? 2 : t < 10 ? 3 : 4;
    const quad = t >= 14 && t < 18;
    const n = t >= 18 ? 360 : 180;
    let split = 540 + 70 * Math.sin(t * 0.9);
    split = lerp(1080, split, ease(E.outExpo, 0, 1.2, t));
    if (t > 13) split = lerp(split, 0, ease(E.inOutCubic, 13, 14, t));
    G.size(1);
    G.draw(this.base, { uT: t }, this.hi);
    G.draw(this.base, { uT: t }, this.lo[n]);
    if (mode === 4 || quad) this.floyd(n);
    G.draw(this.dith, { uHi: this.hi, uLo: this.lo[n], uFS: this.fsTex[n], uN: n, uSplit: quad ? 0 : split, uMode: mode, uQuad: quad ? 1 : 0 });
    G.blit(ctx);

    const names = ['', 'BAYER 2×2', 'BAYER 4×4', 'BAYER 8×8', 'FLOYD–STEINBERG'];
    const subs = ['', '有序遞色 · 4 種閾值', '有序遞色 · 16 種閾值', '有序遞色 · 64 種閾值', '誤差擴散 · 逐格把誤差推給鄰居'];
    if (!quad) {
      // divider + side labels
      if (split > 2 && split < 1078) {
        ctx.fillStyle = fg(1); ctx.fillRect(split - 1.5, 0, 3, 926);
        tagBox(ctx, '原圖 256 階', split - 16, 70, { align: 'right' });
        tagBox(ctx, '1-BIT 2 階', split + 16, 70, {});
      }
      // method title (bottom-left above the ramp)
      const k = t < 4 ? t : t < 7 ? t - 4 : t < 10 ? t - 7 : t < 14 ? t - 10 : t - 18;
      const a = ease(E.outCubic, 0, 0.35, k);
      tagBox(ctx, names[mode], 44, 846 + (1 - a) * 16, { size: 30, inv: true, a });
      tagBox(ctx, t >= 18 ? '誤差擴散 · 格子 6 px → 3 px' : subs[mode], 44, 892, { size: 20, family: F.tc, a: 0.85 * a });
      if (t < 18) drawKernel(ctx, mode, 1040, 44, a);
    } else {
      ctx.fillStyle = fg(1); ctx.fillRect(538.5, 0, 3, 926); ctx.fillRect(0, 538.5, 1080, 3);
      const q = ease(E.outCubic, 14, 14.4, t);
      [['BAYER 2×2', 44, 70], ['BAYER 4×4', 584, 70], ['BAYER 8×8', 44, 610], ['FLOYD–STEINBERG', 584, 610]].forEach(([s, x, y], i) =>
        tagBox(ctx, s, x, y, { size: 22, inv: true, a: ease(E.outCubic, 14 + i * 0.25, 14.5 + i * 0.25, t) * q }));
    }
    // ramp labels
    ctx.fillStyle = fg(0.7); ctx.fillRect(60, 1000, 1, 10); ctx.fillRect(1019, 1000, 1, 10);
    text(ctx, '0.0', 60, 1036, { size: 18, family: F.mono, alpha: 0.7 });
    text(ctx, '灰階 RAMP — 用點的密度假裝灰色', 540, 1036, { size: 18, family: F.tc, align: 'center', alpha: 0.7 });
    text(ctx, '1.0', 1020, 1036, { size: 18, family: F.mono, align: 'right', alpha: 0.7 });
    tagBox(ctx, `${n}×${n} · ${1080 / n} px`, 1036, 892, { size: 18, align: 'right' });
  },
});

function tagBox(ctx, s, x, y, o) {
  const size = o.size || 20, a = o.a === undefined ? 1 : o.a;
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= a;
  font(ctx, size, o.family || F.mono, 500); ctx.letterSpacing = '2px';
  const w = ctx.measureText(s).width, pad = 10;
  const x0 = o.align === 'right' ? x - w - pad * 2 : x;
  ctx.fillStyle = o.inv ? fg(1) : bg(0.88); ctx.fillRect(x0, y - size * 1.02, w + pad * 2, size * 1.4);
  ctx.fillStyle = o.inv ? bg(1) : fg(1); ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x0 + pad, y);
  ctx.restore();
}

/* threshold matrix (Bayer) or diffusion kernel (FS), anchored at its top-right corner */
function drawKernel(ctx, mode, xr, y0, a) {
  ctx.save(); ctx.globalAlpha *= a;
  const box = 176, x0 = xr - box;
  ctx.fillStyle = bg(0.9); ctx.fillRect(x0 - 14, y0 - 14, box + 28, box + 62);
  if (mode < 4) {
    const nn = 1 << mode, c = box / nn;
    const b2 = (x, y) => { x = Math.floor(x); y = Math.floor(y); const v = 0.5 * x + 0.75 * y * y; return v - Math.floor(v); };
    const b4 = (x, y) => b2(x / 2, y / 2) * 0.25 + b2(x, y), b8 = (x, y) => b4(x / 2, y / 2) * 0.25 + b2(x, y);
    const f = mode === 1 ? b2 : mode === 2 ? b4 : b8;
    for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) {
      const v = f(i, j);
      ctx.fillStyle = g(0.08 + v * 0.9); ctx.fillRect(x0 + i * c + 1, y0 + j * c + 1, c - 2, c - 2);
      if (nn <= 4) text(ctx, String(Math.round(v * nn * nn)), x0 + i * c + c / 2, y0 + j * c + c / 2 + 8, { size: nn === 2 ? 30 : 22, family: F.mono, align: 'center', color: v > 0.5 ? K : P });
    }
    text(ctx, `閾值矩陣 ${nn}×${nn}`, xr, y0 + box + 34, { size: 18, family: F.tc, align: 'right', alpha: 0.8 });
  } else {
    const c = box / 3, yy = y0 + c * 0.5;
    const cells = [[1, 0, '●'], [2, 0, '7'], [0, 1, '3'], [1, 1, '5'], [2, 1, '1']];
    for (const [i, j, s] of cells) {
      ctx.strokeStyle = fg(0.8); ctx.lineWidth = 1.5; ctx.strokeRect(x0 + i * c + 2, yy + j * c + 2, c - 4, c - 4);
      if (s === '●') { ctx.fillStyle = fg(1); ctx.fillRect(x0 + i * c + 2, yy + j * c + 2, c - 4, c - 4); }
      else text(ctx, s + '/16', x0 + i * c + c / 2, yy + j * c + c / 2 + 7, { size: 19, family: F.mono, align: 'center' });
    }
    text(ctx, '誤差分配權重', xr, y0 + box + 34, { size: 18, family: F.tc, align: 'right', alpha: 0.8 });
  }
  ctx.restore();
}
