/* 52 像素排序 PIXEL SORTING — a GPU-rendered sunset (sun, clouds, three parallax ridges) at 360², read back,
   every column (or row) split into spans brighter than a threshold, each span sorted by luminance on the CPU,
   then composited on the GPU (wipe, threshold mask view, result). */
const N = 360;
const kf = (t, keys, fn = E.inOutCubic) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, ease(fn, a, b, t)); }
  return keys[keys.length - 1][1];
};
const THR = [[0, 0.62], [5, 0.62], [6, 0.82], [7, 0.82], [8, 0.36], [9, 0.5], [12, 0.5], [14, 0.45]];
const S = M.def({
  id: 'e52', num: 52, ch: 7, title: '像素排序', en: 'PIXEL SORTING', dur: 20, ground: 'light',
  prompt: '先算一張黑白夕陽：太陽、雲、三層山脊在視差移動。每一欄找出亮度高於閾值的連續像素段，把段內像素依亮度重新排序，讓天空像融化般往下流。展示閾值遮罩、閾值 0.36 到 0.82、改成橫向排序、反向排序，最後讓閾值跟著拍子呼吸。',
  how: ['基底 360² GPU 渲染後 readPixels 讀回', '每欄掃出亮度 > 閾值的連續段，段內 TypedArray.sort', '閾值越低段越長；換掃描方向 = 換流動方向'],
  practice: '改用「邊緣偵測」決定段落起訖，比較結果。',
  cues: [{ t: 0.2, type: 'riser', t1: 1.8 }, { t: 2, type: 'tick' }, { t: 5, type: 'tick' }, { t: 9, type: 'whoosh', dur: 0.6 }, { t: 12, type: 'glitch' }, { t: 14, type: 'impact', v: 0.5 }],
  init() {
    const gl = G.gl;
    this.base = G.prog(`in vec2 vUv; out vec4 o; uniform float uT;
      float n1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(hash11(i), hash11(i+1.), f); }
      float ridge(float x, float s){ return n1(x*s)*.55 + n1(x*s*2.1+3.)*.28 + n1(x*s*4.3+7.)*.12; }
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        float y = sp.y, x = sp.x;
        float sky = mix(.34, .62, smoothstep(40., 620., y));
        // clouds: bright, high-contrast masses with dark gaps
        float cl = fbm3(vec3(x*.0035 + uT*.05, y*.011, uT*.04)) + .25*fbm3(vec3(x*.02, y*.06, uT*.1));
        float cm = smoothstep(.5, .62, cl)*smoothstep(600., 200., y);
        sky = mix(sky, .7 + .3*smoothstep(.62,.8,cl), cm);
        // sun with retro cut lines in its lower half
        vec2 sc = vec2(560. + 120.*sin(uT*.21), 470. - 18.*uT*.5);
        float r = length(sp - sc), R = 170.;
        float sun = smoothstep(R+1.5, R-1.5, r);
        float cut = y > sc.y + 20. ? step(fract((y - sc.y)/34.), .32 + (y-sc.y)/R*.35) : 0.;
        float lum = mix(sky, 1., sun*(1.-cut));
        lum += .18*exp(-max(r-R,0.)/50.)*(1.-sun);
        // three ridges, near ones darker and faster (parallax)
        for(int i=0;i<3;i++){
          float fi = float(i);
          float h = 690. + fi*88. - 210.*ridge(x/1080. + uT*(.012 + fi*.022) + fi*4.1, 3. + fi*1.6);
          float tone = mix(.22, .03, fi/2.);
          float rimL = smoothstep(h+10., h, y)*(i==0 ? .75 : .35);
          lum = y > h ? tone + rimL : lum;
        }
        o = vec4(vec3(clamp(lum,0.,1.)),1.);
      }`);
    this.post = G.prog(`in vec2 vUv; out vec4 o;
      uniform sampler2D uB, uS; uniform float uWipe, uMask, uThr;
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        float b = texture(uB, vUv).r, s = texture(uS, vUv).r;
        float v = sp.x < uWipe ? s : b;
        if(uMask > 0.){
          float m = step(uThr, b);
          float hatch = step(.5, fract((sp.x + sp.y)/14.));
          float mv = m > .5 ? mix(.06, .3, hatch) : b*.55 + .45;
          v = mix(v, mv, uMask);
        }
        o = vec4(vec3(mix(.043, .949, v)),1.);
      }`);
    this.bt = G.target(N, N);
    this.st = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.st);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, N, N, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    this.px = new Uint8Array(N * N * 4); this.lum = new Uint8Array(N * N); this.line = new Uint8Array(N);
  },
  /* sort spans of pixels ≥ thr along columns (vertical, top→bottom) or rows (left→right). desc flips order. */
  sortPass(thr, vertical, desc) {
    const gl = G.gl, px = this.px, L = this.lum, line = this.line, T = Math.round(thr * 255);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bt.fb);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (let i = 0; i < N * N; i++) L[i] = px[i * 4];
    // GL rows are bottom-up: index(row r from top, col c) = (N-1-r)*N + c
    const idx = vertical ? (k, j) => (N - 1 - j) * N + k : (k, j) => (N - 1 - k) * N + j;
    for (let k = 0; k < N; k++) {
      for (let j = 0; j < N; j++) line[j] = L[idx(k, j)];
      let j = 0;
      while (j < N) {
        if (line[j] < T) { j++; continue; }
        let e = j; while (e < N && line[e] >= T) e++;
        const seg = line.subarray(j, e); seg.sort(); if (desc) seg.reverse();
        j = e;
      }
      for (let j2 = 0; j2 < N; j2++) L[idx(k, j2)] = line[j2];
    }
    gl.bindTexture(gl.TEXTURE_2D, this.st);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RED, gl.UNSIGNED_BYTE, L);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  },
  frame(ctx, t) {
    let thr = kf(t, THR);
    if (t >= 14) thr = 0.42 + 0.2 * Math.pow(1 - fract(t / BEAT), 3) * (Math.floor(t / BEAT) % 2 ? 0.6 : 1);
    const vertical = !(t >= 9 && t < 12);
    const desc = t >= 12 && t < 14;
    const wipe = lerp(0, 1080, ease(E.inOutCubic, 0.2, 1.8, t));
    const mask = t >= 2 && t < 5 ? ease(E.outCubic, 2, 2.3, t) * (1 - ease(E.inCubic, 4.7, 5, t)) : 0;
    G.size(1);
    G.draw(this.base, { uT: t }, this.bt);
    this.sortPass(thr, vertical, desc);
    G.draw(this.post, { uB: this.bt, uS: this.st, uWipe: wipe, uMask: mask, uThr: thr });
    G.blit(ctx);

    if (t < 2 && wipe > 2 && wipe < 1078) {
      ctx.fillStyle = fg(1); ctx.fillRect(wipe - 1.5, 0, 3, 1080);
      tagBox(ctx, '排序後', wipe - 16, 180, { size: 20, family: F.tc, align: 'right' });
      tagBox(ctx, '原圖', wipe + 16, 180, { size: 20, family: F.tc });
    }
    const head = t < 2 ? '直向排序 ↓' : t < 5 ? '遮罩：只有斜線區會被排序' : t < 9 ? '只改閾值 THRESHOLD' : t < 12 ? '橫向排序 →' : t < 14 ? '反向：亮在前 DESC' : '閾值跟著拍子呼吸';
    tagBox(ctx, head, 44, 74, { size: 30, family: F.tc, inv: true });
    tagBox(ctx, `${vertical ? '每一欄' : '每一列'} ${N} 條 · 段內依亮度${desc ? '由亮到暗' : '由暗到亮'}`, 44, 122, { size: 20, family: F.tc });
    // threshold slider
    const sx = 64, sw = 952, sy = 996;
    ctx.fillStyle = bg(0.92); ctx.fillRect(40, sy - 66, 1000, 100);
    const gr = ctx.createLinearGradient(sx, 0, sx + sw, 0); gr.addColorStop(0, g(0)); gr.addColorStop(1, g(1));
    ctx.fillStyle = gr; ctx.fillRect(sx, sy - 6, sw, 12);
    ctx.strokeStyle = fg(0.6); ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy - 6.5, sw, 12);
    // the sorted part of the range
    ctx.fillStyle = fg(1); ctx.fillRect(sx + sw * thr, sy + 10, sw * (1 - thr), 4);
    const kx = sx + sw * thr;
    ctx.fillStyle = fg(1); ctx.beginPath(); ctx.moveTo(kx, sy - 10); ctx.lineTo(kx - 10, sy - 26); ctx.lineTo(kx + 10, sy - 26); ctx.closePath(); ctx.fill();
    ctx.fillRect(kx - 1.5, sy - 10, 3, 24);
    text(ctx, `閾值 ${thr.toFixed(2)}`, clamp(kx, 120, 960), sy - 34, { size: 20, family: F.mono, align: 'center' });
    text(ctx, '暗', sx, sy - 34, { size: 18, family: F.tc, alpha: 0.6 });
    text(ctx, '亮', sx + sw, sy - 34, { size: 18, family: F.tc, align: 'right', alpha: 0.6 });
    text(ctx, '被排序的亮度範圍', sx + sw, sy + 32, { size: 18, family: F.tc, align: 'right', alpha: 0.7 });
  },
});

function tagBox(ctx, s, x, y, o) {
  const size = o.size || 20, a = o.a === undefined ? 1 : o.a;
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= a;
  font(ctx, size, o.family || F.mono, 500); ctx.letterSpacing = '2px';
  const w = ctx.measureText(s).width, pad = 10;
  const x0 = o.align === 'right' ? x - w - pad * 2 : x;
  ctx.fillStyle = o.inv ? fg(1) : bg(0.92); ctx.fillRect(x0, y - size * 1.02, w + pad * 2, size * 1.4);
  ctx.fillStyle = o.inv ? bg(1) : fg(1); ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x0 + pad, y);
  ctx.restore();
}
