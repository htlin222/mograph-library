/* 58 視差與 2.5D — six ridge planes at real depths, projected through a pinhole camera.
   Pan (camX), dolly (camZ), crane (camY): screen offset of each plane = world offset × f / (z − camZ). */
const FOC = 540, HOR = 520;
const LAYERS = [
  { z: 12, h: 0.16, a: 0.42, fr: 0.9, tone: 0.74 },
  { z: 7.5, h: 0.02, a: 0.36, fr: 1.2, tone: 0.52 },
  { z: 4.8, h: -0.10, a: 0.30, fr: 1.5, tone: 0.32 },
  { z: 3.2, h: -0.24, a: 0.26, fr: 1.8, tone: 0.20 },
  { z: 2.1, h: -0.42, a: 0.24, fr: 2.1, tone: 0.10, trees: 0.55 },
  { z: 1.4, h: -0.70, a: 0.24, fr: 2.4, tone: 0.0, trees: 0.3 },
];
const PH = [
  { t: 0, n: '01', zh: '視差', en: 'PARALLAX · PAN' },
  { t: 3.5, n: '02', zh: '無視差：所有層同速', en: 'NO PARALLAX = FLAT CARD' },
  { t: 7.5, n: '03', zh: '速度 ∝ 1 / 距離', en: 'SPEED = 1 / Z' },
  { t: 11, n: '04', zh: '推軌：近層長得快', en: 'DOLLY IN · CAM Z' },
  { t: 15, n: '05', zh: '升降 + 橫搖', en: 'CRANE UP + PAN' },
];
const STARS = (() => { const r = rng(58), a = []; for (let i = 0; i < 70; i++) a.push([r() * 1080, r() * 460, r() * 1.6 + 0.5, r()]); return a; })();
const ridgeN = (L, i, wx) => { const n = noise.fbm(wx / L.z * L.fr + i * 13.7, i * 3.1, 0.5, 4); return 0.5 + n * 1.6 + 0.35 * Math.abs(noise(wx / L.z * L.fr * 0.5, i * 7.3)); };

function cam(t) {
  const flat = ease(E.inOutCubic, 3.5, 4.3, t) - ease(E.inOutCubic, 7.5, 8.3, t);
  const camZ = 0.9 * ease(E.inOutCubic, 11, 14.2, t) - 0.6 * ease(E.inOutCubic, 15, 18.5, t);
  const camY = 1 + 0.55 * ease(E.inOutSine, 15, 19.6, t);
  const camX = 0.62 * t + 0.6;
  return { camX, camY, camZ, flat };
}

