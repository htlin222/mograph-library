/* 62 擦除與遮罩轉場 — six B&W shots joined by five mask types. Every transition is: draw shot A, clip to a mask
   path that grows with progress p, draw shot B. The inset shows the matte itself (white = incoming shot). */
const SH_ = [];
const STAR = (cx, cy, r, rot, ctx) => { for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); };
const STARS = (() => { const r = rng(62), a = []; for (let i = 0; i < 120; i++) a.push([r() * 1080, r() * 700, r() * 2.2 + 0.6]); return a; })();

/* ---- the six shots ---- */
SH_.push({ name: 'RINGS', draw(ctx, t) {
  ctx.fillStyle = K; ctx.fillRect(0, 0, SW, SH);
  ctx.strokeStyle = P; ctx.lineWidth = 15; ctx.beginPath();
  const cx = 540 + Math.sin(t * 0.7) * 90, cy = 540 + Math.cos(t * 0.5) * 60;
  for (let r = (t * 40) % 40 + 10; r < 900; r += 40) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); }
  ctx.stroke();
} });
SH_.push({ name: 'SUN', draw(ctx, t) {
  ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH);
  const hy = 640, sy = 600 - t * 6;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SW, hy); ctx.clip(); ctx.fillStyle = K; ctx.beginPath(); ctx.arc(540, sy, 210, 0, TAU); ctx.fill(); ctx.restore();
  ctx.fillStyle = K;
  for (let i = 0; i < 34; i++) { const q = i / 34, y = hy + 440 * Math.pow(q, 1.6); ctx.globalAlpha = lerp(0.9, 0.35, q); ctx.fillRect(0, y, SW, lerp(1.5, 3, q)); const w = 210 * lerp(1, 0.4, q) * (0.6 + 0.4 * noise(i * 0.6, t)); ctx.globalAlpha = 1; ctx.fillRect(540 - w, y - 1, w * 2, lerp(3, 7, q)); }
  ctx.globalAlpha = 1;
} });
SH_.push({ name: 'STRIPES', draw(ctx, t) {
  ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH); ctx.fillStyle = K;
  const off = (t * 60) % 80;
  ctx.beginPath(); for (let d = -1200 + off; d < 1200; d += 80) { ctx.moveTo(d, 0); ctx.lineTo(d + 40, 0); ctx.lineTo(d + 40 + 1080, 1080); ctx.lineTo(d + 1080, 1080); ctx.closePath(); } ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(540, 540, 300, 0, TAU); ctx.clip(); ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH); ctx.fillStyle = K;
  ctx.beginPath(); for (let d = -1200 - off; d < 2400; d += 80) { ctx.moveTo(d, 0); ctx.lineTo(d + 40, 0); ctx.lineTo(d + 40 - 1080, 1080); ctx.lineTo(d - 1080, 1080); ctx.closePath(); } ctx.fill();
  ctx.restore(); ctx.strokeStyle = K; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(540, 540, 300, 0, TAU); ctx.stroke();
} });
SH_.push({ name: 'HALFTONE', draw(ctx, t) {
  ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH); ctx.fillStyle = K; ctx.beginPath();
  for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
    const x = 22.5 + i * 45, y = 22.5 + j * 45, d = Math.hypot(x - 540, y - 540);
    const r = 21 * (0.5 + 0.5 * Math.sin(d / 70 - t * 3));
    if (r > 0.8) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  }
  ctx.fill();
} });
SH_.push({ name: 'NIGHT', draw(ctx, t) {
  ctx.fillStyle = K; ctx.fillRect(0, 0, SW, SH);
  for (const [x, y, r] of STARS) { ctx.fillStyle = g(1, 0.4 + 0.4 * Math.sin(t * 3 + x)); ctx.fillRect(x, y, r, r); }
  ctx.fillStyle = P; ctx.beginPath(); ctx.arc(700, 330, 130, 0, TAU); ctx.fill();
  ctx.fillStyle = K; ctx.beginPath(); ctx.arc(760 + t * 2, 300, 120, 0, TAU); ctx.fill();
  ctx.fillStyle = g(0.2); ctx.beginPath(); ctx.moveTo(0, SH);
  for (let x = 0; x <= 1080; x += 20) ctx.lineTo(x, 780 + 60 * noise(x * 0.004, 2.2) * 2 + 40 * Math.sin(x / 300)); ctx.lineTo(1080, SH); ctx.fill();
} });
SH_.push({ name: 'BURST', draw(ctx, t) {
  ctx.fillStyle = P; ctx.fillRect(0, 0, SW, SH); ctx.fillStyle = K; ctx.beginPath();
  const n = 24, a0 = t * 0.25;
  for (let i = 0; i < n; i += 2) { const a = a0 + i * TAU / n, b = a + TAU / n; ctx.moveTo(540, 540); ctx.lineTo(540 + Math.cos(a) * 1600, 540 + Math.sin(a) * 1600); ctx.lineTo(540 + Math.cos(b) * 1600, 540 + Math.sin(b) * 1600); ctx.closePath(); }
  ctx.fill(); ctx.fillStyle = P; ctx.beginPath(); ctx.arc(540, 540, 110, 0, TAU); ctx.fill();
  ctx.fillStyle = K; ctx.beginPath(); ctx.arc(540, 540, 70, 0, TAU); ctx.fill();
} });

