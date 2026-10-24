/* 72 frame = f(t) — the finale. Nine tiles, one per chapter, are all pure functions of one variable T.
   T plays, rewinds, pauses, fast-forwards — every tile follows exactly, because nothing has memory.
   Then the 9 become the 72 (one row per chapter, one cell per segment) and fold back into the formula. */
const CHS = ['時間與緩動', '程序與模擬', '形狀與圖形', '動態字體', '3D 與光', '生成演算法', '後製與風格化', '構成、鏡頭、轉場', '介面、資料、聲音'];
const EASES = [E.inOutCubic, E.outBack, E.outBounce, E.inOutSine, E.outElastic, E.inOutExpo, E.outQuint, E.lin];
const TILE = { w: 300, h: 252, gap: 24, x0: 66, y0: 140 };
const CELL = { w: 104, h: 84, gx: 12, gy: 16, x0: 82, y0: 128 };
const tri = u => 1 - Math.abs(1 - 2 * u);
// the virtual clock: play → rewind → pause → fast-forward → play
function Tv(t) {
  if (t < 8) return t;
  if (t < 9.6) return lerp(8, 3, E.inOutCubic((t - 8) / 1.6));
  if (t < 10.4) return 3;
  if (t < 12) return lerp(3, 12, (t - 10.4) / 1.6);
  return t;
}
const MODE = t => t < 8 ? ['播放', 'PLAY'] : t < 9.6 ? ['倒轉', 'REWIND'] : t < 10.4 ? ['暫停', 'PAUSE'] : t < 12 ? ['快轉', 'FAST-FWD'] : ['播放', 'PLAY'];
const hash = (a, b, c) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
let DB = null, DBX = null;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/* one tile: chapter k drawn in (x, y, w, h) at time T; v = variant (segment index for the 72 cells) */
function drawTile(ctx, k, x, y, w, h, T, v, big) {
  const cx = x + w / 2, cy = y + h / 2, m = Math.min(w, h);
  ctx.fillStyle = P; ctx.strokeStyle = P; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (k === 0) {                                          // easing + spacing dots
    const f = EASES[v % 8], per = 2, ly = big ? cy - 10 : cy;
    ctx.fillStyle = g(1, 0.25); ctx.fillRect(x + w * 0.12, ly, w * 0.76, big ? 2 : 1.5);
    const N = big ? 10 : 4;
    for (let j = N; j >= 0; j--) {
      const u = fract((T - j / 30) / per), p = f(clamp(tri(u) * 1.25 - 0.125));
      ctx.globalAlpha = j === 0 ? 1 : 0.5 * (1 - j / (N + 1));
      ctx.beginPath(); ctx.arc(x + w * (0.12 + 0.76 * p), ly, (j === 0 ? 1 : 0.4) * m * 0.075, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (k === 1) {                                   // harmonograph pen
    const a = [3, 2, 5, 4, 3, 5, 1, 2][v % 8], b = [2, 3, 4, 3, 4, 2, 2, 5][v % 8], n = big ? 260 : 70, R = m * 0.38;
    ctx.lineWidth = big ? 2 : 1.5; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const u = i / n * TAU * 2, d = Math.exp(-u * 0.06); const X = cx + R * d * Math.sin(a * u + T * 0.9), Y = cy + R * d * Math.sin(b * u + T * 0.3); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke();
  } else if (k === 2) {                                   // polar morph circle → square → star
    const s = T * 0.5 + v * 0.37, ph = fract(s) * 3, i0 = Math.floor(ph), u = E.inOutCubic(ph - i0);
    const shp = [th => 1, th => 0.82 / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th))), th => 0.72 + 0.28 * Math.cos(5 * th)];
    const R = m * 0.36, n = big ? 120 : 48;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(T * 0.4 + v); ctx.beginPath();
    for (let i = 0; i <= n; i++) { const th = i / n * TAU, r = R * lerp(shp[i0 % 3](th), shp[(i0 + 1) % 3](th), u); i ? ctx.lineTo(Math.cos(th) * r, Math.sin(th) * r) : ctx.moveTo(r, 0); }
    ctx.fill(); ctx.restore();
  } else if (k === 3) {                                   // variable-font breathing
    const word = big ? 'TYPE' : 'MOTIONAB'[v % 8]; let sc = h * (big ? 0.42 : 0.62) / 700;
    const glyphs = [...word].map((c, i) => glyphAt(c, lerp(62, 125, 0.5 + 0.5 * Math.sin(T * 2 - i * 0.7)), lerp(150, 900, 0.5 + 0.5 * Math.sin(T * 2 - i * 0.7 + 1))));
    let tw = glyphs.reduce((a, gl) => a + gl.adv * sc, 0); if (tw > w * 0.9) { sc *= w * 0.9 / tw; tw = w * 0.9; } let xx = cx - tw / 2;
    ctx.beginPath(); glyphs.forEach(gl => { traceGlyph(ctx, gl, xx, cy + 700 * sc / 2, sc); xx += gl.adv * sc; }); ctx.fill();
  } else if (k === 4) {                                   // wire cube
    const ay = T * 0.9 + v * 0.4, ax = 0.55 + 0.25 * Math.sin(T * 0.5), S = m * 0.24;
    const P3 = [], E3 = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (let i = 0; i < 8; i++) {
      let X = (i & 1 ? 1 : -1), Y = (i & 2 ? 1 : -1), Z = (i & 4 ? 1 : -1);
      [X, Z] = [X * Math.cos(ay) - Z * Math.sin(ay), X * Math.sin(ay) + Z * Math.cos(ay)];
      [Y, Z] = [Y * Math.cos(ax) - Z * Math.sin(ax), Y * Math.sin(ax) + Z * Math.cos(ax)];
      const p = 3.2 / (3.2 + Z); P3.push([cx + X * S * p, cy + Y * S * p]);
    }
    ctx.lineWidth = big ? 3 : 1.6; ctx.beginPath(); E3.forEach(([a, b]) => { ctx.moveTo(...P3[a]); ctx.lineTo(...P3[b]); }); ctx.stroke();
    if (big) P3.forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, TAU); ctx.fill(); });
  } else if (k === 5) {                                   // truchet tiles that flip each beat
    const n = big ? 7 : 4, s = w / n, rows = Math.ceil(h / s);
    ctx.lineWidth = big ? 5 : 2.5; ctx.beginPath();
    for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
      const b = Math.floor(T * 2), r0 = hash(i, j, b + v * 9) > 0.5 ? 1 : 0, r1 = hash(i, j, b + 1 + v * 9) > 0.5 ? 1 : 0;
      const u = E.inOutCubic(clamp((fract(T * 2) - 0.6) / 0.4)), rot = (r0 + (r1 - r0) * u) * Math.PI / 2;
      const tx = x + (i + 0.5) * s, ty = y + (j + 0.5) * s, cr = Math.cos(rot) * s / 2, sr = Math.sin(rot) * s / 2;
      // two quarter arcs around opposite corners, rotated by hand so the whole field is one path
      const ax = tx + (-cr + sr), ay = ty + (-sr - cr), bx = tx + (cr - sr), by = ty + (sr + cr);
      ctx.moveTo(ax + Math.cos(rot) * s / 2, ay + Math.sin(rot) * s / 2); ctx.arc(ax, ay, s / 2, rot, rot + Math.PI / 2);
      ctx.moveTo(bx + Math.cos(rot + Math.PI) * s / 2, by + Math.sin(rot + Math.PI) * s / 2); ctx.arc(bx, by, s / 2, rot + Math.PI, rot + Math.PI * 1.5);
    }
    ctx.stroke();
  } else if (k === 6) {                                   // ordered (Bayer 4×4) dithering of a moving light
    const bw = big ? 75 : 26, bh = Math.round(bw * h / w);
    if (!DB || DB.width !== bw || DB.height !== bh) { DB = makeCanvas(bw, bh); DBX = DB.getContext('2d'); }
    const id = DBX.createImageData(bw, bh), d = id.data;
    const lx = bw * (0.5 + 0.3 * Math.cos(T * 1.1 + v)), ly2 = bh * (0.5 + 0.3 * Math.sin(T * 1.3 + v));
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      const L = clamp(1.15 - Math.hypot(i - lx, j - ly2) / (bw * 0.55)), on = L * 16 > BAYER[(j & 3) * 4 + (i & 3)] + 0.5;
      const o = (j * bw + i) * 4, c = on ? 242 : 11; d[o] = d[o + 1] = d[o + 2] = c; d[o + 3] = 255;
    }
    DBX.putImageData(id, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(DB, x, y, w, h); ctx.restore();
  } else if (k === 7) {                                   // infinite zoom of nested squares
    const f = fract(T * 0.6 + v * 0.13);
    ctx.lineWidth = big ? 3 : 1.5;
    ctx.save(); ctx.translate(cx, cy);
    for (let i = -1; i < 7; i++) { const s = m * 0.05 * Math.pow(1.7, i + f); if (s > m) break; ctx.save(); ctx.rotate((i + f) * 0.3); ctx.globalAlpha = clamp(1.3 - s / m); ctx.strokeRect(-s, -s, 2 * s, 2 * s); ctx.restore(); }
    ctx.restore();
  } else {                                                // spectrum on the beat
    const n = big ? 14 : 6, bw = w * 0.76 / n, env = Math.exp(-fract(T * 2) * 5);
    for (let i = 0; i < n; i++) {
      const lv = 0.15 + 0.55 * Math.abs(Math.sin(T * (1.3 + i * 0.37) + i * 1.7 + v)) * (0.5 + 0.5 * env) + 0.3 * env * Math.exp(-i * 0.35);
      const bh = h * 0.7 * clamp(lv); ctx.fillRect(x + w * 0.12 + i * bw + bw * 0.15, y + h * 0.85 - bh, bw * 0.7, bh);
    }
  }
}

