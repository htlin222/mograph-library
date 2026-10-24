/* 50 半色調 HALFTONE — a ray-marched torus rendered to a 360² target, then re-printed as ink on paper:
   AM dot screen (period + angle), line screen, AM vs FM (stochastic), and a ×4 loupe over a fine screen. */
const kf = (t, keys, fn = E.inOutCubic) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, ease(fn, a, b, t)); }
  return keys[keys.length - 1][1];
};
const PERIOD = [[0, 72], [1.1, 30], [2, 30], [2.8, 16], [4, 16], [4.8, 46], [5.6, 30], [9, 22], [12, 14], [14, 9], [20, 9]];
const ANGLE = [[0, 45], [6, 45], [6.6, 0], [7.4, 0], [8.0, 75], [8.6, 75], [9, 30], [12, -20], [12.01, 45], [20, 45]];
const MAG = 4;
const S = M.def({
  id: 'e50', num: 50, ch: 7, title: '半色調', en: 'HALFTONE', dur: 20, ground: 'light',
  prompt: '一個旋轉的 3D 甜甜圈用黑墨點印在白紙上。先把網點週期從 16 px 調到 46 px，再把網角轉 0°、75°、45°；接著換成線網，再並排比較 AM 調幅和 FM 調頻；最後用細網點加一個 4 倍放大鏡掃過畫面。',
  how: ['基底：SDF 光線步進甜甜圈先渲染成 360² 灰階', 'AM：座標旋轉 θ 切成格，取格心亮度，圓點面積 = 暗度', 'FM：3 px 格子用固定點大小，只用 IGN 雜訊閾值改密度'],
  practice: '把圓點換成方點或橢圓點，看暗部連網的位置。',
  cues: [{ t: 0.1, type: 'whoosh', dur: 0.8 }, { t: 2, type: 'tick' }, { t: 6, type: 'tick' }, { t: 9, type: 'pop' }, { t: 12, type: 'pop' }, { t: 14, type: 'impact', v: 0.5 }],
  init() {
    this.base = G.prog(`in vec2 vUv; out vec4 o; uniform float uT;
      float map(vec3 p){
        p.xy *= rot(uT*.35); p.yz *= rot(1.15 + .3*sin(uT*.6));
        float d = sdTorus(p, vec2(1.05, .42));
        return d;
      }
      vec3 nrm(vec3 p){ vec2 e=vec2(.002,0.); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }
      void main(){
        vec2 uv = vUv*2.-1.;
        vec3 ro = vec3(0,0,4.2), rd = normalize(vec3(uv, -2.1));
        float bgv = .995 - .1*smoothstep(.6, 1.7, length(uv - vec2(-.3,.4)));
        float col = bgv, t = 0.;
        for(int i=0;i<64;i++){ float d = map(ro+rd*t); if(d<.001||t>8.) break; t += d; }
        if(t<8.){
          vec3 p = ro+rd*t, n = nrm(p);
          vec3 L = normalize(vec3(-.6, .75, .5));
          float dif = max(dot(n,L),0.), rim = pow(1.-max(dot(n,-rd),0.), 3.);
          float spec = pow(max(dot(reflect(rd,n),L),0.), 24.);
          col = .1 + .85*dif + .3*spec + .1*rim;
          col = pow(clamp(col,0.,1.), 1./1.6);
        } else {
          // soft contact shadow on the paper behind
          float sh = smoothstep(1.7, .2, length(uv - vec2(.16,-.2)));
          col -= .15*sh;
        }
        o = vec4(vec3(col),1.);
      }`);
    this.post = G.prog(`in vec2 vUv; out vec4 o;
      uniform sampler2D uB; uniform float uP, uA, uMode, uSplit; uniform vec3 uLoupe;
      float dark(vec2 sp){ vec2 u = vec2(sp.x, 1080.-sp.y)/1080.; return 1.-texture(uB, u).r; }
      float ign(vec2 c){ return fract(52.9829189*fract(dot(c, vec2(.06711056,.00583715)))); }
      float am(vec2 sp, float P, float A, float aa){
        mat2 R = rot(A), Ri = rot(-A);
        vec2 q = R*sp, c0 = floor(q/P), f = q/P - c0, sg = vec2(f.x<.5?-1.:0., f.y<.5?-1.:0.);
        float ink = 0.;
        for(int j=0;j<=1;j++) for(int i=0;i<=1;i++){
          vec2 c = c0+sg+vec2(i,j)+.5, cs = Ri*(c*P);
          float d = dark(cs);
          float r = P*.71*sqrt(d);
          ink = max(ink, smoothstep(r+aa, r-aa, length(q-c*P)));
        }
        return ink;
      }
      float lines(vec2 sp, float P, float A, float aa){
        mat2 R = rot(A), Ri = rot(-A);
        vec2 q = R*sp; float c = (floor(q.y/P)+.5)*P;
        float d = dark(Ri*vec2(q.x, c));
        float hw = .5*P*d;
        return smoothstep(hw+aa, hw-aa, abs(q.y-c));
      }
      float fm(vec2 sp, float cs){ vec2 c = floor(sp/cs); return step(ign(c), dark((c+.5)*cs)); }
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        float aa = .75;
        vec2 p = sp;
        float inL = 0.;
        if(uLoupe.z>0.){ float dl = length(sp-uLoupe.xy); inL = step(dl, uLoupe.z); if(inL>.5){ p = uLoupe.xy + (sp-uLoupe.xy)/${MAG}.; aa = .75/${MAG}.; } }
        float ink;
        if(uMode<.5) ink = am(p, uP, uA, aa);
        else if(uMode<1.5) ink = lines(p, uP, uA, aa);
        else ink = sp.x<uSplit ? am(p, uP, uA, aa) : fm(p, 3.);
        float v = mix(.949, .043, ink);
        o = vec4(vec3(v),1.);
      }`);
    this.bt = G.target(360, 360);
  },
  frame(ctx, t) {
    const P = kf(t, PERIOD), A = kf(t, ANGLE);
    const mode = t < 9 ? 0 : t < 12 ? 1 : t < 14 ? 2 : 0;
    const split = mode === 2 ? lerp(1080, 540, ease(E.outExpo, 12, 12.6, t)) : 1080;
    let loupe = [0, 0, 0];
    if (t >= 14) {
      const u = t - 14, r = 190 * ease(E.outBack, 0, 0.6, u);
      loupe = [540 + 250 * Math.sin(u * 0.9 + 0.4), 470 + 170 * Math.sin(u * 1.37), r];
    }
    G.size(1);
    G.draw(this.base, { uT: t + 0.6 }, this.bt);
    G.draw(this.post, { uB: this.bt, uP: P, uA: A * Math.PI / 180, uMode: mode, uSplit: split, uLoupe: loupe });
    G.blit(ctx);

    // header readouts
    const head = mode === 0 ? (t < 14 ? 'AM 調幅網點' : '細網 + 放大鏡 ×4') : mode === 1 ? 'LINE 線網' : 'AM 調幅  vs  FM 調頻';
    tagBox(ctx, head, 44, 74, { size: 30, family: F.tc, inv: true });
    if (mode !== 2) tagBox(ctx, `週期 ${P.toFixed(0).padStart(2)} px · 網角 ${A.toFixed(0).padStart(3)}° · ${(1080 / P).toFixed(0)} 線/畫面`, 44, 122, { size: 20 });
    // highlight the knob being turned
    const knob = t < 2 ? '' : t < 6 ? '← 只改週期 FREQUENCY' : t < 9 ? '← 只改網角 ANGLE' : '';
    if (knob) tagBox(ctx, knob, 44, 160, { size: 20, family: F.tc, a: 0.9 });
    if (mode === 2) {
      ctx.fillStyle = fg(1); ctx.fillRect(split - 1.5, 0, 3, 1080);
      tagBox(ctx, 'AM：點的大小變', split - 16, 122, { size: 20, family: F.tc, align: 'right' });
      tagBox(ctx, 'FM：點的密度變', split + 16, 122, { size: 20, family: F.tc });
    }
    if (loupe[2] > 1) {
      const [lx, ly2, lr] = loupe, hx = lx + lr * 0.707, hy = ly2 + lr * 0.707;
      ctx.lineCap = 'round';
      ctx.strokeStyle = bg(1); ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(hx + 8, hy + 8); ctx.lineTo(hx + 80, hy + 80); ctx.stroke();
      ctx.strokeStyle = fg(1); ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(hx + 8, hy + 8); ctx.lineTo(hx + 80, hy + 80); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.strokeStyle = bg(1); ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(lx, ly2, lr + 4, 0, TAU); ctx.stroke();
      ctx.strokeStyle = fg(1); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(lx, ly2, lr + 4, 0, TAU); ctx.stroke();
      tagBox(ctx, '×4', loupe[0] + loupe[2] * 0.85 + 14, loupe[1] - loupe[2] * 0.6, { size: 22, inv: true });
    }
    // legend: dot area = darkness
    const ly = 930, a = ease(E.outCubic, 0.5, 1.2, t) * (1 - ease(E.inCubic, 8.3, 8.9, t));
    if (a > 0.01) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = bg(0.94); ctx.fillRect(40, ly - 30, 640, 130);
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach((d, i) => {
      const x = 60 + i * 84, c = 64;
      ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, ly - 14.5, c, c);
      ctx.fillStyle = fg(1); ctx.beginPath();
      // same coverage law as the shader (radius grows with √darkness, clipped by the cell)
      ctx.save(); ctx.beginPath(); ctx.rect(x, ly - 15, c, c); ctx.clip();
      ctx.beginPath(); ctx.arc(x + c / 2, ly - 15 + c / 2, c * 0.71 * Math.sqrt(d), 0, TAU); ctx.fill(); ctx.restore();
      text(ctx, `${Math.round(d * 100)}%`, x + c / 2, ly + 78, { size: 18, family: F.mono, align: 'center' });
    });
    text(ctx, '網點面積', 500, ly + 14, { size: 26, family: F.tcBlack, weight: 900 });
    text(ctx, '＝ 暗度', 500, ly + 52, { size: 26, family: F.tc });
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
  ctx.fillStyle = o.inv ? fg(1) : bg(0.92); ctx.fillRect(x0, y - size * 1.02, w + pad * 2, size * 1.4);
  ctx.fillStyle = o.inv ? bg(1) : fg(1); ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x0 + pad, y);
  ctx.restore();
}
