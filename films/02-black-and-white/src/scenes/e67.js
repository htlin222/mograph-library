/* 67 載入與骨架屏 — six loaders, each a tiny pure function of t (spotlit two seconds each),
   a skeleton card with a world-space shimmer; payoff: a feed of skeletons loads with zero layout shift. */
const CELL = { w: 316, h: 290, gap: 18, x0: 48, y0: 40 };
const LOADERS = [
  { zh: '輻條', en: 'SPOKES', f: 'α = 1 − age / 12' },
  { zh: '圓弧', en: 'ARC', f: '頭尾 inOutCubic 錯半拍' },
  { zh: '三點', en: 'DOTS', f: 'y = A·max(0, sin(ωt−0.6i))' },
  { zh: '進度條', en: 'PROGRESS', f: '顯示值用彈簧追目標' },
  { zh: '環形', en: 'RING', f: '弧長 = p · 2π' },
  { zh: '脈衝', en: 'PULSE', f: 'r = r₀ + Δr·f' },
];
const SHIM = 1.5;                                        // shimmer period (s)
const POSTS = [
  { name: '林小黑', time: '剛剛', lines: ['今天把所有轉場都換成彈簧，', '介面終於有了重量感。', '#motion #spring'] },
  { name: '陳灰灰', time: '5 分鐘前', lines: ['骨架屏的尺寸要跟內容一樣，', '載入完成時版面不能跳。', '#ux #skeleton'] },
  { name: '王小白', time: '12 分鐘前', lines: ['光帶 1.5 秒掃一次剛好，', '太快會像在閃爍。', '#loading'] },
];
const LOAD_T = [16.3, 16.75, 17.2];
const CARD_H = 290;
// progress: targets jump in chunks (like network), display chases them with a spring; loops every 4 s
const PSTEPS = [[0, 0], [0.3, 0.18], [0.9, 0.42], [1.4, 0.47], [2.0, 0.81], [2.8, 1.0], [3.6, 0]];
function progress(t) {
  const u = t % 4; let v = 0;
  for (let i = 1; i < PSTEPS.length; i++) { const [ti, vi] = PSTEPS[i]; if (u < ti) break; v += (vi - PSTEPS[i - 1][1]) * (vi === 0 ? E.outCubic(clamp((u - ti) / 0.25)) : spring(u - ti, 180, 24)); }
  return v;
}
let IMGS = [];
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); };

