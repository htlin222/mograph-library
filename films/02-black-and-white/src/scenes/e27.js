/* 27 打字機與解碼 — human-cadence typewriter with an honest cursor, then scramble-decode in three lock orders. */
const R = rng(2701);
const hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1103515245); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
const LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/<>=+';
const CJK = '雜訊解碼字元時間動態黑白程式格點線面光影聲音數位亂序鎖定隨機排列訊號';
/* ---------- the typing script: keystrokes with human timing (typo + backspace included) ---------- */
const SCRIPT = [
  { k: 'type', s: '$ echo "frame = f(t)"' }, { k: 'enter' }, { k: 'out', s: 'frame = f(t)' },
  { k: 'type', s: '$ type --cadence humna' }, { k: 'back', n: 2 }, { k: 'type', s: 'an' }, { k: 'enter' },
  { k: 'out', s: '每個字元都有自己的時間。' },
  { k: 'type', s: '$ ' },
];
const KEYS = [];               // {t, op:'add'|'del'|'nl'|'out', ch}
(function build() {
  let t = 0.25;
  for (const st of SCRIPT) {
    if (st.k === 'type') for (const ch of st.s) {
      KEYS.push({ t, op: 'add', ch });
      t += 0.055 + R() * 0.05 + (ch === ' ' ? 0.06 : 0) + ('"=-'.includes(ch) ? 0.12 : 0);
    }
    if (st.k === 'back') { t += 0.32; for (let i = 0; i < st.n; i++) { KEYS.push({ t, op: 'del' }); t += 0.09; } t += 0.12; }
    if (st.k === 'enter') { t += 0.18; KEYS.push({ t, op: 'nl', key: true }); t += 0.05; }
    if (st.k === 'out') { KEYS.push({ t, op: 'out', s: st.s }); t += 0.55; }
  }
})();
function termState(t) {
  const lines = ['']; let last = -9;
  for (const k of KEYS) {
    if (k.t > t) break;
    if (k.op === 'add') { lines[lines.length - 1] += k.ch; last = k.t; }
    if (k.op === 'del') { lines[lines.length - 1] = [...lines[lines.length - 1]].slice(0, -1).join(''); last = k.t; }
    if (k.op === 'nl') { lines.push(''); last = k.t; }
    if (k.op === 'out') { lines[lines.length - 1] = k.s; lines.push(''); }
  }
  return { lines, last };
}
/* ---------- scramble ---------- */
/* returns the glyph to show for char i: random from the charset until its lock time, then the real one */
function scr(real, i, t, start, lock, set, rate = 18) {
  if (t < start) return { c: '', state: 0 };
  if (t >= lock || real === ' ') return { c: real, state: 2 };
  const k = Math.floor(t * rate);
  return { c: set[Math.floor(hash(i + 31, k) * set.length)], state: 1 };
}
const DEMOS = [
  { t0: 7.0, lines: ['SIGNAL', 'FROM NOISE'], set: LAT, order: 'L→R', label: '順序 左→右 · 間隔 60ms' },
  { t0: 9.5, lines: ['SIGNAL', 'FROM NOISE'], set: LAT, order: 'random', label: '順序 隨機 · 總長 1.6s' },
  { t0: 12.0, lines: ['從雜訊', '中解碼'], set: CJK, order: 'center', label: '順序 中心→外 · 中文字集' },
];
function lockTimes(d) {
  const flat = d.lines.join('').length, out = []; const r = rng(77);
  const perm = [...Array(flat).keys()].map(i => [r(), i]).sort((a, b) => a[0] - b[0]).map(q => q[1]);
  let i = 0;
  d.lines.forEach((ln, li) => [...ln].forEach((ch, ci) => {
    let k;
    if (d.order === 'L→R') k = i * 0.06;
    else if (d.order === 'random') k = perm.indexOf(i) / flat * 1.6;
    else k = Math.abs(ci - (ln.length - 1) / 2) * 0.22 + li * 0.08;
    out.push(0.35 + k); i++;
  }));
  return out;
}
DEMOS.forEach(d => d.locks = lockTimes(d));
const HEAD = 'DECODE', HEAD_TC = '解碼完成';
M.def({
  id: 'e27', num: 27, ch: 4, title: '打字機與解碼', en: 'TYPEWRITER & SCRAMBLE', dur: 20, ground: 'dark',
  prompt: '終端機打字效果：每個字元間隔 55–105ms 隨機、空白後多停一下、打錯兩字再退格；游標打字時實心、閒置才以 530ms 閃爍。接著標題亂碼解碼：每格先在字集裡亂跳，再依左→右、隨機、中心→外三種順序鎖定。最後巨大標題逐拍解碼。黑底。',
  how: ['預先排好每個按鍵的時間戳，畫面只問「t 之前發生了什麼」', '亂碼字 = 字集[hash(i, floor(t×18))]，過了鎖定時間才顯示真字', '用等寬字解碼，字寬不變才不會整行抖動'],
  practice: '用三種鎖定順序解碼你的名字，比較哪種最好讀。',
  cues: [
    ...KEYS.filter(k => k.op === 'add' || k.op === 'del' || k.op === 'nl').map(k => ({ t: k.t, type: 'tick', v: k.op === 'nl' ? 0.55 : 0.28 })),
    { t: 7, type: 'glitch', v: 0.5 }, { t: 9.5, type: 'glitch', v: 0.5 }, { t: 12, type: 'glitch', v: 0.5 },
    ...[...Array(6)].map((_, i) => ({ t: 14.5 + i * 0.5, type: 'pop', v: 0.55 })), { t: 17.5, type: 'impact', v: 0.7 },
  ],
  frame(ctx, t) {
    if (t < 7) {
      /* ---------- terminal ---------- */
      const a = ease(E.outCubic, 0, 0.3, t) * (1 - ease(E.inCubic, 6.6, 7, t));
      ctx.save(); ctx.globalAlpha = a;
      const x0 = 60, y0 = 90, w = SW - 120, h = 560;
      ctx.strokeStyle = fg(0.55); ctx.lineWidth = 2; ctx.strokeRect(x0, y0, w, h);
      ctx.fillStyle = fg(0.55); ctx.fillRect(x0, y0 + 52, w, 2);
      [0, 1, 2].forEach(i => { ctx.beginPath(); ctx.arc(x0 + 30 + i * 28, y0 + 26, 8, 0, TAU); ctx.strokeStyle = fg(0.6); ctx.stroke(); });
      text(ctx, '~/bw — zsh — 80×24', x0 + w / 2, y0 + 34, { size: 19, family: F.mono, align: 'center', alpha: 0.6 });
      const st = termState(t), lh = 76, size = 42;
      font(ctx, size, F.mono, 400);
      let cx = 0, cy = 0;
      st.lines.forEach((ln, i) => {
        const y = y0 + 120 + i * lh;
        const isOut = !ln.startsWith('$') && ln.length;
        text(ctx, ln, x0 + 36, y, { size, family: F.mono, weight: isOut ? 500 : 400, alpha: isOut ? 0.6 : 1 });
        font(ctx, size, F.mono, 400); cx = x0 + 36 + ctx.measureText(ln).width; cy = y;
      });
      // cursor: solid while keys are arriving, blinks (530 ms) only when idle
      const idle = t - st.last;
      const on = idle < 0.5 || Math.floor((idle - 0.5) / 0.53) % 2 === 1;
      if (on) { ctx.fillStyle = fg(1); ctx.fillRect(cx + 3, cy - size * 0.8, size * 0.58, size); }
      text(ctx, idle < 0.5 ? 'CURSOR  SOLID (TYPING)' : 'CURSOR  BLINK 530ms (IDLE)', x0 + w - 24, y0 + h - 24, { size: 18, family: F.mono, align: 'right', alpha: 0.6 });
      /* keystroke seismograph */
      const gx = 60, gw = SW - 120, gy = 820, span = 7;
      text(ctx, '按鍵時間軸 KEYSTROKES', gx, gy - 92, { size: 20, family: F.mono, weight: 500 });
      ctx.fillStyle = fg(0.25); ctx.fillRect(gx, gy, gw, 1.5);
      for (const k of KEYS) {
        if (k.t > t) break;
        const x = gx + gw * k.t / span;
        const hgt = k.op === 'del' ? -34 : k.op === 'nl' ? 56 : k.op === 'out' ? 0 : 40;
        ctx.fillStyle = fg(k.op === 'del' ? 0.55 : 1);
        if (k.op === 'out') { ctx.fillStyle = fg(0.4); ctx.fillRect(x, gy - 6, 26, 12); }
        else if (hgt < 0) ctx.fillRect(x - 1.5, gy, 3, -hgt); else ctx.fillRect(x - 1, gy - hgt, 2, hgt);
      }
      ctx.fillStyle = fg(1); ctx.fillRect(gx + gw * t / span - 1, gy - 70, 2, 110);
      for (let s = 0; s <= 7; s++) text(ctx, s + 's', gx + gw * s / span, gy + 72, { size: 18, family: F.mono, align: s === 7 ? 'right' : s ? 'center' : 'left', alpha: 0.5 });
      text(ctx, 'Δt 55–105ms · 空白 +60ms · ▼ 退格 · 長線 Enter · ■ 程式輸出', gx, gy + 118, { size: 19, family: F.mono, alpha: 0.65 });
      ctx.restore();
    } else if (t < 14) {
      /* ---------- scramble demos ---------- */
      const d = t < 9.5 ? DEMOS[0] : t < 12 ? DEMOS[1] : DEMOS[2], u = t - d.t0;
      const cjk = d.set === CJK, size = cjk ? 200 : 140, lh = cjk ? 230 : 170;
      const out = ease(E.inCubic, d.t0 + 2.2, d.t0 + 2.5, t);
      text(ctx, `0${DEMOS.indexOf(d) + 1}  SCRAMBLE · ${d.label}`, 44, 64, { size: 21, family: F.mono, weight: 500 });
      let i = 0;
      font(ctx, size, F.mono, 500); const cw = cjk ? size * 1.0 : ctx.measureText('M').width;
      const total = d.lines.reduce((a, l) => a + l.length, 0);
      d.lines.forEach((ln, li) => {
        const x0 = (SW - cw * ln.length) / 2, y = 300 + li * lh + (cjk ? 20 : 0);
        [...ln].forEach((ch, ci) => {
          const q = scr(ch, i, u, 0.05 + i * 0.012, d.locks[i], d.set);
          const x = x0 + ci * cw;
          if (q.state === 1) { ctx.fillStyle = fg(0.12); ctx.fillRect(x + 4, y - size * 0.82, cw - 8, size * 0.98); }
          text(ctx, q.c, x + cw / 2, y, { size, family: cjk ? F.tcBlack : F.mono, weight: cjk ? 900 : 500, align: 'center', alpha: (q.state === 2 ? 1 : 0.55) * (1 - out) });
          i++;
        });
      });
      /* lock-time chart: one bar per character, its length = time until it locks */
      const gx = 120, gw = SW - 240, gy = 720, bh = Math.min(9, 150 / total);
      text(ctx, '每格鎖定時間 LOCK TIME', gx, gy - 24, { size: 19, family: F.mono, weight: 500, alpha: 1 - out });
      ctx.save(); ctx.globalAlpha = 1 - out;
      d.locks.forEach((L, k) => {
        const y = gy + k * (bh + 3), full = gw * L / 2.2, now = gw * clamp(u / 2.2) ;
        ctx.fillStyle = fg(0.18); ctx.fillRect(gx, y, full, bh);
        ctx.fillStyle = fg(u >= L ? 1 : 0.55); ctx.fillRect(gx, y, Math.min(full, now), bh);
      });
      ctx.fillStyle = fg(1); ctx.fillRect(gx + gw * clamp(u / 2.2), gy - 8, 2, d.locks.length * (bh + 3) + 12);
      text(ctx, 'charset  ' + (cjk ? CJK.slice(0, 14) + '…' : LAT), gx, gy + d.locks.length * (bh + 3) + 40, { size: 19, family: F.mono, alpha: 0.6 });
      ctx.restore();
    } else {
      /* ---------- payoff: field of noise, a headline decodes on the beat ---------- */
      const u = t - 14;
      // background character field (sparse, low contrast), a scan band passes and calms it
      font(ctx, 20, F.mono, 400); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const band = 60 + u * 190;
      for (let r = 0; r < 26; r++) for (let c = 0; c < 34; c++) {
        const hh = hash(c * 131 + r, 7); if (hh < 0.45) continue;
        const y = 50 + r * 40, x = 40 + c * 30;
        if ((y > 270 && y < 590) || (y > 690 && y < 830)) continue;   // keep the headline rows clean
        const calm = y < band;                         // above the band: characters freeze into dots
        const k = calm ? 0 : Math.floor(t * 12 + hh * 9);
        ctx.fillStyle = fg(calm ? 0.12 : 0.22);
        ctx.fillText(calm ? '·' : LAT[Math.floor(hash(c + r * 97, k) * LAT.length)], x, y);
      }
      ctx.textAlign = 'left';
      // the headline: Archivo outlines in monospaced cells; letter i locks on beat i
      const cell = 165, sc = 0.30, y = 540, x0 = (SW - cell * HEAD.length) / 2;
      ctx.beginPath();
      [...HEAD].forEach((ch, i) => {
        const lockT = 0.5 + i * 0.5, started = u > 0.05 + i * 0.05;
        if (!started) return;
        const q = u >= lockT ? ch : LAT.slice(0, 36)[Math.floor(hash(i + 5, Math.floor(t * 14)) * 36)];
        const gl = glyphAt(q, 62, u >= lockT ? 900 : 300);
        traceGlyph(ctx, gl, x0 + i * cell + (cell - gl.adv * sc * 1.0) / 2, y, sc * 1.0);
      });
      // scale was set for cap ≈ 250px
      ctx.fillStyle = fg(1); ctx.fill();
      [...HEAD].forEach((ch, i) => { const lockT = 0.5 + i * 0.5; if (u < lockT) { ctx.fillStyle = fg(0.5); ctx.fillRect(x0 + i * cell + 20, y + 20, cell - 40, 4); } });
      // 中文 subtitle decodes after
      const tcs = [...HEAD_TC], cw2 = 120, x1 = (SW - cw2 * tcs.length) / 2, y2 = 800;
      tcs.forEach((ch, i) => {
        const q = scr(ch, i, u, 3.0 + i * 0.05, 3.5 + i * 0.25, CJK, 16);
        text(ctx, q.c, x1 + i * cw2 + cw2 / 2, y2, { size: 104, family: F.tcBlack, weight: 900, align: 'center', alpha: q.state === 2 ? 1 : 0.4 });
      });
      // terminal-style cursor after the subtitle
      if (u > 4.6 && Math.floor((u - 4.6) / 0.53) % 2 === 0) { ctx.fillStyle = fg(1); ctx.fillRect(x1 + cw2 * tcs.length + 14, y2 - 92, 48, 108); }
      text(ctx, '04  逐拍鎖定 · ONE LETTER PER BEAT', 44, 64, { size: 21, family: F.mono, weight: 500 });
    }
  },
});
