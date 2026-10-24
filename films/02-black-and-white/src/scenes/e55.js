/* 55 回饋殘影 FEEDBACK ECHO — two float render targets ping-pong at a fixed 30 Hz (M.sim): every step draws the
   previous frame scaled/rotated and multiplied by decay, then the new content on top. Deterministic: on rewind
   M.sim resets and replays from t = 0, so sequential rendering costs one pass per frame. */
const RES = 540;
const CONTENT = `
uniform float uSq, uSqRot, uDot, uPulse, uTau;
float content(vec2 p){
  float v = 0.;
  if(uSq > 0.){ vec2 q = rot(uSqRot)*p; vec2 d = abs(q) - vec2(uSq); float sd = length(max(d,0.)) + min(max(d.x,d.y),0.); v = max(v, smoothstep(.014, .004, abs(sd))); }
  if(uDot > 0.){ vec2 c = uDot > 1.5 ? .26*vec2(cos(uTau*2.4), sin(uTau*2.4)) : vec2(.62*sin(uTau*1.3), .5*sin(uTau*2.1+.4)); v = max(v, smoothstep(.06, .05, length(p-c))); }
  if(uPulse > 0.){ v = max(v, uPulse*smoothstep(.016, .004, abs(length(p) - .86))); }
  return v;
}`;
const PH = [
  { t: 0, name: '拖尾 TRAILS', s: 1.0, r: 0, d: 0.92, sq: 0, dot: 1 },
  { t: 4, name: '縮小回饋 → 隧道', s: 0.955, r: 0, d: 0.95, sq: 0.8, dot: 1 },
  { t: 7, name: '放大回饋 → 爆散', s: 1.045, r: 2.5, d: 0.88, sq: 0.12, dot: 2 },
  { t: 10, name: '旋轉＋縮小 → 螺旋', s: 0.97, r: 3.5, d: 0.85, sq: 0.78, dot: 0 },
  { t: 14, name: '對拍脈衝＋色階', s: 0.975, r: 2.5, d: 0.965, sq: 0.8, dot: 0 },
];
const phaseAt = t => { let p = PH[0]; for (const q of PH) if (t >= q.t) p = q; return p; };
/* decay in the spiral phase climbs per bar so its effect is legible */
const decayAt = (t, p) => p.t === 10 ? [0.85, 0.92, 0.97][Math.min(2, Math.floor((t - 10) / 1.34))] : p.d;
const S = M.def({
  id: 'e55', num: 55, ch: 7, title: '回饋殘影', en: 'FEEDBACK ECHO', dur: 20, ground: 'dark',
  prompt: '做影像回饋：每一格先把上一格畫面縮放、旋轉、乘上衰減再貼回來，最後畫上新的圖形。依序示範：純拖尾（衰減 0.92）、縮放 0.955 成隧道、放大 1.045 往外爆、每格轉 3.5° 成螺旋並把衰減從 0.85 調到 0.97；最後在每一拍送一圈脈衝，壓成 6 階灰。',
  how: ['兩張浮點 render target 乒乓交換，固定 30 Hz 推進', '新格 = max(新圖形, 衰減 × 上一格(縮放 s、旋轉 θ))', 's < 1 往內收成隧道，s > 1 向外爆，衰減決定尾巴長度'],
  practice: '把旋轉中心跟著滑鼠移動，看隧道怎麼彎。',
  cues: [{ t: 0.1, type: 'whoosh', dur: 0.8 }, { t: 4, type: 'tick' }, { t: 7, type: 'tick' }, { t: 10, type: 'tick' }, ...Array.from({ length: 12 }, (_, i) => ({ t: 14 + i * 0.5, type: i % 4 === 0 ? 'kick' : 'tick', v: 0.4 }))],
  init() {
    this.step = G.prog(`in vec2 vUv; out vec4 o;
      uniform sampler2D uPrev; uniform float uS, uR, uDecay;
      ${CONTENT}
      void main(){
        vec2 p = vUv*2.-1.;
        vec2 q = rot(uR)*(p/uS);                   // inverse transform: where this pixel was last frame
        vec2 u = q*.5+.5;
        float prev = (u.x>0.&&u.y>0.&&u.x<1.&&u.y<1.) ? texture(uPrev, u).r : 0.;
        o = vec4(max(prev*uDecay, content(p)), 0., 0., 1.);
      }`);
    this.show = G.prog(`in vec2 vUv; out vec4 o;
      uniform sampler2D uF; uniform float uPost; uniform vec4 uInset;
      ${CONTENT}
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        float v = texture(uF, vUv).r;
        v = pow(clamp(v,0.,1.), .85);
        if(uPost > 0.) v = mix(v, floor(v*6.)/5., uPost);
        vec2 ip = (sp - uInset.xy)/uInset.z;
        if(ip.x>0.&&ip.y>0.&&ip.x<1.&&ip.y<1.){
          vec2 p = vec2(ip.x, 1.-ip.y)*2.-1.;
          v = .06 + .94*content(p);
          vec2 e = min(ip, 1.-ip)*uInset.z; if(min(e.x,e.y) < 2.) v = .7;
        }
        o = vec4(vec3(mix(.043, .949, v)),1.);
      }`);
    this.T = [G.target(RES, RES, { float: true }), G.target(RES, RES, { float: true })];
    this.cur = 0;
  },
  uniformsAt(t) {
    const p = phaseAt(t);
    const pulse = p.t === 14 ? Math.max(0, 1 - fract(t / BEAT) * 6) : 0;
    return { uS: p.s, uR: p.r * Math.PI / 180, uDecay: decayAt(t, p), uSq: p.sq, uSqRot: t * 0.6, uDot: p.dot, uPulse: pulse, uTau: t };
  },
  reset() {
    const gl = G.gl;
    for (const tg of this.T) { gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fb); gl.viewport(0, 0, RES, RES); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.cur = 0;
  },
  frame(ctx, t) {
    if (!this.T) return;
    M.sim(S, t, (dt, n, st) => {
      const nx = 1 - this.cur;
      G.draw(this.step, Object.assign({ uPrev: this.T[this.cur] }, this.uniformsAt(st + dt)), this.T[nx]);
      this.cur = nx;
    }, 30);
    const u = this.uniformsAt(t), p = phaseAt(t);
    G.size(1);
    G.draw(this.show, Object.assign({ uF: this.T[this.cur], uPost: ease(E.inOutCubic, 15.5, 16.5, t), uInset: [836, 836, 200, 0] }, u));
    G.blit(ctx);

    // labels
    tagBox(ctx, p.name, 44, 74, { size: 30, family: F.tc, inv: true });
    const ys = 124;
    const rows = [['縮放 s', `×${p.s.toFixed(3)}`, p.t === 4 || p.t === 7], ['旋轉 θ', `${p.r.toFixed(1)}° / 格`, p.t === 10], ['衰減', u.uDecay.toFixed(2), p.t === 0 || p.t === 10]];
    rows.forEach(([k, v, hot], i) => {
      tagBox(ctx, `${k}  ${v}`, 44, ys + i * 38, { size: 20, family: F.tc, inv: hot && t > p.t + 0.3 });
    });
    tagBox(ctx, 'frame(n) = max( 新圖形 , 衰減 × T( frame(n−1) ) )', 44, 1030, { size: 20, family: F.mono });
    tagBox(ctx, '輸入 INPUT', 1036, 818, { size: 18, family: F.tc, align: 'right' });
    if (t >= 16) tagBox(ctx, '6 階色階', 44, ys + 3 * 38, { size: 20, family: F.tc, a: ease(E.outCubic, 16, 16.4, t) });
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