function formula(ctx, x, y, size, a, align = 'center') {
  font(ctx, size, F.latin, 200); const w1 = ctx.measureText('frame = ').width;
  font(ctx, size, F.latin, 800); const w2 = ctx.measureText('f(t)').width;
  const x0 = align === 'center' ? x - (w1 + w2) / 2 : x;
  text(ctx, 'frame = ', x0, y, { size, family: F.latin, weight: 200, alpha: a });
  text(ctx, 'f(t)', x0 + w1, y, { size, family: F.latin, weight: 800, alpha: a });
  return w1 + w2;
}

M.def({
  id: 'e72', num: 72, ch: 9, title: 'frame = f(t)', en: 'EVERYTHING IS A FUNCTION OF TIME', dur: 20, ground: 'dark',
  prompt: '黑底終章：九格各放一章的代表動畫，全部只吃同一個變數 t。讓 t 正常播放、倒轉 5 秒、暫停、5.6 倍快轉，九格都精準跟著走。最後九格變成 8×9 的 72 格、每格一段，從中心收回，只留下「frame = f(t)」。',
  how: ['每格畫面只是 T 的純函數，沒有任何狀態或累積', 'T(t) 分段：播放、倒轉 inOutCubic、暫停、線性快轉', '72 格：一列一章、一格一段，從中心向外交錯收合'],
  practice: '把你的一個動畫改寫成 frame = f(t)，再試倒轉。',
  cues: [{ t: 1.6, type: 'whoosh', dur: 0.5, v: 0.5 }, { t: 8.0, type: 'riser', t1: 9.6, v: 0.4 }, { t: 9.6, type: 'thud', v: 0.6 }, { t: 10.4, type: 'whoosh', dur: 1.5, v: 0.5 },
    { t: 14.0, type: 'impact', v: 0.5 }, { t: 17.0, type: 'whoosh', dur: 0.6, v: 0.5 }, { t: 17.6, type: 'bell', i: 0, v: 0.55, dec: 4 }, { t: 17.7, type: 'bell', i: 2, v: 0.45, dec: 4 }, { t: 17.8, type: 'bell', i: 4, v: 0.4, dec: 4 }],
  frame(ctx, t) {
    const T = Tv(t), speed = (Tv(t + 0.01) - Tv(t - 0.01)) / 0.02, [mz, me] = MODE(t);
    // ---------- formula: centre → header → centre ----------
    const up = spring(t - 1.3, 180, 24), back = ease(E.outExpo, 17.3, 18.3, t);
    const fs = lerp(lerp(120, 40, up), 132, back), fy = lerp(lerp(470, 84, up), 520, back);
    const fx = lerp(lerp(540, 60, up), 540, back), align = up > 0.5 && back < 0.5 ? 'left' : 'center';
    const showF = back > 0 ? 1 : 1;
    if (align === 'left') formula(ctx, fx, fy, fs, showF, 'left'); else formula(ctx, fx, fy, fs, ease(E.outCubic, 0, 0.3, t) * (back > 0 ? ease(E.outCubic, 17.3, 17.9, t) : 1));
    // t readout
    const ra = (1 - ease(E.inCubic, 1.1, 1.4, t)) + ease(E.outCubic, 17.8, 18.4, t);
    if (ra > 0.01) text(ctx, `t = ${t.toFixed(3)}`, 540, (back > 0 ? 620 : 570), { size: 34, family: F.mono, weight: 500, align: 'center', alpha: 0.6 * clamp(ra) });
    // header readouts during the mosaic
    const ha = ease(E.outCubic, 1.6, 2.1, t) * (1 - ease(E.inCubic, 16.8, 17.3, t));
    if (ha > 0) {
      ctx.save(); ctx.globalAlpha = ha;
      text(ctx, `T = ${T.toFixed(3).padStart(6, '0')}`, 1020, 84, { size: 32, family: F.mono, weight: 500, align: 'right' });
      if (t < 14) {
        font(ctx, 20, F.tc); const lab = `${mz} ${me} ×${speed.toFixed(1)}`, w = ctx.measureText(lab).width + 28;
        const inv = t >= 8 && t < 12;
        ctx.beginPath(); ctx.roundRect(1020 - w, 100, w, 36, 18); if (inv) { ctx.fillStyle = P; ctx.fill(); } else { ctx.strokeStyle = fg(0.4); ctx.lineWidth = 1.5; ctx.stroke(); }
        text(ctx, lab, 1020 - 14, 125, { size: 20, family: F.tc, align: 'right', color: inv ? K : P });
      }
      ctx.restore();
    }
    // ---------- 3×3 mosaic ----------
    const outM = ease(E.inCubic, 13.7, 14.2, t);
    if (t > 1.4 && outM < 1) {
      for (let k = 0; k < 9; k++) {
        const c = k % 3, r = Math.floor(k / 3), x = TILE.x0 + c * (TILE.w + TILE.gap), y = TILE.y0 + r * (TILE.h + TILE.gap);
        const d = Math.hypot(c - 1, r - 1), sp = spring(t - 1.55 - d * 0.09, 220, 22), sc = sp * (1 - 0.15 * outM);
        if (sc <= 0.01) continue;
        ctx.save(); ctx.globalAlpha = clamp(sp * 1.5) * (1 - outM);
        ctx.translate(x + TILE.w / 2, y + TILE.h / 2); ctx.scale(sc, sc); ctx.translate(-x - TILE.w / 2, -y - TILE.h / 2);
        ctx.beginPath(); ctx.roundRect(x, y, TILE.w, TILE.h, 22); ctx.strokeStyle = fg(0.22); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.roundRect(x + 10, y + 10, TILE.w - 20, TILE.h - 56, 14); ctx.clip();
        drawTile(ctx, k, x + 10, y + 6, TILE.w - 20, TILE.h - 46, T, 0, true);
        ctx.restore();
        text(ctx, `0${k + 1}`, x + 18, y + TILE.h - 16, { size: 18, family: F.mono, weight: 500, alpha: 0.5 });
        text(ctx, CHS[k], x + 52, y + TILE.h - 15, { size: 20, family: F.tc, alpha: 0.85 });
        ctx.restore();
      }
    }
    // scrubber (T over 0..20)
    const sa = ease(E.outCubic, 1.8, 2.3, t) * (1 - ease(E.inCubic, 13.6, 14.0, t));
    if (sa > 0) {
      ctx.save(); ctx.globalAlpha = sa;
      const x0 = 60, x1 = 1020, y = 1000, X = v => lerp(x0, x1, v / 20);
      for (let s = 0; s <= 20; s++) { ctx.fillStyle = fg(s % 5 === 0 ? 0.6 : 0.25); ctx.fillRect(X(s) - 1, y - (s % 5 === 0 ? 14 : 7), 2, s % 5 === 0 ? 14 : 7); }
      ctx.fillStyle = fg(0.25); ctx.fillRect(x0, y, x1 - x0, 2); ctx.fillStyle = fg(1); ctx.fillRect(x0, y, X(T) - x0, 2);
      // ghost of where real time is, when T ≠ t
      if (Math.abs(T - t) > 0.05) { ctx.fillStyle = fg(0.35); ctx.fillRect(X(t) - 1, y - 8, 2, 20); text(ctx, 't', X(t), y + 30, { size: 18, family: F.mono, align: 'center', alpha: 0.5 }); }
      ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(X(T), y + 1, 10, 0, TAU); ctx.fill();
      text(ctx, 'T', X(T), y - 20, { size: 20, family: F.mono, weight: 500, align: 'center' });
      const cap = t < 8 ? '九章的動畫，只吃同一個 T' : t < 12 ? '同一個 T → 同一格畫面：可以倒轉、暫停、快轉' : '沒有狀態，就沒有誤差';
      const ca = ease(E.outCubic, t < 8 ? 2.2 : t < 12 ? 8 : 12, (t < 8 ? 2.2 : t < 12 ? 8 : 12) + 0.4, t);
      text(ctx, cap, 60, 1048, { size: 22, family: F.tc, alpha: 0.6 * ca });
      ctx.restore();
    }
    // ---------- the 72 ----------
    if (t > 13.8 && t < 18.2) {
      for (let i = 0; i < 72; i++) {
        const c = i % 8, r = Math.floor(i / 8), x = CELL.x0 + c * (CELL.w + CELL.gx), y = CELL.y0 + r * (CELL.h + CELL.gy);
        const pin = spring(t - 13.9 - i * 0.022, 300, 22);
        const dc = Math.hypot(c - 3.5, (r - 4) * 1.1), fold = E.inBack(clamp((t - 16.9 - (5 - dc) * 0.06) / 0.4));
        const sc = pin * (1 - fold);
        if (sc <= 0.01) continue;
        ctx.save();
        ctx.translate(x + CELL.w / 2, y + CELL.h / 2); ctx.scale(sc, sc); ctx.translate(-x - CELL.w / 2, -y - CELL.h / 2);
        ctx.globalAlpha = clamp(pin * 1.5);
        const lit = ease(E.outCubic, 14.0 + i * 0.022, 14.3 + i * 0.022, t);
        ctx.beginPath(); ctx.roundRect(x, y, CELL.w, CELL.h, 10); ctx.strokeStyle = fg(0.25); ctx.lineWidth = 1.2; ctx.stroke();
        const needClip = r === 5 || r === 6 || r === 7;
        if (needClip) { ctx.save(); ctx.clip(); }
        drawTile(ctx, r, x, y + 4, CELL.w, CELL.h - 6, T + i * 0.1, c, false);
        if (needClip) ctx.restore();
        if (lit > 0) { const flash = 1 - ease(E.outCubic, 14.05 + i * 0.022, 14.3 + i * 0.022, t); if (flash > 0.01) { ctx.fillStyle = fg(0.85 * flash); ctx.fillRect(x, y, CELL.w, CELL.h); } }
        ctx.restore();
      }
      const la = ease(E.outCubic, 15.6, 16.1, t) * (1 - ease(E.inCubic, 16.7, 17.0, t));
      if (la > 0) { ctx.save(); ctx.globalAlpha = la; ctx.fillStyle = K; ctx.fillRect(250, 1030, 580, 36); ctx.restore(); text(ctx, '一列一章，一格一段：72 個 f(t)', 540, 1056, { size: 24, family: F.tc, align: 'center', alpha: 0.75 * la }); }
    }
    // ---------- finale ----------
    if (t > 17.6) {
      const a = ease(E.outCubic, 18.2, 18.8, t);
      ctx.fillStyle = fg(0.5 * a); ctx.fillRect(540 - 300 * a, 572, 600 * a, 2);
      text(ctx, '每一格畫面，都只是時間的函數。', 540, 720, { size: 32, family: F.tc, align: 'center', alpha: 0.7 * ease(E.outCubic, 18.6, 19.2, t) });
    }
  },
});
