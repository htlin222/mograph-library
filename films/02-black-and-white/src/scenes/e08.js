/* 08 無縫循環 — every visual is a function of p = (t mod 2) / 2, so frame 0 ≡ frame 60.
   Rotating-squares figure/ground loop → looping noise (sample on a circle) → integer frequencies →
   payoff: concentric dashed rings, each turning exactly one dash per loop with a radial delay. Light ground. */
const PER = 2, NF = PER * FPS;
const RX = 180, RY = 110, RS = 720, NC = 10, CS = RS / NC;       // checkerboard region
const nz = makeNoise(808);

function header(ctx, tc, f, a) {
  text(ctx, tc, 48, 72, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  text(ctx, f, 1032, 70, { size: 22, family: F.mono, weight: 500, align: 'right', alpha: 0.7 * a });
}

M.def({
  id: 'e08', num: 8, ch: 1, title: '無縫循環', en: 'SEAMLESS LOOP', dur: 20, ground: 'light',
  prompt: '做一段 2 秒完美循環：黑白方格裡的方塊轉 90°，到半圈時前景背景互換，看不出接縫。下方顯示 p = (t mod 2) ÷ 2 的相位環與第 0 / 60 格。再示範雜訊怎麼循環、為何頻率要整數倍，最後用同心虛線圓做一段漂亮的循環。',
  how: ['所有動作只吃 p ∈ [0, 1)：第 0 格與第 60 格完全相同', '雜訊循環：沿著圓取樣 noise(cos 2πp, sin 2πp)', '頻率用整數倍；每圈虛線只轉一格間距，延遲 < 0.5'],
  practice: '用 sin(2π·3p) 做一個 2 秒、三次心跳的循環。',
  cues: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18].map((t, i) => ({ t, type: i % 2 ? 'tick' : 'bell', i: 0, v: i % 2 ? 0.4 : 0.3, dec: 1.2 })),

  frame(ctx, t) {
    const p = fract(t / PER), loop = Math.floor(t / PER);
    const seg = t < 6 ? 0 : t < 10 ? 1 : t < 14 ? 2 : 3, t0 = [0, 6, 10, 14][seg];
    const a = t0 === 0 ? 1 : lerp(0.35, 1, ease(E.outCubic, t0, t0 + 0.25, t));   // hard cut on the bar, quick settle
    ctx.save(); ctx.globalAlpha = a;
    if (seg === 0) this.squares(ctx, p);
    else if (seg === 1) this.noiseLoop(ctx, p, t);
    else if (seg === 2) this.freqs(ctx, p, t);
    else this.rings(ctx, p);
    ctx.restore();
    this.strip(ctx, t, p, loop);
  },

  squares(ctx, p) {
    header(ctx, '前景背景互換', 'angle = 90° · ease(2p)', 1);
    const first = p < 0.5, q = E.inOutCubic(first ? p * 2 : p * 2 - 1);
    ctx.save(); ctx.beginPath(); ctx.rect(RX, RY, RS, RS); ctx.clip();
    ctx.fillStyle = first ? bg(1) : fg(1); ctx.fillRect(RX, RY, RS, RS);
    ctx.fillStyle = first ? fg(1) : bg(1);
    for (let j = -1; j <= NC; j++) for (let i = -1; i <= NC; i++) {
      if (((i + j) & 1) !== (first ? 0 : 1)) continue;
      ctx.save(); ctx.translate(RX + (i + 0.5) * CS, RY + (j + 0.5) * CS); ctx.rotate(q * Math.PI / 2);
      ctx.fillRect(-CS / 2 - 0.3, -CS / 2 - 0.3, CS + 0.6, CS + 0.6); ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = fg(1); ctx.lineWidth = 2; ctx.strokeRect(RX - 1, RY - 1, RS + 2, RS + 2);
  },

  noiseLoop(ctx, p, t) {
    header(ctx, '雜訊也能循環', 'sample noise on a circle', 1);
    const cols = [
      { x: 290, ok: false, tc: '直線取樣', f: 'noise(x + 3p)', off: () => [p * 3, 0] },
      { x: 790, ok: true, tc: '圓形取樣', f: 'noise(x + 圓(p))', off: () => [Math.cos(TAU * p) * 1.1, Math.sin(TAU * p) * 1.1] },
    ];
    cols.forEach(C => {
      const [ox, oy] = C.off(), cy = 410;
      text(ctx, (C.ok ? '○ ' : '× ') + C.tc, C.x, 160, { size: 32, family: F.tcBlack, weight: 900, align: 'center' });
      text(ctx, C.f, C.x, 196, { size: 20, family: F.mono, align: 'center', alpha: 0.6 });
      // blob: r(θ) = R + A · noise(cosθ·f + ox, sinθ·f + oy)
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const th = k / 120 * TAU, r = 118 + 75 * nz(Math.cos(th) * 1.2 + ox + 10, Math.sin(th) * 1.2 + oy + 10, 0.5);
        const x = C.x + Math.cos(th) * r, y = cy + Math.sin(th) * r;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fillStyle = fg(1); ctx.fill();
      // sampling path diagram
      const dy = 690;
      ctx.strokeStyle = fg(0.35); ctx.lineWidth = 2;
      if (!C.ok) {
        ctx.beginPath(); ctx.moveTo(C.x - 120, dy); ctx.lineTo(C.x + 120, dy); ctx.stroke();
        const jump = p < 0.06 ? 1 - p / 0.06 : 0;
        if (jump > 0) { ctx.setLineDash([5, 6]); ctx.strokeStyle = fg(jump); ctx.beginPath(); ctx.moveTo(C.x + 120, dy - 14); ctx.quadraticCurveTo(C.x, dy - 70, C.x - 120, dy - 14); ctx.stroke(); ctx.setLineDash([]);
          text(ctx, '跳！', C.x, dy - 76, { size: 26, family: F.tcBlack, weight: 900, align: 'center', alpha: jump }); }
        ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(C.x - 120 + 240 * p, dy, 11, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(C.x, dy, 70, 0, TAU); ctx.stroke();
        ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(C.x + Math.cos(TAU * p) * 70, dy + Math.sin(TAU * p) * 70, 11, 0, TAU); ctx.fill();
      }
      text(ctx, C.ok ? '取樣點繞圓：終點 = 起點' : '取樣點走直線：終點 ≠ 起點', C.x, 810, { size: 22, family: F.tc, align: 'center', alpha: 0.65 });
    });
  },

  freqs(ctx, p, t) {
    header(ctx, '頻率要整數倍', 'angle = 2π · n · p', 1);
    const ns = [1, 2, 3, 1.5];
    ns.forEach((n, i) => {
      const cx = 180 + i * 240, cy = 330, R = 92, ok = Number.isInteger(n);
      ctx.strokeStyle = fg(0.25); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      // start mark at 12 o'clock
      ctx.fillStyle = fg(0.5); ctx.fillRect(cx - 1, cy - R - 16, 2, 14);
      // trail of the hand over the last 0.25 loop
      for (let k = 12; k >= 1; k--) {
        const pp = p - k * 0.02; if (pp < 0) continue;
        const a = -Math.PI / 2 + TAU * n * pp;
        ctx.fillStyle = fg(0.25 * (1 - k / 13)); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 8, 0, TAU); ctx.fill();
      }
      const a = -Math.PI / 2 + TAU * n * p;
      ctx.strokeStyle = fg(1); ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 12, 0, TAU); ctx.fill();
      text(ctx, `× ${n}`, cx, cy + R + 64, { size: 34, family: F.mono, weight: 500, align: 'center' });
      text(ctx, ok ? '○' : '×', cx, cy + R + 112, { size: 36, family: F.tc, align: 'center' });
      // value over one loop: sin(2π n p), with the seam marked
      const px = cx - 95, pw = 190, py = 700, ph = 70;
      ctx.strokeStyle = fg(0.2); ctx.lineWidth = 1; ctx.strokeRect(px, py - ph, pw, ph * 2);
      ctx.strokeStyle = fg(1); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let k = 0; k <= 80; k++) { const u = k / 80, y = py - Math.sin(TAU * n * u) * ph * 0.85; k ? ctx.lineTo(px + u * pw, y) : ctx.moveTo(px, y); }
      ctx.stroke();
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(px + p * pw, py - Math.sin(TAU * n * p) * ph * 0.85, 7, 0, TAU); ctx.fill();
      if (!ok) { ctx.fillStyle = fg(1); ctx.fillRect(px + pw - 2, py - ph, 4, ph * 2); text(ctx, '接縫', px + pw, py + ph + 34, { size: 22, family: F.tcBlack, weight: 900, align: 'right' }); }
    });
  },

  rings(ctx, p) {
    header(ctx, '每圈只轉一格', 'Δθ = 一格間距 · ease(p − i·0.025)', 1);
    const cx = 540, cy = 470;
    ctx.lineCap = 'butt';
    for (let i = 0; i < 17; i++) {
      const r = 30 + i * 22, n = Math.max(6, Math.round(TAU * r / 52)), step = TAU / n;
      const q = E.inOutCubic(clamp((p - i * 0.025) / 0.5)), dir = i % 2 ? 1 : -1;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(dir * step * q + (i % 2) * step / 2);
      ctx.strokeStyle = fg(1); ctx.lineWidth = 13;
      ctx.beginPath();
      for (let k = 0; k < n; k++) { ctx.moveTo(Math.cos(k * step) * r, Math.sin(k * step) * r); ctx.arc(0, 0, r, k * step, k * step + step * 0.5); }
      ctx.stroke();
      ctx.restore();
    }
  },

  strip(ctx, t, p, loop) {
    const y = 950, f = Math.floor(p * NF + 1e-6);
    ctx.fillStyle = fg(0.15); ctx.fillRect(40, 868, SW - 80, 1);
    // phase ring
    const cx = 108, R = 52;
    ctx.strokeStyle = fg(0.15); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, y, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = fg(1); ctx.beginPath(); ctx.arc(cx, y, R, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
    text(ctx, p.toFixed(2), cx, y + 9, { size: 24, family: F.mono, weight: 500, align: 'center' });
    text(ctx, `t = ${t.toFixed(2).padStart(5, '0')} s`, 196, y - 18, { size: 22, family: F.mono, alpha: 0.6 });
    text(ctx, 'p = (t mod 2) ÷ 2', 196, y + 18, { size: 24, family: F.mono, weight: 500 });
    text(ctx, `LOOP ${loop + 1}`, 196, y + 54, { size: 18, family: F.mono, alpha: 0.5, spacing: 2 });
    // frame ruler
    const x0 = 560, x1 = 1032, w = x1 - x0;
    for (let k = 0; k <= NF; k++) {
      const x = x0 + w * k / NF, major = k % 10 === 0;
      ctx.fillStyle = fg(k === 0 || k === NF ? 1 : major ? 0.5 : 0.18); ctx.fillRect(x - 0.75, y - (major ? 14 : 7), 1.5, major ? 28 : 14);
    }
    ctx.fillStyle = fg(1); ctx.fillRect(x0 + w * p - 1.5, y - 30, 3, 60);
    const seam = Math.exp(-p * PER * 6);
    text(ctx, 'f 0', x0, y + 50, { size: 20, family: F.mono, weight: 500, alpha: lerp(0.5, 1, seam) });
    text(ctx, 'f 60 = f 0', x1, y + 50, { size: 20, family: F.mono, weight: 500, align: 'right', alpha: lerp(0.5, 1, seam) });
    text(ctx, `f ${String(f).padStart(2, '0')}`, clamp(x0 + w * p, x0 + 30, x1 - 30), y - 40, { size: 20, family: F.mono, align: 'center' });
  },
});