/* ---- masks: add path for progress p (stage coords) ---- */
const MASKS = {
  wipe: { zh: '線性擦除', en: 'LINEAR WIPE', par: 'angle −20° · edge line', path(ctx, p, o = {}) { const a = o.a ?? -20 * Math.PI / 180, d = lerp(-820, 820, p); ctx.save(); ctx.translate(540, 540); ctx.rotate(a); ctx.rect(-2000, -2000, 2000 + d, 4000); ctx.restore(); }, edge(ctx, p, o = {}) { const a = o.a ?? -20 * Math.PI / 180, d = lerp(-820, 820, p); ctx.save(); ctx.translate(540, 540); ctx.rotate(a); ctx.moveTo(d, -2000); ctx.lineTo(d, 2000); ctx.restore(); } },
  iris: { zh: '圓形光圈', en: 'IRIS', par: 'r = p · 900 · from (700, 420)', path(ctx, p, o = {}) { const [x, y] = o.c || [700, 420]; ctx.moveTo(x + p * 1100, y); ctx.arc(x, y, Math.max(0.1, p * 1100), 0, TAU); }, edge(ctx, p, o) { this.path(ctx, p, o); } },
  clock: { zh: '時鐘擦除', en: 'CLOCK WIPE', par: 'θ = p · 360°', path(ctx, p, o = {}) { const s = o.dir || 1; ctx.moveTo(540, 540); ctx.arc(540, 540, 1600, -Math.PI / 2, -Math.PI / 2 + s * p * TAU, s < 0); ctx.closePath(); }, edge(ctx, p, o = {}) { const s = o.dir || 1, a = -Math.PI / 2 + s * p * TAU; ctx.moveTo(540, 540); ctx.lineTo(540 + Math.cos(a) * 1600, 540 + Math.sin(a) * 1600); ctx.moveTo(540, 540); ctx.lineTo(540, -1000); } },
  blinds: { zh: '百葉窗', en: 'VENETIAN BLINDS', par: '12 strips · stagger 0.05', path(ctx, p, o = {}) { const n = 12, w = 1080 / n; for (let i = 0; i < n; i++) { const q = clamp(p * 1.55 - i * 0.05); if (q <= 0) continue; o.v ? ctx.rect(i * w, 0, w * q, 1080) : ctx.rect(0, i * w, 1080, w * q); } }, edge() {} },
  shape: { zh: '形狀遮罩', en: 'SHAPE MASK', par: 'star · scale inCubic · rotate', path(ctx, p) { const r = 2400 * E.inCubic(p); if (r > 0.5) STAR(540, 540, r, p * 1.4, ctx); }, edge(ctx, p) { this.path(ctx, p); } },
};
/* transitions: [start, dur, mask, from, to, opts] */
const TR = [
  [0.5, 1.4, 'wipe', 0, 1], [3.5, 1.4, 'iris', 1, 2], [6.5, 1.4, 'clock', 2, 3], [9.5, 1.4, 'blinds', 3, 4], [12.5, 1.4, 'shape', 4, 5],
  [15.5, 0.8, 'wipe', 5, 0, { a: Math.PI / 4 }], [16.5, 0.8, 'iris', 0, 1, { c: [540, 540] }], [17.5, 0.8, 'clock', 1, 3, { dir: -1 }], [18.5, 0.8, 'blinds', 3, 2, { v: true }],
];

