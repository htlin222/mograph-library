/* 36 線框地形 — fBm terrain as a wire grid scrolling toward the camera, projected by hand in Canvas2D. */
const ROWS = 46, COLS = 60, XW = 15, ZN = 1.6, DZ = 0.62, FOC = 560, HOR = 500;
const nz = makeNoise(36);
function height(x, wz, oct, amp) {
  let s = 0, a = 0.5, f = 0.16;
  for (let i = 0; i < 4; i++) { const w = clamp(oct - i); if (w <= 0) break; s += w * a * nz(x * f, wz * f, 3.1 * i); a *= 0.5; f *= 2.1; }
  const valley = 0.06 + 0.94 * smooth(0.8, 7, Math.abs(x));
  return amp * Math.max(-0.1, s * 2.2 + 0.35) * valley;
}
let CC = null;
const cpuCtx = () => CC || (CC = makeCanvas(SW, SH).getContext('2d', { willReadFrequently: true }));
M.def({
  id: 'e36', num: 36, ch: 5, title: '線框地形', en: 'WIREFRAME TERRAIN', dur: 20, ground: 'dark',
  prompt: '黑底白線的 3D 線框地形，從地平線往鏡頭捲動。先是平的網格，再把雜訊高度拉起，碎形層數 1 到 4 逐拍加上並標示；示範沒有遮擋的穿透線框與加上遮擋的差別，再換成只有橫線的山脈；最後地平線升起條紋太陽。',
  how: ['46×60 頂點，高度＝fBm 雜訊，中央壓低成山谷', '透視投影 x/z、y/z；由遠到近逐條畫（畫家演算法）', '每條帶先填黑再描線＝隱藏線消除；遠處線變細變暗'],
  practice: '把高度改成 sin(x)·cos(z)，看規則地形長什麼樣。',
  cues: [{ t: 0.1, type: 'whoosh', dur: 0.8, v: 0.3 }, { t: 2, type: 'riser', t1: 4, v: 0.3 }, { t: 4, type: 'tick' }, { t: 5, type: 'tick' }, { t: 6, type: 'tick' }, { t: 7, type: 'tick' }, { t: 8, type: 'glitch', v: 0.3 }, { t: 10, type: 'thud' }, { t: 14, type: 'impact', v: 0.6 }],
  // drawn into a CPU-backed canvas (willReadFrequently): software raster of thousands of strokes is far cheaper than SwiftShader
  frame(stage, t) { const ctx = cpuCtx(); this.draw(ctx, t); stage.drawImage(ctx.canvas, 0, 0); },
  draw(ctx, t) {
    const io = E.inOutCubic;
    const amp = lerp(0, 3.2, ease(io, 2, 3.6, t)) + ease(io, 14, 16, t) * 0.8;
    const oct = t < 4 ? 1 : Math.min(4, 1 + Math.floor(t - 4) + ease(E.outCubic, 0, 0.3, fract(t - 4)));
    const occl = t < 8 ? 1 : t < 10 ? 0 : 1;
    const vlines = t >= 11.5 && t < 14 ? 1 - ease(io, 11.5, 12, t) : 1;
    const ru = clamp((t - 14) / 2), speed = 2.2 + 3.5 * ru;
    const S = (2.2 * t + 3.5 * (ru * ru + Math.max(0, t - 16))) / DZ;    // position = integral of speed
    const camH = 1.5 + Math.sin(t * 0.7) * 0.15 - ease(io, 14, 16, t) * 0.35;
    const cx = SW / 2 + Math.sin(t * 0.33) * 30;
    const sunA = ease(E.outCubic, 14, 16.5, t);
    ctx.fillStyle = K; ctx.fillRect(0, 0, SW, SH);
    // sun: striped disc rising out of the horizon (drawn first, terrain occludes it)
    if (sunA > 0) {
      const R = 200, sy = HOR + 40 - sunA * 130;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SW, HOR + 2); ctx.clip();
      ctx.beginPath(); ctx.arc(cx, sy, R, 0, TAU); ctx.clip();
      ctx.fillStyle = P; ctx.fillRect(cx - R, sy - R, R * 2, R * 2);
      ctx.fillStyle = K;
      for (let i = 0; i < 9; i++) { const y = sy + i * 26 - fract(t * 0.6) * 26; const h = 2 + Math.max(0, y - sy + 20) * 0.08; ctx.fillRect(cx - R, y, R * 2, h); }
      ctx.restore();
    }
    // horizon line
    ctx.fillStyle = g(1, 0.5); ctx.fillRect(0, HOR, SW, 1.5);
    // grid: rows from far to near
    const fs = fract(S), base = Math.floor(S);
    const P0 = new Float32Array((COLS + 1) * 2), P1 = new Float32Array((COLS + 1) * 2);
    const proj = (out, i) => {
      const z = ZN + (i - fs) * DZ, wz = (ROWS - i) + base;
      for (let c = 0; c <= COLS; c++) {
        const x = -XW + 2 * XW * c / COLS, h = height(x, wz * DZ, oct, amp);
        out[c * 2] = cx + x * FOC / z; out[c * 2 + 1] = HOR + (camH - h) * FOC / z;
      }
      return z;
    };
    let far = P0, near = P1;
    proj(far, ROWS);
    ctx.lineJoin = 'round';
    for (let i = ROWS - 1; i >= 0; i--) {
      const z = proj(near, i);
      const depth = clamp((z - ZN) / (ROWS * DZ));
      const fade = Math.pow(1 - depth, 1.4) * (i === 0 ? fs : 1) * clamp((ROWS - i + fs) / 3);
      if (occl > 0) {                         // hidden-line removal: fill the strip with the ground colour
        ctx.beginPath(); ctx.moveTo(far[0], far[1]);
        for (let c = 1; c <= COLS; c++) ctx.lineTo(far[c * 2], far[c * 2 + 1]);
        for (let c = COLS; c >= 0; c--) ctx.lineTo(near[c * 2], near[c * 2 + 1]);
        ctx.closePath(); ctx.fillStyle = K; ctx.fill();
      }
      ctx.lineWidth = 0.6 + 2.2 * (1 - depth);
      ctx.strokeStyle = g(1, 0.15 + 0.85 * fade);
      ctx.beginPath(); ctx.moveTo(near[0], near[1]);
      for (let c = 1; c <= COLS; c++) ctx.lineTo(near[c * 2], near[c * 2 + 1]);
      if (vlines > 0.01) {
        ctx.stroke(); ctx.strokeStyle = g(1, (0.15 + 0.85 * fade) * vlines); ctx.beginPath();
        for (let c = 0; c <= COLS; c++) { ctx.moveTo(far[c * 2], far[c * 2 + 1]); ctx.lineTo(near[c * 2], near[c * 2 + 1]); }
      }
      ctx.stroke();
      [far, near] = [near, far];
    }
    // --- overlay ---
    const lbl = t < 2 ? ['amp 0', '平的網格：只有透視'] : t < 4 ? ['amp → 3.2', '把雜訊高度拉起來'] : t < 8 ? [`octaves ${Math.min(4, Math.floor(oct + 0.01))}`, '碎形層數逐拍增加：細節變多'] : t < 10 ? ['occlusion OFF', '不遮擋：後面的線全透出來'] : t < 11.5 ? ['occlusion ON', '每條帶先填黑：隱藏線消除'] : t < 14 ? ['rows only', '只留橫線：山脈剪影'] : ['speed 2.2 → 5.7', '條紋太陽從地平線升起'];
    const la = Math.min(1, ...[2, 4, 8, 10, 11.5, 14].map(b => clamp(Math.abs(t - b) / 0.2))) * ease(E.outCubic, 0.1, 0.5, t);
    text(ctx, lbl[0], 48, 84, { size: 34, family: F.mono, weight: 500, color: P, alpha: la });
    text(ctx, lbl[1], 48, 128, { size: 26, family: F.tc, color: g(.72), alpha: la });
    text(ctx, `${ROWS}×${COLS}  amp ${amp.toFixed(2)}  oct ${oct.toFixed(1)}  v ${speed.toFixed(1)}`, SW - 48, 84, { size: 19, family: F.mono, color: g(.6), align: 'right' });
    text(ctx, 'x′ = x·f / z    y′ = (h₀ − y)·f / z', SW - 48, 118, { size: 19, family: F.mono, color: g(.6), align: 'right' });
  },
});
