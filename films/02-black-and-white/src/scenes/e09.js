/* 09 振盪與諧振圖 — sine → Lissajous → damping → harmonograph, drawn as a pen. */
const CX = 540, CY = 540;
/* section label: index · 中文 · EN */
function tag(ctx, i, zh, en, a) {
  text(ctx, String(i).padStart(2, '0'), 60, 86, { size: 20, family: F.mono, weight: 500, alpha: 0.5 * a });
  text(ctx, zh, 100, 88, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 116 + w, 86, { size: 18, family: F.mono, spacing: 3, alpha: 0.5 * a });
}
const win = (t, a, b, f = 0.3) => Math.min(ease(E.outCubic, a, a + f, t), 1 - ease(E.inCubic, b - f, b, t));
/* oscillator A: frequency steps on the bar, amplitude eases */
const fA = t => (t < 2 ? 0.5 : 1.5);
const phA = t => (t < 2 ? 0.5 * t : 1 + 1.5 * (t - 2));               // ∫ f dt (cycles)
const ampA = t => lerp(210, 130, ease(E.inOutCubic, 2, 2.5, t));
/* Lissajous ratios per bar */
const RAT = [[1, 2, 4.0], [3, 2, 6.0], [3, 4, 8.0]];
function ratio(t) {
  let a = RAT[0][0], b = RAT[0][1];
  for (let i = 1; i < RAT.length; i++) { const k = ease(E.inOutCubic, RAT[i][2] - 0.25, RAT[i][2] + 0.25, t); a = lerp(a, RAT[i][0], k); b = lerp(b, RAT[i][1], k); }
  return [a, b];
}
/* harmonograph: two damped pendulums per axis */
const HG = { A: [250, 170, 250, 170], f: [2.003, 3, 3, 2.002], p: [0, 1.4, 0.6, 2.9], d: [0.0021, 0.0016, 0.0019, 0.0024] };
const hx = τ => HG.A[0] * Math.sin(HG.f[0] * τ + HG.p[0]) * Math.exp(-HG.d[0] * τ) + HG.A[1] * Math.sin(HG.f[1] * τ + HG.p[1]) * Math.exp(-HG.d[1] * τ);
const hy = τ => HG.A[2] * Math.sin(HG.f[2] * τ + HG.p[2]) * Math.exp(-HG.d[2] * τ) + HG.A[3] * Math.sin(HG.f[3] * τ + HG.p[3]) * Math.exp(-HG.d[3] * τ);
const HMAX = 640, HC = { c: null, τ: 0 };

