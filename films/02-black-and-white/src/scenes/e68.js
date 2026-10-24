/* 68 資料動畫 — bar-chart race (values tween, ranks spring, axis rescales), line chart drawn on
   with a trim, then the same data as a donut whose angles are tweened between years. Patterns, not colours. */
const CATS = ['緩動', '遮罩', '轉場', '字體', '彈簧', '粒子'];
const BASE = [30, 22, 15, 18, 12, 8], GROW = [1.05, 1.18, 1.3, 1.12, 1.45, 1.62];
const YEARS = 8, Y0 = 2019;
const DATA = [];                                         // DATA[y][c]
{ const r = rng(68); for (let y = 0; y < YEARS; y++) DATA.push(BASE.map((b, c) => b * Math.pow(GROW[c], y) * (1 + 0.08 * (r() - 0.5)))); }
const STEP_T = y => 1.6 + (y - 1) * 0.9;                 // year y (1..7) starts tweening at this time
const yearPos = t => { let y = 0; for (let k = 1; k < YEARS; k++) if (t >= STEP_T(k)) y = k - 1 + E.outCubic(clamp((t - STEP_T(k)) / 0.6)); return y; };
const valAt = (yf, c) => { const a = Math.floor(yf), b = Math.min(YEARS - 1, a + 1); return lerp(DATA[a][c], DATA[b][c], yf - a); };
const rankOf = (vals, c) => vals.filter((v, k) => v > vals[c] || (v === vals[c] && k < c)).length;
// rank keys per category: change 0.15 s into each tween
const RANKK = CATS.map((_, c) => { const k = [[0, rankOf(DATA[0], c)]]; for (let y = 1; y < YEARS; y++) k.push([STEP_T(y) + 0.15, rankOf(DATA[y], c)]); return k; });
const trk = (t, keys, kk = 220, cc = 26) => { let v = keys[0][1]; for (let i = 1; i < keys.length; i++) { if (t < keys[i][0]) break; v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], kk, cc); } return v; };
const fmt = v => v >= 100 ? v.toFixed(0) : v.toFixed(1);
let PATS = null;
function makePats(ctx) {
  const mk = draw => { const c = makeCanvas(24, 24), x = c.getContext('2d'); x.fillStyle = K; x.fillRect(0, 0, 24, 24); x.fillStyle = P; x.strokeStyle = P; draw(x); return ctx.createPattern(c, 'repeat'); };
  return [
    P,
    mk(x => { x.lineWidth = 5; x.beginPath(); for (let i = -24; i <= 48; i += 12) { x.moveTo(i, 24); x.lineTo(i + 24, 0); } x.stroke(); }),
    mk(x => { for (const [a, b] of [[6, 6], [18, 18]]) { x.beginPath(); x.arc(a, b, 4.2, 0, TAU); x.fill(); } }),
    mk(x => { x.lineWidth = 2.5; x.beginPath(); for (let i = -24; i <= 48; i += 8) { x.moveTo(i, 24); x.lineTo(i + 24, 0); x.moveTo(i, 0); x.lineTo(i + 24, 24); } x.stroke(); }),
    mk(x => { x.fillRect(0, 2, 24, 4); x.fillRect(0, 14, 24, 4); }),
    mk(x => { x.fillRect(2, 0, 3, 24); x.fillRect(10, 0, 3, 24); x.fillRect(18, 0, 3, 24); }),
  ];
}
function phaseLabel(ctx, n, zh, en, a) {
  ctx.save(); ctx.globalAlpha *= a;
  text(ctx, n, 60, 78, { size: 22, family: F.mono, weight: 500, alpha: 0.5 });
  text(ctx, zh, 108, 80, { size: 34, family: F.tcBlack, weight: 900 });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 124 + w, 78, { size: 20, family: F.mono, alpha: 0.5, spacing: 3 });
  ctx.restore();
}

