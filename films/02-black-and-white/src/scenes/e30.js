/* 30 文字路徑 — text placed glyph by glyph along a path by arc length: circle · sine · spiral · rotating 3D cylinder. */
const PHR = 'TYPE ON A PATH · 文字沿路徑走 · ';
/* sample a parametric path into a polyline with cumulative arc length */
function samplePath(fn, n) {
  const pts = [], cum = [0];
  for (let i = 0; i <= n; i++) pts.push(fn(i / n));
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[n] };
}
/* point + tangent angle at arc length s (binary search) */
function at(path, s) {
  const { pts, cum } = path; let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m; else hi = m; }
  const k = clamp((s - cum[lo]) / ((cum[hi] - cum[lo]) || 1));
  const a = pts[lo], b = pts[hi];
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])];
}
const widths = new Map();
function cw(ctx, ch, size, fam) { const key = ch + size + fam; if (!widths.has(key)) { font(ctx, size, fam, fam === F.latin ? 700 : 900); widths.set(key, ctx.measureText(ch).width); } return widths.get(key); }
const famOf = ch => /[　-鿿]/.test(ch) ? F.tcBlack : F.latin;
/* lay a string along a path from arc length `off`; wraps if closed. sizeFn(s) lets size vary along the path */
function typeOnPath(ctx, str, path, off, size, o = {}) {
  const chars = [...str]; let s = off, i = 0, guard = 0;
  const closed = o.closed, col = o.color || FG;
  while (guard++ < 600) {
    const ch = chars[i % chars.length]; i++;
    const sz = o.sizeFn ? o.sizeFn(s) : size, fam = famOf(ch);
    const w = cw(ctx, ch, 100, fam) * sz / 100 + (o.track || 0) * sz / 100;
    const mid = s + w / 2;
    if (!closed && mid > path.len) break;
    if (closed && s - off > path.len - w * 0.5) break;
    if (mid >= 0 && sz > 3) {
      const [x, y, a] = at(path, closed ? ((mid % path.len) + path.len) % path.len : mid);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      font(ctx, sz, fam, fam === F.latin ? 700 : 900); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(ch, 0, o.shift || 0);
      ctx.restore();
      if (o.mark && o.mark(i)) o.onMark(x, y, a);
    }
    s += w;
  }
}
const ROWS = ['KINETIC TYPE · ', '動態字體 · 文字路徑 · ', 'AROUND AND AROUND · ', '圓柱上的字 · ', 'f(t) WRAPS TEXT · ', '黑與白 · 白與黑 · ', 'TYPE ON A PATH · '];
M.def({
  id: 'e30', num: 30, ch: 4, title: '文字路徑', en: 'TYPE ON PATH', dur: 20, ground: 'light',
  prompt: '讓一句中英混排的字沿著路徑跑：先繞圓旋轉並標出切線，再跟著振幅會變的正弦波流動，再捲進螺旋、越往中心越小；最後七圈文字包在旋轉的 3D 圓柱上，相鄰兩圈反向轉，背面變淡。字要逐字擺放、順著路徑轉角度。白底黑字。',
  how: ['把路徑取樣成折線並累加弧長，二分搜尋找出 s 的位置', '每個字放在 s + 字寬/2，旋轉到切線角 atan2(dy, dx)', '圓柱：x = R·sinφ、水平縮放 cosφ，cosφ<0 的背面畫淡'],
  practice: '讓你的名字沿著一個心形路徑繞一圈。',
  cues: [{ t: 0, type: 'whoosh', dur: 1, v: 0.5 }, { t: 5, type: 'pop', v: 0.6 }, { t: 7, type: 'tick' }, { t: 9, type: 'tick' }, { t: 10, type: 'pop', v: 0.6 }, { t: 13.5, type: 'riser', t1: 14 }, { t: 14, type: 'impact', v: 0.7 }],
  frame(ctx, t) {
    const lab = (a, b) => { text(ctx, a, 44, 62, { size: 21, family: F.mono, weight: 500 }); text(ctx, b, SW - 44, 62, { size: 20, family: F.mono, align: 'right', alpha: 0.7 }); };
    if (t < 5) {
      /* ---------- circle ---------- */
      const cx = 540, cy = 540, R = 330, a = ease(E.outExpo, 0, 0.8, t) * (1 - ease(E.inCubic, 4.7, 5, t));
      ctx.save(); ctx.globalAlpha = a;
      const circ = samplePath(u => [cx + R * Math.cos(-Math.PI / 2 + u * TAU), cy + R * Math.sin(-Math.PI / 2 + u * TAU)], 360);
      ctx.strokeStyle = fg(0.2); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      let marked = null;
      typeOnPath(ctx, PHR + PHR, circ, t * 110 - 40, 62, { closed: true, track: 4, mark: i => i === 9, onMark: (x, y, an) => marked = [x, y, an] });
      // inner ring, opposite direction, smaller
      const R2 = 236, inner = samplePath(u => [cx + R2 * Math.cos(-Math.PI / 2 + u * TAU), cy + R2 * Math.sin(-Math.PI / 2 + u * TAU)], 240);
      typeOnPath(ctx, '反向 · REVERSE · 字掛在內側 · ', inner, -t * 70, 30, { closed: true, color: fg(0.55), track: 2, shift: 30 });
      // tangent/normal of one glyph
      if (marked) {
        const [x, y, an] = marked;
        ctx.strokeStyle = fg(1); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - Math.cos(an) * 90, y - Math.sin(an) * 90); ctx.lineTo(x + Math.cos(an) * 90, y + Math.sin(an) * 90); ctx.stroke();
        ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
        const deg = ((an * 180 / Math.PI) % 360 + 360) % 360;
        text(ctx, `切線 ${deg.toFixed(0)}°`, cx, cy + 10, { size: 30, family: F.mono, weight: 500, align: 'center' });
        text(ctx, 'rotate(atan2(dy,dx))', cx, cy + 46, { size: 19, family: F.mono, align: 'center', alpha: 0.6 });
      }
      ctx.restore();
      lab('01  圓 CIRCLE', 's = t × 110 px/s');
    } else if (t < 10) {
      /* ---------- sine ---------- */
      const u = t - 5, bar = Math.floor(u / 2);
      const A = lerp(40, 115, ease(E.inOutCubic, 0, 1.2, u)) * (1 - 0.5 * ease(E.inOutCubic, 3, 3.8, u));
      const k = lerp(1.2, 2.4, ease(E.inOutCubic, 2, 2.8, u)), om = 3;
      const wave = (dy) => samplePath(q => { const x = -40 + q * 1160; return [x, 470 + dy + A * Math.sin(k * (x / 1080) * TAU - om * t)]; }, 260);
      const p0 = wave(0);
      ctx.strokeStyle = fg(0.18); ctx.lineWidth = 1.5; ctx.beginPath(); p0.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      const fl = ease(E.outCubic, 0, 0.4, u);
      typeOnPath(ctx, PHR + PHR + PHR, p0, -((u * 160) % 600) - 100, 58, { track: 3, color: fg(fl) });
      typeOnPath(ctx, 'y = A·sin(kx − ωt) · ', wave(200), -((u * 90) % 400) - 60, 30, { color: fg(0.55 * fl) });
      // readouts
      [['A', A.toFixed(0) + ' px'], ['k', k.toFixed(2)], ['ω', om.toFixed(1) + ' rad/s']].forEach(([n, v], i) => {
        text(ctx, n, 70 + i * 300, 940, { size: 44, family: F.latin, weight: 300 });
        text(ctx, v, 70 + i * 300 + 44, 940, { size: 30, family: F.mono, weight: 500 });
      });
      ctx.fillStyle = fg(0.25); ctx.fillRect(70, 875, 940, 1.5);
      lab('02  正弦 SINE', 'A、k 每小節改變');
    } else if (t < 14) {
      /* ---------- spiral: size shrinks with radius ---------- */
      const u = t - 10, cx = 540, cy = 520, turns = 5.2, r0 = 40, r1 = 440;
      const sp = samplePath(q => { const th = q * turns * TAU + u * 0.6; const r = lerp(r1, r0, q); return [cx + r * Math.cos(th), cy + r * Math.sin(th)]; }, 900);
      const a = ease(E.outCubic, 0, 0.4, u) * (1 - ease(E.inCubic, 3.6, 4, u));
      ctx.save(); ctx.globalAlpha = a;
      typeOnPath(ctx, PHR + PHR + PHR + PHR + PHR + PHR, sp, -(u * 170 % 700) - 40, 0, { sizeFn: s => 64 * Math.pow(1 - s / sp.len, 1.05), track: 2 });
      ctx.restore();
      lab('03  螺旋 SPIRAL', '字級 ∝ 半徑');
    } else {
      /* ---------- payoff: cylinder ---------- */
      const u = t - 14, R = 360, cx = 540, rows = ROWS.length, rh = 112, y0 = 540 - (rows - 1) * rh / 2 + 22;
      const k = ease(E.outExpo, 0, 1.2, u);
      const items = [];
      ROWS.forEach((row, r) => {
        const dir = r % 2 ? -1 : 1, size = 70, rot = dir * (u * 0.55 + r * 0.4) + (1 - k) * dir * -2.5;
        let s = 0, i = 0; const circ = TAU * R; const str = [...row];
        while (s < circ - 20) {
          const ch = str[i % str.length]; i++;
          const fam = famOf(ch), w = cw(ctx, ch, 100, fam) * size / 100 + 4;
          if (s + w > circ) break;
          const phi = (s + w / 2) / R + rot;
          items.push({ ch, fam, phi, y: y0 + r * rh, size });
          s += w;
        }
      });
      // back first, then front
      items.sort((a, b) => Math.cos(a.phi) - Math.cos(b.phi));
      for (const it of items) {
        const c = Math.cos(it.phi), x = cx + R * Math.sin(it.phi);
        ctx.save(); ctx.translate(x, it.y); ctx.scale(c, 1);
        font(ctx, it.size, it.fam, it.fam === F.latin ? 700 : 900); ctx.textAlign = 'center';
        ctx.fillStyle = c >= 0 ? fg(lerp(0.55, 1, c) * k) : fg(0.2 * k);
        ctx.fillText(it.ch, 0, 0); ctx.restore();
      }
      // cylinder silhouette lines
      ctx.fillStyle = fg(0.15 * k); ctx.fillRect(cx - R - 1, 90, 1.5, 900); ctx.fillRect(cx + R, 90, 1.5, 900);
      lab('04  3D 圓柱 CYLINDER', 'x = R·sinφ · scaleX = cosφ');
    }
  },
});
