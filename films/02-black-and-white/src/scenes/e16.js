/* 16 細胞自動機 — elementary CA (rules 30 / 90 / 110) cascading down, then Life with a Gosper glider gun. */
function tag(ctx, i, zh, en, a) {
  text(ctx, String(i).padStart(2, '0'), 60, 86, { size: 20, family: F.mono, weight: 500, alpha: 0.5 * a });
  text(ctx, zh, 100, 88, { size: 34, family: F.tcBlack, weight: 900, alpha: a });
  font(ctx, 34, F.tcBlack, 900); const w = ctx.measureText(zh).width;
  text(ctx, en, 116 + w, 86, { size: 18, family: F.mono, spacing: 3, alpha: 0.5 * a });
}
/* ---- 1D ---- */
const CW = 120, CP = 8, GX = 60, GY = 300, GH = 640, VIS = GH / CP, RPS = 45;          // cells, pitch, rows/s
const RULES = [{ r: 30, t0: 0, t1: 4, start: 'mid' }, { r: 90, t0: 4, t1: 6, start: 'mid' }, { r: 110, t0: 6, t1: 8, start: 'right' }];
const LIFE_T = 8;
/* ---- Life ---- */
const LW = 220, LH = 170, VX = 4, VY = 4, GUN2 = 118;                                              // world size, viewport origin
const GUN = [[24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2], [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3], [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5], [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8]];
const genAt = t => t < LIFE_T ? 0 : t < 10 ? (t - LIFE_T) * 8 : t < 14 ? 16 + (t - 10) * 24 : 112 + (t - 14) * 32;     // generations as f(t)
const pitchAt = t => lerp(13, 6, ease(E.inOutCubic, 14, 16.5, t));
let hist, life, nxt, dead, gen;
const S = M.def({
  id: 'e16', num: 16, ch: 2, title: '細胞自動機', en: 'CELLULAR AUTOMATA', dur: 20, ground: 'dark',
  prompt: '黑底白格。先做一維細胞自動機：上方列出 8 種三格鄰居與輸出（規則表），每秒長 45 列往下瀑布：Rule 30 混沌、4 秒換 Rule 90 謝爾賓斯基、6 秒 Rule 110；8 秒切到康威生命遊戲，高斯帕滑翔機槍每 30 代射出一架滑翔機，最後鏡頭拉遠，露出第二把槍，兩道隊伍對撞。',
  how: ['一維：新格 = 規則號第 (左·4+中·2+右) 位元', '生命遊戲 B3/S23：鄰居 3 誕生，2–3 存活', '固定步長逐代計算；死亡格留 8 代灰階殘影'],
  practice: '換成 Rule 184，看它怎麼像塞車的車流。',
  cues: [{ t: 4, type: 'tick' }, { t: 6, type: 'tick' }, { t: 8, type: 'whoosh', dur: 0.5 }, { t: 14.5, type: 'riser', t1: 17 }],
  init() {
    // precompute every 1D rule's history (pure function of rule + start)
    hist = RULES.map(R => {
      const rows = Math.ceil((R.t1 - R.t0) * RPS) + 2, c = makeCanvas(CW, rows), x = c.getContext('2d'), im = x.createImageData(CW, rows), d = im.data;
      let row = new Uint8Array(CW); row[R.start === 'mid' ? CW >> 1 : CW - 2] = 1;
      for (let y = 0; y < rows; y++) {
        for (let i = 0; i < CW; i++) { const p = (y * CW + i) * 4, v = row[i] ? 242 : 11; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
        const nr = new Uint8Array(CW);
        for (let i = 0; i < CW; i++) { const l = row[(i - 1 + CW) % CW], m = row[i], r = row[(i + 1) % CW]; nr[i] = (R.r >> (l * 4 + m * 2 + r)) & 1; }
        row = nr;
      }
      x.putImageData(im, 0, 0); return { c, rows };
    });
  },
  reset() {
    life = new Uint8Array(LW * LH); nxt = new Uint8Array(LW * LH); dead = new Uint8Array(LW * LH).fill(255); gen = 0;
    for (const [x, y] of GUN) { life[(y + 6) * LW + x + 6] = 1; life[(y + 6) * LW + (35 - x) + 6 + GUN2] = 1; }   // second gun, mirrored, off-screen right
  },
  frame(ctx, t) {
    M.sim(S, t, (dt, n, st) => {
      const target = Math.floor(genAt(st + dt));
      while (gen < target) {
        for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
          let c = 0;
          for (let j = -1; j <= 1; j++) { const yy = y + j; if (yy < 0 || yy >= LH) continue; for (let i = -1; i <= 1; i++) { const xx = x + i; if ((i || j) && xx >= 0 && xx < LW) c += life[yy * LW + xx]; } }
          const k = y * LW + x, a = life[k];
          nxt[k] = (c === 3 || (a && c === 2)) ? 1 : 0;
          if (a && !nxt[k]) dead[k] = 0; else if (!nxt[k] && dead[k] < 255) dead[k]++;
        }
        [life, nxt] = [nxt, life]; gen++;
      }
    }, 30);
    /* ---------- 1D (0–8) ---------- */
    const a1 = 1 - ease(E.inCubic, LIFE_T - 0.3, LIFE_T, t);
    if (a1 > 0) {
      ctx.save(); ctx.globalAlpha = a1;
      const ri = t < 4 ? 0 : t < 6 ? 1 : 2, R = RULES[ri], H = hist[ri], u = t - R.t0;
      tag(ctx, ri + 1, ['一維・混沌', '一維・碎形', '一維・圖靈完備'][ri], `ELEMENTARY CA · RULE ${R.r}`, ri === 0 ? 1 : ease(E.outCubic, R.t0, R.t0 + 0.3, t));
      // rule table: 8 neighbourhoods → output
      const q = 24, tw = 122, tx0 = 60 + (960 - (tw * 7 + q * 3 + 6)) / 2, ty = 140;
      for (let b = 7; b >= 0; b--) {
        const x = tx0 + (7 - b) * tw, out = (R.r >> b) & 1;
        for (let k = 0; k < 3; k++) { const on = (b >> (2 - k)) & 1; ctx.fillStyle = fg(on ? 1 : 0.0); ctx.strokeStyle = fg(0.55); ctx.lineWidth = 1.5; if (on) ctx.fillRect(x + k * (q + 3), ty, q, q); else ctx.strokeRect(x + k * (q + 3) + 0.75, ty + 0.75, q - 1.5, q - 1.5); }
        const flash = 1 - ease(E.outCubic, R.t0, R.t0 + 0.5, t);
        const ox = x + q + 3, oy = ty + q + 8;
        if (out) { ctx.fillStyle = fg(1); ctx.fillRect(ox, oy, q, q); } else { ctx.strokeStyle = fg(0.55); ctx.strokeRect(ox + 0.75, oy + 0.75, q - 1.5, q - 1.5); }
        if (flash > 0 && out) { ctx.strokeStyle = fg(flash); ctx.lineWidth = 2; ctx.strokeRect(ox - 5, oy - 5, q + 10, q + 10); }
        text(ctx, String(out), ox + q / 2, oy + q + 30, { size: 22, family: F.mono, weight: 500, align: 'center', alpha: 0.7 });
      }
      // cascade: rows revealed at RPS, scrolling once the field is full
      const shown = Math.min(H.rows, Math.floor(u * RPS) + 1), first = Math.max(0, shown - VIS), n = shown - first;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(H.c, 0, first, CW, n, GX, GY, CW * CP, n * CP);
      ctx.imageSmoothingEnabled = true;
      // dark gaps between cells: thin grid lines over the cascade
      ctx.fillStyle = bg(1);
      for (let i = 0; i <= CW; i++) ctx.fillRect(GX + i * CP - 1, GY, 2, n * CP);
      for (let j = 0; j <= n; j++) ctx.fillRect(GX, GY + j * CP - 1, CW * CP, 2);
      // write head on the newest row
      ctx.fillStyle = fg(0.9); ctx.fillRect(GX - 18, GY + (n - 1) * CP, 10, CP - 2); ctx.fillRect(GX + CW * CP + 8, GY + (n - 1) * CP, 10, CP - 2);
      text(ctx, `RULE ${R.r}`, 60, 1000, { size: 40, family: F.latin, weight: 800 });
      text(ctx, `${R.r.toString(2).padStart(8, '0')}₂ · 第 ${shown} 列`, 1020, 1000, { size: 24, family: F.mono, align: 'right', alpha: 0.6 });
      ctx.restore();
    }
    /* ---------- Life (8–20) ---------- */
    const a2 = ease(E.outCubic, LIFE_T, LIFE_T + 0.4, t);
    if (a2 > 0) {
      ctx.save(); ctx.globalAlpha = a2;
      tag(ctx, 4, '生命遊戲', 'LIFE · GOSPER GLIDER GUN', 1);
      const pc = pitchAt(t), X0 = 60, Y0 = 140, VWp = 960, VHp = 800;
      ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, VWp, VHp); ctx.clip();
      const vy = VY - Math.round(30 * ease(E.inOutCubic, 14.5, 17, t)), ys = Math.max(0, -vy);   // pan up: centre the V
      const cols = Math.ceil(VWp / pc), rows = Math.ceil(VHp / pc), sz = Math.max(2, pc - (pc > 8 ? 2.5 : 1.2));
      // after-images (recently dead) in greys
      for (let lv = 1; lv <= 8; lv++) {
        ctx.fillStyle = fg(0.36 * (1 - lv / 9)); ctx.beginPath();
        for (let y = ys; y < rows; y++) for (let x = 0; x < cols; x++) { const k = (y + vy) * LW + x + VX; if (dead[k] === lv - 1 && !life[k]) ctx.rect(X0 + x * pc, Y0 + y * pc, sz, sz); }
        ctx.fill();
      }
      ctx.fillStyle = fg(1); ctx.beginPath();
      for (let y = ys; y < rows; y++) for (let x = 0; x < cols; x++) if (life[(y + vy) * LW + x + VX]) ctx.rect(X0 + x * pc, Y0 + y * pc, sz, sz);
      ctx.fill();
      // faint lattice dots when zoomed in
      if (pc > 9) { ctx.fillStyle = fg(0.12); ctx.beginPath(); for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) ctx.rect(X0 + x * pc + sz / 2 - 1, Y0 + y * pc + sz / 2 - 1, 2, 2); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = fg(0.25); ctx.lineWidth = 1; ctx.strokeRect(X0 - 0.5, Y0 - 0.5, VWp + 1, VHp + 1);
      // rules legend
      text(ctx, 'B3 / S23', 60, 1000, { size: 40, family: F.latin, weight: 800 });
      text(ctx, '死格鄰居 = 3 → 誕生 · 活格鄰居 2–3 → 存活', 270, 996, { size: 22, family: F.tc, alpha: 0.65 });
      text(ctx, `gen ${String(gen).padStart(3, '0')} · 週期 30 · ${t < 14.5 ? '1' : '2'} 把槍`, 1020, 1036, { size: 20, family: F.mono, align: 'right', alpha: 0.6 });
      ctx.restore();
    }
  },
});