M.def({
  id: 'e68', num: 68, ch: 9, title: '資料動畫', en: 'DATA ANIMATION', dur: 20, ground: 'dark',
  prompt: '黑底資料動畫，不用顏色只用圖樣區分六類：先做長條競賽 2019→2026，數值補間、名次用彈簧換位、座標軸跟著縮放；接著折線圖用 trim 畫出；最後同一份資料變甜甜圈圖，角度在兩個年份間補間，選中的一片彈出。',
  how: ['每年資料線性補間 0.6s outCubic，名次變化交給彈簧', '折線用累積弧長裁切，領頭點帶數值標籤', '甜甜圈每片角度 = 佔比·2π，換年份時補間角度'],
  practice: '把長條改成直的，名次換位時加 30ms 交錯。',
  cues: [...[1, 2, 3, 4, 5, 6, 7].map(y => ({ t: STEP_T(y), type: 'tick', v: 0.45 })), { t: 8.6, type: 'whoosh', dur: 0.4, v: 0.4 },
    { t: 12.4, type: 'whoosh', dur: 0.4, v: 0.4 }, { t: 15.0, type: 'pop', v: 0.5 }, { t: 17.0, type: 'pop', v: 0.6 }, { t: 17.05, type: 'bell', i: 3, v: 0.4, dec: 2 }],
  frame(ctx, t) {
    if (!PATS) PATS = makePats(ctx);
    // ================= A: bar race (0 – 8.6) =================
    const aOut = ease(E.inCubic, 8.2, 8.7, t);
    if (aOut < 1) {
      ctx.save(); ctx.globalAlpha = 1 - aOut;
      phaseLabel(ctx, '01', '長條競賽', 'BAR RACE', ease(E.outCubic, 0, 0.4, t));
      const yf = yearPos(t), vals = CATS.map((_, c) => valAt(yf, c));
      const vmax = Math.max(...vals);
      const ax = 210, aw = 640, top = 150, rowH = 86;
      const amax = vmax * 1.15;                                  // axis follows the leader continuously
      // gridlines: 'nice' tick step that fades between values
      const step = amax > 160 ? 50 : amax > 80 ? 25 : 10;
      for (let v = 0; v <= amax; v += step) {
        const x = ax + aw * v / amax;
        ctx.fillStyle = fg(v === 0 ? 0.6 : 0.14); ctx.fillRect(x, top - 20, v === 0 ? 2 : 1, rowH * 6 + 10);
        text(ctx, String(v), x, top + rowH * 6 + 26, { size: 18, family: F.mono, align: 'center', alpha: 0.45 });
      }
      CATS.forEach((name, c) => {
        const grow = spring(t - 0.1 - c * 0.07, 200, 22);
        const ry = top + trk(t, RANKK[c]) * rowH, w = Math.max(0, aw * vals[c] / amax * grow);
        ctx.fillStyle = PATS[c]; ctx.fillRect(ax, ry, w, rowH - 24);
        ctx.strokeStyle = P; ctx.lineWidth = 2; ctx.strokeRect(ax + 1, ry + 1, Math.max(0, w - 2), rowH - 26);
        text(ctx, name, ax - 20, ry + 44, { size: 30, family: F.tc, align: 'right', alpha: clamp(grow) });
        text(ctx, fmt(vals[c] * clamp(grow)), ax + w + 14, ry + 42, { size: 24, family: F.mono, weight: 500, alpha: clamp(grow) });
      });
      // year counter, rolling digits
      const ya = ease(E.outCubic, 0.3, 0.9, t);
      ctx.save(); ctx.beginPath(); ctx.rect(500, 770, 520, 180); ctx.clip();
      const fr = yf - Math.floor(yf), yi = Math.floor(yf);
      for (const [k, off] of [[yi, -fr], [yi + 1, 1 - fr]]) {
        if (k >= YEARS) continue;
        const gl = String(Y0 + k).split(''); let xx = 1020 - 4 * 112;
        ctx.fillStyle = fg(ya); ctx.beginPath();
        gl.forEach(d => { const G2 = glyphAt(d, 100, 800); traceGlyph(ctx, G2, xx, 930 + off * 170, 0.16); xx += G2.adv * 0.16; });
        ctx.fill();
      }
      ctx.restore();
      text(ctx, '名次 = 彈簧 k 220 · 數值 = 0.6s outCubic · 軸跟著最大值', 60, 1030, { size: 20, family: F.tc, alpha: 0.5 * ya });
      ctx.restore();
    }
    // ================= B: line chart (8.6 – 12.8) =================
    const bIn = ease(E.outCubic, 8.6, 9.0, t), bOut = ease(E.inCubic, 12.2, 12.7, t);
    if (bIn > 0 && bOut < 1) {
      ctx.save(); ctx.globalAlpha = bIn * (1 - bOut);
      phaseLabel(ctx, '02', '折線描繪', 'LINE DRAW-ON', 1);
      const lx = 130, lw = 760, ly = 170, lh = 600, LO = Math.log(5), HI = Math.log(320);
      const X = y => lx + lw * y / (YEARS - 1), Y = v => ly + lh - lh * (Math.log(v) - LO) / (HI - LO);
      [5, 10, 30, 100, 300].forEach((v, k) => { const a = ease(E.outCubic, 8.7 + k * 0.08, 9.2 + k * 0.08, t); ctx.fillStyle = fg(k === 0 ? 0.6 : 0.14); ctx.fillRect(lx, Y(v), lw * a, k === 0 ? 2 : 1); text(ctx, String(v), lx - 16, Y(v) + 6, { size: 18, family: F.mono, align: 'right', alpha: 0.45 * a }); });
      text(ctx, '對數軸 LOG', lx, ly - 24, { size: 18, family: F.mono, alpha: 0.5 });
      for (let y = 0; y < YEARS; y++) text(ctx, String(Y0 + y), X(y), ly + lh + 36, { size: 18, family: F.mono, align: 'center', alpha: 0.45 });
      const series = [[5, 'solid'], [1, 'dash'], [0, 'dot']];
      series.forEach(([c, sty], si) => {
        const p = E.inOutCubic(clamp((t - 9.0 - si * 0.35) / 2.4));
        if (p <= 0) return;
        const pts = DATA.map((d, y) => [X(y), Y(d[c])]);
        // cumulative length for the trim
        const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const target = L[L.length - 1] * p; let head = pts[0];
        const path = [pts[0]];
        for (let i = 1; i < pts.length; i++) { if (L[i] <= target) { path.push(pts[i]); head = pts[i]; } else { const u = (target - L[i - 1]) / (L[i] - L[i - 1]); head = [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]; path.push(head); break; } }
        if (si === 0) {                                   // hatched area under the lead series (down to the axis floor)
          ctx.save(); ctx.globalAlpha *= 0.55; ctx.fillStyle = PATS[1]; ctx.beginPath(); ctx.moveTo(pts[0][0], Y(5)); path.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(head[0], Y(5)); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.strokeStyle = P; ctx.lineWidth = si === 0 ? 5 : 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.setLineDash(sty === 'dash' ? [16, 12] : sty === 'dot' ? [2, 12] : []);
        ctx.beginPath(); path.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.setLineDash([]);
        // markers pop as the line passes them
        pts.forEach((q, i) => { const reached = L[i] <= target; if (!reached) return;
          const tr = 9.0 + si * 0.35 + 2.4 * invEase(L[i] / L[L.length - 1]); const s = spring(t - tr, 500, 16);
          ctx.fillStyle = K; ctx.strokeStyle = P; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q[0], q[1], 8 * s, 0, TAU); ctx.fill(); ctx.stroke(); });
        // leading tag
        const yv = Math.exp(LO + (HI - LO) * (ly + lh - head[1]) / lh);
        ctx.fillStyle = P; ctx.beginPath(); ctx.arc(head[0], head[1], 10, 0, TAU); ctx.fill();
        const tagW = 150, tx = head[0] + 20, ty = head[1] + 14;
        ctx.fillStyle = si === 0 ? P : K; ctx.strokeStyle = P; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(tx, ty - 26, tagW, 40, 8); ctx.fill(); ctx.stroke();
        text(ctx, `${CATS[c]} ${fmt(yv)}`, tx + 12, ty + 3, { size: 22, family: F.tc, color: si === 0 ? K : P });
      });
      text(ctx, 'trim = 累積弧長 × p · 2.4s inOutCubic · 各晚 0.35s', 60, 1030, { size: 20, family: F.tc, alpha: 0.5 });
      ctx.restore();
    }
    // ================= C: donut (12.6 – 20) =================
    if (t > 12.5) {
      const cIn = ease(E.outCubic, 12.5, 12.9, t);
      ctx.save(); ctx.globalAlpha = cIn;
      phaseLabel(ctx, '03', '甜甜圈補間', 'DONUT MORPH', 1);
      const morph = spring(t - 15.0, 120, 18);                  // 2019 → 2026 shares
      const d0 = DATA[0], d1 = DATA[YEARS - 1], s0 = d0.reduce((a, b) => a + b), s1 = d1.reduce((a, b) => a + b);
      const shares = CATS.map((_, c) => lerp(d0[c] / s0, d1[c] / s1, morph));
      const cx = 400, cy = 540, R = 310, r0 = 170;
      const sel = 5, pop = spring(t - 17.0, 260, 16);
      let a = -Math.PI / 2;
      CATS.forEach((_, c) => {
        const grow = clamp(spring(t - 12.7 - c * 0.08, 160, 22), 0, 1.05);
        const span = shares[c] * TAU * Math.min(1, grow);
        const mid = a + span / 2, off = c === sel ? 34 * pop : 0, ox = Math.cos(mid) * off, oy = Math.sin(mid) * off;
        const rr = R * (0.7 + 0.3 * clamp(grow));
        ctx.beginPath(); ctx.arc(cx + ox, cy + oy, rr, a, a + span); ctx.arc(cx + ox, cy + oy, r0, a + span, a, true); ctx.closePath();
        ctx.fillStyle = PATS[c]; ctx.fill(); ctx.strokeStyle = K; ctx.lineWidth = 6; ctx.stroke();
        a += span;
      });
      // centre counter
      const tot = lerp(s0, s1, morph) * clamp(spring(t - 12.8, 120, 22));
      const sw = ease(E.inOutCubic, 17.0, 17.4, t);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r0 - 8, 0, TAU); ctx.clip();
      text(ctx, tot.toFixed(0), cx, cy + 22 - sw * 240, { size: 64, family: F.latin, weight: 800, align: 'center' });
      text(ctx, morph < 0.5 ? String(Y0) : String(Y0 + YEARS - 1), cx, cy + 64 - sw * 240, { size: 22, family: F.mono, align: 'center', alpha: 0.6 });
      text(ctx, (shares[sel] * 100).toFixed(1) + '%', cx, cy + 22 + (1 - sw) * 240, { size: 60, family: F.latin, weight: 800, align: 'center' });
      text(ctx, CATS[sel], cx, cy + 66 + (1 - sw) * 240, { size: 28, family: F.tcBlack, weight: 900, align: 'center', alpha: 0.8 });
      ctx.restore();
      // legend with live percentages
      CATS.forEach((name, c) => {
        const y = 300 + c * 86, la = ease(E.outCubic, 12.9 + c * 0.08, 13.4 + c * 0.08, t), on = c === sel ? clamp(pop) : 0;
        ctx.save(); ctx.globalAlpha *= la;
        ctx.fillStyle = PATS[c]; ctx.fillRect(790, y - 30, 40, 40); ctx.strokeStyle = P; ctx.lineWidth = 2; ctx.strokeRect(790, y - 30, 40, 40);
        text(ctx, name, 850, y, { size: 28, family: on > 0.5 ? F.tcBlack : F.tc, weight: on > 0.5 ? 900 : 400 });
        text(ctx, (shares[c] * 100).toFixed(1) + '%', 1020, y, { size: 24, family: F.mono, weight: 500, align: 'right', alpha: 0.7 + 0.3 * on });
        ctx.restore();
      });
      const lbl = t < 15 ? '每片角度 = 佔比 × 2π，彈簧交錯長出' : t < 17 ? '換成 2026：補間角度，不重畫' : '選中的一片沿中線彈出 34px';
      const la = ease(E.outCubic, t < 15 ? 13 : t < 17 ? 15 : 17, (t < 15 ? 13 : t < 17 ? 15 : 17) + 0.4, t);
      text(ctx, lbl, 60, 1030, { size: 22, family: F.tc, alpha: 0.6 * la });
      ctx.restore();
    }
  },
});
function invEase(y) {                                    // inverse of inOutCubic (for marker pop timing)
  return y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt((1 - y) / 4);
}
