/* 66 共享元素轉換 — container transform: a list card becomes the detail screen. Every sub-element
   (card, image, title, subtitle) has a rect in each layout; one spring p interpolates them (FLIP). */
const SCR = { x: 74, y: 54, w: 512, h: 972, r: 50 };
const ITEMS = [
  { zh: '同心圓', en: 'RINGS · 01' }, { zh: '斜紋', en: 'STRIPES · 02' },
  { zh: '網點', en: 'HALFTONE · 03' }, { zh: '波浪', en: 'WAVES · 04' },
];
const NORMAL = { k: 260, c: 30 }, SLOW = { k: 6, c: 4.6 }, FAST = { k: 340, c: 32 };
// open / close events per card: [time, value, spring]
const OPEN = [[], [], [], []];
OPEN[1].push([0.6, 1, NORMAL], [2.4, 0, NORMAL]);
OPEN[2].push([3.9, 1, SLOW], [6.6, 0, SLOW]);
OPEN[0].push([9.5, 1, FAST], [11.0, 0, FAST]);
OPEN[3].push([11.5, 1, FAST], [13.0, 0, FAST]);
OPEN[2].push([16.0, 1, NORMAL]);
const GRID_T = 14.2;
const track = (t, ev) => { let v = 0, prev = 0; for (const [ti, vi, sp] of ev) { if (t < ti) break; v += (vi - prev) * spring(t - ti, sp.k, sp.c); prev = vi; } return v; };
const lastEvent = t => { let best = null; OPEN.forEach((ev, i) => ev.forEach(e => { if (e[0] <= t && (!best || e[0] > best.t)) best = { t: e[0], i, v: e[1], sp: e[2] }; })); return best; };

function listL(i) {
  const x = 96, y = 196 + i * 196, w = 468, h = 176;
  return { card: [x, y, w, h, 24, 24], img: [x + 20, y + 20, 136, 136, 16, 16], title: [x + 182, y + 76, 36], sub: [x + 184, y + 114], body: 0 };
}
function gridL(i) {
  const c = i % 2, r = i >> 1, w = 222, h = 380, x = 96 + c * (w + 24), y = 196 + r * (h + 24);
  return { card: [x, y, w, h, 24, 24], img: [x, y, w, 250, 24, 6], title: [x + 18, y + 302, 32], sub: [x + 20, y + 340], body: 0 };
}
const DETAIL = { card: [SCR.x, SCR.y, SCR.w, SCR.h, SCR.r, SCR.r], img: [SCR.x, SCR.y, SCR.w, 440, SCR.r, 0], title: [110, 572, 60], sub: [112, 616], body: 1 };
const mixA = (a, b, p) => a.map((v, k) => lerp(v, b[k], p));
const mixL = (a, b, p) => ({ card: mixA(a.card, b.card, p), img: mixA(a.img, b.img, p), title: mixA(a.title, b.title, p), sub: mixA(a.sub, b.sub, p), body: lerp(a.body, b.body, p) });
const rr2 = (ctx, x, y, w, h, rt, rb) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, [rt, rt, rb, rb].map(r => Math.max(0, Math.min(r, w / 2, h / 2)))); };

let IMGS = [];
function makeImages() {
  return ITEMS.map((_, k) => {
    const S = 640, c = makeCanvas(S, S), x = c.getContext('2d');
    x.fillStyle = K; x.fillRect(0, 0, S, S); x.fillStyle = P; x.strokeStyle = P;
    if (k === 0) { for (let r = 300; r > 0; r -= 22) { x.lineWidth = 9; x.beginPath(); x.arc(S * 0.42, S * 0.46, r, 0, TAU); x.stroke(); } for (let r = 300; r > 0; r -= 22) { x.lineWidth = 3; x.beginPath(); x.arc(S * 0.62, S * 0.56, r, 0, TAU); x.stroke(); } }
    if (k === 1) { x.save(); x.translate(S / 2, S / 2); x.rotate(-Math.PI / 4); for (let i = -30; i < 30; i++) x.fillRect(i * 34, -600, 16, 1200); x.restore(); x.globalCompositeOperation = 'xor'; x.beginPath(); x.arc(S / 2, S / 2, 190, 0, TAU); x.fill(); x.globalCompositeOperation = 'source-over'; }
    if (k === 2) { const st = 26; for (let yy = st / 2; yy < S; yy += st) for (let xx = st / 2; xx < S; xx += st) { const d = Math.hypot(xx - S * 0.35, yy - S * 0.4) / (S * 0.75); const r = st * 0.5 * clamp(1 - d); if (r > 0.6) { x.beginPath(); x.arc(xx, yy, r, 0, TAU); x.fill(); } } }
    if (k === 3) { x.lineWidth = 5; for (let j = 0; j < 30; j++) { x.beginPath(); for (let xx = 0; xx <= S; xx += 8) { const yy = 30 + j * 21 + Math.sin(xx * 0.018 + j * 0.35) * 26 * Math.sin(j * 0.2 + 0.6); xx ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); } }
    return c;
  });
}
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
const BODY = ['共享元素讓人知道「我從哪來」。', '卡片、圖片、標題各自從起點', '補間到終點，不是淡入淡出。'];

