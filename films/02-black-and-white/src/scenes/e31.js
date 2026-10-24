/* 31 數字滾動 — mechanical odometer carry, eased count-up (proportional vs tabular figures), slot drums with spring landings. */
const WD = 100, WT = 760;
const dg = d => glyphAt(String(((d % 10) + 10) % 10), WD, WT);
/* fill one digit glyph centred in a cell */
function digit(ctx, d, cx, base, sc) { const gl = dg(d); traceGlyph(ctx, gl, cx - gl.adv * sc / 2, base, sc); }
/* a drum: continuous position p (digit units), window centred at (cx, cy) */
function drum(ctx, p, cx, cy, w, h, sc, blur = 0, ink = 1) {
  ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2, cy - h / 2, w, h); ctx.clip();
  const capH = 686 * sc, n0 = Math.floor(p);
  const copies = blur > 0.05 ? 5 : 1;
  for (let c = 0; c < copies; c++) {
    const off = copies > 1 ? (c / (copies - 1) - 0.5) * blur : 0;
    ctx.beginPath();
    for (let n = n0 - 1; n <= n0 + 2; n++) {
      const y = cy + (n - p + off) * h * 0.92;
      digit(ctx, n, cx, y + capH / 2, sc);
    }
    ctx.fillStyle = fg(ink / (copies > 1 ? 2.6 : 1)); ctx.fill();
  }
  // drum shading: fade to ground at top and bottom
  const gr = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  gr.addColorStop(0, bg(1)); gr.addColorStop(0.22, bg(0)); gr.addColorStop(0.78, bg(0)); gr.addColorStop(1, bg(1));
  ctx.fillStyle = gr; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}
