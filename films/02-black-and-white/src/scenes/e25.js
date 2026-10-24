/* 25 動態字體 — a phrase choreographed word by word on the 120 BPM grid.
   A: one word per beat, scale contrast · B: justified lockup (wdth solved per line) · C: 中文九宮格 · payoff: weight on the beat. */
const SPACE = 230;                                   // space advance in font units
const advOf = (str, wd, wt) => { let a = 0; for (const ch of str) a += ch === ' ' ? SPACE : glyphAt(ch, wd, wt).adv; return a; };
/* draw a string with exact Archivo outlines; track = extra px between glyphs */
function drawWord(ctx, str, x, y, sc, wd, wt, track = 0) {
  ctx.beginPath(); let cx = x;
  for (const ch of str) { if (ch === ' ') { cx += SPACE * sc + track; continue; } const gl = glyphAt(ch, wd, wt); traceGlyph(ctx, gl, cx, y, sc); cx += gl.adv * sc + track; }
  ctx.fill();
}
const CAP = 686;
/* ---- section A: one word per beat (time, word, cap height px, wdth, entrance) ---- */
const A = [
  { t: 0.0, w: 'EVERY', cap: 250, wd: 62, fx: 'rise' },
  { t: 0.5, w: 'WORD', cap: 330, wd: 100, fx: 'zoom' },
  { t: 1.0, w: 'LANDS', cap: 280, wd: 80, fx: 'drop' },
  { t: 1.5, w: 'ON', cap: 80, wd: 125, fx: 'pop' },
  { t: 1.75, w: 'THE', cap: 80, wd: 125, fx: 'pop' },
  { t: 2.0, w: 'BEAT', cap: 0, wd: 125, fx: 'slam' },     // cap 0 → fill the stage width
];
/* ---- section B / payoff: the lockup. Target cap heights; wdth is solved so each line fills 940 px ---- */
const LOCK = [['EVERY', 104], ['WORD', 172], ['LANDS', 124], ['ON THE', 58], ['BEAT', 226]];
const LW = 940, LX = 70;
const TC = '每個字都踩在拍點上';
let lock = null, tiles = null;
function solveLock(wt) {
  let y = 0; const out = [];
  for (const [w, cap] of LOCK) {
    const sc = cap / CAP, need = LW / sc;          // font units the line must span
    let lo = 62, hi = 125;                          // bisection on wdth: advance grows with width
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (advOf(w, m, wt) < need) lo = m; else hi = m; }
    const wd = (lo + hi) / 2, a = advOf(w, wd, wt);
    const track = (LW - a * sc) / Math.max(1, w.length - 1);   // leftover → tracking, so the line justifies exactly
    y += cap; out.push({ w, cap, sc, wd, track, y }); y += 22;
  }
  return out;
}
const S = M.def({
  id: 'e25', num: 25, ch: 4, title: '動態字體', en: 'KINETIC TYPOGRAPHY', dur: 20, ground: 'dark',
  prompt: '把「EVERY WORD LANDS ON THE BEAT」在 120 BPM 上一拍一字地編舞：重要字放大、虛字縮小；再疊成左右對齊的字塊，每行用寬度軸撐滿；接著九個中文字逐拍砸進九宮格；最後字重隨拍點輪流脈衝。黑底白字。',
  how: ['每個字的進場時間都對齊 0.5 秒拍點，入場 outExpo', '字塊：字高固定，二分法解出 wdth 撐滿行寬，餘量給字距', '收尾：第 k 拍讓第 k 行 wght 300→900 再衰減'],
  practice: '把一句歌詞照拍點排成 8 秒的字卡動畫。',
  cues: [
    ...A.map(a => ({ t: a.t, type: a.fx === 'slam' ? 'impact' : a.fx === 'pop' ? 'tick' : 'pop', v: a.fx === 'slam' ? 0.8 : 0.6 })),
    ...[4, 4.5, 5, 5.5, 6].map(t => ({ t, type: 'pop', v: 0.5 })),
    ...[...TC].map((_, i) => ({ t: 8 + i * 0.5, type: i === 8 ? 'thud' : 'tick', v: 0.6 })),
    { t: 13.2, type: 'riser', t1: 14 }, { t: 14, type: 'impact', v: 0.8 },
  ],
  init() {
    lock = solveLock(820);
    // cache each 中文 glyph once (2× res, white-on-clear and black-on-white tile) — big CJK text is expensive to re-rasterise every frame
    tiles = [...TC].map(ch => [false, true].map(live => { const c = makeCanvas(540, 540), x = c.getContext('2d');
      if (live) { x.fillStyle = P; x.fillRect(12, 12, 516, 516); }
      x.scale(2, 2); text(x, ch, 135, 135 + 82, { size: 232, family: F.tcBlack, weight: 900, align: 'center', color: live ? K : P }); return c; }));
  },
  frame(ctx, t) {
    const beat = Math.floor(t / BEAT), inBar = beat % 4, bar = Math.floor(beat / 4);
    let label = '', invert = false;
    const payoff = t >= 14;
    /* ---------- payoff ground: a white plate wipes up on the downbeat at 14 s ---------- */
    if (payoff) {
      const wp = ease(E.inOutExpo, 13.75, 14.0, t);
      ctx.fillStyle = P; ctx.fillRect(0, SH * (1 - wp), SW, SH * wp); invert = wp >= 1;
    }
    const ink = invert ? K : P, inkA = a => invert ? `rgba(11,11,11,${a})` : `rgba(242,242,240,${a})`;
    ctx.fillStyle = ink;
    if (t < 4) {
      /* ---------- A: one word per beat ---------- */
      label = '01  一拍一字 · ONE WORD PER BEAT';
      let cur = 0; for (let i = 0; i < A.length; i++) if (t >= A[i].t) cur = i;
      const a = A[cur], u = t - a.t;
      let cap = a.cap, wd = a.wd; const wt = a.fx === 'pop' ? 500 : 900;
      cap = Math.min(cap || 1e9, 940 / advOf(a.w, wd, wt) * CAP);
      let sc = cap / CAP;
      const wpx = advOf(a.w, wd, wt) * sc;
      let x = (SW - wpx) / 2, y = 540 + cap / 2, s = 1, alpha = 1, clip = null;
      if (a.fx === 'rise') { const k = ease(E.outExpo, 0, 0.35, u); y += (1 - k) * cap * 1.1; clip = [0, 540 - cap / 2 - 10, SW, cap + 20]; }
      if (a.fx === 'zoom') { s = lerp(1.9, 1, ease(E.outExpo, 0, 0.4, u)); }
      if (a.fx === 'drop') { const k = ease(E.outBounce, 0, 0.42, u); y = lerp(-40, y, k); }
      if (a.fx === 'pop') { s = lerp(0.2, 1, ease(E.outBack, 0, 0.2, u)); }
      if (a.fx === 'slam') {
        s = lerp(3.2, 1, ease(E.outExpo, 0, 0.3, u));
        const flash = 1 - ease(E.outCubic, 0, 0.25, u);                      // a one-frame-ish negative on the downbeat
        if (flash > 0) { ctx.fillStyle = `rgba(242,242,240,${flash})`; ctx.fillRect(0, 0, SW, SH); }
        ctx.fillStyle = flash > 0.5 ? K : P;
        // pulse on every following beat
        const bu = (t - 2) % BEAT; s *= 1 + 0.035 * Math.exp(-bu * 12) * (t > 2.4 ? 1 : 0);
      }
      ctx.save();
      if (clip) { ctx.beginPath(); ctx.rect(...clip); ctx.clip(); }
      ctx.translate(SW / 2, 540); ctx.scale(s, s); ctx.translate(-SW / 2, -540);
      ctx.globalAlpha = alpha;
      drawWord(ctx, a.w, x, y, sc, wd, wt);
      ctx.restore();
      // previous small words linger as context during "ON THE"
      if (cur === 4) { ctx.fillStyle = fg(0.45); drawWord(ctx, 'ON', SW / 2 - advOf('ON', 125, 500) * 80 / CAP / 2, 540 + 40 - 110, 80 / CAP, 125, 500); }
      text(ctx, `${a.w}  cap ${Math.round(cap)}px · wdth ${wd} · ${a.fx}`, 70, 950, { size: 20, family: F.mono, alpha: 0.6, color: P });
    } else if (t < 8) {
      /* ---------- B: lockup ---------- */
      label = '02  尺寸對比字塊 · SCALE-CONTRAST LOCKUP';
      const top = 100;
      lock.forEach((L, i) => {
        const t0 = 4 + i * 0.5, k = ease(E.outExpo, t0, t0 + 0.45, t);
        if (k <= 0) return;
        const dir = i % 2 ? 1 : -1, x = LX + dir * (1 - k) * 700;
        ctx.save(); ctx.beginPath(); ctx.rect(0, top + L.y - L.cap - 4, SW, L.cap + 8); ctx.clip();
        ctx.fillStyle = P; drawWord(ctx, L.w, x, top + L.y, L.sc, L.wd, 820, L.track); ctx.restore();
        // measurement guides
        const ga = ease(E.outCubic, 6.0 + i * 0.12, 6.4 + i * 0.12, t);
        if (ga > 0) {
          ctx.fillStyle = fg(0.35 * ga); ctx.fillRect(LX - 30, top + L.y - L.cap, 14, 1.5); ctx.fillRect(LX - 30, top + L.y, 14, 1.5); ctx.fillRect(LX - 24, top + L.y - L.cap, 1.5, L.cap);
        }
      });
      // readout column (right side would collide with type → print under the block)
      const ra = ease(E.outCubic, 6.2, 6.8, t);
      text(ctx, 'wdth  ' + lock.map(L => `${L.w.replace(' ', '·')} ${L.wd.toFixed(0)}`).join('   '), 70, 950, { size: 19, family: F.mono, alpha: 0.6 * ra, color: P });
    } else if (t < 14) {
      /* ---------- C: 中文九宮格, one character per beat ---------- */
      label = '03  中文逐拍 · 3×3 GRID ON THE BEAT';
      const cs = 270, gx = (SW - cs * 3) / 2, gy = 120;
      const out = ease(E.inExpo, 13.0, 13.75, t);
      for (let i = 0; i < 9; i++) {
        const t0 = 8 + i * 0.5; if (t < t0) continue;
        const c = i % 3, r = Math.floor(i / 3), u = t - t0;
        const cx = gx + c * cs + cs / 2, cy = gy + r * cs + cs / 2;
        const sc = lerp(2.4, 1, ease(E.outExpo, 0, 0.3, u)) * (1 - ease(E.inBack, 13.0 + (8 - i) * 0.06, 13.5 + (8 - i) * 0.06, t));
        const live = u < BEAT;                                   // the character on the current beat is a solid tile
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        ctx.drawImage(tiles[i][live ? 1 : 0], -cs / 2, -cs / 2, cs, cs);
        ctx.restore();
      }
      // grid hairlines
      ctx.fillStyle = fg(0.18 * (1 - out));
      for (let k = 0; k <= 3; k++) { ctx.fillRect(gx + k * cs, gy, 1, cs * 3); ctx.fillRect(gx, gy + k * cs, cs * 3, 1); }
      text(ctx, `t0 = 8.0 + i × 0.5 s   ·   scale 2.4 → 1   outExpo 0.3 s`, 70, 960, { size: 19, family: F.mono, alpha: 0.6 * (1 - out), color: P });
    }
    if (payoff) {
      /* ---------- payoff: weight on the beat, rippling down the lockup ---------- */
      label = '04  字重踩拍 · WEIGHT ON THE BEAT';
      const top = 100;
      const settle = ease(E.inOutCubic, 18.5, 19.4, t);
      lock.forEach((L, i) => {
        // which beat hits this line: beats cycle down the lines
        const bb = Math.floor((t - 14) / BEAT), since = (t - 14) - bb * BEAT;
        const hit = (bb % LOCK.length) === i ? Math.exp(-since * 7) : 0;
        const prev = ((bb - 1) % LOCK.length + LOCK.length) % LOCK.length === i ? Math.exp(-(since + BEAT) * 7) : 0;
        let wt = lerp(300, 900, Math.max(hit, prev)); wt = lerp(wt, 900, settle);
        const a = advOf(L.w, L.wd, wt), track = (LW - a * L.sc) / Math.max(1, L.w.length - 1);
        const k = ease(E.outExpo, 14.0 + i * 0.08, 14.5 + i * 0.08, t);
        ctx.save(); ctx.beginPath(); ctx.rect(0, top + L.y - L.cap - 4, SW, L.cap + 8); ctx.clip();
        ctx.fillStyle = K; drawWord(ctx, L.w, LX, top + L.y + (1 - k) * (L.cap + 10), L.sc, L.wd, wt, track);
        ctx.restore();
      });
      text(ctx, '每個字都踩在拍點上', 70, 960, { size: 30, family: F.tc, color: K, alpha: ease(E.outCubic, 15, 15.6, t) });
    }
    /* ---------- chrome: section label, bar/beat counter, beat ruler ---------- */
    const chrome = payoff && invert ? K : P;
    text(ctx, label, 44, 64, { size: 20, family: F.mono, weight: 500, color: chrome, alpha: 0.85, spacing: 1 });
    text(ctx, `BAR ${bar + 1} · BEAT ${inBar + 1}`, SW - 44, 64, { size: 20, family: F.mono, weight: 500, color: chrome, align: 'right', alpha: 0.85 });
    // beat ruler: 40 beats; events of the current section marked
    const rx = 44, rw = SW - 88, ry = 1030;
    for (let b = 0; b < 40; b++) {
      const x = rx + rw * b / 39, down = b % 4 === 0, past = b <= beat;
      ctx.fillStyle = chrome === P ? `rgba(242,242,240,${past ? 0.9 : 0.25})` : `rgba(11,11,11,${past ? 0.9 : 0.25})`;
      ctx.fillRect(x - 1, ry - (down ? 18 : 9), 2, down ? 18 : 9);
    }
    const px = rx + rw * clamp(t / BEAT / 39); ctx.fillStyle = chrome; ctx.fillRect(px - 1.5, ry - 30, 3, 36);
    const pulse = Math.exp(-((t % BEAT)) * 10);
    ctx.beginPath(); ctx.arc(SW - 238, 57, 4 + 5 * pulse, 0, TAU); ctx.fill();
  },
});