function drawLoader(ctx, k, cx, cy, t) {
  ctx.save(); ctx.fillStyle = K; ctx.strokeStyle = K; ctx.lineCap = 'round';
  if (k === 0) {
    const head = Math.floor(t * 12);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2, age = ((head - i) % 12 + 12) % 12;
      ctx.globalAlpha = 1 - age / 12 * 0.88; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); ctx.lineTo(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56); ctx.stroke();
    }
  } else if (k === 1) {
    const T = 1.4, n = Math.floor(t / T), ph = t / T - n;
    const head = E.inOutCubic(clamp(ph * 2)), tail = E.inOutCubic(clamp(ph * 2 - 1));
    const base = t * 2.4 + n * 0.75 * TAU - Math.PI / 2;
    ctx.lineWidth = 11; ctx.globalAlpha = 0.1; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 50, base + tail * 0.75 * TAU, base + head * 0.75 * TAU + 0.12); ctx.stroke();
  } else if (k === 2) {
    for (let i = 0; i < 3; i++) {
      const ph = TAU * 1.25 * t - i * 0.6, y = -40 * Math.max(0, Math.sin(ph)), d = ((ph % TAU) + TAU) % TAU - Math.PI;
      const sq = d > 0 ? 1 + 0.3 * Math.exp(-d * 4) * Math.cos(d * 3) : 1;
      ctx.beginPath(); ctx.ellipse(cx + (i - 1) * 52, cy + 20 + y, 17 * sq, 17 / sq, 0, 0, TAU); ctx.fill();
    }
  } else if (k === 3) {
    const p = clamp(progress(t), 0, 1.02), w = 250, x = cx - w / 2;
    rr(ctx, x, cy - 9, w, 18, 9); ctx.globalAlpha = 0.1; ctx.fill(); ctx.globalAlpha = 1;
    if (p > 0.005) { rr(ctx, x, cy - 9, w * Math.min(1, p), 18, 9); ctx.fill(); }
    text(ctx, `${Math.round(clamp(p) * 100)}%`, cx, cy - 32, { size: 30, family: F.mono, weight: 500, align: 'center', color: K });
  } else if (k === 4) {
    const p = E.inOutCubic(fract(t / 3) * 1.15 > 1 ? 1 : fract(t / 3) * 1.15);
    ctx.lineWidth = 12; ctx.globalAlpha = 0.1; ctx.beginPath(); ctx.arc(cx, cy, 54, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    if (p > 0.003) { ctx.beginPath(); ctx.arc(cx, cy, 54, -Math.PI / 2, -Math.PI / 2 + p * TAU); ctx.stroke(); }
    text(ctx, String(Math.round(p * 100)), cx, cy + 11, { size: 30, family: F.mono, weight: 500, align: 'center', color: K });
  } else {
    for (let i = 0; i < 3; i++) {
      const f = fract(t / 1.5 + i / 3);
      ctx.globalAlpha = (1 - f) * 0.9; ctx.lineWidth = 4 + 6 * (1 - f); ctx.beginPath(); ctx.arc(cx, cy, 12 + 54 * E.outCubic(f), 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(cx, cy, 12 + 2 * Math.sin(t * TAU / 1.5), 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// skeleton geometry relative to a card at (x, y) — the real content uses the same boxes
const SK = [
  ['c', 76, 64, 34], ['r', 128, 42, 200, 20], ['r', 128, 74, 120, 14],
  ['r', 36, 120, 300, 136, 16], ['r', 368, 128, 520, 22], ['r', 368, 172, 440, 22], ['r', 368, 216, 260, 22],
];
function skelPath(ctx, x, y) {
  ctx.beginPath();
  for (const s of SK) { if (s[0] === 'c') { ctx.moveTo(x + s[1] + s[3], y + s[2]); ctx.arc(x + s[1], y + s[2], s[3], 0, TAU); } else ctx.roundRect(x + s[1], y + s[2], s[3], s[4], s[5] || s[4] / 2); }
}
function drawCard(ctx, x, y, t, load, post, img) {
  rr(ctx, x - 1, y + 4, 986, CARD_H, 30); ctx.fillStyle = g(0, 0.04); ctx.fill();
  rr(ctx, x, y, 984, CARD_H, 28); ctx.fillStyle = '#ffffff'; ctx.fill();
  if (load < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - load;
    skelPath(ctx, x, y); ctx.fillStyle = g(0, 0.075); ctx.fill();
    // world-space shimmer: one diagonal band for every skeleton on screen, period 1.5 s
    ctx.clip();
    const bx = -500 + fract(t / SHIM) * 2300;
    const gr = ctx.createLinearGradient(bx - 220, 0, bx + 220, 260);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(x, y, 984, CARD_H);
    ctx.restore();
  }
  if (load > 0 && post) {
    ctx.save(); ctx.globalAlpha *= load; ctx.translate(0, (1 - load) * 10);
    ctx.fillStyle = K; ctx.beginPath(); ctx.arc(x + 76, y + 64, 34, 0, TAU); ctx.fill();
    text(ctx, post.name[0], x + 76, y + 75, { size: 30, family: F.tcBlack, weight: 900, align: 'center', color: P });
    text(ctx, post.name, x + 128, y + 61, { size: 28, family: F.tcBlack, weight: 900, color: K });
    text(ctx, post.time, x + 128, y + 92, { size: 20, family: F.tc, color: K, alpha: 0.5 });
    ctx.save(); rr(ctx, x + 36, y + 120, 300, 136, 16); ctx.clip(); ctx.drawImage(img, x + 36, y + 120, 300, 136); ctx.restore();
    post.lines.forEach((l, k) => text(ctx, l, x + 368, y + 148 + k * 44, { size: 28, family: k === 2 ? F.mono : F.tc, color: K, alpha: k === 2 ? 0.5 : 0.9 }));
    ctx.restore();
  }
}
function makeImgs() {
  return [0, 1, 2].map(k => {
    const c = makeCanvas(600, 272), x = c.getContext('2d'); x.fillStyle = K; x.fillRect(0, 0, 600, 272); x.fillStyle = P; x.strokeStyle = P;
    if (k === 0) { x.lineWidth = 6; for (let r = 20; r < 700; r += 26) { x.beginPath(); x.arc(470, 230, r, 0, TAU); x.stroke(); } }
    if (k === 1) { for (let yy = 8; yy < 272; yy += 20) for (let xx = 8; xx < 600; xx += 20) { const r = 9 * clamp(xx / 600); if (r > 0.5) { x.beginPath(); x.arc(xx, yy, r, 0, TAU); x.fill(); } } }
    if (k === 2) { for (let i = 0; i < 24; i++) x.fillRect(i * 26, 0, 13 * (0.3 + 0.7 * Math.abs(Math.sin(i * 0.4))), 272); }
    return c;
  });
}

M.def({
  id: 'e67', num: 67, ch: 9, title: '載入與骨架屏', en: 'LOADERS & SKELETONS', dur: 20, ground: 'light',
  prompt: '白底，上方六種載入動畫：輻條、圓弧、三點、進度條、環形、脈衝，每 2 秒聚焦一個並標公式；下方骨架卡片，光帶 1.5 秒掃一次。最後三張骨架卡依序載入真內容，版面完全不位移。',
  how: ['每個載入器都是 t 的純函數，例如輻條 ⌊12t⌋ 步進', '光帶用全域座標的斜向漸層，裁切在骨架形狀內', '骨架與內容共用同一組方框，載入只做交叉淡入'],
  practice: '把三點改成先壓扁再跳起，加一點預備動作。',
  cues: [...[2, 4, 6, 8, 10, 12].map(t => ({ t, type: 'tick', v: 0.5 })), { t: 14.0, type: 'whoosh', dur: 0.4, v: 0.5 },
    ...LOAD_T.map((t, i) => ({ t, type: 'bell', i: i + 1, v: 0.4, dec: 1.2 }))],
  init() { IMGS = makeImgs(); },
  frame(ctx, t) {
    const focus = t >= 2 && t < 14 ? Math.floor((t - 2) / 2) : -1;
    // ---------- loader grid ----------
    for (let k = 0; k < 6; k++) {
      const c = k % 3, r = Math.floor(k / 3), x = CELL.x0 + c * (CELL.w + CELL.gap), y = CELL.y0 + r * (CELL.h + CELL.gap);
      const intro = spring(t - k * 0.05, 300, 26), out = ease(E.inBack, 13.85 + k * 0.05, 14.3 + k * 0.05, t);
      if (out >= 1) continue;
      const fa = focus < 0 ? 1 : focus === k ? 1 : 0.32;
      const fs = track2(t, k);
      ctx.save(); ctx.globalAlpha = clamp(intro * 1.4) * (1 - out);
      const cx = x + CELL.w / 2, cy = y + CELL.h / 2;
      ctx.translate(cx, cy + (1 - intro) * 30); ctx.scale(1 - 0.2 * out, 1 - 0.2 * out); ctx.translate(-cx, -cy);
      rr(ctx, x, y, CELL.w, CELL.h, 28); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = 1.5 + 1.5 * fs; ctx.strokeStyle = g(0, 0.1 + 0.8 * fs); ctx.stroke();
      ctx.globalAlpha *= lerp(1, fa, ease(E.outCubic, 1.8, 2.1, t));
      drawLoader(ctx, k, cx, y + 128, t);
      text(ctx, `0${k + 1}`, x + 26, y + 44, { size: 19, family: F.mono, weight: 500, alpha: 0.45 });
      text(ctx, LOADERS[k].en, x + CELL.w - 26, y + 44, { size: 19, family: F.mono, weight: 500, alpha: 0.45, align: 'right', spacing: 2 });
      text(ctx, LOADERS[k].zh, cx, y + 236, { size: 28, family: F.tcBlack, weight: 900, align: 'center' });
      text(ctx, LOADERS[k].f, cx, y + 268, { size: 18, family: F.mono, align: 'center', alpha: 0.4 + 0.5 * fs });
      ctx.restore();
    }
    // ---------- skeleton cards ----------
    const ys = [lerp(680, 50, spring(t - 14.0, 220, 26)), lerp(1120, 360, spring(t - 14.2, 220, 26)), lerp(1500, 670, spring(t - 14.4, 220, 26))];
    const cin = spring(t - 0.3, 260, 26);
    ys.forEach((y0, i) => {
      if (i > 0 && t < 13.9) return;
      const y = i === 0 ? y0 + (1 - cin) * 60 : y0;
      ctx.save(); ctx.globalAlpha = i === 0 ? clamp(cin * 1.4) : 1;
      drawCard(ctx, 48, y, t, ease(E.outCubic, LOAD_T[i], LOAD_T[i] + 0.45, t), POSTS[i], IMGS[i]);
      ctx.restore();
    });
    if (t < 14.2) {
      const a = ease(E.outCubic, 0.6, 1.0, t) * (1 - ease(E.inCubic, 13.6, 14.0, t));
      text(ctx, '骨架屏 SKELETON · 光帶週期 1.5s', 48, 1060 - (1 - cin) * 0, { size: 20, family: F.mono, alpha: 0.5 * a });
    } else {
      const a = ease(E.outCubic, 17.8, 18.4, t);
      text(ctx, '骨架 = 內容的方框　→　載入時版面位移 0 px', SW / 2, 1028, { size: 26, family: F.tc, align: 'center', alpha: 0.65 * a });
    }
  },
});
function track2(t, k) {                                  // focus ring weight for loader k
  const t0 = 2 + k * 2;
  return ease(E.outCubic, t0, t0 + 0.25, t) * (1 - ease(E.inCubic, t0 + 1.8, t0 + 2.0, t));
}