M.def({
  id: 'e62', num: 62, ch: 8, title: '擦除與遮罩轉場', en: 'WIPES & MASK TRANSITIONS', dur: 20, ground: 'dark',
  prompt: '六個黑白鏡頭（同心圓、黑太陽、斜紋、半色調、夜空、放射線）每 3 秒用不同遮罩轉場：線性擦除、圓形光圈、時鐘擦除、百葉窗、星形遮罩，各 1.4 秒 inOutCubic。右下角同步顯示遮罩本身（白＝新鏡頭）；最後每兩拍一次快切合集。',
  how: ['先畫鏡頭 A，再以遮罩路徑 clip，畫鏡頭 B', '遮罩是 p 的函數：半平面、圓 r=p·R、扇形 θ=p·360°', '百葉窗 12 條，每條延遲 0.05；邊界描一條亮線'],
  practice: '只用一個圓形遮罩，做出開場與收尾兩種轉場。',
  cues: TR.map(([a, d, m]) => ({ t: a, type: m === 'blinds' ? 'tick' : 'whoosh', dur: d })).concat(TR.map(([a, d]) => ({ t: a + d, type: 'pop', v: 0.4 }))),
  frame(ctx, t) {
    // current transition state
    let idx = -1; for (let i = 0; i < TR.length; i++) if (t >= TR[i][0]) idx = i;
    let from = 0, to = 0, p = 1, tr = null;
    if (idx >= 0) { tr = TR[idx]; from = tr[3]; to = tr[4]; p = E.inOutCubic(clamp((t - tr[0]) / tr[1])); }
    const mk = tr ? MASKS[tr[2]] : MASKS.wipe, o = (tr && tr[5]) || {};
    if (!tr || p >= 1) SH_[tr ? to : 0].draw(ctx, t);
    else {
      SH_[from].draw(ctx, t);
      ctx.save(); ctx.beginPath(); mk.path(ctx, p, o); ctx.clip(); SH_[to].draw(ctx, t); ctx.restore();
      // edge line (difference so it reads on either side)
      ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.strokeStyle = P; ctx.lineWidth = 4; ctx.beginPath(); mk.edge(ctx, p, o); ctx.stroke(); ctx.restore();
    }
    // ---- label (top-left) ----
    const showIdx = Math.max(0, idx), T = TR[showIdx], M_ = MASKS[T[2]];
    const la = idx < 0 ? ease(E.outCubic, 0, 0.4, t) : ease(E.outCubic, T[0], T[0] + 0.35, t);
    const payoff = t >= 15.5;
    ctx.fillStyle = K; ctx.fillRect(40, 40, 470, 132);
    ctx.strokeStyle = P; ctx.lineWidth = 1.5; ctx.strokeRect(40, 40, 470, 132);
    text(ctx, payoff ? `MONTAGE · ${showIdx - 4} / 4` : `0${showIdx + 1} / 05`, 58, 76, { size: 20, family: F.mono, weight: 500, color: P, spacing: 3, alpha: 0.55 * la });
    text(ctx, M_.zh, 58, 124, { size: 42, family: F.tcBlack, weight: 900, color: P, alpha: la });
    text(ctx, `${M_.en} · ${payoff ? '0.8s' : T[1] + 's'}`, 60, 156, { size: 18, family: F.mono, weight: 500, color: P, spacing: 2, alpha: 0.65 * la });
    // ---- matte inset (bottom-right): black = outgoing, white = incoming ----
    const X = 790, Y = 760, Z = 250, sc = Z / 1080;
    ctx.fillStyle = K; ctx.fillRect(X - 8, Y - 44, Z + 16, Z + 74);
    ctx.save(); ctx.translate(X, Y); ctx.beginPath(); ctx.rect(0, 0, Z, Z); ctx.clip();
    ctx.fillStyle = g(0.12); ctx.fillRect(0, 0, Z, Z);
    ctx.scale(sc, sc); ctx.beginPath(); mk.path(ctx, tr ? p : 0, o); ctx.fillStyle = P; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = P; ctx.lineWidth = 1.5; ctx.strokeRect(X, Y, Z, Z);
    text(ctx, 'MATTE 遮罩', X, Y - 14, { size: 18, family: F.mono, weight: 500, color: P, alpha: 0.8 });
    text(ctx, `p ${(tr ? p : 0).toFixed(2)}`, X + Z, Y - 14, { size: 18, family: F.mono, weight: 500, color: P, align: 'right' });
    ctx.fillStyle = g(1, 0.25); ctx.fillRect(X, Y + Z + 12, Z, 4); ctx.fillStyle = P; ctx.fillRect(X, Y + Z + 12, Z * (tr ? p : 0), 4);
    // shot names A → B (bottom-left)
    const nm = (i) => String.fromCharCode(65 + i) + ' ' + SH_[i].name;
    ctx.fillStyle = K; ctx.fillRect(40, 940, 470, 100); ctx.strokeStyle = P; ctx.lineWidth = 1.5; ctx.strokeRect(40, 940, 470, 100);
    text(ctx, M_.par, 58, 974, { size: 18, family: F.mono, color: P, alpha: 0.6 });
    text(ctx, tr ? `${nm(from)}  →  ${nm(to)}` : nm(0), 58, 1024, { size: 22, family: F.mono, weight: 500, color: P, spacing: 1 });
  },
});
