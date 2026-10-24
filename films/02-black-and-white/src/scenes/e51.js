/* 51 ASCII — a ray-marched ringed planet rendered to 270², then re-drawn as characters: each cell samples one
   luminance, a LUT maps it to a glyph sorted by measured ink density, the glyph is fetched from an atlas. */
const RAMPS = [
  ' .:-=+*#%@',
  ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  '　、一二工王田回固國鬱',
  '|/-\\',
];
const GW = 40, GH = 64;            // atlas cell (px)
const kf = (t, keys, fn = E.inOutCubic) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, ease(fn, a, b, t)); }
  return keys[keys.length - 1][1];
};
const CELL = [[0, 30], [5, 30], [5.6, 16], [6.5, 16], [7.1, 44], [7.8, 30], [8, 22], [11, 22], [11.01, 34], [14, 34], [14.01, 20], [20, 20]];
const S = M.def({
  id: 'e51', num: 51, ch: 7, title: 'ASCII 字元畫', en: 'ASCII RENDERING', dur: 20, ground: 'dark',
  prompt: '把一顆帶環、有衛星繞行的 3D 行星即時轉成文字畫：畫面切成等寬字格，每格取一個亮度，換成依墨量排序的字元。依序示範：取樣馬賽克對照、字格 16 到 44 px、10 字與 70 字字階、中文筆畫字階，最後加上邊緣方向字 | / - \\。',
  how: ['init 時把每個字畫進圖集，量墨量後由疏到密排序', '每格取格心亮度 → 查表得字號 → 從圖集取字形', '邊緣：格間 Sobel 梯度夠大時改用 | / - \\ 四個方向字'],
  practice: '用你名字裡的字做字階，由少到多筆畫排列。',
  cues: [{ t: 0.1, type: 'glitch' }, { t: 2, type: 'tick' }, { t: 5, type: 'tick' }, { t: 8, type: 'pop' }, { t: 11, type: 'pop' }, { t: 14, type: 'impact', v: 0.5 }],
  init() {
    const gl = G.gl;
    // atlas: one row per ramp, glyphs sorted by measured coverage; LUT (256 × ramps) luminance → glyph index
    const maxN = Math.max(...RAMPS.map(r => [...r].length));
    const cv = makeCanvas(maxN * GW, RAMPS.length * GH), x = cv.getContext('2d'), sc = makeCanvas(GW * 2, GH), y = sc.getContext('2d', { willReadFrequently: true });
    const lut = new Uint8Array(256 * RAMPS.length * 4);
    this.sorted = [];
    RAMPS.forEach((r, ri) => {
      const chars = [...r], cjk = ri === 2;
      const fam = cjk ? F.tc : F.mono, sz = cjk ? 46 : 54;
      const measure = ch => {
        y.fillStyle = '#000'; y.fillRect(0, 0, GW * 2, GH);
        y.fillStyle = '#fff'; font(y, sz, fam, cjk ? 400 : 500); y.textAlign = 'center'; y.textBaseline = 'middle';
        y.fillText(ch, GW, GH / 2 + 2);
        const d = y.getImageData(0, 0, GW * 2, GH).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i];
        return s;
      };
      let list = chars.map(ch => ({ ch, d: measure(ch) }));
      if (ri < 3) list.sort((a, b) => a.d - b.d);
      this.sorted.push(list.map(q => q.ch).join(''));
      const dmax = list[list.length - 1].d || 1;
      list.forEach(q => q.n = q.d / dmax);
      for (let v = 0; v < 256; v++) {
        let best = 0, bd = 1e9;
        list.forEach((q, i) => { const e = Math.abs(q.n - v / 255); if (e < bd) { bd = e; best = i; } });
        lut[(ri * 256 + v) * 4] = best;
      }
      list.forEach((q, i) => {
        x.save(); x.beginPath(); x.rect(i * GW, ri * GH, GW, GH); x.clip();
        x.fillStyle = '#000'; x.fillRect(i * GW, ri * GH, GW, GH);
        x.fillStyle = '#fff'; font(x, sz, fam, cjk ? 400 : 500); x.textAlign = 'center'; x.textBaseline = 'middle';
        if (cjk) { x.translate(i * GW + GW / 2, ri * GH + GH / 2 + 2); x.scale(0.62, 1); x.fillText(q.ch, 0, 0); }
        else x.fillText(q.ch, i * GW + GW / 2, ri * GH + GH / 2 + 2);
        x.restore();
      });
    });
    this.atlas = G.texFrom(cv);
    this.atlasSize = [cv.width, cv.height];
    this.lut = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.lut);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, RAMPS.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.rampLen = RAMPS.map(r => [...r].length);

    this.base = G.prog(`in vec2 vUv; out vec4 o; uniform float uT;
      vec3 c1, c2, c3;
      float map(vec3 p){
        float d = length(p-c1)-.82;
        vec3 q = p; q.xy *= rot(.42 + .12*sin(uT*.6)); q.yz *= rot(-.38);
        q.xz *= rot(uT*.4);
        d = min(d, sdTorus(q, vec2(1.42, .1)));
        d = min(d, length(p-c2)-.24);
        return d;
      }
      vec3 nrm(vec3 p){ vec2 e=vec2(.003,0.); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }
      void main(){
        c1 = vec3(0., .05*sin(uT*1.2), 0.);
        c2 = vec3(1.62*cos(uT*.9), .5*sin(uT*.9)+.2, 1.25*sin(uT*.9));
        vec2 uv = vUv*2.-1.;
        vec3 ro = vec3(0,0,4.6), rd = normalize(vec3(uv*1.12, -2.3));
        float t = 0., col = 0.;
        for(int i=0;i<56;i++){ float d = map(ro+rd*t); if(d<.002||t>9.) break; t += d; }
        if(t<9.){
          vec3 p = ro+rd*t, n = nrm(p), L = normalize(vec3(-.5,.7,.6));
          float dif = max(dot(n,L),0.), spec = pow(max(dot(reflect(rd,n),L),0.), 30.);
          float rim = pow(1.-max(dot(n,-rd),0.), 2.5);
          col = .1 + .95*dif + .4*spec + .3*rim;
        }
        o = vec4(vec3(clamp(col,0.,1.)),1.);
      }`);
    this.post = G.prog(`in vec2 vUv; out vec4 o;
      uniform sampler2D uB, uAtlas, uLut; uniform vec2 uAtlasSize; uniform float uCell, uRamp, uSplit, uEdge, uAsp, uReveal;
      float lumAt(vec2 sp){ return texture(uB, vec2(sp.x, 1080.-sp.y)/1080.).r; }
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        vec2 cs = vec2(uCell*uAsp, uCell);
        vec2 off = mod(vec2(1080.)-cs*floor(1080./cs), cs)*.5;     // centre the grid
        vec2 cell = floor((sp-off)/cs), f = fract((sp-off)/cs);
        vec2 cc = off + (cell+.5)*cs;
        float l = lumAt(cc);
        float ramp = uRamp, gi;
        if(uEdge>.5){
          float gx = lumAt(cc+vec2(cs.x,0.)) - lumAt(cc-vec2(cs.x,0.));
          float gy = lumAt(cc+vec2(0.,cs.y)) - lumAt(cc-vec2(0.,cs.y));
          float gm = length(vec2(gx,gy));
          if(gm > .3 && l > .03){
            float a = atan(gy, gx);                         // gradient angle; edge runs perpendicular
            float k = mod(floor((a + PI/8.)/(PI/4.)), 4.);  // 0: horizontal grad → '|' edge
            ramp = 3.; gi = k;
          }
        }
        if(ramp < 2.9) gi = texelFetch(uLut, ivec2(int(clamp(l,0.,1.)*255.), int(ramp)), 0).r*255.;
        vec2 auv = vec2((gi + f.x)*${GW}., (ramp*${GH}.) + f.y*${GH}.) / uAtlasSize;
        float ink = texture(uAtlas, vec2(auv.x, 1.-auv.y)).r;
        float v = ink;
        // reveal: rows switch on top → bottom
        if(cc.y > uReveal) v = 0.;
        if(sp.x < uSplit){ v = l; vec2 e = min(f, 1.-f)*cs; if(min(e.x,e.y) < .8) v = mix(v, .5, .5); }
        o = vec4(vec3(mix(.043, .949, v)),1.);
      }`);
    this.bt = G.target(270, 270);
  },
  frame(ctx, t) {
    const cell = kf(t, CELL);
    const ramp = t < 8 ? 0 : t < 11 ? 1 : t < 14 ? 2 : 1;
    const edge = t >= 14 ? 1 : 0;
    let split = t >= 2 && t < 5 ? lerp(0, 540, ease(E.outExpo, 2, 2.6, t)) * (1 - ease(E.inOutCubic, 4.6, 5, t)) : 0;
    const asp = ramp === 2 ? 1 : 0.62;
    G.size(1);
    G.draw(this.base, { uT: t + 2 }, this.bt);
    G.draw(this.post, { uB: this.bt, uAtlas: this.atlas, uLut: this.lut, uAtlasSize: this.atlasSize, uCell: cell, uRamp: ramp, uSplit: split, uEdge: edge, uAsp: asp, uReveal: lerp(-40, 1200, ease(E.outCubic, 0, 0.9, t)) });
    G.blit(ctx);

    // labels
    const head = t < 2 ? '10 字字階' : t < 5 ? '取樣：每格只取一個亮度' : t < 8 ? '字格大小 CELL SIZE' : t < 11 ? '70 字字階' : t < 14 ? '中文筆畫字階' : '＋ 邊緣方向字';
    tagBox(ctx, head, 44, 74, { size: 30, family: F.tc, inv: true });
    const cols = Math.floor(1080 / (cell * asp)), rows = Math.floor(1080 / cell);
    tagBox(ctx, `字格 ${cell.toFixed(0)} px · ${cols}×${rows} = ${cols * rows} 字`, 44, 122, { size: 20 });
    if (split > 4) {
      ctx.fillStyle = fg(1); ctx.fillRect(split - 1.5, 0, 3, 960);
      tagBox(ctx, '亮度馬賽克', split - 16, 180, { size: 20, family: F.tc, align: 'right' });
      tagBox(ctx, '查表換字', split + 16, 180, { size: 20, family: F.tc });
    }
    // ramp strip
    const rs = this.sorted[ramp], chars = [...rs], n = chars.length;
    ctx.fillStyle = bg(0.94); ctx.fillRect(40, 958, 1000, 92);
    const x0 = 64, w = 952;
    const gr = ctx.createLinearGradient(x0, 0, x0 + w, 0); gr.addColorStop(0, g(0)); gr.addColorStop(1, g(1));
    ctx.fillStyle = gr; ctx.fillRect(x0, 1028, w, 8);
    const fs = n > 20 ? 18 : 34;
    chars.forEach((ch, i) => {
      const cx = x0 + (i + 0.5) * w / n;
      text(ctx, ch, cx, 1012, { size: ramp === 2 ? 34 : fs, family: ramp === 2 ? F.tc : F.mono, align: 'center', color: P });
    });
    if (edge) {
      const a = ease(E.outBack, 14, 14.5, t);
      ctx.save(); ctx.globalAlpha *= clamp(a);
      ctx.fillStyle = bg(0.94); ctx.fillRect(836, 44, 200, 112);
      ['|', '/', '-', '\\'].forEach((c, i) => {
        const cx = 868 + i * 46;
        text(ctx, c, cx, 138, { size: 44, family: F.mono, align: 'center', color: P });
      });
      text(ctx, 'Sobel 方向', 1020, 72, { size: 18, family: F.tc, align: 'right', alpha: 0.7 });
      ctx.restore();
    }
  },
});

function tagBox(ctx, s, x, y, o) {
  const size = o.size || 20, a = o.a === undefined ? 1 : o.a;
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= a;
  font(ctx, size, o.family || F.mono, 500); ctx.letterSpacing = '2px';
  const w = ctx.measureText(s).width, pad = 10;
  const x0 = o.align === 'right' ? x - w - pad * 2 : x;
  ctx.fillStyle = o.inv ? fg(1) : bg(0.9); ctx.fillRect(x0, y - size * 1.02, w + pad * 2, size * 1.4);
  ctx.fillStyle = o.inv ? bg(1) : fg(1); ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x0 + pad, y);
  ctx.restore();
}