M.def({
  id: 'e09', num: 9, ch: 2, title: '振盪與諧振圖', en: 'OSCILLATION & HARMONOGRAPH', dur: 20, ground: 'light',
  prompt: '黑白、白紙黑線。先畫一個正弦振盪器與旋轉相量，紙帶記錄波形；再把兩個振盪器接成 x、y 畫出李薩如圖形，頻率比每小節換 1:2、3:2、3:4；最後加上指數阻尼，四個擺的諧振圖像筆一樣慢慢畫完。',
  how: ['y = A·sin(2πft+φ)，A 與 f 在小節點切換', 'x 與 y 各一個振盪器，頻率比 a:b 決定圖形', '每項乘 e^(−d·t)，四個擺略微失諧 2.003:3'],
  practice: '把頻率比改成 5:4，再讓 φ 隨時間慢慢轉。',
  cues: [{ t: 2, type: 'tick' }, { t: 4, type: 'pop' }, { t: 6, type: 'tick' }, { t: 8, type: 'tick' }, { t: 10, type: 'pop' }, { t: 12, type: 'tick' }, { t: 14, type: 'bell', i: 2, v: 0.5 }],
  frame(ctx, t) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    /* ---------- 1. sine oscillator + phasor + chart recorder (0–4.3) ---------- */
    let a = win(t, -1, 4.3);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      tag(ctx, 1, '正弦振盪', 'SINE OSCILLATOR', 1);
      const pcx = 270, px = 540, A = ampA(t), ph = phA(t) * TAU;
      // phasor circle
      ctx.strokeStyle = fg(0.25); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(pcx, CY, A, 0, TAU); ctx.stroke();
      const qx = pcx + A * Math.cos(ph), qy = CY - A * Math.sin(ph);
      ctx.strokeStyle = fg(1); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pcx, CY); ctx.lineTo(qx, qy); ctx.stroke();
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(pcx, CY, 5, 0, TAU); ctx.fill();
      // projection line
      ctx.setLineDash([6, 8]); ctx.strokeStyle = fg(0.45); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, qy); ctx.stroke(); ctx.setLineDash([]);
      // axis + paper
      ctx.fillStyle = fg(0.2); ctx.fillRect(px, CY, 500, 1.5);
      ctx.fillStyle = fg(0.9); ctx.fillRect(px - 1, CY - 250, 2, 500);
      // trace: x = px + (t - t')·speed
      const sp = 170; ctx.strokeStyle = fg(1); ctx.lineWidth = 4; ctx.beginPath();
      for (let x = 0; x <= 500; x += 3) { const tp = t - x / sp; if (tp < 0) break; const y = CY - ampA(tp) * Math.sin(phA(tp) * TAU); x ? ctx.lineTo(px + x, y) : ctx.moveTo(px + x, y); }
      ctx.stroke();
      // second ticks on the paper
      for (let k = Math.ceil(t - 500 / sp); k <= t; k++) { if (k < 0) continue; const x = px + (t - k) * sp; ctx.fillStyle = fg(0.5); ctx.fillRect(x, CY + 262, 1.5, 14); text(ctx, k + 's', x, CY + 302, { size: 18, family: F.mono, align: 'center', alpha: 0.45 }); }
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(px, qy, 11, 0, TAU); ctx.fill();
      text(ctx, 'y = A · sin(2π·f·t + φ)', 60, 970, { size: 30, family: F.mono, weight: 500 });
      text(ctx, `A ${A.toFixed(0).padStart(3)} px    f ${fA(t).toFixed(1)} Hz`, 60, 1015, { size: 22, family: F.mono, alpha: 0.6 });
      ctx.restore();
    }
    /* ---------- 2. Lissajous (4.3–10) ---------- */
    a = win(t, 4.3, 10);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      tag(ctx, 2, '李薩如圖形', 'LISSAJOUS', 1);
      const [fa, fb] = ratio(t), R = 280, cx = 600, cy = 560, phi = 0.5 * Math.PI + 0.35 * (t - 4.3);
      const τ = (t - 4.3) * Math.PI, X = s => cx + R * Math.sin(fa * s + phi), Y = s => cy - R * Math.sin(fb * s);
      // frame
      ctx.strokeStyle = fg(0.15); ctx.lineWidth = 1.5; ctx.strokeRect(cx - R, cy - R, 2 * R, 2 * R);
      // full figure, faint
      ctx.strokeStyle = fg(0.22); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 720; i++) { const s = i / 720 * TAU; i ? ctx.lineTo(X(s), Y(s)) : ctx.moveTo(X(s), Y(s)); }
      ctx.stroke();
      // pen trail
      ctx.strokeStyle = fg(1); ctx.lineWidth = 5; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const s = τ - 1.6 + 1.6 * i / 60; i ? ctx.lineTo(X(s), Y(s)) : ctx.moveTo(X(s), Y(s)); }
      ctx.stroke();
      const x = X(τ), y = Y(τ);
      // rails
      const ry = 170, rx = 170;
      ctx.fillStyle = fg(0.3); ctx.fillRect(cx - R, ry, 2 * R, 2); ctx.fillRect(rx, cy - R, 2, 2 * R);
      ctx.setLineDash([5, 7]); ctx.strokeStyle = fg(0.4); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, y); ctx.moveTo(rx, y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = fg(1);
      ctx.beginPath(); ctx.arc(x, ry + 1, 10, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(rx + 1, y, 10, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
      text(ctx, `x : a = ${fa.toFixed(fa % 1 ? 2 : 0)}`, cx + R, ry - 20, { size: 20, family: F.mono, align: 'right', alpha: 0.6 });
      ctx.save(); ctx.translate(rx - 22, cy + R); ctx.rotate(-Math.PI / 2); text(ctx, `y : b = ${fb.toFixed(fb % 1 ? 2 : 0)}`, 0, 0, { size: 20, family: F.mono, alpha: 0.6 }); ctx.restore();
      // big ratio readout
      const ra = Math.round(fa), rb = Math.round(fb), settled = Math.abs(fa - ra) < 0.02 && Math.abs(fb - rb) < 0.02;
      text(ctx, settled ? `${ra} : ${rb}` : '· · ·', 60, 980, { size: 64, family: F.latin, weight: 800 });
      text(ctx, `a : b    φ = ${(phi / Math.PI % 2).toFixed(2)}π`, 60, 1020, { size: 22, family: F.mono, alpha: 0.6 });
      text(ctx, 'x = sin(a·t + φ)   y = sin(b·t)', 1020, 1020, { size: 22, family: F.mono, align: 'right', alpha: 0.6 });
      ctx.restore();
    }
    /* ---------- 3. damping (10–14) ---------- */
    a = win(t, 10, 13.9, 0.2);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      tag(ctx, 3, '阻尼', 'DAMPING  e^(−d·t)', 1);
      const second = t >= 12, d = second ? 0.06 : 0.012, t0 = second ? 12 : 10;
      const τm = 60 * ease(E.outQuad, t0, t0 + 1.8, t), R = 330, cx = 540, cy = 520;
      const X = s => cx + R * Math.exp(-d * s) * Math.sin(2 * s + 0.4), Y = s => cy - R * Math.exp(-d * s) * Math.sin(3.02 * s);
      ctx.strokeStyle = fg(0.9); ctx.lineWidth = 1.6; ctx.beginPath();
      const n = Math.ceil(τm / 0.04);
      for (let i = 0; i <= n; i++) { const s = τm * i / Math.max(1, n); i ? ctx.lineTo(X(s), Y(s)) : ctx.moveTo(X(s), Y(s)); }
      ctx.stroke();
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(X(τm), Y(τm), 10, 0, TAU); ctx.fill();
      // envelope plot
      const ex = 640, ey = 900, ew = 380, eh = 100;
      ctx.fillStyle = fg(0.3); ctx.fillRect(ex, ey + eh, ew, 1.5); ctx.fillRect(ex, ey, 1.5, eh);
      ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const s = 60 * i / 200, v = Math.exp(-d * s) * Math.sin(3.02 * s); i ? ctx.lineTo(ex + ew * i / 200, ey + eh / 2 - v * eh / 2) : ctx.moveTo(ex, ey + eh / 2); }
      ctx.stroke();
      ctx.strokeStyle = fg(1); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const s = 60 * i / 100; const y = ey + eh / 2 - Math.exp(-d * s) * eh / 2; i ? ctx.lineTo(ex + ew * i / 100, y) : ctx.moveTo(ex, y); }
      ctx.stroke();
      ctx.fillStyle = fg(1); ctx.fillRect(ex + ew * τm / 60 - 1, ey - 6, 2, eh + 12);
      text(ctx, `d = ${d.toFixed(3)}`, 60, 980, { size: 56, family: F.latin, weight: 800 });
      text(ctx, second ? '阻尼大：很快收束' : '阻尼小：繞很多圈', 60, 1022, { size: 24, family: F.tc, alpha: 0.65 });
      ctx.restore();
    }
    /* ---------- 4. harmonograph (14–20) ---------- */
    a = ease(E.outCubic, 13.9, 14.15, t);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      tag(ctx, 4, '諧振圖', 'HARMONOGRAPH · 4 PENDULUMS', 1);
      const τm = HMAX * ease(E.inOutSine, 14, 19.4, t), cx = 540, cy = 540, dτ = 0.045;
      // incremental pen: opaque ink into a cache canvas, only the new arc each frame (reset on rewind)
      if (!HC.c) { HC.c = makeCanvas(SW, SH); HC.x = HC.c.getContext('2d', { willReadFrequently: true }); }
      if (τm < HC.τ - 1e-9) { HC.x.clearRect(0, 0, SW, SH); HC.τ = 0; }
      if (τm > HC.τ) {
        const x = HC.x; x.strokeStyle = fg(1); x.lineWidth = 1.05; x.lineJoin = 'round'; x.beginPath();
        x.moveTo(cx + hx(HC.τ), cy - hy(HC.τ));
        for (let s = Math.floor(HC.τ / dτ + 1) * dτ; s < τm; s += dτ) x.lineTo(cx + hx(s), cy - hy(s));
        x.lineTo(cx + hx(τm), cy - hy(τm)); x.stroke(); HC.τ = τm;
      }
      ctx.globalAlpha = a * 0.7; ctx.drawImage(HC.c, 0, 0); ctx.globalAlpha = a;
      if (t < 19.5) { ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(cx + hx(τm), cy - hy(τm), 8, 0, TAU); ctx.fill(); }
      text(ctx, 'x = Σ Aᵢ·sin(fᵢt+φᵢ)·e^(−dᵢt)', 60, 1030, { size: 22, family: F.mono, alpha: 0.6 });
      text(ctx, `t ${τm.toFixed(0).padStart(3)}`, 1020, 1030, { size: 22, family: F.mono, align: 'right', alpha: 0.6 });
      ctx.restore();
    }
  },
});
