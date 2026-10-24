/* 07 對拍 — 120 BPM made visible: a ball lands on one of four beat circles every beat, a scrolling
   waveform shows kick / hats / claps, downbeats invert the stage. Payoff: a square that *lands* each
   90° turn exactly on the beat, rings per beat. Dark ground. */
const CY = 470, CR = 78, CXS = [180, 420, 660, 900];
const WY = 800, WAMP = 78;
const layers = tau => ({ hats: tau >= 4, claps: tau >= 8, accent: tau >= 8 });
const since = (t, step) => t - Math.floor(t / step) * step;     // time since last grid line

/* synthetic "audio" envelope at scene time tau (for the waveform strip) */
function amp(tau) {
  if (tau < 0) return 0;
  const L = layers(tau), b = Math.floor(tau / BEAT), db = tau - b * BEAT, down = b % 4 === 0;
  let a = Math.exp(-db * 11) * (L.accent && down ? 1 : 0.72) * Math.abs(Math.sin(db * 70 * (1 + Math.exp(-db * 20))));
  if (L.hats) { const e = since(tau, BEAT / 2); a += Math.exp(-e * 40) * 0.28 * Math.abs(Math.sin(e * 900)); }
  if (L.claps && (b % 4 === 1 || b % 4 === 3)) a += Math.exp(-db * 18) * 0.55 * (0.6 + 0.4 * Math.abs(Math.sin(db * 2300)));
  return Math.min(a, 1.15);
}

