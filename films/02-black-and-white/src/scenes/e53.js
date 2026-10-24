/* 53 故障 GLITCH — a test-card base (canvas 540², uploaded per frame) broken on the GPU by four layers:
   slice displacement, macroblock corruption, scanline tear, ghost + bit-crush. Bursts are beat-locked. */
const BS = 540;
const S = M.def({
  id: 'e53', num: 53, ch: 7, title: '故障', en: 'GLITCH', dur: 20, ground: 'dark',
  prompt: '做一張黑白測試卡（灰階條、圓、GLITCH 大字、時間碼），然後在每一拍故障一次再立刻恢復。依序單獨示範四層：橫向切片位移、48 px 區塊損毀、掃描線撕裂、重影加位元壓縮；最後四層一起在拍點爆發，右側清單標出哪層開著。',
  how: ['切片：每條橫帶用 hash(帶號, seed) 決定水平位移', '區塊：48 px 格子抽樣，改成錯位、像素化或反相', 'seed 每 1/15 秒換一次，強度用拍點包絡 e^(−8t) 衰減'],
  practice: '只用一層故障做 4 拍的節奏，強弱錯開。',
  cues: [0.1, ...Array.from({ length: 24 }, (_, i) => 2 + i * 0.5)].map((t, i) => ({ t, type: i === 0 || t >= 14 ? 'glitch' : 'tick', v: t >= 14 ? 0.5 : 0.35 })),
  init() {
    this.cv = makeCanvas(BS, BS); this.cx = this.cv.getContext('2d');
    // static layer of the test card
    const st = makeCanvas(BS, BS), x = st.getContext('2d');
    x.fillStyle = K; x.fillRect(0, 0, BS, BS);
    for (let i = 0; i < 8; i++) { x.fillStyle = g(i / 7); x.fillRect(30 + i * 60, 66, 60, 40); }
    x.strokeStyle = P; x.lineWidth = 1; x.strokeRect(30.5, 66.5, 480, 40);
    x.strokeStyle = g(0.5); x.lineWidth = 1;
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(i * 90, 118); x.lineTo(i * 90, 392); x.stroke(); x.beginPath(); x.moveTo(0, 118 + i * 45); x.lineTo(BS, 118 + i * 45); x.stroke(); }
    x.strokeStyle = P; x.lineWidth = 3; x.beginPath(); x.arc(270, 255, 132, 0, TAU); x.stroke();
    x.lineWidth = 1.5; x.beginPath(); x.arc(270, 255, 96, 0, TAU); x.stroke();
    // frequency sweep bars
    for (let xx = 30, w = 9; xx < 510; xx += w * 2, w = Math.max(1, w * 0.86)) { x.fillStyle = P; x.fillRect(xx, 400, w, 22); }
    this.st = st;
    this.tex = G.texFrom(this.cv);
    this.post = G.prog(`in vec2 vUv; out vec4 o;
      uniform sampler2D uB; uniform float uSeed, uSlice, uBlock, uTear, uGhost, uTearY;
      float tx(vec2 sp){ sp = clamp(sp, vec2(0.), vec2(1079.)); return texture(uB, vec2(sp.x, 1080.-sp.y)/1080.).r; }
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        vec2 p = sp;
        float sd = uSeed;
        // 1 slice displacement: coarse and fine bands
        if(uSlice > 0.){
          float b1 = floor(sp.y/72.), b2 = floor(sp.y/9.);
          float h1 = hash21(vec2(b1, sd)), h2 = hash21(vec2(b2, sd*1.7));
          float off = (h1 > 1.-.55*uSlice ? (hash21(vec2(b1, sd+3.))-.5)*560. : 0.)
                    + (h2 > 1.-.3*uSlice ? (hash21(vec2(b2, sd+9.))-.5)*140. : 0.);
          p.x += off*uSlice;
        }
        // 3 scanline tear: rows above the tear line skew sideways, rows near it wobble
        if(uTear > 0.){
          float d = uTearY - sp.y;
          if(d > 0.) p.x += uTear*(170.*exp(-d/260.) + 26.*sin(sp.y*.09 + sd));
          p.y += uTear*12.*sin(sp.x*.01 + sd);
        }
        // 2 macroblocks
        float inv = 0.;
        if(uBlock > 0.){
          vec2 bc = floor(sp/48.);
          float h = hash21(bc + sd*7.13);
          if(h < uBlock*.3){
            float m = hash21(bc + sd*3.1);
            if(m < .4) p += floor((hash22(bc + sd) - .5)*12.)*48.;
            else if(m < .75) p = (floor(p/16.)+.5)*16.;
            else inv = 1.;
          }
          // row smear: a whole 48 px row repeats its first line
          if(hash11(bc.y + sd*5.3) < uBlock*.08) p.y = bc.y*48.;
        }
        float v = tx(p);
        // 4 ghost + bit crush
        if(uGhost > 0.){
          float gh = tx(p + vec2(30.*uGhost, 0.)), gh2 = tx(p - vec2(64.*uGhost, 6.));
          v = max(v, .55*gh) - .35*gh2*uGhost;
          float lv = mix(256., 3., uGhost);
          v = floor(clamp(v,0.,1.)*lv)/(lv-1.);
        }
        if(inv > .5) v = 1.-v;
        // scan noise lines
        float nl = hash21(vec2(floor(sp.y/2.), sd*2.3));
        float act = max(max(uSlice, uBlock), max(uTear, uGhost));
        if(act > .03 && nl > 1.-.035*act) v = hash21(vec2(floor(sp.x/3.), floor(sp.y/2.)+sd));
        o = vec4(vec3(clamp(v,.043,.949)),1.);
      }`);
  },
  drawBase(t) {
    const x = this.cx;
    x.drawImage(this.st, 0, 0);
    // radar sweep
    const a = t * 2.2;
    x.save(); x.translate(270, 255);
    x.fillStyle = 'rgba(242,242,240,0.16)'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 130, a - 0.7, a); x.closePath(); x.fill();
    x.strokeStyle = P; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(130 * Math.cos(a), 130 * Math.sin(a)); x.stroke();
    x.restore();
    // title
    x.fillStyle = K; x.fillRect(46, 202, 448, 106);
    x.fillStyle = P; font(x, 108, F.latin, 800); x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText('GLITCH', 270, 293);
    // timecode
    const f = Math.floor(t * 30), ss = Math.floor(f / 30), ff = f % 30;
    x.fillStyle = K; x.fillRect(150, 428, 240, 30);
    font(x, 24, F.mono, 500); x.fillStyle = P; x.textAlign = 'center';
    x.fillText(`00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, 270, 451);
    x.textAlign = 'left';
  },
  frame(ctx, t) {
    this.drawBase(t);
    G.texFrom(this.cv, this.tex);
    // beat envelope: sharp attack, fast decay; seed chatters at 15 Hz while active
    const beat = Math.floor(t / BEAT), ph = t - beat * BEAT;
    const env = Math.exp(-ph * 8) * (beat % 4 === 3 ? 1.25 : 1);
    const seed = Math.floor(t * 15) + 1;
    let sl = 0, bl = 0, te = 0, gh = 0;
    if (t < 1.2) { const e = Math.exp(-t * 3.5); sl = e; bl = e; te = e * 0.6; gh = e * 0.5; }
    else if (t >= 2 && t < 5) sl = env;
    else if (t >= 5 && t < 8) bl = env * 1.6;
    else if (t >= 8 && t < 11) te = env * 1.2;
    else if (t >= 11 && t < 14) gh = env * 1.1;
    else if (t >= 14) {
      const k = 0.7 + 0.5 * ease(E.inCubic, 14, 19.5, t);
      sl = env * k; bl = env * k * 1.4; te = env * k * (beat % 2 ? 1 : 0.3); gh = env * k * 0.8;
      if (t > 19.5) { sl = bl = te = gh = 0; }
    }
    const tearY = 300 + 600 * hash1(beat * 3.7);
    G.size(1);
    G.draw(this.post, { uB: this.tex, uSeed: seed % 97, uSlice: sl, uBlock: bl, uTear: te, uGhost: gh, uTearY: tearY });
    G.blit(ctx);

    // labels
    const head = t < 2 ? '故障＝在拍點上壞掉' : t < 5 ? '01 切片位移 SLICE' : t < 8 ? '02 區塊損毀 BLOCK' : t < 11 ? '03 掃描線撕裂 TEAR' : t < 14 ? '04 重影＋位元壓縮' : '全部疊加 · 對拍爆發';
    tagBox(ctx, head, 44, 74, { size: 30, family: F.tc, inv: true });
    // layer list with live intensity bars
    const L = [['SLICE', sl], ['BLOCK', bl], ['TEAR', te], ['GHOST', gh]];
    const lx = 806, ly = 922;
    ctx.fillStyle = bg(1); ctx.fillRect(lx - 16, ly - 32, 266, 150);
    L.forEach(([n, v], i) => {
      const y = ly + i * 34, on = (t >= 2 + i * 3 && t < 5 + i * 3) || t >= 14 || t < 1.2;
      ctx.fillStyle = fg(on ? 1 : 0.3); ctx.fillRect(lx, y - 16, 16, 16);
      if (!on) { ctx.fillStyle = bg(1); ctx.fillRect(lx + 2, y - 14, 12, 12); }
      text(ctx, `0${i + 1} ${n}`, lx + 28, y, { size: 20, family: F.mono, alpha: on ? 1 : 0.4 });
      ctx.fillStyle = fg(0.2); ctx.fillRect(lx + 156, y - 12, 80, 8);
      ctx.fillStyle = fg(1); ctx.fillRect(lx + 156, y - 12, 80 * clamp(v), 8);
    });
    // beat envelope plot
    const px = 44, py = 1010, pw = 300;
    ctx.fillStyle = bg(1); ctx.fillRect(px - 4, py - 76, pw + 16, 104);
    ctx.strokeStyle = fg(0.9); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const u = i / 120 * 4 * BEAT, e = Math.exp(-(u % BEAT) * 8);
      const X = px + 6 + i / 120 * pw, Y = py - 6 - e * 52;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
    const cur = (t % (4 * BEAT)) / (4 * BEAT);
    ctx.fillStyle = fg(1); ctx.fillRect(px + 6 + cur * pw - 1, py - 66, 2, 62);
    text(ctx, '強度 = e^(−8·拍內時間)', px + 6, py + 18, { size: 18, family: F.tc, alpha: 0.75 });
  },
});
const hash1 = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

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
