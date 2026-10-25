/* Trailer renderer — 1920×1080. Runs inside the film's page (same engine, same scenes), after M.boot().
   T.render(ctx, i) draws trailer frame i; every scene is drawn by its own frame(ctx, t) into a 1080² stage
   buffer and then placed (scaled) into the 16:9 layout. Times come from PLAN (plan.js). */
const T = { W: 1920, H: 1080 };
(function () {
  const TW = 1920, TH = 1080;
  const seg = id => M.timeline.find(s => s.id === id);
  const SB = makeCanvas(1080, 1080), sbx = SB.getContext('2d');
  /* draw one scene's stage at scene-local time t into the shared stage buffer */
  function stage(id, t) {
    const s = seg(id);
    if (!s.ready) { s.init && s.init(); s.ready = true; }
    const light = s.ground === 'light';
    FG = light ? K : P; BG = light ? P : K;
    sbx.save(); sbx.setTransform(1, 0, 0, 1, 0, 0); sbx.globalAlpha = 1; sbx.globalCompositeOperation = 'source-over'; sbx.filter = 'none';
    sbx.fillStyle = BG; sbx.fillRect(0, 0, 1080, 1080);
    sbx.beginPath(); sbx.rect(0, 0, 1080, 1080); sbx.clip();
    const gt = s.start + t;
    s.frame(sbx, t, { dur: s.dur, p: t / s.dur, gt, beat: t / BEAT, bar: t / BAR, frame: Math.round(gt * FPS) });
    sbx.restore();
    FG = P; BG = K;
    return SB;
  }
  /* place stage(id, t) into ctx at (x, y, size) with an optional zoom about the centre */
  function put(ctx, id, t, x, y, size, zoom = 1) {
    const img = stage(id, t);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
    const s2 = size * zoom; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x - (s2 - size) / 2, y - (s2 - size) / 2, s2, s2);
    ctx.restore();
  }
  const ink = (a = 1) => `rgba(242,242,240,${a})`;
  const T2 = (ctx, s, x, y, o) => text(ctx, s, x, y, Object.assign({ color: P }, o));
  const inDrop = b => (b >= 32 && b < 64) || (b >= 72 && b < 104);
  const punch = b => inDrop(b) ? 1 + 0.035 * Math.exp(-fract(b) * 7) : 1;          // a kick on every beat
  const zh = id => seg(id).title, en = id => seg(id).en, num = id => String(seg(id).num).padStart(2, '0');

  /* side captions for a single stage */
  function captions(ctx, id, u, quick) {
    const a = ease(E.outCubic, 0, 0.18, u);
    T2(ctx, num(id), 60, 150, { size: 120, family: F.latin, weight: 800, alpha: a });
    T2(ctx, '/72', 60 + 150, 150, { size: 30, family: F.mono, alpha: 0.5 * a });
    if (quick) return;
    // English name, wrapped into the left column
    let fs = 46; font(ctx, fs, F.latin, 800); const words = en(id).split(' '); const lines = []; let line = '';
    for (const w of words) { const tst = line ? line + ' ' + w : w; if (ctx.measureText(tst).width > 330 && line) { lines.push(line); line = w; } else line = tst; }
    lines.push(line);
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width)); if (widest > 330) fs = Math.floor(fs * 330 / widest);   // one long word: shrink, never run under the stage
    lines.forEach((l, k) => { const ak = ease(E.outCubic, 0.06 * k, 0.06 * k + 0.25, u); T2(ctx, l, 60 + (1 - ak) * -30, 860 + k * fs * 1.17 - (lines.length - 1) * fs * 1.17, { size: fs, weight: 800, alpha: ak }); });
    // Chinese title, vertical, right column
    const chars = [...zh(id)].filter(c => c.trim()); const size = chars.length > 6 ? 54 : 72;
    chars.forEach((c, k) => { const ak = ease(E.outCubic, 0.05 * k, 0.05 * k + 0.22, u); T2(ctx, c, 1800, 160 + k * (size * 1.12), { size, family: F.tcBlack, weight: 900, align: 'center', alpha: ak }); });
  }
  /* small chrome on every frame: corner marks, title strip, beat counter */
  function chrome(ctx, b) {
    ctx.save(); ctx.strokeStyle = ink(0.35); ctx.lineWidth = 2;
    for (const [x, y, sx, sy] of [[24, 24, 1, 1], [TW - 24, 24, -1, 1], [24, TH - 24, 1, -1], [TW - 24, TH - 24, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * 26); ctx.lineTo(x, y); ctx.lineTo(x + sx * 26, y); ctx.stroke(); }
    ctx.restore();
    T2(ctx, 'BLACK & WHITE MOTION · 黑白動態全書', 60, TH - 40, { size: 18, family: F.mono, alpha: 0.45, spacing: 2 });
    const bar = Math.floor(b / 4) + 1, bt = Math.floor(b % 4) + 1;
    T2(ctx, `150 BPM · ${String(bar).padStart(2, '0')}.${bt}`, TW - 60, TH - 40, { size: 18, family: F.mono, alpha: 0.45, align: 'right' });
  }

  /* cached small stills of all 72 for the mosaic and the title backdrop */
  let stills = null;
  function makeStills() {
    stills = [];
    for (let n = 1; n <= 72; n++) {
      const id = 'e' + String(n).padStart(2, '0'), c = makeCanvas(160, 160), x = c.getContext('2d');
      x.imageSmoothingQuality = 'high'; x.drawImage(stage(id, 15), 0, 0, 160, 160); stills.push(c);
    }
  }
  T.prepare = () => { if (!stills) makeStills(); };

  const LAY = {
    black(ctx, sh, u, b) {
      if (sh.fx.text && !sh.fx.stutter) T2(ctx, sh.fx.text, TW / 2, TH / 2 + 8, { size: 22, family: F.mono, align: 'center', spacing: 8, alpha: ease(E.outCubic, 0.3, 1.2, u * sh.n) * 0.8 });
      if (sh.fx.stutter) { const on = Math.floor(u * sh.n * 8) % 2 === 0; if (on) T2(ctx, sh.fx.text, TW / 2, TH / 2 + 110, { size: 320, weight: 900, align: 'center' }); }
    },
    ftext(ctx, sh, u) {
      const k = E.outExpo(clamp(u * 3)); ctx.save(); ctx.translate(TW / 2, TH / 2); ctx.scale(lerp(2.4, 1, k), lerp(2.4, 1, k));
      T2(ctx, sh.fx.text, 0, 170, { size: 480, weight: 800, align: 'center', alpha: k }); ctx.restore();
    },
    one(ctx, sh, u, b) {
      const id = sh.ids[0], t = sh.t0[0] + u * sh.n * TBEAT;
      const zoom = (sh.fx.slow ? lerp(1, 1.06, u) : lerp(1.0, 1.025, u)) * punch(b);
      ctx.save();
      if (sh.fx.iris) { const r = 780 * E.inOutCubic(clamp(u * sh.n / 1.2)); ctx.beginPath(); ctx.arc(TW / 2, TH / 2, Math.max(1, r), 0, TAU); ctx.clip(); }
      if (sh.fx.wipe) { const w = 1080 * E.inOutCubic(clamp(u * sh.n / 1.0)); ctx.beginPath(); ctx.rect(420, 0, w, TH); ctx.clip(); }
      put(ctx, id, t, 420, 0, 1080, zoom);
      ctx.restore();
      captions(ctx, id, u * sh.n * TBEAT, sh.fx.quick);
      if (sh.fx.big) { const k = ease(E.outExpo, 0, 0.12, u); ctx.save(); ctx.globalCompositeOperation = 'difference'; T2(ctx, sh.fx.big, TW / 2, TH / 2 + 130, { size: lerp(520, 380, k), weight: 900, align: 'center', alpha: 1 - ease(E.inCubic, 0.55, 1, u) }); ctx.restore(); }
    },
    two(ctx, sh, u, b) {
      sh.ids.forEach((id, k) => { put(ctx, id, sh.t0[k] + u * sh.n * TBEAT, 40 + k * 940, 70, 900, punch(b)); T2(ctx, `${num(id)}  ${en(id)}`, 40 + k * 940, 1010, { size: 22, family: F.mono, alpha: 0.75 }); });
    },
    three(ctx, sh, u, b) {
      sh.ids.forEach((id, k) => {
        const d = ease(E.outCubic, k * 0.08, k * 0.08 + 0.25, u);
        put(ctx, id, sh.t0[k] + u * sh.n * TBEAT, 30 + k * 630, 240 + (1 - d) * 60, 600, punch(b));
        T2(ctx, num(id), 30 + k * 630, 210, { size: 44, weight: 800, alpha: d }); T2(ctx, zh(id), 30 + k * 630 + 70, 207, { size: 30, family: F.tcBlack, weight: 900, alpha: d });
        T2(ctx, en(id), 30 + k * 630, 880, { size: 20, family: F.mono, alpha: 0.7 * d });
      });
    },
    grid4(ctx, sh, u, b) {
      sh.ids.forEach((id, k) => { const x = 432 + (k % 2) * 536, y = 12 + Math.floor(k / 2) * 536; put(ctx, id, sh.t0[k] + u * sh.n * TBEAT, x, y, 520, punch(b)); T2(ctx, num(id), x + 14, y + 38, { size: 26, family: F.mono, weight: 500, color: seg(id).ground === 'light' ? K : P }); });
      T2(ctx, '4×', 60, 150, { size: 120, weight: 800 });
    },
    grid9(ctx, sh, u, b) {
      sh.ids.forEach((id, k) => {
        const x = 425 + (k % 3) * 360, y = 5 + Math.floor(k / 3) * 360, d = ease(E.outBack, k * 0.03, k * 0.03 + 0.2, u);
        ctx.save(); ctx.translate(x + 175, y + 175); ctx.scale(d, d); ctx.translate(-x - 175, -y - 175);
        put(ctx, id, sh.t0[k] + u * sh.n * TBEAT, x, y, 350, punch(b)); ctx.restore();
      });
      T2(ctx, '9×', 60, 150, { size: 120, weight: 800 });
    },
    mosaic(ctx, sh, u) {
      const nShow = Math.floor(clamp(u / 0.86) * 72);
      for (let k = 0; k < 72; k++) {
        const x = (k % 12) * 160, y = 60 + Math.floor(k / 12) * 160, appear = clamp(u / 0.86 * 72 - k);
        if (appear <= 0) continue;
        const s = E.outBack(clamp(appear * 1.5));
        ctx.save(); ctx.translate(x + 80, y + 80); ctx.scale(s, s); ctx.drawImage(stills[k], -80, -80, 160, 160); ctx.restore();
      }
      const cnt = Math.max(1, nShow);
      ctx.save(); ctx.globalCompositeOperation = 'difference';
      T2(ctx, String(cnt).padStart(2, '0'), TW / 2, TH / 2 + 150, { size: 420, weight: 900, align: 'center' }); ctx.restore();
    },
    title(ctx, sh, u) {
      ctx.save(); ctx.globalAlpha = 0.13;
      for (let k = 0; k < 72; k++) { const x = (k % 12) * 160, y = 60 + Math.floor(k / 12) * 160 + Math.sin(k * 1.7 + u * 3) * 6; ctx.drawImage(stills[k], x, y, 160, 160); }
      ctx.restore();
      ctx.fillStyle = 'rgba(11,11,11,0.55)'; ctx.fillRect(0, 0, TW, TH);
      const a = ease(E.outExpo, 0, 0.12, u), b2 = ease(E.outCubic, 0.12, 0.3, u), c = ease(E.outCubic, 0.25, 0.45, u);
      ctx.save(); ctx.translate(TW / 2, 470); ctx.scale(lerp(1.3, 1, a), lerp(1.3, 1, a));
      T2(ctx, '黑白動態全書', 0, 0, { size: 170, family: F.tcBlack, weight: 900, align: 'center', alpha: a, spacing: 12 }); ctx.restore();
      T2(ctx, 'BLACK & WHITE MOTION', TW / 2, 590, { size: 64, weight: 800, align: 'center', spacing: 18 * b2 + 4, alpha: b2 });
      ctx.fillStyle = ink(c); ctx.fillRect(TW / 2 - 360 * c, 640, 720 * c, 3);
      T2(ctx, '72 techniques  ·  every pixel and every sound computed in code', TW / 2, 700, { size: 28, family: F.mono, align: 'center', alpha: c * 0.85 });
    },
    end(ctx, sh, u) {
      put(ctx, sh.ids[0], sh.t0[0] + u * sh.n * TBEAT, 420, 0, 1080, lerp(1, 1.04, u));
      const a = ease(E.outCubic, 0.05, 0.3, u);
      T2(ctx, 'frame', 60, 470, { size: 64, family: F.mono, weight: 500, alpha: a });
      T2(ctx, '= f(t)', 60, 560, { size: 92, weight: 800, alpha: a });
      T2(ctx, 'github.com/', 1500 + 360, 470, { size: 26, family: F.mono, align: 'right', alpha: a * 0.8 });
      T2(ctx, 'htlin222/', 1500 + 360, 510, { size: 26, family: F.mono, align: 'right', alpha: a * 0.8 });
      T2(ctx, 'mograph-library', 1500 + 360, 550, { size: 26, family: F.mono, align: 'right', alpha: a * 0.8 });
      const out = ease(E.inCubic, 0.7, 1, u); if (out > 0) { ctx.fillStyle = `rgba(11,11,11,${out})`; ctx.fillRect(0, 0, TW, TH); }
    },
  };

  const BUF = makeCanvas(TW, TH), bx = BUF.getContext('2d');
  T.render = function (out, i) {
    const t = i / FPS, b = t / TBEAT;
    const sh = PLAN.shots.find(s => b >= s.b - 1e-9 && b < s.b + s.n - 1e-9) || PLAN.shots[PLAN.shots.length - 1];
    const u = clamp((b - sh.b) / sh.n);
    const ctx = bx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = K; ctx.fillRect(0, 0, TW, TH);
    FG = P; BG = K;
    LAY[sh.lay](ctx, sh, u, b);
    // glitch: horizontal slices shoved sideways for one frame
    if (sh.fx.glitch && sh.fx.glitch.some(g => b >= g && b < g + 0.12)) {
      const snap = makeCanvas(TW, TH); snap.getContext('2d').drawImage(BUF, 0, 0);
      const r = rng(Math.floor(b * 8) + 7);
      for (let k = 0; k < 14; k++) { const y = r() * TH, h = 10 + r() * 70, dx = (r() - 0.5) * 260; ctx.drawImage(snap, 0, y, TW, h, dx, y, TW, h); }
    }
    if (sh.fx.invertOn && sh.fx.invertOn.some(g => b >= g && b < g + 0.5)) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = P; ctx.fillRect(0, 0, TW, TH); ctx.globalCompositeOperation = 'source-over'; }
    if (sh.lay !== 'title' && sh.lay !== 'mosaic') chrome(ctx, b);
    // white flash on the first frames of a marked shot
    if (sh.fx.flash) { const fl = 1 - clamp((b - sh.b) / 0.25); if (fl > 0) { ctx.fillStyle = `rgba(242,242,240,${fl})`; ctx.fillRect(0, 0, TW, TH); } }
    ctx.restore();
    out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.globalCompositeOperation = 'copy';
    out.filter = 'grayscale(1)'; out.drawImage(BUF, 0, 0); out.filter = 'none'; out.restore();
  };
  T.frames = Math.round(PLAN.beats * TBEAT * FPS);
})();
