/* 63 匹配剪接 — shots that share one circle (same centre, same radius) cut into each other invisibly:
   sun → wheel → eye → moon → clock → record → lens. A before/after shows the same cut mismatched vs matched,
   then match-on-action (one shared rotation), then a cut on every beat. */
const CX = 540, CY = 500, R = 250;
const STARS = (() => { const r = rng(63), a = []; for (let i = 0; i < 110; i++) a.push([r() * 1080, r() * 1080, r() * 2 + 0.6, r()]); return a; })();
const CRATERS = (() => { const r = rng(631), a = []; for (let i = 0; i < 26; i++) { const ang = r() * TAU, d = Math.sqrt(r()) * 0.86; a.push([Math.cos(ang) * d, Math.sin(ang) * d, 0.04 + r() * r() * 0.16, r()]); } return a; })();
const big = (ctx, c) => { ctx.fillStyle = c; ctx.fillRect(-2000, -2000, 5080, 5080); };

const SHOTS = {
  sun: { zh: '太陽', draw(ctx, t) {
    big(ctx, P);
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.fill();
    for (let i = 0; i < 26; i++) { const q = i / 26, y = 800 + 300 * Math.pow(q, 1.5); ctx.globalAlpha = lerp(0.9, 0.4, q); ctx.fillRect(-200, y, 1480, lerp(1.5, 3, q)); const w = R * lerp(0.9, 0.35, q) * (0.6 + 0.4 * noise(i * 0.6, t)); ctx.globalAlpha = 1; ctx.fillRect(CX - w, y - 1, w * 2, lerp(3, 7, q)); }
    ctx.globalAlpha = 1;
  } },
  wheel: { zh: '車輪', draw(ctx, t, rot) {
    big(ctx, K);
    ctx.strokeStyle = P; ctx.fillStyle = P;
    ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(CX + 30, CY - 10); ctx.lineTo(CX + 420, CY - 700); ctx.stroke();      // fork
    ctx.lineWidth = 32; ctx.beginPath(); ctx.arc(CX, CY, R - 16, 0, TAU); ctx.stroke();                                   // tyre
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(CX, CY, R - 44, 0, TAU); ctx.stroke();                                    // rim
    ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 32; i++) { const a = rot + i * TAU / 32, b = a + (i % 2 ? 0.42 : -0.42); ctx.moveTo(CX + Math.cos(a) * 22, CY + Math.sin(a) * 22); ctx.lineTo(CX + Math.cos(b) * (R - 44), CY + Math.sin(b) * (R - 44)); }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, 26, 0, TAU); ctx.fill();
    ctx.fillRect(-200, CY + R, 1480, 4);
  } },
  eye: { zh: '眼睛', draw(ctx, t, rot, local) {
    big(ctx, K);
    const blink = local > 1.2 && local < 1.5 ? Math.sin((local - 1.2) / 0.3 * Math.PI) : 0;
    const k = 1 - blink * 0.97;
    ctx.save(); ctx.beginPath(); ctx.moveTo(60, CY); ctx.quadraticCurveTo(CX, CY - 560 * k, 1020, CY); ctx.quadraticCurveTo(CX, CY + 560 * k, 60, CY); ctx.closePath();
    ctx.fillStyle = P; ctx.fill(); ctx.clip();
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = g(1, 0.5); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 90; i++) { const a = i * TAU / 90 + 0.02 * Math.sin(i * 7), r0 = 110 + 20 * ((i * 37) % 5) / 5; ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); ctx.lineTo(CX + Math.cos(a) * (R - 18), CY + Math.sin(a) * (R - 18)); }
    ctx.stroke();
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(CX, CY, 96 + 8 * Math.sin(t * 2), 0, TAU); ctx.fill();
    ctx.fillStyle = P; ctx.beginPath(); ctx.arc(CX - 70, CY - 80, 26, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = P; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(30, CY - 10); ctx.quadraticCurveTo(CX, CY - 640 * k, 1050, CY - 10); ctx.stroke();
  } },
  moon: { zh: '月亮', draw(ctx, t) {
    big(ctx, K);
    for (const [x, y, r, b] of STARS) { ctx.fillStyle = g(1, 0.3 + 0.5 * b); ctx.fillRect(x, y, r, r); }
    ctx.fillStyle = P; ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.clip();
    for (const [x, y, r, b] of CRATERS) { ctx.fillStyle = g(0.8 + b * 0.12); ctx.beginPath(); ctx.arc(CX + x * R, CY + y * R, r * R, 0, TAU); ctx.fill(); }
    const sh = ctx.createRadialGradient(CX - 80, CY - 80, R * 0.6, CX, CY, R * 1.05); sh.addColorStop(0, 'rgba(11,11,11,0)'); sh.addColorStop(1, 'rgba(11,11,11,0.45)');
    ctx.fillStyle = sh; ctx.fillRect(CX - R, CY - R, 2 * R, 2 * R);
    ctx.restore();
  } },
  clock: { zh: '時鐘', draw(ctx, t, rot) {
    big(ctx, P);
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.fill();
    ctx.fillStyle = P; ctx.beginPath(); ctx.arc(CX, CY, R - 22, 0, TAU); ctx.fill();
    ctx.fillStyle = K;
    for (let i = 0; i < 60; i++) { ctx.save(); ctx.translate(CX, CY); ctx.rotate(i * TAU / 60); i % 5 ? ctx.fillRect(-1.5, -(R - 36), 3, 12) : ctx.fillRect(-5, -(R - 36), 10, 34); ctx.restore(); }
    const hand = (a, len, w) => { ctx.save(); ctx.translate(CX, CY); ctx.rotate(a); ctx.fillRect(-w / 2, -len, w, len + 20); ctx.restore(); };
    hand(rot / 12 + 1.2, 120, 14); hand(rot + 0.4, 190, 9);
    ctx.fillStyle = K; hand(rot * 4, 205, 3);
    ctx.beginPath(); ctx.arc(CX, CY, 14, 0, TAU); ctx.fill();
  } },
  vinyl: { zh: '唱片', draw(ctx, t, rot) {
    big(ctx, P);
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = g(0.2); ctx.lineWidth = 1.2; ctx.beginPath();
    for (let r = 100; r < R - 8; r += 4.5) { ctx.moveTo(CX + r, CY); ctx.arc(CX, CY, r, 0, TAU); } ctx.stroke();
    ctx.fillStyle = 'rgba(242,242,240,0.14)'; ctx.beginPath();
    for (const o of [0, Math.PI]) { ctx.moveTo(CX, CY); ctx.arc(CX, CY, R - 6, rot + o, rot + o + 0.35); ctx.closePath(); } ctx.fill();
    ctx.fillStyle = P; ctx.beginPath(); ctx.arc(CX, CY, 84, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(rot); text(ctx, 'SIDE A', 0, -30, { size: 20, family: F.mono, weight: 500, color: K, align: 'center', spacing: 4 }); ctx.fillStyle = K; ctx.fillRect(-40, 22, 80, 3); ctx.restore();
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(CX, CY, 8, 0, TAU); ctx.fill();
  } },
  lens: { zh: '鏡頭光圈', draw(ctx, t, rot) {
    big(ctx, P);
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = g(0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(CX, CY, R - 24, 0, TAU); ctx.stroke();
    ctx.fillStyle = g(0.3); ctx.beginPath(); ctx.arc(CX, CY, R - 34, 0, TAU); ctx.fill();
    const n = 7, ra = 120 + 50 * Math.sin(t * 1.3), pts = [];
    for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; pts.push([CX + Math.cos(a) * ra, CY + Math.sin(a) * ra]); }
    ctx.strokeStyle = g(0.6); ctx.lineWidth = 2; ctx.beginPath();
    pts.forEach(([x, y], i) => { const [nx, ny] = pts[(i + 1) % n], dx = nx - x, dy = ny - y, L = Math.hypot(dx, dy); ctx.moveTo(x, y); ctx.lineTo(x - dx / L * 260, y - dy / L * 260); });
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R - 34, 0, TAU); ctx.clip(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = K; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(242,242,240,0.5)'; ctx.beginPath(); ctx.arc(CX - 40, CY - 46, 16, 0, TAU); ctx.fill();
  } },
};
/* edit decision list: [t0, shot] (each shot runs to the next cut) */
const EDL = [[0, 'sun'], [2, 'wheel'], [4, 'eye'], [6, 'moon'], [8, 'CMP'], [12, 'vinyl'], [14, 'lens'],
  [16, 'sun'], [16.5, 'wheel'], [17, 'eye'], [17.5, 'moon'], [18, 'clock'], [18.5, 'vinyl'], [19, 'lens'], [19.5, 'sun']];
