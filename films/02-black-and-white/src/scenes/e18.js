/* 18 形狀變形 — polar r(θ) interpolation between circle / square / triangle / star, eased vs spring, then a nested payoff. */
const N = 360;
const SH = {};                                     // name → Float32Array r(θ), θ = -π/2 + TAU*i/N
function polyR(verts) {
  const r = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + TAU * i / N, dx = Math.cos(a), dy = Math.sin(a); let best = 1e9;
    for (let k = 0; k < verts.length; k++) {
      const [x1, y1] = verts[k], [x2, y2] = verts[(k + 1) % verts.length];
      const ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
      const tt = (x1 * ey - y1 * ex) / den, u = (x1 * dy - y1 * dx) / den;
      if (tt > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.min(best, tt);
    }
    r[i] = best;
  }
  return r;
}
const ngon = (n, R, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => [R * Math.cos(a0 + TAU * i / n), R * Math.sin(a0 + TAU * i / n)]);
const NAMES = { circle: '圓', square: '方', triangle: '三角', star: '星' };
const SEQ_A = [['circle', 'square'], ['square', 'triangle'], ['triangle', 'star'], ['star', 'circle']];
const SEQ_B = [['circle', 'square'], ['square', 'star'], ['star', 'triangle']];
const CYC = ['circle', 'square', 'triangle', 'star'];
const KS = 120, CS = 6.6;                           // spring params (ζ = c / 2√k ≈ 0.30)
const S = M.def({
  id: 'e18', num: 18, ch: 3, title: '形狀變形', en: 'SHAPE MORPH', dur: 20, ground: 'dark',
  prompt: '白色實心形狀依序變形：圓→方→三角→星→圓，每 2 秒一次。前 8 秒用 inOutCubic，之後改用彈簧（ζ≈0.3）讓形狀衝過頭再回彈；下方展開 r(θ) 曲線即時顯示。最後 14 層同心形狀錯開 0.06 秒連鎖變形，黑白交替。',
  how: ['每個形狀取樣 360 條射線，得到極座標 r(θ) 陣列', '變形 = 兩陣列逐點 lerp；p 用緩動或彈簧，可大於 1', '多邊形 r(θ) 用射線與各邊求交，取最近交點'],
  practice: '加入心形 r(θ)，讓它在拍點上跳動。',
  cues: [0, 2, 4, 6, 8, 10, 12].map(t => ({ t: t + 0.02, type: t >= 8 ? 'pop' : 'tick', v: 0.55 })).concat([{ t: 14, type: 'impact', v: 0.5 }, { t: 16, type: 'clap', v: 0.35 }, { t: 18, type: 'clap', v: 0.35 }]),
  init() {
    const c = new Float32Array(N).fill(1); SH.circle = c;
    SH.square = polyR(ngon(4, 1.18, -Math.PI / 4));
    SH.triangle = polyR(ngon(3, 1.32));
    SH.star = polyR(Array.from({ length: 10 }, (_, i) => { const R = i % 2 ? 0.55 : 1.3, a = -Math.PI / 2 + TAU * i / 10; return [R * Math.cos(a), R * Math.sin(a)]; }));
  },
  frame(ctx, t) {
    const tmp = new Float32Array(N);
    const mix = (a, b, p) => { for (let i = 0; i < N; i++) tmp[i] = a[i] + (b[i] - a[i]) * p; return tmp; };
    const path = (r, cx, cy, R, rot = 0) => {
      ctx.beginPath();
      for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + TAU * i / N + rot, rr = r[i] * R; i ? ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)) : ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
      ctx.closePath();
    };
    if (t < 14) {
      const sp = t >= 8, k = sp ? Math.min(2, Math.floor((t - 8) / 2)) : Math.min(3, Math.floor(t / 2));
      const u = sp ? t - 8 - k * 2 : t - k * 2;
      const [from, to] = sp ? SEQ_B[k] : SEQ_A[k];
      const p = sp ? spring(u, KS, CS) : E.inOutCubic(clamp(u / 1.1));
      const r = mix(SH[from], SH[to], p);
      const cx = 540, cy = 440, R = 205, la = ease(E.outCubic, sp ? 8 : 0, (sp ? 8 : 0) + 0.4, t);
      // header
      text(ctx, sp ? '02' : '01', 48, 72, { size: 22, family: F.mono, weight: 500, alpha: 0.5 * la });
      text(ctx, sp ? 'SPRING  k 120 · c 6.6 · ζ 0.30' : 'EASE  inOutCubic · 1.1 s', 92, 72, { size: 22, family: F.mono, weight: 500, spacing: 2, alpha: la });
      text(ctx, `${NAMES[from]} → ${NAMES[to]}`, 48, 112, { size: 30, family: F.tcBlack, weight: 900, alpha: la });
      // spokes: the sampled rays
      ctx.strokeStyle = fg(0.22); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < N; i += 10) { const a = -Math.PI / 2 + TAU * i / N, rr = r[i] * R; ctx.moveTo(cx, cy); ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
      ctx.stroke();
      // ghost of target
      ctx.setLineDash([4, 8]); ctx.strokeStyle = fg(0.45); ctx.lineWidth = 2; path(SH[to], cx, cy, R); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = fg(1); path(r, cx, cy, R); ctx.fill();
      ctx.strokeStyle = bg(0.4); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < N; i += 10) { const a = -Math.PI / 2 + TAU * i / N, rr = r[i] * R; ctx.moveTo(cx + 18 * Math.cos(a), cy + 18 * Math.sin(a)); ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
      ctx.stroke();
      text(ctx, '畫出 36 / 360 條射線', 870, 572, { size: 18, family: F.tc, align: 'center', alpha: 0.55 });
      // ---- r(θ) graph ----
      const gx = 110, gw = 860, gy = 930, gh = 170, sy = v => gy - (v / 1.4) * gh;
      ctx.fillStyle = fg(0.3); ctx.fillRect(gx, gy, gw, 1.5); ctx.fillRect(gx, gy - gh - 10, 1.5, gh + 10);
      ctx.fillStyle = fg(0.14); ctx.fillRect(gx, sy(1), gw, 1);
      text(ctx, 'r', gx - 18, gy - gh - 2, { size: 20, family: F.mono, align: 'right', alpha: 0.7 });
      text(ctx, '1.0', gx - 14, sy(1) + 6, { size: 18, family: F.mono, align: 'right', alpha: 0.5 });
      ['0', 'π/2', 'π', '3π/2', '2π'].forEach((l, i) => text(ctx, l, gx + gw * i / 4, gy + 30, { size: 18, family: F.mono, align: 'center', alpha: 0.55 }));
      text(ctx, 'θ', gx + gw + 26, gy + 6, { size: 20, family: F.mono, alpha: 0.7 });
      const curve = (arr, w, a, dash) => { ctx.setLineDash(dash || []); ctx.strokeStyle = fg(a); ctx.lineWidth = w; ctx.beginPath(); for (let i = 0; i <= N; i++) { const v = arr[i % N]; const x = gx + gw * i / N; i ? ctx.lineTo(x, sy(v)) : ctx.moveTo(x, sy(v)); } ctx.stroke(); ctx.setLineDash([]); };
      curve(SH[from], 1.5, 0.35, [2, 6]); curve(SH[to], 1.5, 0.6, [8, 6]); curve(r, 3, 1);
      text(ctx, `r(θ) = lerp(${from}, ${to}, p)   p = ${p.toFixed(2)}`, 540, gy + 76, { size: 22, family: F.mono, align: 'center', alpha: 0.9 });
      // p meter (shows overshoot)
      const mx = 870, my = 150, mh = 360, py = q => my + mh - q / 1.4 * mh;
      ctx.fillStyle = fg(0.2); ctx.fillRect(mx, my, 2, mh); ctx.fillStyle = fg(0.5); ctx.fillRect(mx - 10, py(1), 22, 2); ctx.fillRect(mx - 10, py(0), 22, 2);
      text(ctx, '1', mx + 22, py(1) + 6, { size: 18, family: F.mono, alpha: 0.6 }); text(ctx, '0', mx + 22, py(0) + 6, { size: 18, family: F.mono, alpha: 0.6 });
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(mx + 1, py(p), 9, 0, TAU); ctx.fill();
      text(ctx, 'p', mx + 1, my - 18, { size: 20, family: F.mono, align: 'center', alpha: 0.7 });
    } else {
      // payoff: 14 nested shapes, each ring delayed 0.06 s, spring morph every second, alternating ink
      const cx = 540, cy = 540, n = 14;
      const intro = ease(E.outExpo, 14, 14.8, t);
      for (let j = n - 1; j >= 0; j--) {
        const tl = t - 14 - j * 0.06, k = Math.max(0, Math.floor(tl)), u = tl - k;
        const from = CYC[k % 4], to = CYC[(k + 1) % 4];   // k = 0 starts from the circle: no pop
        const p = tl < 0 ? 0 : spring(u, KS, CS);
        const r = mix(SH[tl < 0 ? 'circle' : from], SH[tl < 0 ? 'circle' : to], p);
        const R = (24 + j * 25) * lerp(0.2, 1, intro);
        ctx.fillStyle = (n - 1 - j) % 2 ? bg(1) : fg(1);
        path(r, cx, cy, R, j * 0.07 * Math.sin((t - 14) * 0.7)); ctx.fill();
      }
      text(ctx, '03  NESTED · delay 0.06 s × 14', 48, 72, { size: 22, family: F.mono, weight: 500, spacing: 2, alpha: ease(E.outCubic, 14.2, 14.6, t) });
      text(ctx, '每層同一條彈簧，晚 2 格出發', 48, 1032, { size: 24, family: F.tc, alpha: 0.75 * ease(E.outCubic, 14.6, 15, t) });
    }
  },
});
void S;
