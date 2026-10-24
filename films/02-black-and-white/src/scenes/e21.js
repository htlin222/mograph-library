/* 21 重複器 — one element, N copies, per-copy offsets: rotation, scale, delay; radial → spiral → wave → grid → op-art. */
const CX = 540, CY = 500;
const NSTEP = [1, 2, 3, 4, 6, 8, 12, 18, 24, 36];
const S = M.def({
  id: 'e21', num: 21, ch: 3, title: '重複器', en: 'REPEATERS & ARRAYS', dur: 20, ground: 'light',
  prompt: '只畫一個元素，其餘全用重複器複製：放射狀從 1 份加到 36 份；方框複製 40 份，每份多轉 4.5°、縮 0.94 倍成螺旋；每份延遲 0.05 秒讓扭動成波；11×11 短線依索引轉角；最後 12 圈極座標陣列（第 k 圈 6k 份）逐圈延遲 0.12 秒，脈動成歐普藝術。白底黑形。',
  how: ['第 i 份的變換 = 原件 × (旋轉 iΔθ, 縮放 sⁱ)', '延遲：第 i 份讀取 t − i·d 的動畫值', '極座標陣列：第 k 圈延遲 k × 0.12 s，形成同心波'],
  practice: '只用一條線與重複器，做出一朵會呼吸的花。',
  cues: [...NSTEP.map((_, i) => ({ t: i * 0.4 + 0.02, type: 'tick', v: 0.35 + i * 0.03 })), { t: 4, type: 'pop', v: 0.5 }, { t: 6, type: 'pop', v: 0.5 },
    { t: 8, type: 'thud', v: 0.5 }, { t: 10, type: 'thud', v: 0.6 }, { t: 12, type: 'pop', v: 0.5 }, { t: 14, type: 'impact', v: 0.5 }, { t: 18, type: 'bell', i: 5, v: 0.4, dec: 3 }],
  frame(ctx, t) {
    const ph = t < 4 ? 0 : t < 8 ? 1 : t < 12 ? 2 : t < 14 ? 3 : 4;
    let knobs = { copies: '', rot: '', scale: '', delay: '' }, act = {};
    ctx.fillStyle = fg(1); ctx.strokeStyle = fg(1);
    if (ph === 0) {
      const k = Math.min(NSTEP.length - 1, Math.floor(t / 0.4)), u = clamp((t - k * 0.4) / 0.3);
      const n = NSTEP[k], prev = NSTEP[Math.max(0, k - 1)], e = E.outCubic(u);
      const step = lerp(TAU / Math.max(prev, 1) * (prev === 1 ? 0 : 1), TAU / n, k === 0 ? 1 : e);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i * step;
        ctx.save(); ctx.translate(CX, CY); ctx.rotate(a);
        ctx.globalAlpha = i < prev ? 1 : e;
        ctx.beginPath(); ctx.moveTo(80, -3); ctx.lineTo(390, -15); ctx.arc(390, 0, 15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(80, 3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // mark the original
      ctx.fillStyle = bg(1); ctx.beginPath(); ctx.arc(CX, CY - 390, 7, 0, TAU); ctx.fill();
      text(ctx, '#0 原件', CX + 30, CY - 420, { size: 20, family: F.tc });
      ctx.strokeStyle = fg(1); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(CX + 26, CY - 426); ctx.lineTo(CX + 8, CY - 400); ctx.stroke();
      knobs = { copies: String(n), rot: n === 1 ? '—' : `${(360 / n).toFixed(1)}°`, scale: '1.00', delay: '0 s' }; act = { copies: 1, rot: 1 };
    } else if (ph === 1 || ph === 2) {
      const dth = (ph === 1 ? ease(E.inOutCubic, 4.05, 5.6, t) : 1) * 4.5 * Math.PI / 180;
      const sc = ph === 1 ? lerp(1, 0.94, ease(E.inOutCubic, 6, 7.4, t)) : 0.94;
      const delay = ph === 2 ? (t < 10 ? 0 : 0.05 * ease(E.inOutCubic, 10, 10.4, t)) : 0;
      const amp = ph === 2 ? ease(E.inOutCubic, 8, 8.5, t) * 0.5 : 0;
      ctx.lineWidth = 2.6; ctx.lineJoin = 'miter';
      for (let i = 0; i < 40; i++) {
        const ti = t - i * delay;
        const a = i * dth + amp * Math.sin(Math.PI * (ti - 8));
        const s = 620 * Math.pow(sc, i);
        ctx.save(); ctx.translate(CX, CY); ctx.rotate(a);
        ctx.strokeStyle = fg(i === 0 ? 1 : 0.92); ctx.lineWidth = i === 0 ? 5 : 2.4;
        ctx.strokeRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      if (ph === 1 && t < 5) text(ctx, '#0', CX - 310, CY - 322, { size: 20, family: F.mono, weight: 500 });
      knobs = { copies: '40', rot: `+${(dth * 180 / Math.PI).toFixed(1)}°`, scale: `×${sc.toFixed(3)}`, delay: `${delay.toFixed(2)} s` };
      act = ph === 1 ? (t < 6 ? { rot: 1 } : { scale: 1 }) : { delay: 1 };
    } else if (ph === 3) {
      const n = 11, cell = 70, x0 = CX - (n - 1) * cell / 2, y0 = CY + 20 - (n - 1) * cell / 2, a0 = ease(E.outCubic, 12, 12.6, t);
      ctx.lineCap = 'round'; ctx.lineWidth = 7;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const a = (i + j) * 15 * Math.PI / 180 * a0 + (t - 12) * Math.PI;
        const x = x0 + i * cell, y = y0 + j * cell, L = 30;
        ctx.beginPath(); ctx.moveTo(x - L * Math.cos(a), y - L * Math.sin(a)); ctx.lineTo(x + L * Math.cos(a), y + L * Math.sin(a)); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      knobs = { copies: '11×11', rot: '(i+j)×15°', scale: '1.00', delay: '0 s' }; act = { copies: 1, rot: 1 };
    } else {
      // polar array: ring k holds 6k copies; each ring reads time t − k·0.12 s
      const intro = ease(E.outCubic, 14, 15.2, t);
      ctx.beginPath();
      for (let k = 1; k <= 12; k++) {
        const ti = Math.max(0, t - 14 - k * 0.12), pz = 0.5 + 0.5 * Math.cos(Math.PI * ti);   // starts full: no blank frame at the cut
        const tri = fract(ti / 4) < 0.5 ? fract(ti / 4) * 2 : 2 - fract(ti / 4) * 2;
        const sz = 30 * lerp(0.14, 1.05, pz) * clamp(0.35 + intro * 1.3 - k * 0.03), R = 33 * k, n = 6 * k;
        for (let i = 0; i < n; i++) {
          const th = i * TAU / n + k * 0.13, rot = th + Math.PI / 2 * E.inOutCubic(tri);
          const cx = CX + R * Math.cos(th), cy = CY + R * Math.sin(th), c = Math.cos(rot) * sz / 2, sn = Math.sin(rot) * sz / 2;
          ctx.moveTo(cx + c - sn, cy + sn + c); ctx.lineTo(cx - c - sn, cy - sn + c); ctx.lineTo(cx - c + sn, cy - sn - c); ctx.lineTo(cx + c + sn, cy + sn - c); ctx.closePath();
        }
      }
      ctx.fill();
      ctx.beginPath(); ctx.arc(CX, CY, 12 * intro, 0, TAU); ctx.fill();
      knobs = { copies: '6k × 12 圈', rot: '0–90°', scale: '0.14–1', delay: 'k×0.12 s' }; act = { delay: 1, scale: 1 };
    }
    // phase label
    const at = [0, 4, 8, 12, 14][ph], la = ease(E.outCubic, at, at + 0.4, t);
    const names = [['01', 'RADIAL', '放射狀：份數 1 → 36'], ['02', 'OFFSET', '每份多轉 Δθ、再乘 s'], ['03', 'DELAY', t < 10 ? '延遲 0：整體一起扭' : '每份晚 0.05 s：扭動變成波'], ['04', 'GRID', '二維陣列：角度依索引'], ['05', 'POLAR ARRAY', '第 k 圈 6k 份，晚 k×0.12 s']][ph];
    ctx.fillStyle = bg(1); ctx.fillRect(36, 40, 330, 84);
    text(ctx, names[0], 48, 72, { size: 22, family: F.mono, weight: 500, alpha: 0.5 * la });
    text(ctx, names[1], 92, 72, { size: 22, family: F.mono, weight: 500, spacing: 3, alpha: la });
    text(ctx, names[2], 48, 110, { size: 24, family: F.tc, alpha: 0.8 * la });
    // knob row
    const keys = [['copies', 'COPIES 份數'], ['rot', 'ROTATE 旋轉'], ['scale', 'SCALE 縮放'], ['delay', 'DELAY 延遲']];
    keys.forEach(([k, lab], i) => {
      const x = 48 + i * 252, y = 962, w = 236, on = act[k];
      ctx.fillStyle = on ? fg(1) : bg(1); ctx.fillRect(x, y, w, 72);
      ctx.strokeStyle = fg(1); ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, 70);
      text(ctx, lab, x + 14, y + 26, { size: 18, family: F.tc, color: on ? P : K, alpha: 0.8 });
      text(ctx, knobs[k], x + 14, y + 60, { size: 26, family: F.mono, weight: 500, color: on ? P : K });
    });
  },
});
void S;
