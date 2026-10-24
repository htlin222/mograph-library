/* 56 狹縫掃描 SLIT-SCAN — time displacement computed analytically: the base scene is a pure function of time,
   so every pixel simply evaluates it at  τ = t − K·delay(pixel). No history buffer needed; any frame is exact. */
const kf = (t, keys, fn = E.inOutCubic) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerp(va, vb, ease(fn, a, b, t)); }
  return keys[keys.length - 1][1];
};
const KEYS = [[0, 0], [2, 0], [3, 0.12], [4, 0.12], [5, 0.3], [6, 0.3], [6.01, 0.25], [9, 0.25], [9.01, 0.3], [12, 0.3], [12.01, 0.4], [14, 0.4], [14.01, 0.3], [16, 0.7], [18, 1.1], [20, 1.1]];
const MODES = ['逐列延遲（捲簾快門）', '逐欄延遲', '放射延遲：中心＝現在', '雜訊延遲圖', '放射延遲 · K 加到 1.1 秒'];
const S = M.def({
  id: 'e56', num: 56, ch: 7, title: '狹縫掃描', en: 'SLIT-SCAN', dur: 20, ground: 'light',
  prompt: '每秒轉不到一圈的三葉螺旋槳加一顆繞行的球。讓畫面每一列顯示不同時刻：上面是現在、越往下越早，延遲從 0 加到 0.3 秒，葉片就彎了；再換成逐欄、由中心往外、雜訊延遲圖，右下角畫出延遲圖，灰色影子是當下真實位置，最後放射延遲加到 1.1 秒，葉片捲成螺旋。',
  how: ['每個像素取 τ = t − K × 延遲圖(x, y)，再算那一刻的畫面', '場景是時間的純函數，所以不必存舊影格', '延遲圖：列 y、欄 x、半徑 r 或 fbm 雜訊；K 是最大延遲秒數'],
  practice: '用手機全景模式拍一個轉動的人，觀察同樣的扭曲。',
  cues: [{ t: 0.1, type: 'whoosh', dur: 0.7 }, { t: 2, type: 'riser', t1: 5.5 }, { t: 6, type: 'tick' }, { t: 9, type: 'tick' }, { t: 12, type: 'tick' }, { t: 14, type: 'impact', v: 0.5 }],
  init() {
    this.post = G.prog(`in vec2 vUv; out vec4 o;
      uniform float uT, uK, uMode, uGhost; uniform vec4 uInset;
      float delayAt(vec2 sp, float m){
        if(m < .5) return sp.y/1080.;
        if(m < 1.5) return sp.x/1080.;
        if(m < 2.5 || m > 3.5) return clamp(length(sp - vec2(540.))/700., 0., 1.);
        return clamp(fbm3(vec3(sp*.0024, 3.1))*1.6 - .3, 0., 1.);
      }
      float scene(vec2 sp, float tau){
        vec2 p = (sp - vec2(540., 500.))/430.;
        float px = 1.6/430.;
        float r = length(p), a = atan(p.y, p.x) - tau*5.2;
        float sec = TAU/3., aa = mod(a, sec) - sec*.5;
        float w = .17 - .09*r;
        float blade = smoothstep(px, -px, abs(aa)*r - w)*smoothstep(.86+px, .86-px, r);
        float hub = smoothstep(.15+px, .15-px, r);
        float hole = smoothstep(.05+px, .05-px, r);
        vec2 bc = .98*vec2(cos(tau*2.2), sin(tau*2.2));
        float ball = smoothstep(.1+px, .1-px, length(p - bc));
        float ring = smoothstep(1.5*px, 0., abs(r - .98));      // static: unaffected by time
        return clamp(max(max(blade, hub)-hole, max(ball, ring*.35)), 0., 1.);
      }
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        float d = delayAt(sp, uMode);
        float ink = scene(sp, uT - uK*d);
        float ink0 = scene(sp, uT)*uGhost;
        float v = mix(mix(.949, .74, ink0), .043, ink);
        vec2 ip = (sp - uInset.xy)/uInset.z;
        if(ip.x>0. && ip.y>0. && ip.x<1. && ip.y<1.){
          float di = delayAt(ip*1080., uMode);
          v = mix(.92, .12, di);
          vec2 e = min(ip, 1.-ip)*uInset.z; if(min(e.x, e.y) < 2.) v = .043;
        }
        o = vec4(vec3(v), 1.);
      }`);
  },
  frame(ctx, t) {
    const K = kf(t, KEYS);
    const mode = t < 6 ? 0 : t < 9 ? 1 : t < 12 ? 2 : t < 14 ? 3 : 4;
    const ins = [836, 816, 200, 0];
    G.size(1);
    G.draw(this.post, { uT: t, uK: K, uMode: mode, uInset: ins, uGhost: ease(E.outCubic, 2, 2.5, t) * (1 - ease(E.inOutCubic, 15, 16, t)) });
    G.blit(ctx);

    tagBox(ctx, K < 0.005 ? '原始畫面：K = 0' : MODES[mode], 44, 74, { size: 30, family: F.tc, inv: true });
    tagBox(ctx, `最大延遲 K = ${K.toFixed(2)} s · ${(K * 30).toFixed(1)} 格`, 44, 122, { size: 20, family: F.tc });
    text(ctx, '延遲圖', ins[0], ins[1] - 14, { size: 18, family: F.tc, alpha: 0.8 });
    text(ctx, '白＝現在　黑＝K 秒前', ins[0] + ins[2], ins[1] + ins[2] + 26, { size: 18, family: F.tc, align: 'right', alpha: 0.8 });
    // time axis for the row / column modes: which moment each edge shows
    if (mode === 0 && K > 0.005) {
      ctx.fillStyle = fg(1); ctx.fillRect(1048, 160, 2, 620);
      ctx.beginPath(); ctx.moveTo(1049, 790); ctx.lineTo(1041, 774); ctx.lineTo(1057, 774); ctx.closePath(); ctx.fill();
      text(ctx, 't', 1030, 170, { size: 20, family: F.mono, align: 'right' });
      text(ctx, `t−${K.toFixed(2)}`, 1030, 780, { size: 20, family: F.mono, align: 'right' });
    }
    if (mode === 1) {
      ctx.fillStyle = fg(1); ctx.fillRect(60, 1046, 700, 2);
      text(ctx, 't', 60, 1036, { size: 20, family: F.mono });
      text(ctx, `t−${(K * 700 / 1080).toFixed(2)} →`, 760, 1036, { size: 20, family: F.mono, align: 'right' });
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
