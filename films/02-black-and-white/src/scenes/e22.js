/* 22 布林運算 — union / subtract / intersect / XOR via canvas compositing, then even-odd fill of many shapes. */
let OFF = null, OX = null, ICONS = [];
const OPS = [
  { key: 'UNION', zh: '聯集 A ∪ B', op: 'source-over', t0: 0 },
  { key: 'SUBTRACT', zh: '相減 A − B', op: 'destination-out', t0: 3 },
  { key: 'INTERSECT', zh: '交集 A ∩ B', op: 'destination-in', t0: 6 },
  { key: 'XOR', zh: '互斥 A xor B', op: 'xor', t0: 9 },
  { key: 'EVEN-ODD', zh: '奇偶填色：重疊奇數次才填', op: 'evenodd', t0: 12 },
];
const circ = (c, x, y, r) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); };
function sq(c, x, y, s, a, rr = 0.18) {
  // rounded square, rotated a, side s
  const h = s / 2, r = s * rr, pts = [];
  const cs = Math.cos(a), sn = Math.sin(a), P_ = (u, v) => [x + u * cs - v * sn, y + u * sn + v * cs];
  const k = 0.5523 * r;
  const seq = [[-h + r, -h], [h - r, -h], ['c', h - r + k, -h, h, -h + r - k, h, -h + r], [h, h - r], ['c', h, h - r + k, h - r + k, h, h - r, h], [-h + r, h], ['c', -h + r - k, h, -h, h - r + k, -h, h - r], [-h, -h + r], ['c', -h, -h + r - k, -h + r - k, -h, -h + r, -h]];
  seq.forEach((q, i) => {
    if (q[0] === 'c') { const a1 = P_(q[1], q[2]), a2 = P_(q[3], q[4]), a3 = P_(q[5], q[6]); c.bezierCurveTo(a1[0], a1[1], a2[0], a2[1], a3[0], a3[1]); }
    else { const p = P_(q[0], q[1]); i === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1]); }
  });
  c.closePath(); void pts;
}
/* composite A op B into ctx-like target c (2D context), ink colour col */
function boolDraw(c, op, A, B, col) {
  c.fillStyle = col;
  if (op === 'evenodd') { c.beginPath(); A(c); B(c); c.fill('evenodd'); return; }
  c.beginPath(); A(c); c.fill();
  c.globalCompositeOperation = op; c.beginPath(); B(c); c.fill(); c.globalCompositeOperation = 'source-over';
}
const S = M.def({
  id: 'e22', num: 22, ch: 3, title: '布林運算', en: 'BOOLEANS', dur: 20, ground: 'dark',
  prompt: '黑底白形：一個圓 A 與一個圓角方 B 持續移動、旋轉，每 3 秒切換一種布林運算：聯集、相減、交集、互斥，虛線保留原本輪廓；下方五格圖示標出目前運算。最後 9 個圓加 3 個方塊旋轉，用奇偶填色交織成萬花筒。',
  how: ['離屏畫布：先畫 A，再用合成模式畫 B', '相減 destination-out、交集 destination-in、互斥 xor', '多形狀放同一路徑 fill(\'evenodd\')：奇數層才填'],
  practice: '只用兩個圓的相減做出月亮的盈虧。',
  cues: [{ t: 0.05, type: 'pop', v: 0.5 }, { t: 3, type: 'pop', v: 0.5 }, { t: 6, type: 'pop', v: 0.5 }, { t: 9, type: 'pop', v: 0.5 }, { t: 12, type: 'thud', v: 0.6 },
    { t: 14, type: 'impact', v: 0.55 }, { t: 16, type: 'clap', v: 0.3 }, { t: 18, type: 'clap', v: 0.3 }],
  init() {
    OFF = makeCanvas(SW, SH); OX = OFF.getContext('2d');
    ICONS = OPS.map(o => [P, K].map(col => {
      const c = makeCanvas(120, 72), x = c.getContext('2d');
      if (o.op === 'evenodd') boolDraw(x, 'evenodd', q => { circ(q, 40, 36, 24); circ(q, 60, 36, 24); }, q => circ(q, 80, 36, 24), col);
      else boolDraw(x, o.op, q => circ(q, 48, 36, 28), q => circ(q, 74, 36, 28), col);
      return c;
    }));
  },
  frame(ctx, t) {
    const k = OPS.findLastIndex(o => t >= o.t0), O = OPS[k];
    const cy = 470;
    let A, B;
    if (t < 14) {
      const ax = 540 - 105 + 70 * Math.sin(t * 1.3), ay = cy + 30 * Math.sin(t * 0.9);
      const bx = 540 + 110 - 40 * Math.sin(t * 0.8), by = cy - 20 * Math.cos(t * 1.1), ba = t * 0.5;
      if (k < 4) {
        A = c => circ(c, ax, ay, 200); B = c => sq(c, bx, by, 330, ba);
      } else {
        A = c => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5 + (t - 12) * 0.5; circ(c, 540 + 120 * Math.cos(a), cy + 120 * Math.sin(a), 175); } };
        B = () => {};
      }
      OX.setTransform(1, 0, 0, 1, 0, 0); OX.clearRect(0, 0, SW, SH);
      boolDraw(OX, O.op, A, B, P);
      ctx.drawImage(OFF, 0, 0);
      // ghost outlines of the operands
      ctx.save(); ctx.setLineDash([6, 8]); ctx.lineWidth = 2; ctx.strokeStyle = g(1, 0.55);
      ctx.globalCompositeOperation = 'difference';
      ctx.beginPath(); A(ctx); B(ctx); ctx.stroke(); ctx.restore();
      if (k < 4) {
        text(ctx, 'A', ax - 240, ay - 160, { size: 40, family: F.latin, weight: 800 });
        text(ctx, 'B', bx + 210, by - 170, { size: 40, family: F.latin, weight: 800 });
      } else {
      }
    } else {
      // payoff: 9 circles + 3 squares, even-odd
      const u = t - 14, gr = lerp(0.4, 1, ease(E.outExpo, 14, 15.2, t)), c0 = 470;
      OX.setTransform(1, 0, 0, 1, 0, 0); OX.clearRect(0, 0, SW, SH);
      OX.fillStyle = P; OX.beginPath();
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + u * 0.35, rr = 150 + 40 * Math.sin(u * 1.1 + i), r = 190 * gr; circ(OX, 540 + rr * Math.cos(a) * gr, c0 + rr * Math.sin(a) * gr, r); }
      for (let i = 0; i < 3; i++) sq(OX, 540, c0, (300 + i * 130) * gr, -u * 0.25 * (i % 2 ? -1 : 1) + i * 0.3, 0.08);
      circ(OX, 540, c0, 60 * gr);
      OX.fill('evenodd');
      ctx.drawImage(OFF, 0, 0);
    }
    // label
    const la = ease(E.outCubic, O.t0, O.t0 + 0.35, t), lab = t >= 14 ? ['06', 'KALEIDOSCOPE', '9 圓 + 3 方，一次 evenodd 填色'] : [String(k + 1).padStart(2, '0'), O.key, O.zh];
    const at = t >= 14 ? ease(E.outCubic, 14, 14.4, t) : la;
    text(ctx, lab[0], 48, 72, { size: 22, family: F.mono, weight: 500, alpha: 0.5 * at });
    text(ctx, lab[1], 92, 72, { size: 22, family: F.mono, weight: 500, spacing: 3, alpha: at });
    text(ctx, lab[2], 48, 112, { size: 26, family: F.tc, alpha: 0.8 * at });
    if (k < 4 && t < 14) text(ctx, `globalCompositeOperation = '${O.op}'`, 1032, 830, { size: 20, family: F.mono, align: 'right', alpha: 0.7 * la });
    if (k === 4 && t < 14) text(ctx, `ctx.fill('evenodd')`, 1032, 830, { size: 20, family: F.mono, align: 'right', alpha: 0.7 * la });
    // legend tiles
    const tw = 180, gap = 9, x0 = (SW - (tw * 5 + gap * 4)) / 2, ty = 896;
    OPS.forEach((o, i) => {
      const on = i === k, x = x0 + i * (tw + gap);
      ctx.fillStyle = on ? P : K; ctx.fillRect(x, ty, tw, 140);
      ctx.strokeStyle = g(1, on ? 1 : 0.35); ctx.lineWidth = 2; ctx.strokeRect(x + 1, ty + 1, tw - 2, 138);
      ctx.drawImage(ICONS[i][on ? 1 : 0], x + (tw - 120) / 2, ty + 14);
      text(ctx, o.key, x + tw / 2, ty + 120, { size: 18, family: F.mono, weight: 500, align: 'center', color: on ? K : P, spacing: 1, alpha: on ? 1 : 0.7 });
    });
  },
});
void S;