M.def({
  id: 'e07', num: 7, ch: 1, title: '對拍', en: 'BEAT SYNC', dur: 20, ground: 'dark',
  prompt: '120 BPM，一拍 0.5 秒：一顆球每拍跳到下一個圓上，落地剛好在拍點，圓被打到就放大。下方畫捲動的波形與拍線，依序加入八分音符、強拍和 2、4 拍拍手；每小節第一拍全畫面反相閃一下。最後方塊每拍轉 90°，在拍點停穩。',
  how: ['拍 = floor(t ÷ 0.5)，拍內時間 = t mod 0.5，全部由 t 算', '撞擊用 exp(−12·Δt) 衰減；強拍反相用 difference 混合', '動作要「落」在拍上：旋轉在拍前 0.3 s 開始'],
  practice: '把方塊改成拍前 0.1 s 才開始轉，感覺變了嗎？',
  cues: [4.25, 4.75, 5.25, 5.75, 6.25, 6.75, 7.25, 7.75].map(t => ({ t, type: 'tick', v: 0.3 }))
    .concat([8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5, 17.5, 18.5, 19.5].map(t => ({ t, type: 'clap', v: 0.5 })))
    .concat([8, 10, 12, 16, 18].map(t => ({ t, type: 'thud', v: 0.5 })), [{ t: 14, type: 'impact', v: 0.7 }]),

  frame(ctx, t) {
    const L = layers(t), b = Math.floor(t / BEAT), db = t - b * BEAT, bi = b % 4, bar = Math.floor(t / BAR);
    const hit = Math.exp(-db * 12);
    // ---- header: counter
    text(ctx, `${bar + 1}`, 48, 150, { size: 120, family: F.latin, weight: 800 });
    font(ctx, 120, F.latin, 800); const w1 = ctx.measureText(`${bar + 1}`).width;
    text(ctx, `.${bi + 1}`, 48 + w1, 150, { size: 120, family: F.latin, weight: 800, alpha: lerp(0.5, 1, hit) });
    text(ctx, 'BAR . BEAT', 52, 186, { size: 18, family: F.mono, alpha: 0.5, spacing: 2 });
    text(ctx, '120 BPM', 1032, 92, { size: 28, family: F.mono, weight: 500, align: 'right' });
    text(ctx, '1 拍 = 0.5 s　1 小節 = 2 s', 1032, 128, { size: 20, family: F.tc, align: 'right', alpha: 0.55 });
    const ph = t < 4 ? ['每一拍', 'QUARTER NOTES'] : t < 8 ? ['＋ 八分音符', '+ EIGHTHS (OFFBEAT)'] : t < 14 ? ['＋ 強拍與拍手', 'DOWNBEAT ACCENT + 2 & 4'] : ['落在拍上', 'LAND ON THE BEAT'];
    const pk = t < 4 ? 0 : t < 8 ? 4 : t < 14 ? 8 : 14, pa = ease(E.outCubic, pk, pk + 0.4, t);
    text(ctx, ph[0], 1032, 176, { size: 32, family: F.tcBlack, weight: 900, align: 'right', alpha: pa });

    const PO = ease(E.inCubic, 13.6, 13.95, t), PF = ease(E.outCubic, 13.95, 14.25, t);   // out, then in: never both
    // ---- beat circles + hopping ball
    if (PO < 1) {
      ctx.save(); ctx.globalAlpha = 1 - PO;
      CXS.forEach((x, i) => {
        const on = i === bi, down = i === 0;
        const punch = on ? 1 + (L.accent && down ? 0.32 : 0.16) * hit : 1;
        const r = CR * punch;
        if (on) { ctx.fillStyle = fg(lerp(0.35, 1, hit)); ctx.beginPath(); ctx.arc(x, CY, r, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = fg(on ? 1 : 0.4); ctx.lineWidth = down ? 6 : 2;
        ctx.beginPath(); ctx.arc(x, CY, r, 0, TAU); ctx.stroke();
        // clap burst on 2 & 4
        if (L.claps && on && (i === 1 || i === 3)) {
          ctx.strokeStyle = fg(0.8 * hit); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, CY, r + 18 + (1 - hit) * 60, 0, TAU); ctx.stroke();
        }
        text(ctx, String(i + 1), x, CY + 16, { size: 46, family: F.latin, weight: 800, align: 'center', color: on && hit > 0.4 ? K : P, alpha: on ? 1 : 0.6 });
      });
      // eighth-note dots between the circles
      if (L.hats) {
        const e = Math.floor(t / (BEAT / 2)), off = e % 2 === 1, eh = Math.exp(-since(t, BEAT / 2) * 14);
        [300, 540, 780, 1010].forEach((x, i) => {
          const lit = off && i === bi;
          ctx.fillStyle = fg(lit ? lerp(0.35, 1, eh) : 0.25);
          ctx.beginPath(); ctx.arc(x, CY, lit ? 10 + 6 * eh : 8, 0, TAU); ctx.fill();
        });
      }
      // the ball: lands on circle (b+1)%4 exactly at the next beat
      const from = CXS[bi], to = CXS[(bi + 1) % 4], u = db / BEAT;
      const top = CY - CR - 16, arc = to < from ? 230 : 130;
      const bx = lerp(from, to, E.inOutSine(u)), by = top - arc * 4 * u * (1 - u);
      const sq = Math.exp(-db * 30) * 0.35;
      ctx.save(); ctx.translate(bx, by + 16 * sq); ctx.scale(1 + sq, 1 - sq);
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); ctx.restore();
      ctx.restore();
    }

    // ---- payoff: rings + landing square
    if (PF > 0) {
      ctx.save(); ctx.globalAlpha = PF;
      const cx = 540, cy = 450;
      for (let k = 0; k < 5; k++) {
        const bb = b - k, tb = bb * BEAT; if (tb < 14 - 0.01) continue;
        const age = t - tb, r = 150 + age * 300;
        ctx.strokeStyle = fg(clamp(0.7 * (1 - age / 2.2))); ctx.lineWidth = bb % 4 === 0 ? 8 : 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      }
      // eighth ticks on an orbit
      for (let k = 0; k < 8; k++) {
        const a = -Math.PI / 2 + k * TAU / 8, cur = Math.floor(t / (BEAT / 2)) % 8 === k;
        const eh = cur ? Math.exp(-since(t, BEAT / 2) * 10) : 0;
        ctx.fillStyle = fg(cur ? lerp(0.4, 1, eh) : 0.2);
        ctx.save(); ctx.translate(cx + Math.cos(a) * 270, cy + Math.sin(a) * 270); ctx.rotate(a);
        ctx.fillRect(-14 - eh * 10, -3, 28 + eh * 20, 6); ctx.restore();
      }
      // the square: rotation happens in the 0.3 s *before* each beat, settles exactly on it
      const nb = b + 1, pre = clamp((t - (nb * BEAT - 0.3)) / 0.3);
      const ang = (nb - 1 + E.outBack(pre)) * Math.PI / 2;
      const s = 170 * (1 + 0.1 * hit);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.fillStyle = fg(1); ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
      text(ctx, String(bi + 1), cx, cy + 34, { size: 96, family: F.latin, weight: 800, align: 'center', color: K });
      // timing diagram: rotation window vs beat
      text(ctx, '轉動 0.3 s → 拍點', cx, 680, { size: 22, family: F.tc, align: 'center', alpha: 0.6 });
      ctx.restore();
    }

    // ---- waveform strip (scrolling, playhead in the centre)
    const x0 = 48, x1 = 1032, win = 4, X = tau => 540 + (tau - t) / win * (x1 - x0);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, WY - WAMP - 30, x1 - x0, WAMP * 2 + 90); ctx.clip();
    for (let k = Math.floor((t - win / 2) / BEAT); k <= Math.ceil((t + win / 2) / BEAT); k++) {
      const x = X(k * BEAT), down = k % 4 === 0;
      ctx.fillStyle = fg(down ? 0.35 : 0.13); ctx.fillRect(x - (down ? 1 : 0.5), WY - WAMP - 10, down ? 2 : 1, WAMP * 2 + 20);
      if (down && k >= 0) text(ctx, String(k / 4 + 1), x + 6, WY + WAMP + 40, { size: 18, family: F.mono, alpha: 0.5 });
    }
    for (let x = x0; x < x1; x += 3) {
      const tau = t + (x - 540) / (x1 - x0) * win, a = amp(tau), h = a * WAMP;
      if (h < 0.5) continue;
      ctx.fillStyle = fg(tau <= t ? 0.95 : 0.35); ctx.fillRect(x, WY - h, 2, h * 2);
    }
    ctx.restore();
    ctx.fillStyle = fg(1); ctx.fillRect(539, WY - WAMP - 22, 3, WAMP * 2 + 44);
    ctx.fillStyle = fg(0.3); ctx.fillRect(x0, WY, x1 - x0, 1);
    // phrase map: 4 bars × 4 beats
    for (let k = 0; k < 16; k++) {
      const x = 48 + k * 61.5 + Math.floor(k / 4) * 0, cur = k === b % 16, past = k < b % 16;
      ctx.fillStyle = fg(cur ? 1 : past ? 0.45 : 0.12);
      ctx.fillRect(x, 1010, 52, k % 4 === 0 ? 22 : 12);
    }
    // downbeat flash: invert the stage
    if (L.accent) {
      const sb = since(t, BAR), f = sb < 0.067 ? 1 : Math.exp(-(sb - 0.067) * 22) * 0.85;
      if (f > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = `rgba(242,242,240,${f})`; ctx.fillRect(0, 0, SW, SH); ctx.restore(); }
    }
  },
});
