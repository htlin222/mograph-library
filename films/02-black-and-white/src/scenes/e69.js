/* 69 音訊視覺化 — a synthetic 120 BPM track (same arrangement as chapter 9's music: E dorian, four-on-the-floor,
   clap on 2 & 4, 16th hats, eighth bass; drums enter after 2 bars) is turned into an analytic spectrum S(f, t).
   64 log-spaced bars morph from a line into a circle; a scrolling envelope and an oscilloscope follow. */
const NB = 64, F0 = 30, F1 = 16000;
const FREQ = Array.from({ length: NB }, (_, i) => F0 * Math.pow(F1 / F0, i / (NB - 1)));
const LF = FREQ.map(f => Math.log2(f));
const KEY = 40, ROOTS = [0, 5, 0, -2], PAD = [[12, 15, 19, 22, 26], [7, 11, 14, 17, 21], [12, 15, 19, 22, 26], [14, 17, 21, 24, 28]];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const DRUMS = 4.0;
function voices(t) {                                     // envelopes of every voice at time t
  const beat = t / 0.5, bi = Math.floor(beat), db = (beat - bi) * 0.5;
  const drums = t >= DRUMS;
  const kick = drums ? Math.exp(-db * 11) : 0;
  const clap = drums && bi % 2 === 1 ? Math.exp(-db * 10) : 0;
  const s16 = t / 0.125, d16 = (s16 - Math.floor(s16)) * 0.125;
  const hat = drums ? Math.exp(-d16 * 45) * (Math.floor(s16) % 2 ? 1 : 0.55) : 0;
  const e8 = t / 0.25, d8 = (e8 - Math.floor(e8)) * 0.25;
  const bar = Math.floor(t / 2) % 4;
  const bass = 0.35 + 0.65 * Math.exp(-d8 * 7);
  const bassF = mtof(KEY + ROOTS[bar] + (Math.floor(e8) % 4 === 2 ? 12 : 0));
  const pad = 0.75 + 0.25 * Math.sin(t * 1.3);
  const padF = PAD[bar].map(n => mtof(KEY + ROOTS[bar] + n));
  return { kick, clap, hat, bass, bassF, pad, padF, db, drums, bi };
}
const pk = (lf, lf0, w) => { const d = (lf - lf0) / w; return Math.exp(-d * d); };
function spectrum(t, out) {
  const v = voices(t), lb = Math.log2(v.bassF), lp = v.padF.map(Math.log2);
  for (let i = 0; i < NB; i++) {
    const lf = LF[i];
    let s = 0.04 + 0.03 * (noise(i * 0.31, t * 3) + 0.5);
    s += v.kick * (1.25 * pk(lf, 5.8, 0.75) + 0.4 * pk(lf, 7.2, 0.6));
    s += v.clap * (0.5 * pk(lf, 8.0, 0.6) + 0.55 * pk(lf, 11.0, 1.7));
    s += v.hat * 0.7 * pk(lf, 13.3, 0.7);
    s += v.bass * (0.8 * pk(lf, lb, 0.14) + 0.4 * pk(lf, lb + 1, 0.12) + 0.2 * pk(lf, lb + 1.58, 0.12));
    for (let k = 0; k < 5; k++) s += v.pad * 0.28 * (pk(lf, lp[k], 0.07) + 0.4 * pk(lf, lp[k] + 1, 0.07));
    s *= 1 - 0.3 * clamp((lf - 12) / 2);
    out[i] = 1 - Math.exp(-1.7 * s);
  }
  return out;
}
const BUF = new Float32Array(NB), PBUF = new Float32Array(NB), CAP = new Float32Array(NB);
function caps(t) {                                       // peak-hold with gravity, as a pure function of the past 0.6 s
  CAP.fill(0);
  for (let k = 0; k <= 18; k++) {
    const tau = k / 30; if (t - tau < 0) break;
    spectrum(t - tau, PBUF);
    const drop = 2.4 * Math.max(0, tau - 0.12) ** 2;
    for (let i = 0; i < NB; i++) CAP[i] = Math.max(CAP[i], PBUF[i] - drop);
  }
  return CAP;
}
function envelope(t) { const v = voices(t); return clamp(0.12 + 0.55 * v.kick + 0.35 * v.clap + 0.08 * v.hat + 0.12 * v.bass + 0.06 * v.pad, 0, 1); }
function scope(t, tau) {                                 // waveform sample at t + tau (tau in s, small)
  const v = voices(t), dt = v.db + tau;
  let y = 0;
  if (v.drums) y += v.kick * 0.8 * Math.sin(TAU * (50 * dt + 5 * (1 - Math.exp(-20 * dt))));
  const ph = (t + tau) * v.bassF; y += 0.28 * v.bass * (Math.sin(TAU * ph) + 0.5 * Math.sin(TAU * 2 * ph) + 0.25 * Math.sin(TAU * 3 * ph));
  for (let k = 0; k < 3; k++) y += 0.06 * Math.sin(TAU * v.padF[k] * (t + tau));
  if (v.clap > 0.02) y += v.clap * 0.35 * (fract(Math.sin((t + tau) * 91731.7) * 43758.5) - 0.5) * 2;
  return y;
}

