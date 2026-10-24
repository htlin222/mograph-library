/* 11 流場 — particles follow a noise angle field, leaving hairline traces; knobs k and rotation. */
function tag(ctx, i, zh, en, a) {
  text(ctx, String(i).padStart(2, '0'), 60, 86, { size: 20, family: F.mono, weight: 500, alpha: 0.5 * a });
  text(ctx, zh, 100, 88, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 116 + w, 86, { size: 18, family: F.mono, spacing: 3, alpha: 0.5 * a });
}
const HZ = 30, NMAX = 3600, X0 = 40, Y0 = 130, X1 = 1040, Y1 = 940;   // particle box
const fnz = makeNoise(31);
/* parameters as a pure function of sim time */
const kOf = t => t < 8 ? 1 : t < 12 ? 3.2 : 1.8;
const rotOf = t => t < 12 ? 0 : 0.32 * (t - 12);
const nOf = t => t < 4 ? 260 : Math.round(lerp(260, NMAX, ease(E.outCubic, 4, 5.5, t)));
const SC = 0.0021;
const angle = (x, y, t) => fnz(x * SC, y * SC, 0.6 + t * 0.03) * TAU * kOf(t) + rotOf(t);
let trail, tx, P_;
const S = M.def({
  id: 'e11', num: 11, ch: 2, title: '流場', en: 'FLOW FIELD', dur: 20, ground: 'light',
  prompt: '白紙上做流場：先畫出 Perlin 雜訊角度場的指針，幾百顆粒子沿著走；4 秒後增加到 3600 顆，留下 1px 髮絲般的軌跡；8 秒把角度倍率 k 調到 3.2 變成漩渦；12 秒 k 回到 1.8，整個場每秒旋轉 0.32 弧度，累積成黑白版畫。',
  how: ['角度 = noise(x·s, y·s)·2π·k，粒子沿角度走', '每步畫一段 1px 線到軌跡畫布，30 Hz 固定步', 'k 調大出現漩渦；場加上 θ(t) 讓紋理彎曲'],
  practice: '把粒子速度改成跟雜訊值成正比，看疏密。',
  cues: [{ t: 4, type: 'whoosh', dur: 0.8 }, { t: 8, type: 'pop' }, { t: 12, type: 'tick' }, { t: 14, type: 'bell', i: 1, v: 0.4 }],
  init() { trail = makeCanvas(SW, SH); tx = trail.getContext('2d', { willReadFrequently: true }); },
  reset() {
    tx.fillStyle = bg(1); tx.fillRect(0, 0, SW, SH);
    const r = rng(1107); P_ = { x: new Float32Array(NMAX), y: new Float32Array(NMAX), life: new Float32Array(NMAX), r };
    for (let i = 0; i < NMAX; i++) { P_.x[i] = r.range(X0, X1); P_.y[i] = r.range(Y0, Y1); P_.life[i] = r.range(20, 220); }
  },
  frame(ctx, t) {
    M.sim(S, t, (dt, n, st) => {
      const tt = st + dt, N = nOf(tt), r = P_.r;
      // clear on the k change
      if (tt > 8 && tt <= 8.6) { tx.fillStyle = bg(0.22); tx.fillRect(0, 0, SW, SH); }
      else if (tt < 8) { tx.fillStyle = bg(0.03); tx.fillRect(0, 0, SW, SH); }
      else if (tt < 12) { tx.fillStyle = bg(0.012); tx.fillRect(0, 0, SW, SH); }
      else { tx.fillStyle = bg(0.006); tx.fillRect(0, 0, SW, SH); }
      tx.beginPath();
      const sp = tt < 4 ? 4.2 : 3.2;
      for (let i = 0; i < N; i++) {
        let x = P_.x[i], y = P_.y[i];
        const a = angle(x, y, tt), nx = x + Math.cos(a) * sp, ny = y + Math.sin(a) * sp;
        if (--P_.life[i] < 0 || nx < X0 || nx > X1 || ny < Y0 || ny > Y1) { P_.x[i] = r.range(X0, X1); P_.y[i] = r.range(Y0, Y1); P_.life[i] = r.range(40, 240); continue; }
        tx.moveTo(x, y); tx.lineTo(nx, ny); P_.x[i] = nx; P_.y[i] = ny;
      }
      tx.strokeStyle = fg(tt < 4 ? 0.9 : tt < 12 ? 0.32 : 0.2); tx.lineWidth = tt < 4 ? 2 : 1; tx.stroke();
    }, HZ);
    ctx.drawImage(trail, 0, 0);
    // needle field overlay
    const na = Math.max(1 - ease(E.inOutCubic, 5, 6.5, t), 0.85 * Math.min(ease(E.outCubic, 8, 8.4, t), 1 - ease(E.inCubic, 9.6, 10.6, t)), 0.85 * Math.min(ease(E.outCubic, 12, 12.4, t), 1 - ease(E.inCubic, 13.4, 14.2, t)));
    if (na > 0.01) {
      ctx.save(); ctx.strokeStyle = fg(0.55 * na); ctx.fillStyle = fg(0.7 * na); ctx.lineWidth = 2; ctx.beginPath();
      for (let gy = Y0 + 25; gy < Y1; gy += 50) for (let gx = X0 + 25; gx < X1; gx += 50) {
        const a = angle(gx, gy, t), c = Math.cos(a) * 15, s = Math.sin(a) * 15;
        ctx.moveTo(gx - c, gy - s); ctx.lineTo(gx + c, gy + s);
      }
      ctx.stroke(); ctx.beginPath();
      for (let gy = Y0 + 25; gy < Y1; gy += 50) for (let gx = X0 + 25; gx < X1; gx += 50) { const a = angle(gx, gy, t); ctx.moveTo(gx + Math.cos(a) * 15 + 3.5, gy + Math.sin(a) * 15); ctx.arc(gx + Math.cos(a) * 15, gy + Math.sin(a) * 15, 3.5, 0, TAU); }
      ctx.fill(); ctx.restore();
    }
    // heads in the first phase
    if (t < 6 && P_) {
      const ha = 1 - ease(E.inOutCubic, 4, 6, t); ctx.fillStyle = fg(ha); ctx.beginPath();
      for (let i = 0; i < 260; i++) { ctx.moveTo(P_.x[i] + 4.5, P_.y[i]); ctx.arc(P_.x[i], P_.y[i], 4.5, 0, TAU); }
      ctx.fill();
    }
    // header band & readouts (paper behind so trails don't fight the type)
    ctx.fillStyle = bg(1); ctx.fillRect(0, 0, SW, Y0 - 4); ctx.fillRect(0, Y1 + 4, SW, SH - Y1 - 4);
    const ph = t < 4 ? 0 : t < 8 ? 1 : t < 12 ? 2 : 3;
    const tags = [['角度場', 'ANGLE FIELD'], ['髮絲軌跡', 'HAIRLINE TRACES'], ['調高 k', 'TURBULENCE'], ['旋轉場', 'ROTATING FIELD']];
    const ta = ph === 0 ? 1 : ease(E.outCubic, ph * 4, ph * 4 + 0.3, t);
    tag(ctx, ph + 1, tags[ph][0], tags[ph][1], ta);
    text(ctx, 'angle = noise(x·s, y·s)·2π·k + θ', 60, 995, { size: 24, family: F.mono, weight: 500 });
    const ro = (str, x, on) => text(ctx, str, x, 1035, { size: 22, family: F.mono, alpha: on ? 1 : 0.4, weight: on ? 500 : 400 });
    ro(`N ${String(nOf(t)).padStart(4)}`, 60, t >= 4 && t < 6);
    ro(`k ${kOf(t).toFixed(1)}`, 260, t >= 8 && t < 12);
    ro(`θ ${rotOf(t).toFixed(2)} rad`, 400, t >= 12);
    ro(`s ${SC}`, 650, false);
  },
});