M.def({
  id: 'e58', num: 58, ch: 8, title: '視差與 2.5D', en: 'PARALLAX & 2.5D', dur: 20, ground: 'dark',
  prompt: '六層山脊放在真實深度 z=1.4～12，用針孔相機投影：先橫搖看視差，再故意讓所有層同速（變成扁平紙片）對照；標出每層速度 ×1/z、加俯視小圖；接著推軌、最後升降鏡頭。遠層淡、近層黑，月亮在無限遠不動。',
  how: ['螢幕位移 = 世界位移 × f ÷ (z − 相機 z)，f=540', '遠層灰 0.74、近層純黑：空氣透視，霧在山腳', '月亮在 z=∞：平移不動，只有旋轉才會動'],
  practice: '把一張照片拆成前中後三層，做 3 秒的橫搖。',
  cues: [{ t: 3.5, type: 'whoosh', dur: 0.8 }, { t: 7.5, type: 'whoosh', dur: 0.8 }, { t: 11, type: 'riser', t1: 14.2 }, { t: 15, type: 'whoosh', dur: 1.6 }, { t: 7.5, type: 'tick' }],
  frame(ctx, t) {
    const c = cam(t);
    const horY = HOR + FOC * (c.camY - 1) * 0;        // the horizon is at infinity: it never moves with camY
    // sky
    const sg = ctx.createLinearGradient(0, 0, 0, 700);
    sg.addColorStop(0, '#0b0b0b'); sg.addColorStop(0.62, '#1d1d1d'); sg.addColorStop(1, '#5e5e5e');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, SW, SH);
    for (const [x, y, r, b] of STARS) { ctx.fillStyle = g(1, 0.25 + 0.5 * b * (0.7 + 0.3 * Math.sin(t * 2 + b * 20))); ctx.fillRect(x, y, r, r); }
    // moon at infinity: does not move
    ctx.fillStyle = P; ctx.beginPath(); ctx.arc(780, 150, 54, 0, TAU); ctx.fill();
    ctx.fillStyle = g(0, 0.06); ctx.beginPath(); ctx.arc(765, 138, 12, 0, TAU); ctx.arc(797, 168, 8, 0, TAU); ctx.fill();
    const ys = [];                                      // ridge y at x=1000, for the tags
    LAYERS.forEach((L, i) => {
      const zc = Math.max(0.35, L.z - c.camZ);
      // flat mode: every layer gets the nearest layer's screen speed
      const near = LAYERS[LAYERS.length - 1].z - c.camZ;
      const cx = lerp(c.camX, c.camX * zc / near, c.flat);
      const sy = wx => horY - FOC * (1 + L.z * (L.h + L.a * ridgeN(L, i, wx)) - c.camY) / zc;
      const top = sy(cx);
      const gr = ctx.createLinearGradient(0, top - 60, 0, top + 300);
      gr.addColorStop(0, g(L.tone)); gr.addColorStop(0.55, g(L.tone + 0.05)); gr.addColorStop(1, g(L.tone + (i === LAYERS.length - 1 ? 0.0 : 0.16)));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(0, SH);
      let yAt = 0;
      for (let x = -10; x <= 1090; x += 10) { const y = sy(cx + (x - 540) * zc / FOC); ctx.lineTo(x, y); if (x === 1000) yAt = y; }
      ctx.lineTo(1090, SH); ctx.closePath(); ctx.fill();
      ys.push(yAt);
      if (L.trees) {   // pines standing on the ridge, same depth, same parallax
        ctx.fillStyle = g(L.tone - 0.02);
        const w0 = cx + (-80 - 540) * zc / FOC, w1 = cx + (1160 - 540) * zc / FOC, step = L.trees;
        for (let k = Math.floor(w0 / step); k <= w1 / step; k++) {
          const r = rng(k * 7 + i * 1000), wx = k * step + r() * step * 0.6;
          if (r() < 0.35) continue;
          const x = 540 + (wx - cx) * FOC / zc, y = sy(wx) + 6, th = FOC * (0.16 + r() * 0.2) * (L.z / 2) / zc, tw = th * 0.28;
          ctx.beginPath();
          for (let s = 0; s < 3; s++) { const yy = y - th * s * 0.3; ctx.moveTo(x - tw * (1 - s * 0.22), yy); ctx.lineTo(x, yy - th * 0.5); ctx.lineTo(x + tw * (1 - s * 0.22), yy); }
          ctx.fill(); ctx.fillRect(x - 1.5, y - 4, 3, 10);
        }
      }
    });
    // ---- teaching overlays ----
    const ph = PH.reduce((a, p) => t >= p.t ? p : a, PH[0]);
    const la = ease(E.outCubic, ph.t + 0.15, ph.t + 0.6, t) * (ph.n === '05' ? 1 - ease(E.inCubic, 18.2, 19, t) : 1);
    text(ctx, `${ph.n} / 05`, 44, 66, { size: 20, family: F.mono, weight: 500, color: P, spacing: 3, alpha: 0.55 * la });
    text(ctx, ph.zh, 44, 122, { size: 46, family: F.tcBlack, weight: 900, color: P, alpha: la });
    text(ctx, ph.en, 46, 156, { size: 18, family: F.mono, weight: 500, color: P, spacing: 4, alpha: 0.6 * la });
    if (c.flat > 0.02) {   // big ✕ stamp
      const a = c.flat;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(950, 70); ctx.lineTo(1020, 140); ctx.moveTo(1020, 70); ctx.lineTo(950, 140); ctx.stroke(); ctx.restore();
    }
    // per-layer speed tags
    const tagA = ease(E.outCubic, 7.8, 8.4, t) * (1 - ease(E.inCubic, 14.6, 15.2, t));
    if (tagA > 0) {
      const near = LAYERS[LAYERS.length - 1].z - c.camZ;
      // tag rows: follow each ridge, but keep ≥ 34 px apart (ridges cross while dollying)
      const ty = ys.map(y => clamp(y - 14, 190, 1040)), ord = ty.map((y, i) => i).sort((a, b) => ty[a] - ty[b]);
      for (let k = 1; k < ord.length; k++) ty[ord[k]] = Math.max(ty[ord[k]], ty[ord[k - 1]] + 40);
      for (let k = ord.length - 2; k >= 0; k--) ty[ord[k]] = Math.min(ty[ord[k]], ty[ord[k + 1]] - 40);
      LAYERS.forEach((L, i) => {
        const zc = Math.max(0.35, L.z - c.camZ), sp = near / zc, y = ty[i];
        const s = `z ${(L.z - c.camZ).toFixed(1).padStart(4)}  ×${sp.toFixed(2)}`;
        font(ctx, 19, F.mono, 500); const w = ctx.measureText(s).width + 20;
        ctx.globalAlpha = tagA; ctx.fillStyle = P; ctx.fillRect(1040 - w, y - 22, w, 30);
        text(ctx, s, 1030, y, { size: 19, family: F.mono, weight: 500, color: K, align: 'right' });
        ctx.fillStyle = P; ctx.fillRect(1040 - w - 70 * sp, y - 8, 70 * sp, 3);       // speed bar
        ctx.globalAlpha = 1;
      });
    }
    // top view inset: planes, camera, frustum
    const ia = ease(E.outCubic, 7.8, 8.6, t) * (1 - ease(E.inCubic, 17.6, 18.4, t));
    if (ia > 0) {
      const bx = 44, by = 820, bw = 330, bh = 216;
      ctx.save(); ctx.globalAlpha = ia;
      ctx.fillStyle = 'rgba(11,11,11,0.92)'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = g(1, 0.5); ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
      text(ctx, '俯視 TOP VIEW', bx + 14, by + 30, { size: 18, family: F.mono, weight: 500, color: P, alpha: 0.75 });
      const zy = z => by + bh - 34 - (Math.log(z + 0.6) - Math.log(0.6)) / (Math.log(12.6) - Math.log(0.6)) * (bh - 80);
      const camYp = zy(c.camZ), cxp = bx + bw / 2;
      LAYERS.forEach(L => { ctx.fillStyle = g(L.tone + 0.35); ctx.fillRect(bx + 16, zy(L.z) - 1.5, bw - 32, 3); });
      ctx.strokeStyle = g(1, 0.45); ctx.setLineDash([4, 5]); ctx.beginPath();
      ctx.moveTo(cxp, camYp); ctx.lineTo(cxp - 150, camYp - 150 * 0.95); ctx.moveTo(cxp, camYp); ctx.lineTo(cxp + 150, camYp - 150 * 0.95); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = P; ctx.beginPath(); ctx.moveTo(cxp, camYp - 10); ctx.lineTo(cxp - 9, camYp + 8); ctx.lineTo(cxp + 9, camYp + 8); ctx.closePath(); ctx.fill();
      // motion arrow: pan right / dolly up
      ctx.strokeStyle = P; ctx.lineWidth = 2.5; ctx.beginPath();
      if (t < 11 || t > 15) { ctx.moveTo(cxp + 16, camYp + 2); ctx.lineTo(cxp + 52, camYp + 2); ctx.lineTo(cxp + 44, camYp - 5); }
      else { ctx.moveTo(cxp + 18, camYp + 6); ctx.lineTo(cxp + 18, camYp - 26); ctx.lineTo(cxp + 12, camYp - 18); }
      ctx.stroke();
      text(ctx, `cam z ${c.camZ.toFixed(2)}  y ${c.camY.toFixed(2)}`, bx + bw - 14, by + bh - 12, { size: 18, family: F.mono, color: P, align: 'right', alpha: 0.6 });
      ctx.restore();
    }
    if (t > 18.4) text(ctx, 'PAN · DOLLY · CRANE', 540, 1030, { size: 20, family: F.mono, weight: 500, color: P, spacing: 8, align: 'center', alpha: ease(E.outCubic, 18.4, 19.2, t) * 0.8 });
  },
});