M.def({
  id: 'e69', num: 69, ch: 9, title: '音訊視覺化', en: 'AUDIO VISUALIZER', dur: 20, ground: 'light',
  prompt: '白底黑色音訊視覺化，訊號自己合成：120 BPM、四拍大鼓、二四拍拍手、十六分音符踩鈸、八分音符貝斯，前 2 小節沒鼓。64 根對數頻段長條加峰值帽，再彎成圓形；接著捲動波形與示波器；最後全部疊成一個會呼吸的圓。',
  how: ['頻譜是解析式 S(f,t)：每個聲部在 log f 上一個高斯峰', '峰值帽 = 過去 0.6 秒 max(值 − 重力·τ²)', '長條第 i 根：直線位置與角度 θᵢ 用彈簧插值'],
  practice: '把大鼓改成只在一、三拍，看圓怎麼呼吸。',
  cues: [{ t: DRUMS, type: 'impact', v: 0.5 }, { t: 5.0, type: 'whoosh', dur: 0.5, v: 0.4 }, { t: 10.0, type: 'whoosh', dur: 0.4, v: 0.4 }, { t: 14.0, type: 'whoosh', dur: 0.5, v: 0.5 }],
  frame(ctx, t) {
    const v = voices(t), S = spectrum(t, BUF);
    const m = spring(t - 5.0, 140, 20);                                   // line → circle
    const kc = spring(t - 10.0, 160, 22) - spring(t - 14.0, 120, 18);     // compact layout for section C
    const big = spring(t - 14.0, 120, 18);
    const pulse = 1 + 0.07 * v.kick;
    const cx = 540, cy = lerp(560, 290, kc) - 20 * big, R0 = (lerp(210, 105, kc) + 25 * big) * pulse, hs = lerp(1, 0.42, kc);
    // ---------- bars ----------
    const C = m > 0.001 ? null : caps(t);
    const bw = 11, x0 = 72, span = 936, base = 780, H = 560;
    ctx.fillStyle = K;
    for (let side = 0; side < (m > 0.001 ? 2 : 1); side++) {
      for (let i = 0; i < NB; i++) {
        const h = Math.max(4, S[i] * H);
        const lx = x0 + span * (i + 0.5) / NB, ly = base;
        const u = (i + 0.5) / NB, th = side ? Math.PI / 2 + u * Math.PI - TAU : Math.PI / 2 - u * Math.PI;   // bass at the bottom, mirrored
        const px = lerp(lx, cx + Math.cos(th) * R0, m), py = lerp(ly, cy + Math.sin(th) * R0, m);
        const ang = lerp(-Math.PI / 2, th, m), len = lerp(h, h * 0.42 * hs, m), wid = lerp(bw, 7 * (0.8 + 0.4 * hs), m);
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang + Math.PI / 2);
        ctx.beginPath(); ctx.roundRect(-wid / 2, -len, wid, len, wid / 2); ctx.fill();
        ctx.restore();
        if (C && side === 0) ctx.fillRect(lx - bw / 2, base - C[i] * H - 12, bw, 4);
      }
    }
    // ---------- linear chrome ----------
    const la = 1 - clamp(m * 3);
    if (la > 0) {
      ctx.save(); ctx.globalAlpha = la;
      ctx.fillStyle = g(0, 0.5); ctx.fillRect(x0, base + 10, span, 2);
      for (const [f, s] of [[50, '50'], [100, '100'], [500, '500'], [1000, '1k'], [5000, '5k'], [10000, '10k']]) {
        const x = x0 + span * (Math.log2(f / F0) / Math.log2(F1 / F0) * (NB - 1) + 0.5) / NB;
        ctx.fillRect(x - 1, base + 10, 2, 12); text(ctx, s, x, base + 50, { size: 19, family: F.mono, align: 'center', alpha: 0.6 });
      }
      text(ctx, 'Hz · log', x0 + span, base + 84, { size: 19, family: F.mono, align: 'right', alpha: 0.45 });
      const da = ease(E.outCubic, DRUMS, DRUMS + 0.2, t) * (1 - ease(E.inCubic, 4.6, 5.0, t));
      if (da > 0) { ctx.fillStyle = K; ctx.beginPath(); ctx.roundRect(x0, 150, 250, 50, 25); ctx.globalAlpha = la * da; ctx.fill(); text(ctx, '鼓進場  DRUMS IN', x0 + 125, 184, { size: 24, family: F.tc, align: 'center', color: P }); }
      ctx.restore();
    }
    // ---------- centre disc (circle modes) ----------
    if (m > 0.01) {
      ctx.save(); ctx.globalAlpha = clamp(m * 1.5);
      ctx.fillStyle = K; ctx.beginPath(); ctx.arc(cx, cy, R0 * (0.55 + 0.12 * v.kick), 0, TAU); ctx.fill();
      // oscilloscope wrapped around a ring inside the disc (payoff)
      if (big > 0.01) {
        ctx.strokeStyle = P; ctx.lineWidth = 3; ctx.globalAlpha *= clamp(big); ctx.beginPath();
        const rr = R0 * 0.38;
        for (let k = 0; k <= 240; k++) { const a = k / 240 * TAU, y = scope(t, k / 240 * 0.03); const r = rr + y * R0 * 0.12; const X = cx + Math.cos(a - Math.PI / 2) * r, Y = cy + Math.sin(a - Math.PI / 2) * r; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    }
    // ---------- section C: scrolling envelope + oscilloscope ----------
    const ca = clamp(kc * 1.4);
    if (ca > 0.01) {
      ctx.save(); ctx.globalAlpha = ca;
      const ex = 72, ew = 936, ey = 610, eh = 120, win = 4;
      for (let b = 0; b <= 8; b++) {                                     // beat grid
        const tb = (Math.floor(t / 0.5) - b) * 0.5, x = ex + ew * (1 - (t - tb) / win);
        if (x < ex) continue; const down = Math.round(tb / 0.5) % 4 === 0;
        ctx.fillStyle = g(0, down ? 0.4 : 0.14); ctx.fillRect(x, ey - eh / 2 - 10, down ? 2 : 1, eh + 20);
      }
      for (let k = 0; k < 120; k++) {
        const tt = t - win + win * k / 120; if (tt < 0) continue;
        const a = envelope(tt) * eh / 2, x = ex + ew * k / 120;
        ctx.fillStyle = K; ctx.fillRect(x, ey - a, ew / 120 - 2.5, a * 2);
      }
      ctx.fillStyle = K; ctx.fillRect(ex + ew - 2, ey - eh / 2 - 16, 3, eh + 32);
      text(ctx, '包絡 ENVELOPE · 最近 4 秒', ex, ey - eh / 2 - 24, { size: 20, family: F.tc, alpha: 0.6 });
      const sy = 860, sh = 90;
      ctx.strokeStyle = g(0, 0.2); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, sy); ctx.lineTo(ex + ew, sy); ctx.stroke();
      ctx.strokeStyle = K; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let k = 0; k <= 360; k++) { const y = scope(t, k / 360 * 0.03); const X = ex + ew * k / 360, Y = sy - y * sh; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.stroke();
      text(ctx, '示波器 SCOPE · 30 ms 視窗', ex, sy - sh - 18, { size: 20, family: F.tc, alpha: 0.6 });
      ctx.restore();
    }
    // ---------- labels & beat counter ----------
    const sec = t < 5 ? 0 : t < 10 ? 1 : t < 14 ? 2 : 3, st = [0, 5, 10, 14][sec];
    const labels = [['01', '頻譜', '64 根對數頻段 · 峰值帽'], ['02', '環形', '第 i 根 → 角度 θᵢ，左右鏡像'], ['03', '波形', '同一訊號的時域樣子'], ['04', '全部', '頻譜環 + 示波環 + 大鼓脈衝']];
    const [n, zh, sub] = labels[sec], a = ease(E.outCubic, st, st + 0.4, t);
    text(ctx, n, 72, 78, { size: 22, family: F.mono, weight: 500, alpha: 0.5 * a });
    text(ctx, zh, 116, 80, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
    text(ctx, sub, 72, 118, { size: 22, family: F.tc, alpha: 0.6 * a });
    const beatIn = Math.floor(t / 0.5) % 4;
    for (let k = 0; k < 4; k++) {
      const x = 880 + k * 36, on = k === beatIn;
      ctx.fillStyle = on ? K : g(0, 0.15); ctx.beginPath(); ctx.arc(x, 70, on ? 11 : 8, 0, TAU); ctx.fill();
    }
    text(ctx, `120 BPM · bar ${Math.floor(t / 2) + 1}`, 1008, 118, { size: 20, family: F.mono, weight: 500, align: 'right', alpha: 0.6 });
  },
});
