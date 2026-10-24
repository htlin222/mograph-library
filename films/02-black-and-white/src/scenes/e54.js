/* 54 底片與 CRT FILM & CRT — one film-leader countdown (canvas → texture) shown first as a projected film frame,
   then on a CRT. Every artefact is a separate shader term, switched on one per bar and ticked in a checklist. */
const BS = 540;
const IMG = [160, 70, 760, 760];          // image rect in stage px (x, y, w, h)
const FILM = [['顆粒', 2], ['片門晃動', 4], ['閃爍', 6], ['刮痕灰塵', 6], ['暗角', 8]];
const CRT = [['掃描線', 11], ['曲面', 12.5], ['蔭罩', 14], ['光暈', 14], ['滾動', 16]];
const S = M.def({
  id: 'e54', num: 54, ch: 7, title: '底片與 CRT', en: 'FILM & CRT', dur: 20, ground: 'light',
  prompt: '同一段電影倒數片頭，前半當成放映中的底片，每 2 秒加一層：顆粒、片門晃動、閃爍與刮痕、暗角；後半開機變成 CRT 電視：掃描線、曲面變形、蔭罩條紋與光暈、垂直滾動，最後關機縮成一條線再縮成一個點。下方清單逐項打勾。',
  how: ['顆粒：每格新 hash 雜訊，只加在中間調；晃動是 2 px 噪聲位移', 'CRT 掃描線：每 4.5 px 一條，亮的地方光束變粗', '曲面：螢幕座標 q ← q·(1 + k·q²) 桶形變形，框外塗黑'],
  practice: '只用顆粒和晃動，讓一張靜態照片「活」起來。',
  cues: [{ t: 2, type: 'tick' }, { t: 4, type: 'tick' }, { t: 6, type: 'tick' }, { t: 8, type: 'tick' }, { t: 10, type: 'thud' }, { t: 11, type: 'tick' }, { t: 12.5, type: 'tick' }, { t: 14, type: 'tick' }, { t: 16, type: 'tick' }, { t: 18.6, type: 'whoosh', dur: 0.6 }],
  init() {
    this.cv = makeCanvas(BS, BS); this.cx = this.cv.getContext('2d');
    this.tex = G.texFrom(this.cv);
    this.post = G.prog(`in vec2 vUv; out vec4 o;
      uniform sampler2D uB; uniform float uMode, uF, uGrain, uFlick, uDust, uVig, uScan, uCurve, uMask, uBloom, uRoll, uPow, uOff1, uOff2;
      uniform vec3 uWeave; uniform vec4 uImg;
      float img(vec2 q){ // q in 0..1 image space (y down)
        if(q.x<0.||q.y<0.||q.x>1.||q.y>1.) return 0.;
        return texture(uB, vec2(q.x, 1.-q.y)).r; }
      void main(){
        vec2 sp = vec2(vUv.x, 1.-vUv.y)*1080.;
        float F = uF;
        vec2 q = (sp - uImg.xy)/uImg.zw;                       // 0..1 inside the picture
        float v;
        if(uMode < .5){
          // ---------- FILM ----------
          vec2 c = q - .5; c = mat2(cos(uWeave.z), -sin(uWeave.z), sin(uWeave.z), cos(uWeave.z))*c; q = c + .5 + uWeave.xy/uImg.zw;
          float inside = step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
          v = img(q);
          v *= 1. + uFlick*(hash11(F*.37)-.5)*.32;
          // dust: a few specks per frame, and one or two hairline scratches
          vec2 cell = floor(q*vec2(12.)); vec2 cf = fract(q*12.);
          float hd = hash21(cell + F*1.13);
          if(hd > 1.-.025*uDust){ vec2 dc = .3 + .4*hash22(cell+F); float r = .04 + .1*hash21(cell*3.+F); v = mix(v, .06, smoothstep(r, r*.4, length(cf-dc))*.9); }
          float sx = hash11(floor(F/3.)*.71), sw = .0016;
          if(hash11(floor(F/3.)*1.9) > .35) v = mix(v, .95, uDust*.7*smoothstep(sw, 0., abs(q.x - sx - .002*sin(q.y*9.+F))));
          // grain on 2 px clumps, strongest in the mid-tones
          float gr = hash21(floor(sp/2.) + fract(F*.618)*917.) - .5;
          v += uGrain*gr*.38*(.35 + 2.6*v*(1.-v));
          float d = length(q-.5);
          v *= mix(1., smoothstep(.85, .25, d), uVig);
          v = clamp(v, 0., 1.)*inside;
          // film strip: black base, sprocket holes either side
          vec2 fr = vec2(sp.x, sp.y + uWeave.y);
          float strip = step(90., sp.x)*step(sp.x, 990.);
          float hole = 0.;
          for(int s=0;s<2;s++){ float hx = s==0 ? 124. : 956.; vec2 hp = vec2(fr.x-hx, mod(fr.y, 90.)-45.); vec2 dd = abs(hp)-vec2(14.,20.); hole = max(hole, step(length(max(dd+6.,0.))-6., 0.)); }
          float out_ = mix(.949, .06, strip);
          out_ = mix(out_, .949, hole*strip);
          float inRect = step(uImg.x, sp.x)*step(sp.x, uImg.x+uImg.z)*step(uImg.y, sp.y)*step(sp.y, uImg.y+uImg.w);
          v = mix(out_, mix(.06, .949, v), inRect);
        } else {
          // ---------- CRT ----------
          vec2 c = (q - .5)*2.;
          c *= 1. + uCurve*.14*(c.yx*c.yx);
          // power on/off: vertical then horizontal collapse
          float sy = mix(.004, 1., uPow) * mix(1., .003, uOff1), sx = mix(1., .004, uOff2);
          vec2 cc = c / vec2(sx, sy);
          vec2 qq = cc*.5 + .5;
          qq.y = fract(qq.y + uRoll*(.06*floor(F/2.)/15.)) ; // rolling hold
          qq.x += uRoll*.012*sin(qq.y*40. + F)*step(.82, hash11(floor(qq.y*60.)+F));
          float inside = step(abs(cc.x), 1.)*step(abs(cc.y), 1.);
          float b = img(qq);
          if(uBloom > 0.){ float s = 0.; for(int i=0;i<8;i++){ float a = float(i)*.785; s += img(qq + vec2(cos(a), sin(a))*.012); } b = b + uBloom*.35*s/8.; }
          // scanlines: beam is wider where the signal is bright
          float rows = 760./4.5, ry = fract(qq.y*rows) - .5;
          float w = mix(.2, .5, clamp(b,0.,1.));
          float scan = exp(-ry*ry/(w*w*.5));
          v = mix(b, b*scan*1.25, uScan);
          float mk = fract(sp.x/4.);
          v *= mix(1., mk < .5 ? 1.08 : .62, uMask);
          v += .02*hash21(floor(sp/2.)+F)*uScan;
          float cornerD = length(max(abs(c)-vec2(.82), 0.));
          float edge = mix(inside, inside*smoothstep(.2, .14, cornerD), uCurve);
          float bright = 1. + 3.*uOff1 + 6.*uOff2;
          v = clamp(v*bright, 0., 1.)*edge;
          // body
          float body = step(110., sp.x)*step(sp.x, 970.)*step(30., sp.y)*step(sp.y, 880.);
          vec2 bd = abs(sp - vec2(540., 455.)) - vec2(430.-30., 425.-30.);
          body = step(length(max(bd,0.)) - 30., 0.);
          vec2 sd = abs(sp - vec2(540., 450.)) - vec2(392.-24., 392.-24.);
          float screen = step(length(max(sd,0.)) - 24., 0.);
          float bg = mix(.949, .12, body);
          bg = mix(bg, .02, screen);
          v = mix(bg, max(.02, v), screen*inside);
          if(uOff2 > .999) v = mix(bg, .02, screen);
        }
        o = vec4(vec3(v),1.);
      }`);
  },
  drawLeader(t) {
    const x = this.cx, c = BS / 2;
    x.fillStyle = g(0.82); x.fillRect(0, 0, BS, BS);
    const a = fract(t) * TAU - Math.PI / 2;
    x.fillStyle = g(0.28); x.beginPath(); x.moveTo(c, c); x.arc(c, c, 400, -Math.PI / 2, a); x.closePath(); x.fill();
    x.strokeStyle = g(0.05); x.lineWidth = 4; x.beginPath(); x.moveTo(0, c); x.lineTo(BS, c); x.moveTo(c, 0); x.lineTo(c, BS); x.stroke();
    x.strokeStyle = P; x.lineWidth = 8; x.beginPath(); x.arc(c, c, 210, 0, TAU); x.stroke();
    x.strokeStyle = g(0.05); x.lineWidth = 5; x.beginPath(); x.arc(c, c, 180, 0, TAU); x.stroke();
    x.fillStyle = g(0.05); font(x, 250, F.latin, 800); x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const n = 9 - (Math.floor(t) % 8);
    x.fillText(String(n), c, c + 88);
  },
  frame(ctx, t) {
    const crt = t >= 10;
    this.drawLeader(t);
    G.texFrom(this.cv, this.tex);
    const f = Math.floor(t * 24);                 // film runs at 24 fps: artefacts change per film frame
    const on = (k) => ease(E.outCubic, k, k + 0.25, t);
    const w = on(4);
    const weave = [w * (2.2 * noise(t * 3.1, 0.5) + 0.8 * noise(t * 13, 4)), w * 3.2 * noise(t * 2.3, 9.1), w * 0.0025 * noise(t * 1.7, 2.2)];
    const pw = ease(E.outCubic, 10, 10.45, t), off1 = ease(E.inCubic, 18.6, 18.95, t), off2 = ease(E.inOutCubic, 18.95, 19.35, t);
    G.size(1);
    G.draw(this.post, {
      uB: this.tex, uMode: crt ? 1 : 0, uF: f % 1000, uImg: IMG,
      uGrain: on(2), uWeave: weave, uFlick: on(6), uDust: on(6), uVig: on(8),
      uScan: on(11), uCurve: on(12.5), uMask: on(14), uBloom: on(14), uRoll: t >= 16 && t < 18.6 ? 1 : 0,
      uPow: crt ? pw : 1, uOff1: off1, uOff2: off2,
    });
    G.blit(ctx);
    // the off-dot fades out
    if (t > 19.35) { const a = 1 - ease(E.outCubic, 19.35, 19.9, t); ctx.fillStyle = `rgba(242,242,240,${a})`; ctx.beginPath(); ctx.arc(540, 450, 6 + 10 * a, 0, TAU); ctx.fill(); }

    // headline
    // checklists
    const row = (items, y, label, active) => {
      if (active) { ctx.fillStyle = fg(1); ctx.fillRect(52, y - 26, 96, 34); }
      text(ctx, label, 64, y, { size: 22, family: F.mono, alpha: active ? 1 : 0.4, spacing: 2, color: active ? bg(1) : undefined });
      let x = 172;
      items.forEach(([name, k]) => {
        const done = t >= k, a = active ? 1 : 0.4;
        ctx.save(); ctx.globalAlpha *= a;
        ctx.strokeStyle = fg(1); ctx.lineWidth = 2; ctx.strokeRect(x + 1, y - 19, 20, 20);
        if (done) {
          const p = ease(E.outCubic, k, k + 0.3, t);
          ctx.fillStyle = fg(1); ctx.fillRect(x + 1, y - 19, 20, 20);
          ctx.strokeStyle = bg(1); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 5, y - 9); ctx.lineTo(x + 9, y - 4 - 2 * (1 - p)); ctx.lineTo(x + 9 + 8 * p, y - 15 * p); ctx.stroke();
        }
        ctx.restore();
        text(ctx, name, x + 30, y, { size: 22, family: F.tc, alpha: (done ? 1 : 0.45) * a });
        font(ctx, 22, F.tc); x += 30 + ctx.measureText(name).width + 34;
      });
    };
    ctx.fillStyle = bg(1); ctx.fillRect(0, 912, 1080, 168);
    row(FILM, 966, 'FILM', !crt);
    row(CRT, 1016, 'CRT', crt);
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