/* odometer: digit i only turns while every lower digit is rolling 9 → 0 */
const odo = (v, i) => { if (i === 0) return v; const m = Math.pow(10, i); return Math.floor(v / m) + Math.max(0, (v % m) - (m - 1)); };
const odoV = t => 99984 + 6.4 * t;                      // crosses 100 000 at t = 2.5 s
const COUNT = 1280000;
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/* slot drums for the payoff: spin at constant speed, stop on a beat with a velocity-matched decaying overshoot */
const SLOT = [{ to: 0, stop: 14.0 }, { to: 7, stop: 14.5 }, { to: 2, stop: 15.0 }];
const VEL = 26;
function slotPos(t, s, i) {
  const target = s.to + 40 + i * 10;                    // land after many turns
  if (t < 12) return (target - VEL * (s.stop - 12)) - 0.0;   // idle before spin-up
  if (t < s.stop) {
    const t0 = 12, ramp = 0.8;
    // position before stop, ramping speed in over 0.8 s (integral of a linear ramp), reaching target at s.stop
    const full = q => q < ramp ? VEL * q * q / (2 * ramp) : VEL * (q - ramp / 2);
    return target - (full(s.stop - t0) - full(t - t0));
  }
  const u = t - s.stop; return target + (VEL / 18) * Math.exp(-6 * u) * Math.sin(18 * u);
}
M.def({
  id: 'e31', num: 31, ch: 4, title: '數字滾動', en: 'COUNTERS & ODOMETERS', dur: 20, ground: 'dark',
  prompt: '做一組黑底白字的數字動畫：先是六位里程表，個位一直轉、進位只在下一位 9→0 時跟著轉，從 099 984 滾過 100 000；接著兩行數字從 0 數到 1,280,000，比較比例數字會抖、等寬數字不抖，並畫出緩動曲線；最後三個轉輪依拍點逐一停在 072，帶回彈。',
  how: ['里程表：第 i 位 = floor(v/10^i) + max(0, v mod 10^i − 10^i + 1)', '數到目標：value = round(目標 × outExpo(t/2.4s))，固定格寬', '轉輪停止時速度連續：A·e^(−6t)·sin(18t)，A = v/18'],
  practice: '做一個倒數計時器，最後三秒每秒放大一次。',
  cues: [{ t: 2.5, type: 'bell', i: 0, v: 0.5 }, { t: 6, type: 'pop', v: 0.6 }, { t: 9, type: 'pop', v: 0.6 }, { t: 12, type: 'riser', t1: 14 }, ...SLOT.map(s => ({ t: s.stop, type: 'thud', v: 0.8 })), { t: 15.0, type: 'impact', v: 0.6 }],
  frame(ctx, t) {
    const lab = (a, b) => { text(ctx, a, 44, 62, { size: 21, family: F.mono, weight: 500 }); text(ctx, b, SW - 44, 62, { size: 20, family: F.mono, align: 'right', alpha: 0.7 }); };
    if (t < 6) {
      /* ---------- odometer ---------- */
      const v = odoV(t), cw = 150, n = 6, x0 = (SW - cw * n) / 2, cy = 400, h = 250, sc = 140 / 686;
      const a = ease(E.outCubic, 0, 0.3, t) * (1 - ease(E.inCubic, 5.6, 6, t));
      ctx.save(); ctx.globalAlpha = a;
      for (let i = 0; i < n; i++) {
        const cx = x0 + cw * (n - 1 - i) + cw / 2, p = odo(v, i);
        ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1.5; ctx.strokeRect(cx - cw / 2 + 6, cy - h / 2, cw - 12, h);
        drum(ctx, p, cx, cy, cw - 12, h, sc, 0);
        // per-digit rotation readout
        const moving = i === 0 || (p % 1) > 0.001;
        text(ctx, p.toFixed(2), cx, cy + h / 2 + 44, { size: 18, family: F.mono, align: 'center', alpha: moving ? 1 : 0.35 });
        text(ctx, '10^' + i, cx, cy - h / 2 - 22, { size: 18, family: F.mono, align: 'center', alpha: 0.45 });
      }
      // carry indicator
      const near = Math.abs(t - 2.5) < 0.35;
      text(ctx, near ? '進位連鎖 CARRY ↺' : 'v = ' + v.toFixed(2), SW / 2, 700, { size: near ? 40 : 30, family: near ? F.tcBlack : F.mono, weight: near ? 900 : 500, align: 'center' });
      text(ctx, '高位只在低位 9→0 的那一段跟著轉', SW / 2, 760, { size: 24, family: F.tc, align: 'center', alpha: 0.6 });
      ctx.restore();
      lab('01  里程表 ODOMETER', 'v = 99 984 + 6.4·t');
    } else if (t < 12) {
      /* ---------- count-up: proportional vs tabular, with the easing curve ---------- */
      const run = t < 9 ? 0 : 1, u = (t - (run ? 9 : 6)), dur = 2.4;
      const fn = run ? E.outExpo : E.lin, k = fn(clamp(u / dur));
      const val = Math.round(COUNT * k), s = fmt(val);
      const sc = 120 / 686, base1 = 300, base2 = 520;
      // proportional: each glyph's own advance, whole string centred → width changes, it jitters
      let tot = 0; for (const ch of s) tot += ch === ',' ? 120 : glyphAt(ch, WD, WT).adv; tot *= sc;
      let x = (SW - tot) / 2; ctx.beginPath();
      for (const ch of s) { if (ch === ',') { ctx.rect(x + 4, base1 - 4, 10, 26); x += 120 * sc; continue; } const gl = glyphAt(ch, WD, WT); traceGlyph(ctx, gl, x, base1, sc); x += gl.adv * sc; }
      ctx.fillStyle = fg(1); ctx.fill();
      // tabular: fixed cells, right-aligned to the final width → nothing moves sideways
      const cell = 600 * sc, fin = fmt(COUNT), wTab = [...fin].reduce((a, ch) => a + (ch === ',' ? 120 * sc : cell), 0);
      x = (SW + wTab) / 2; ctx.beginPath();
      for (const ch of [...s].reverse()) { if (ch === ',') { x -= 120 * sc; ctx.rect(x + 4, base2 - 4, 10, 26); continue; } x -= cell; digit(ctx, +ch, x + cell / 2, base2, sc); }
      ctx.fill();
      // edges: show the jitter against fixed guides
      ctx.fillStyle = fg(0.3); ctx.fillRect((SW + wTab) / 2 + 12, base2 - 130, 1.5, 150); ctx.fillRect((SW - tot) / 2 - 12, base1 - 130, 1.5, 150);
      text(ctx, '比例數字 PROPORTIONAL · 置中 → 抖動', 70, base1 + 48, { size: 20, family: F.mono, alpha: 0.65 });
      text(ctx, '等寬數字 TABULAR · 固定格寬 → 穩定', 70, base2 + 48, { size: 20, family: F.mono, alpha: 0.65 });
      // curve
      const gx = 120, gy = 640, gw = 360, gh = 300;
      ctx.strokeStyle = fg(0.3); ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, gh);
      ctx.beginPath(); for (let i = 0; i <= 60; i++) { const q = i / 60, y = gy + gh - gh * fn(q); i ? ctx.lineTo(gx + gw * q, y) : ctx.moveTo(gx + gw * q, y); }
      ctx.strokeStyle = fg(1); ctx.lineWidth = 3; ctx.stroke();
      const q = clamp(u / dur); ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(gx + gw * q, gy + gh - gh * k, 9, 0, TAU); ctx.fill();
      text(ctx, run ? 'outExpo' : 'linear', gx + gw + 40, gy + 60, { size: 54, family: F.latin, weight: 300 });
      text(ctx, `t ${(q * dur).toFixed(2)}s / ${dur}s`, gx + gw + 44, gy + 120, { size: 22, family: F.mono });
      text(ctx, run ? '先快後慢：最後幾位數慢慢停' : '等速：最後一刻突然停住', gx + gw + 44, gy + 170, { size: 24, family: F.tc, alpha: 0.75 });
      lab('02  數到目標 COUNT-UP', run ? 'ease = outExpo' : 'ease = linear');
    } else {
      /* ---------- payoff: slot drums land on the beat ---------- */
      const cw = 330, h = 520, cy = 460, sc = 0.53, x0 = (SW - cw * 3) / 2;
      SLOT.forEach((s, i) => {
        const p = slotPos(t, s, i), cx = x0 + cw * i + cw / 2;
        // speed → blur (numerical derivative is fine: pure function of t)
        const vel = Math.abs(slotPos(t + 1 / 60, s, i) - p) * 60;
        drum(ctx, p, cx, cy, cw - 16, h, sc, clamp(vel / VEL) * 0.35);
        ctx.fillStyle = fg(0.4); ctx.fillRect(cx - cw / 2 + 8, cy - h / 2, cw - 16, 2); ctx.fillRect(cx - cw / 2 + 8, cy + h / 2 - 2, cw - 16, 2);
        const landed = t >= s.stop;
        text(ctx, landed ? 'STOP' : vel > 1 ? vel.toFixed(0) + '/s' : '—', cx, cy + h / 2 + 46, { size: 20, family: F.mono, align: 'center', alpha: landed ? 1 : 0.5 });
      });
      const ta = ease(E.outCubic, 15.2, 15.8, t);
      text(ctx, '共 72 種動態技法', SW / 2, 960, { size: 56, family: F.tcBlack, weight: 900, align: 'center', alpha: ta });
      text(ctx, '72 MOTION TECHNIQUES · 20 SECONDS EACH', SW / 2, 1010, { size: 19, family: F.mono, align: 'center', alpha: 0.6 * ta, spacing: 2 });
      lab('03  轉輪 SLOT · 逐拍停', '回彈 A·e^(−6t)·sin(18t)');
    }
  },
});