const rotAt = t => t * 1.6;                     // one shared rotation = match on action

function matchCircle(ctx, a, x = CX, y = CY, r = R) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.strokeStyle = P; ctx.globalAlpha = a; ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(x, y, r + 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x + 22, y); ctx.moveTo(x, y - 22); ctx.lineTo(x, y + 22); ctx.stroke();
  ctx.restore();
}

M.def({
  id: 'e63', num: 63, ch: 8, title: '匹配剪接', en: 'MATCH CUT', dur: 20, ground: 'light',
  prompt: '七個鏡頭共用同一個圓（圓心 540,500、半徑 250）：太陽→車輪→眼睛→月亮→時鐘→唱片→鏡頭光圈，每 2 秒在小節線上硬切。剪接點閃出虛線圓標示匹配；中段左右對照不對齊與對齊兩種版本，接著做旋轉方向延續的動作匹配，最後每拍一切。黑白。',
  how: ['所有鏡頭的主體圓：同圓心、同半徑、同畫面位置', '旋轉角共用 rot = t × 1.6：轉速方向跨剪接延續', '不匹配版只把圓移到 (300,300)、縮 0.55 對照'],
  practice: '找三樣圓形物品，拍成三個能無縫硬切的鏡頭。',
  cues: EDL.filter(e => e[1] !== 'CMP').map(([t]) => ({ t, type: t >= 16 ? 'kick' : 'impact', v: t >= 16 ? 0.7 : 0.5 }))
    .concat([8, 9, 10, 11].map(t => ({ t, type: 'clap', v: 0.4 }))),
  frame(ctx, t) {
    let ei = 0; for (let i = 0; i < EDL.length; i++) if (t >= EDL[i][0]) ei = i;
    const [t0, key] = EDL[ei], local = t - t0, rot = rotAt(t);
    const sinceCut = local, cutA = ei === 0 ? 0 : Math.exp(-sinceCut * 4);
    if (key !== 'CMP') {
      SHOTS[key].draw(ctx, t, rot, local);
      // match outline: flash at each cut, faint otherwise (fades away in the last beat)
      const base = t > 19.5 ? 0.25 * (1 - smooth(19.5, 19.9, t)) : 0.25;
      matchCircle(ctx, Math.max(base, cutA));
      // labels
      ctx.save(); ctx.globalCompositeOperation = 'difference';
      const prev = ei > 0 && EDL[ei - 1][1] !== 'CMP' ? SHOTS[EDL[ei - 1][1]].zh : '月亮';
      text(ctx, ei === 0 ? SHOTS[key].zh : `${prev} → ${SHOTS[key].zh}`, 44, 80, { size: 40, family: F.tcBlack, weight: 900, color: P });
      const sub = t < 8 ? '形狀匹配 SHAPE MATCH' : t < 16 ? '動作匹配 MATCH ON ACTION' : '每拍一切 CUT ON BEAT';
      text(ctx, sub, 46, 116, { size: 18, family: F.mono, weight: 500, color: P, spacing: 3, alpha: 0.75 });
      if (cutA > 0.05 && ei > 0) text(ctx, `CUT  Δ 0 px`, CX + R + 34, CY - R + 10, { size: 20, family: F.mono, weight: 500, color: P, alpha: cutA, spacing: 2 });
      // rotation arrow during match-on-action
      const ra = t >= 12 && t < 16 ? 1 : 0;
      if (ra) {
        ctx.strokeStyle = P; ctx.fillStyle = P; ctx.lineWidth = 4; const rr = R + 46, a0 = rot % TAU;
        ctx.beginPath(); ctx.arc(CX, CY, rr, a0, a0 + 0.9); ctx.stroke();
        const ae = a0 + 0.9, hx = CX + Math.cos(ae) * rr, hy = CY + Math.sin(ae) * rr, tx = -Math.sin(ae), ty = Math.cos(ae);
        ctx.beginPath(); ctx.moveTo(hx + tx * 18, hy + ty * 18); ctx.lineTo(hx - ty * 11, hy + tx * 11); ctx.lineTo(hx + ty * 11, hy - tx * 11); ctx.closePath(); ctx.fill();
        text(ctx, '同一個 rot：轉向跨剪接延續', 1036, 80, { size: 22, family: F.tc, color: P, align: 'right' });
      }
      ctx.restore();
    } else {
      // before / after: the same moon → clock cut, mismatched (left) vs matched (right)
      ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH);
      const u = (t - 8) % 2, shot = u < 1 ? 'moon' : 'clock', ca = u >= 1 ? Math.exp(-(u - 1) * 3) : 0;
      const pw = 490, sc = pw / 1080, top = 220;
      [[40, false], [550, true]].forEach(([px, ok]) => {
        ctx.save(); ctx.translate(px, top); ctx.beginPath(); ctx.rect(0, 0, pw, pw); ctx.clip();
        ctx.scale(sc, sc);
        if (!ok && shot === 'clock') { ctx.translate(300, 300); ctx.scale(0.55, 0.55); ctx.translate(-CX, -CY); }
        SHOTS[shot].draw(ctx, t, rotAt(t), u);
        ctx.restore();
        ctx.save(); ctx.translate(px, top); ctx.scale(sc, sc);
        matchCircle(ctx, 0.5, CX, CY, R);
        if (!ok && shot === 'clock') {
          matchCircle(ctx, 0.9, 300, 300, R * 0.55);
          ctx.globalCompositeOperation = 'difference'; ctx.strokeStyle = P; ctx.fillStyle = P; ctx.lineWidth = 7; ctx.globalAlpha = Math.max(0.35, ca);
          ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(330, 330); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(300, 300); ctx.lineTo(352, 318); ctx.lineTo(318, 352); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = K; ctx.lineWidth = 2; ctx.strokeRect(px, top, pw, pw);
        text(ctx, ok ? '✓ 對齊：同圓心同半徑' : '✕ 不對齊：眼睛要重新找', px, top + pw + 50, { size: 28, family: F.tcBlack, weight: 900, color: K });
        text(ctx, ok ? 'Δ 0 px · 剪接隱形' : `Δ ${Math.round(Math.hypot(CX - 300, CY - 300))} px · 跳動感`, px, top + pw + 86, { size: 20, family: F.mono, weight: 500, color: K, alpha: 0.7 });
        text(ctx, shot === 'moon' ? 'A 月亮' : 'B 時鐘', px + pw - 16, top + 36, { size: 20, family: F.mono, weight: 500, color: shot === 'moon' ? P : K, align: 'right' });
      });
      text(ctx, '剪接前後，觀眾的視線停在同一點', 540, 930, { size: 28, family: F.tc, color: K, align: 'center', alpha: ease(E.outCubic, 8.6, 9.2, t) });
      text(ctx, 'EYE TRACE: KEEP THE SUBJECT WHERE THE EYE ALREADY IS', 540, 970, { size: 18, family: F.mono, color: K, align: 'center', spacing: 2, alpha: 0.55 * ease(E.outCubic, 8.6, 9.2, t) });
      text(ctx, '前 / 後對照', 44, 80, { size: 40, family: F.tcBlack, weight: 900, color: K, alpha: ease(E.outCubic, 8, 8.4, t) });
      text(ctx, 'BEFORE / AFTER · SAME CUT', 46, 116, { size: 18, family: F.mono, weight: 500, color: K, spacing: 3, alpha: 0.7 });
    }
    // edit timeline strip
    ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = P;
    const X = tt => 60 + 960 * tt / 20, y = 1030;
    ctx.globalAlpha = 0.35; ctx.fillRect(60, y, 960, 3);
    EDL.forEach(([tc]) => { ctx.globalAlpha = t >= tc ? 0.95 : 0.35; ctx.fillRect(X(tc) - 1.5, y - 12, 3, 27); });
    ctx.globalAlpha = 1; ctx.fillRect(60, y - 2, X(t) - 60, 7);
    ctx.restore();
  },
});