M.def({
  id: 'e66', num: 66, ch: 9, title: '共享元素轉換', en: 'SHARED-ELEMENT TRANSITION', dur: 20, ground: 'dark',
  prompt: '黑底手機畫面，列表四張白卡。點一張卡，卡片本身彈簧展開成全螢幕詳情頁：圖片變主圖、標題放大移位，內文延遲淡入，再收回。中段放慢約 6 倍並畫出起點、終點框；最後列表變網格再展開。',
  how: ['FLIP：記錄起點與終點矩形，用同一個 p 補間', '卡片、圖片、標題各有三種版面的矩形與圓角', 'p 用彈簧 k 260、c 30；內文在 p > 0.72 才進場'],
  practice: '關閉時讓圖片先回位、卡片晚 60ms 跟上。',
  cues: [{ t: 0.6, type: 'tick' }, { t: 0.62, type: 'whoosh', dur: 0.35, v: 0.5 }, { t: 2.4, type: 'whoosh', dur: 0.3, v: 0.4 },
    { t: 3.9, type: 'whoosh', dur: 1.5, v: 0.5 }, { t: 6.6, type: 'whoosh', dur: 1.5, v: 0.4 }, { t: 9.5, type: 'tick' }, { t: 11.5, type: 'tick' },
    { t: GRID_T, type: 'whoosh', dur: 0.5, v: 0.5 }, { t: 16.0, type: 'pop', v: 0.6 }, { t: 16.05, type: 'whoosh', dur: 0.4, v: 0.5 }],
  init() { IMGS = makeImages(); },
  frame(ctx, t) {
    const intro = spring(t + 0.05, 200, 26);
    // ---------- phone ----------
    ctx.save(); ctx.translate(0, (1 - intro) * 60); ctx.globalAlpha = clamp(intro * 1.3);
    ctx.beginPath(); ctx.roundRect(SCR.x - 14, SCR.y - 14, SCR.w + 28, SCR.h + 28, SCR.r + 14); ctx.strokeStyle = fg(0.4); ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(SCR.x, SCR.y, SCR.w, SCR.h, SCR.r); ctx.clip();
    ctx.fillStyle = g(0.07); ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    text(ctx, '9:41', SCR.x + 46, SCR.y + 44, { size: 22, family: F.mono, weight: 500, alpha: 0.7 });
    text(ctx, '收藏', 96, 156, { size: 50, family: F.tcBlack, weight: 900 });
    text(ctx, 'COLLECTION', 210, 154, { size: 19, family: F.mono, alpha: 0.45, spacing: 3 });
    const ps = OPEN.map(ev => track(t, ev));
    const gps = [0, 1, 2, 3].map(i => spring(t - GRID_T - i * 0.07, 240, 26));
    const lay = i => mixL(mixL(listL(i), gridL(i), gps[i]), DETAIL, ps[i]);
    const order = [0, 1, 2, 3].sort((a, b) => ps[a] - ps[b]);
    const pMax = Math.max(...ps);
    order.forEach((i, n) => {
      const L = lay(i);
      if (n === 3 && pMax > 0.002) { ctx.fillStyle = `rgba(0,0,0,${0.65 * clamp(pMax)})`; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h); }
      if (n === 3 && t > 3.6 && t < 9.2) {               // FIRST ghost sits under the moving card
        const ga = ease(E.outCubic, 3.6, 4.0, t) * (1 - ease(E.inCubic, 8.6, 9.2, t)), F0 = listL(2);
        ctx.save(); ctx.globalAlpha = ga; ctx.setLineDash([10, 8]); ctx.lineWidth = 2.5; ctx.strokeStyle = P;
        ctx.beginPath(); ctx.roundRect(F0.card[0] - 6, F0.card[1] - 6, F0.card[2] + 12, F0.card[3] + 12, 30); ctx.stroke(); ctx.restore();
      }
      const [cx, cy, cw, ch, crt, crb] = L.card;
      ctx.save();
      rr2(ctx, cx, cy, cw, ch, crt, crb); ctx.fillStyle = P; ctx.fill(); ctx.clip();
      const [ix, iy, iw, ih, irt, irb] = L.img;
      ctx.save(); rr2(ctx, ix, iy, iw, ih, irt, irb); ctx.clip(); cover(ctx, IMGS[i], ix, iy, iw, ih); ctx.restore();
      const [tx, ty0, ts] = L.title;
      // keep the title below the image whenever it slides under it horizontally
      const wv = clamp((ix + iw + 30 - tx) / 80), ty = lerp(ty0, Math.max(ty0, iy + ih + ts * 1.15), wv), dy = ty - ty0;
      text(ctx, ITEMS[i].zh, tx, ty, { size: ts, family: F.tcBlack, weight: 900, color: K });
      text(ctx, ITEMS[i].en, L.sub[0], L.sub[1] + dy, { size: 19, family: F.mono, color: g(0.35), spacing: 2 });
      if (L.body > 0.72) {
        BODY.forEach((s, k) => { const a = ease(E.outCubic, 0.72 + k * 0.07, 0.97 + k * 0.03, L.body);
          text(ctx, s, 112, ty + 118 + k * 46 + (1 - a) * 24, { size: 27, family: F.tc, color: K, alpha: a * 0.85 }); });
        const a = ease(E.outCubic, 0.8, 1, L.body);
        ctx.fillStyle = g(0, 0.12 * a); ctx.fillRect(112, ty + 278, 440, 2);
        for (let k = 0; k < 3; k++) { ctx.fillStyle = g(0, 0.1 * a); ctx.beginPath(); ctx.roundRect(112, ty + 308 + k * 36, 440 - k * 90, 16, 8); ctx.fill(); }
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P; ctx.beginPath(); ctx.arc(SCR.x + 52, SCR.y + 76, 26, 0, TAU); ctx.fill();
        ctx.strokeStyle = K; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(SCR.x + 43, SCR.y + 67); ctx.lineTo(SCR.x + 61, SCR.y + 85); ctx.moveTo(SCR.x + 61, SCR.y + 67); ctx.lineTo(SCR.x + 43, SCR.y + 85); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    });
    // tap indicators
    OPEN.forEach((ev, i) => ev.forEach(([T, v]) => {
      const d = t - T; if (d < -0.25 || d > 0.3) return;
      const L = v === 1 ? mixL(listL(i), gridL(i), gps[i]) : null;
      const [x, y] = L ? [L.img[0] + L.img[2] * 0.5, L.img[1] + L.img[3] * 0.5] : [SCR.x + 52, SCR.y + 76];
      const a = d < 0 ? ease(E.outCubic, -0.25, 0, d) : 1 - ease(E.inQuad, 0, 0.3, d);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g(0.5, 0.35); ctx.strokeStyle = g(1, 0.8); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, 30 * (d < 0 ? lerp(1.4, 1, a) : 1 + d), 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }));
    ctx.restore(); ctx.restore();
    // ghost rects (FIRST / LAST) during the slow-motion pass
    const ga = ease(E.outCubic, 3.6, 4.0, t) * (1 - ease(E.inCubic, 8.6, 9.2, t));
    if (ga > 0) {
      ctx.save(); ctx.globalAlpha = ga; ctx.setLineDash([10, 8]); ctx.lineWidth = 2.5; ctx.strokeStyle = P;
      const F0 = listL(2);
      ctx.beginPath(); ctx.roundRect(SCR.x - 26, SCR.y - 26, SCR.w + 52, SCR.h + 52, SCR.r + 26); ctx.stroke();
      ctx.setLineDash([]);
      const tag = (s, x, y, inv) => { font(ctx, 19, F.mono, 500); const w = ctx.measureText(s).width + 20; ctx.fillStyle = inv ? P : K; ctx.fillRect(x, y - 22, w, 30); text(ctx, s, x + 10, y, { size: 19, family: F.mono, weight: 500, color: inv ? K : P }); };
      tag('FIRST', F0.card[0] - 6, F0.card[1] + F0.card[3] + 32, true);
      tag('LAST', SCR.x + SCR.w - 70, SCR.y - 26, true);
      ctx.restore();
    }
    // ---------- teaching column ----------
    const X = 650, a0 = ease(E.outCubic, 0.2, 0.8, t);
    ctx.save(); ctx.globalAlpha = a0;
    text(ctx, 'FLIP', X, 112, { size: 76, family: F.latin, weight: 800, spacing: 2 });
    [['F', '記錄起點 First'], ['L', '量出終點 Last'], ['I', '反轉成起點 Invert'], ['P', '播放 p: 0 → 1']].forEach(([k, s], n) => {
      text(ctx, k, X, 170 + n * 40, { size: 24, family: F.mono, weight: 500 }); text(ctx, s, X + 36, 170 + n * 40, { size: 24, family: F.tc, alpha: 0.7 });
    });
    // active transition and property table
    const ev = lastEvent(t) || { i: 1, v: 1, t: 0.6, sp: NORMAL };
    const i = ev.i, p = ps[i], from = mixL(listL(i), gridL(i), gps[i]);
    ctx.fillStyle = fg(0.25); ctx.fillRect(X, 352, 390, 1.5);
    text(ctx, '屬性', X, 392, { size: 22, family: F.tc, alpha: 0.5 }); text(ctx, '起點', X + 160, 392, { size: 22, family: F.tc, alpha: 0.5, align: 'right' });
    text(ctx, '現在', X + 275, 392, { size: 22, family: F.tc, alpha: 0.5, align: 'right' }); text(ctx, '終點', X + 390, 392, { size: 22, family: F.tc, alpha: 0.5, align: 'right' });
    const cur = lay(i);
    const rows = [['card.x', from.card[0], cur.card[0], DETAIL.card[0]], ['card.y', from.card[1], cur.card[1], DETAIL.card[1]], ['card.w', from.card[2], cur.card[2], DETAIL.card[2]],
      ['card.h', from.card[3], cur.card[3], DETAIL.card[3]], ['img.h', from.img[3], cur.img[3], DETAIL.img[3]], ['title', from.title[2], cur.title[2], DETAIL.title[2]]];
    rows.forEach(([k, a, c, b], n) => {
      const y = 438 + n * 40;
      text(ctx, k, X, y, { size: 22, family: F.mono, alpha: 0.75 });
      text(ctx, a.toFixed(0), X + 160, y, { size: 22, family: F.mono, align: 'right', alpha: 0.45 });
      text(ctx, c.toFixed(0), X + 275, y, { size: 22, family: F.mono, weight: 500, align: 'right' });
      text(ctx, b.toFixed(0), X + 390, y, { size: 22, family: F.mono, align: 'right', alpha: 0.45 });
    });
    // p meter + p(t) plot
    const my = 712;
    text(ctx, `p = ${(Math.abs(p) < 0.0005 ? 0 : clamp(p, -9, 9)).toFixed(3)}`, X, my, { size: 30, family: F.mono, weight: 500 });
    ctx.fillStyle = fg(0.18); ctx.fillRect(X, my + 22, 390, 8); ctx.fillStyle = fg(1); ctx.fillRect(X, my + 22, 390 * clamp(p), 8);
    const py0 = my + 60, ph = 110;
    ctx.strokeStyle = fg(0.2); ctx.lineWidth = 1; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(X, py0); ctx.lineTo(X + 390, py0); ctx.moveTo(X, py0 + ph); ctx.lineTo(X + 390, py0 + ph); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = fg(1); ctx.lineWidth = 2.5; ctx.beginPath();
    for (let k = 0; k <= 80; k++) { const tt = Math.max(0, t - 3 + 3 * k / 80), v = track(tt, OPEN[i]); const xx = X + 390 * k / 80, yy = py0 + ph - ph * v; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    text(ctx, 'p(t) · 最近 3 秒', X, py0 + ph + 34, { size: 20, family: F.tc, alpha: 0.5 });
    // mode tag
    const mode = t < 3.7 ? ['一般速度', `k ${NORMAL.k} · c ${NORMAL.c}`] : t < 9.2 ? ['慢動作 ≈ 0.15×', `k ${SLOW.k} · c ${SLOW.c}`] : t < GRID_T ? ['任何位置都成立', `k ${FAST.k} · c ${FAST.c}`] : ['列表 → 網格 → 詳情', '同一元素，三種版面'];
    const ma = ease(E.outCubic, 0, 0.3, t - (t < 3.7 ? 0 : t < 9.2 ? 3.7 : t < GRID_T ? 9.2 : GRID_T));
    ctx.save(); ctx.globalAlpha *= ma; ctx.fillStyle = fg(1); ctx.beginPath(); ctx.roundRect(X, 962, 390, 74, 18); ctx.fill();
    text(ctx, mode[0], X + 22, 996, { size: 26, family: F.tc, color: BG === K ? K : P, weight: 400 }); text(ctx, mode[1], X + 22, 1024, { size: 19, family: F.mono, color: BG === K ? K : P, alpha: 0.7 });
    ctx.restore();
    ctx.restore();
  },
});
