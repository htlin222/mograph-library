/* 12 群集 — Reynolds boids: separation, alignment, cohesion switched on one by one, then a predator. */
function tag(ctx, i, zh, en, a) {
  text(ctx, String(i).padStart(2, '0'), 60, 86, { size: 20, family: F.mono, weight: 500, alpha: 0.5 * a });
  text(ctx, zh, 100, 88, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 116 + w, 86, { size: 18, family: F.mono, spacing: 3, alpha: 0.5 * a });
}
const HZ = 30, N = 300, BX0 = 0, BY0 = 120, BX1 = 1080, BY1 = 950, BW = BX1 - BX0, BH = BY1 - BY0;
const R = 75, RS = 30, VMAX = 5.2, VMIN = 2.4, FMAX = 0.16, TL = 7;
/* which rules are on at time t */
const rules = t => ({ sep: t >= 2, ali: t >= 6, coh: t >= 10, pred: t >= 14 });
const predAt = t => { const u = (t - 14) * 0.55; return [540 + 330 * Math.sin(u * 1.7 + 0.4), BY0 + BH / 2 + 260 * Math.sin(u * 2.3)]; };
let B, lay, lx;
const lim = (v, m) => { const l = Math.hypot(v[0], v[1]); return l > m ? [v[0] / l * m, v[1] / l * m] : v; };
const steer = (dx, dy, vx, vy) => { const l = Math.hypot(dx, dy) || 1; return lim([dx / l * VMAX - vx, dy / l * VMAX - vy], FMAX); };
const wrapd = (d, L) => d > L / 2 ? d - L : d < -L / 2 ? d + L : d;
const S = M.def({
  id: 'e12', num: 12, ch: 2, title: '群集', en: 'BOIDS', dur: 20, ground: 'dark',
  prompt: '黑底白色箭頭做 300 隻 boids 群集。三條規則輪流打開並在畫面標示：2 秒開「分離」、6 秒加「對齊」、10 秒加「聚合」；挑一隻標出感知半徑與三個轉向向量；14 秒放進一個捕食者，群體分流又重聚。',
  how: ['每隻只看半徑 75px 內的鄰居，30 Hz 固定步', '分離推開、對齊平均速度、聚合朝向中心', '三力加權後限制最大轉向 0.16，速度 2.4–5.2'],
  practice: '只開對齊與聚合、關掉分離，看會發生什麼。',
  cues: [{ t: 2, type: 'pop' }, { t: 6, type: 'pop' }, { t: 10, type: 'pop' }, { t: 14, type: 'impact', v: 0.5 }],
  init() { lay = makeCanvas(SW, SH); lx = lay.getContext('2d', { willReadFrequently: true }); },
  reset() {
    const r = rng(1212); B = []; S.fi = 0;
    for (let i = 0; i < N; i++) {
      const c = i % 5, cx = 160 + c * 190, cy = BY0 + 200 + (c % 2) * 380;
      const a = r() * TAU, d = Math.sqrt(r()) * 70;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, h = r() * TAU, sp = r.range(VMIN, VMAX);
      B.push({ x, y, vx: Math.cos(h) * sp, vy: Math.sin(h) * sp, w: r() * 100, tx: new Float32Array(TL).fill(x), ty: new Float32Array(TL).fill(y), f: { sep: [0, 0], ali: [0, 0], coh: [0, 0] }, nb: [] });
    }
  },
  frame(ctx, t) {
    M.sim(S, t, (dt, n, st) => {
      const tt = st + dt, on = rules(tt), P = on.pred ? predAt(tt) : null;
      // focus boid: re-picked at each rule change, the one nearest the centre
      if (n === 0 || [2, 6, 10].some(q => Math.abs(tt - q) < dt / 2)) { let best = 1e9; B.forEach((o, i) => { const d = Math.hypot(o.x - 540, o.y - 560); if (d < best) { best = d; S.fi = i; } }); }
      for (let i = 0; i < N; i++) {
        const b = B[i]; let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, cn = 0, sn = 0;
        if (i === S.fi) b.nb.length = 0;
        for (let j = 0; j < N; j++) {
          if (j === i) continue; const o = B[j];
          const dx = wrapd(o.x - b.x, BW), dy = wrapd(o.y - b.y, BH), d2 = dx * dx + dy * dy;
          if (d2 > R * R) continue;
          const d = Math.sqrt(d2) || 0.01;
          ax += o.vx; ay += o.vy; cx += dx; cy += dy; cn++;
          if (d < RS) { sx -= dx / d / d; sy -= dy / d / d; sn++; }
          if (i === S.fi) b.nb.push(j);
        }
        let fx = 0, fy = 0;
        b.f.sep = sn ? steer(sx, sy, b.vx, b.vy) : [0, 0];
        b.f.ali = cn ? steer(ax / cn, ay / cn, b.vx, b.vy) : [0, 0];
        b.f.coh = cn ? steer(cx / cn, cy / cn, b.vx, b.vy) : [0, 0];
        if (on.sep) { fx += b.f.sep[0] * 1.9; fy += b.f.sep[1] * 1.9; }
        if (on.ali) { fx += b.f.ali[0] * 1.0; fy += b.f.ali[1] * 1.0; }
        if (on.coh) { fx += b.f.coh[0] * 0.75; fy += b.f.coh[1] * 0.75; }
        if (P) { const dx = wrapd(b.x - P[0], BW), dy = wrapd(b.y - P[1], BH), d = Math.hypot(dx, dy); if (d < 190) { const s = steer(dx, dy, b.vx, b.vy); fx += s[0] * 3 * (1 - d / 190) * 2; fy += s[1] * 3 * (1 - d / 190) * 2; } }
        // gentle wander so 'all off' still moves
        const wa = noise(b.w, tt * 0.6, 0.5) * 0.9, sp0 = Math.hypot(b.vx, b.vy);
        fx += -b.vy / sp0 * wa * 0.12; fy += b.vx / sp0 * wa * 0.12;
        b.ax = fx; b.ay = fy;
      }
      for (const b of B) {
        b.vx += b.ax; b.vy += b.ay;
        let sp = Math.hypot(b.vx, b.vy); const c = clamp(sp, VMIN, VMAX) / sp; b.vx *= c; b.vy *= c;
        b.x += b.vx; b.y += b.vy;
        if (b.x < BX0) b.x += BW; if (b.x >= BX1) b.x -= BW; if (b.y < BY0) b.y += BH; if (b.y >= BY1) b.y -= BH;
        b.tx.copyWithin(1, 0); b.ty.copyWithin(1, 0); b.tx[0] = b.x; b.ty[0] = b.y;
      }
    }, HZ);
    const on = rules(t);
    /* boids drawn on a CPU layer (many small paths), then blitted */
    lx.clearRect(0, 0, SW, SH);
    lx.save(); lx.beginPath(); lx.rect(BX0, BY0, BW, BH); lx.clip();
    lx.strokeStyle = fg(0.28); lx.lineWidth = 1.5; lx.beginPath();
    for (const b of B) { lx.moveTo(b.tx[0], b.ty[0]); for (let k = 1; k < TL; k++) { if (Math.abs(b.tx[k] - b.tx[k - 1]) > 50 || Math.abs(b.ty[k] - b.ty[k - 1]) > 50) break; lx.lineTo(b.tx[k], b.ty[k]); } }
    lx.stroke();
    lx.fillStyle = fg(1); lx.beginPath();
    for (const b of B) {
      const sp = Math.hypot(b.vx, b.vy), ux = b.vx / sp, uy = b.vy / sp;
      lx.moveTo(b.x + ux * 11, b.y + uy * 11); lx.lineTo(b.x - ux * 7 - uy * 5.5, b.y - uy * 7 + ux * 5.5); lx.lineTo(b.x - ux * 3.5, b.y - uy * 3.5); lx.lineTo(b.x - ux * 7 + uy * 5.5, b.y - uy * 7 - ux * 5.5); lx.closePath();
    }
    lx.fill(); lx.restore();
    ctx.drawImage(lay, 0, 0);
    /* focus boid: perception radius, neighbours, steering vectors */
    const b = B[S.fi], fa = 1 - ease(E.inOutCubic, 14, 15, t);
    if (fa > 0) {
      ctx.save(); ctx.globalAlpha = fa;
      ctx.setLineDash([4, 6]); ctx.strokeStyle = fg(0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1; ctx.beginPath();
      for (const j of b.nb) { const o = B[j], dx = wrapd(o.x - b.x, BW), dy = wrapd(o.y - b.y, BH); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + dx, b.y + dy); }
      ctx.stroke();
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = fg(1); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 16, 0, TAU); ctx.stroke();
      const vec = (f, lab, act, k) => {
        const L = 560, x2 = b.x + f[0] * L, y2 = b.y + f[1] * L, len = Math.hypot(x2 - b.x, y2 - b.y);
        ctx.globalAlpha = fa * (act ? 1 : 0.25);
        ctx.strokeStyle = fg(1); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x2, y2); ctx.stroke();
        if (len > 8) { const ux = (x2 - b.x) / len, uy = (y2 - b.y) / len; ctx.fillStyle = fg(1); ctx.beginPath(); ctx.moveTo(x2 + ux * 6, y2 + uy * 6); ctx.lineTo(x2 - ux * 8 - uy * 6, y2 - uy * 8 + ux * 6); ctx.lineTo(x2 - ux * 8 + uy * 6, y2 - uy * 8 - ux * 6); ctx.fill(); }
        if (act && len > 8) text(ctx, lab, x2 + (x2 - b.x) / len * 16, y2 + (y2 - b.y) / len * 16 + 7, { size: 20, family: F.tc, align: 'center' });
        ctx.globalAlpha = fa;
      };
      vec(b.f.sep, '分離', on.sep); vec(b.f.ali, '對齊', on.ali); vec(b.f.coh, '聚合', on.coh);
      text(ctx, `鄰居 ${b.nb.length}`, Math.min(b.x + R * 0.72 + 8, 960), Math.max(b.y - R * 0.72 - 8, BY0 + 28), { size: 18, family: F.mono, alpha: 0.7 });
      ctx.restore();
    }
    /* predator */
    if (on.pred) {
      const [px, py] = predAt(t), k = ease(E.outBack, 14, 14.5, t);
      ctx.strokeStyle = fg(0.25); ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.arc(px, py, 190 * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(px, py, 22 * k, 0, TAU); ctx.fill();
      ctx.fillStyle = bg(1); ctx.beginPath(); ctx.arc(px, py, 9 * k, 0, TAU); ctx.fill();
    }
    /* chrome: bands, tag, switches */
    ctx.fillStyle = bg(1); ctx.fillRect(0, 0, SW, BY0); ctx.fillRect(0, BY1, SW, SH - BY1);
    ctx.fillStyle = fg(0.18); ctx.fillRect(40, BY0 - 1, SW - 80, 1); ctx.fillRect(40, BY1, SW - 80, 1);
    const ph = on.pred ? 4 : on.coh ? 3 : on.ali ? 2 : on.sep ? 1 : 0;
    const tags = [['全部關閉', 'NO RULES · WANDER'], ['分離', 'SEPARATION'], ['＋ 對齊', '+ ALIGNMENT'], ['＋ 聚合', '+ COHESION'], ['捕食者', 'PREDATOR · FLEE']];
    tag(ctx, ph + 1, tags[ph][0], tags[ph][1], ph === 0 ? 1 : ease(E.outCubic, [0, 2, 6, 10, 14][ph], [0, 2, 6, 10, 14][ph] + 0.3, t));
    const sw = [['分離', 'SEPARATION', on.sep, 2], ['對齊', 'ALIGNMENT', on.ali, 6], ['聚合', 'COHESION', on.coh, 10]];
    sw.forEach(([zh, en, act, t0], i) => {
      const x = 60 + i * 330, y = 990, k = ease(E.outBack, t0, t0 + 0.35, t);
      ctx.strokeStyle = fg(0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, 76, 40, 20); ctx.stroke();
      if (k > 0) { ctx.fillStyle = fg(k); ctx.beginPath(); ctx.roundRect(x, y, 76, 40, 20); ctx.fill(); }
      ctx.fillStyle = k > 0.5 ? bg(1) : fg(0.7); ctx.beginPath(); ctx.arc(x + 20 + 36 * k, y + 20, 13, 0, TAU); ctx.fill();
      text(ctx, zh, x + 92, y + 22, { size: 26, family: F.tcBlack, weight: 900, alpha: act ? 1 : 0.45 });
      text(ctx, en, x + 92, y + 44, { size: 18, family: F.mono, spacing: 1, alpha: act ? 0.6 : 0.35 });
    });
  },
});
