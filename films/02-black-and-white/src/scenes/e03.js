/* 03 彈簧 — 3×3 grid: stiffness rows × damping columns, live step-response traces and ζ.
   Payoff: the nine springs leave their cells and chase one shared 2D target. Dark ground. */
const KS = [100, 225, 400], CS = [6, 15, 30];          // m = 1
const CX0 = 150, CP = 300, CWD = 290, CY0 = 150, RP = 284, CHT = 270;
const TRAVEL = 110, SQ = 40;
const CELLS = [];
KS.forEach((k, r) => CS.forEach((c, q) => {
  const x = CX0 + q * CP, y = CY0 + r * RP;
  CELLS.push({ k, c, r, q, x, y, z: c / (2 * Math.sqrt(k)), rx0: x + 90, ry: y + 62 });
}));
const H8 = n => { const r = rng(9100 + n); return [0, 0.25, 0.5, 0.75, 1][Math.floor(r() * 5)]; };
const PATH = [[0, 0], [-250, -220], [250, -220], [250, 220], [-250, 220], [0, 0], [-300, 0], [300, 0]];
const PC = [540, 560];
const PHASE = 14;

/* targets as a pure function of time (normalised rail position for cells, absolute for payoff) */
function target(C, T) {
  if (T < PHASE) {
    let n;
    if (T < 8) n = Math.floor(T / 2) % 2 === 0 ? 1 : 0;
    else { const b = Math.floor(T / 0.5); n = H8(b); if (n === H8(b - 1)) n = 1 - n; }
    return { x: C.rx0 + n * TRAVEL, y: C.ry, a: 0, s: SQ };
  }
  const j = Math.floor((T - PHASE) / 0.5), p = PATH[j % PATH.length];
  return { x: PC[0] + p[0], y: PC[1] + p[1], a: j * Math.PI / 2, s: 170 };
}

const S = M.def({
  id: 'e03', num: 3, ch: 1, title: '彈簧', en: 'SPRING', dur: 20, ground: 'dark',
  prompt: '做 3×3 彈簧方格：橫列剛度 k = 100 / 225 / 400，直行阻尼 c = 6 / 15 / 30。方塊每 2 秒換邊，格內畫出位置的即時軌跡與 ζ 值；之後目標每拍亂跳；最後九個方塊離開格子，追同一個目標。黑底白線。',
  how: ['F = −k(x − 目標) − c·v，240 Hz 半隱式歐拉積分', 'ζ = c ÷ 2√(km)：< 1 回彈、= 1 臨界、> 1 遲緩', '目標改變時保留速度，所以中途重定向依然連續'],
  practice: '找出 ζ ≈ 0.6 的參數，做一顆不吵的按鈕回彈。',
  cues: [0, 2, 4, 6].map(t => ({ t, type: 'tick', v: 0.5 }))
    .concat([{ t: 8, type: 'pop', v: 0.5 }, { t: 14, type: 'whoosh', dur: 0.5, v: 0.6 }, { t: 14, type: 'bell', i: 0, v: 0.5 }]),

  reset() {
    this.st = CELLS.map(C => ({ x: C.rx0, y: C.ry, vx: 0, vy: 0, a: 0, va: 0, s: SQ, vs: 0, hist: [], trail: [] }));
  },
  step(dt, n, T) {
    CELLS.forEach((C, i) => {
      const s = this.st[i], tg = target(C, T);
      const k = C.k, c = C.c;
      s.vx += (-k * (s.x - tg.x) - c * s.vx) * dt; s.x += s.vx * dt;
      s.vy += (-k * (s.y - tg.y) - c * s.vy) * dt; s.y += s.vy * dt;
      s.va += (-k * (s.a - tg.a) - c * s.va) * dt; s.a += s.va * dt;
      s.vs += (-k * (s.s - tg.s) - c * s.vs) * dt; s.s += s.vs * dt;
      if (n % 4 === 0) {                          // 60 Hz history of normalised rail position + target
        s.hist.push([(s.x - C.rx0) / TRAVEL, (tg.x - C.rx0) / TRAVEL]);
        if (s.hist.length > 120) s.hist.shift();
        if (T > PHASE - 0.2) { s.trail.push(s.x, s.y); if (s.trail.length > 90) s.trail.splice(0, 2); }
      }
    });
  },

  frame(ctx, t) {
    M.sim(S, t, (dt, n, T) => this.step(dt, n, T), 240);
    const out = ease(E.inOutCubic, PHASE, PHASE + 0.6, t);
    const bar = Math.floor(t / 2);

    // ---- grid furniture
    if (out < 1) {
      ctx.save(); ctx.globalAlpha = 1 - out;
      text(ctx, '阻尼 c →', 1032, 70, { size: 24, family: F.tcBlack, weight: 900, align: 'right', alpha: bar === 1 ? 1 : 0.55 });
      CS.forEach((c, q) => text(ctx, `c = ${c}`, CX0 + q * CP + CWD / 2, 122, { size: 22, family: F.mono, weight: 500, align: 'center', alpha: bar === 1 ? 1 : 0.7 }));
      KS.forEach((k, r) => {
        const y = CY0 + r * RP + CHT / 2;
        text(ctx, 'k =', 48, y - 6, { size: 20, family: F.mono, alpha: bar === 2 ? 1 : 0.55 });
        text(ctx, String(k), 48, y + 22, { size: 26, family: F.mono, weight: 500, alpha: bar === 2 ? 1 : 0.8 });
      });
      text(ctx, '剛度 k ↓', 48, 70, { size: 24, family: F.tcBlack, weight: 900, alpha: bar === 2 ? 1 : 0.55 });
      // caption per bar
      const caps = ['ζ = c ÷ 2√(k·m)　　m = 1', 'c 越大 → 回彈越少', 'k 越大 → 越快、越抖', 'ζ = 1 臨界阻尼：最快且不過衝', '目標每拍亂跳：速度被保留', '目標每拍亂跳：速度被保留', '目標每拍亂跳：速度被保留'];
      const cap = caps[Math.min(bar, 6)], ca = ease(E.outCubic, bar * 2, bar * 2 + 0.4, t);
      text(ctx, cap, 540, 1052, { size: 26, family: F.tc, align: 'center', alpha: ca });
      ctx.restore();
    }

    CELLS.forEach((C, i) => {
      const s = this.st[i];
      const fa = 1 - out;
      if (fa > 0) {
        ctx.save(); ctx.globalAlpha = fa;
        // emphasis: column (bar 1), row (bar 2), critical cell (bar 3)
        let em = 0.16;
        if (bar === 3 && Math.abs(C.z - 1) < 0.01) em = 1;
        ctx.strokeStyle = fg(em); ctx.lineWidth = em > 0.5 ? 3 : 1;
        ctx.strokeRect(C.x + .5, C.y + .5, CWD, CHT);
        // rail + target
        ctx.fillStyle = fg(0.18); ctx.fillRect(C.rx0, C.ry, TRAVEL, 2);
        ctx.fillRect(C.rx0 - 1, C.ry - 8, 2, 18); ctx.fillRect(C.rx0 + TRAVEL - 1, C.ry - 8, 2, 18);
        const tg = target(C, Math.min(t, PHASE - 0.001));
        ctx.fillStyle = fg(0.7); ctx.beginPath(); ctx.moveTo(tg.x, C.ry + 30); ctx.lineTo(tg.x - 7, C.ry + 42); ctx.lineTo(tg.x + 7, C.ry + 42); ctx.fill();
        // ghost ticks: where the square was over the last 0.5 s (60 Hz samples)
        { const hs = s.hist; ctx.fillStyle = fg(0.45);
          for (let j = Math.max(0, hs.length - 30); j < hs.length; j += 2) ctx.fillRect(C.rx0 + hs[j][0] * TRAVEL - 1, C.ry - 30, 2, 10); }
        // trace plot: last 2 s
        const px = C.x + 18, pw = CWD - 36, py0 = C.y + 212, ph = 100;   // value 0 at py0, 1 at py0-ph
        const Y = v => py0 - 12 - clamp(v, -0.65, 1.65) * ph * 0.55;
        ctx.setLineDash([3, 5]); ctx.strokeStyle = fg(0.3); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, Y(0)); ctx.lineTo(px + pw, Y(0)); ctx.moveTo(px, Y(1)); ctx.lineTo(px + pw, Y(1)); ctx.stroke(); ctx.setLineDash([]);
        const hs = s.hist, n = hs.length;
        if (n > 1) {
          ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1.5; ctx.beginPath();
          for (let j = 0; j < n; j++) { const xx = px + pw * (1 - (n - 1 - j) / 119); j ? ctx.lineTo(xx, Y(hs[j][1])) : ctx.moveTo(xx, Y(hs[j][1])); }
          ctx.stroke();
          ctx.strokeStyle = fg(1); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath();
          for (let j = 0; j < n; j++) { const xx = px + pw * (1 - (n - 1 - j) / 119); j ? ctx.lineTo(xx, Y(hs[j][0])) : ctx.moveTo(xx, Y(hs[j][0])); }
          ctx.stroke();
          ctx.fillStyle = fg(1); ctx.beginPath(); ctx.arc(px + pw, Y(hs[n - 1][0]), 4, 0, TAU); ctx.fill();
        }
        // ζ readout
        const kind = C.z < 0.99 ? '欠阻尼' : C.z < 1.01 ? '臨界' : '過阻尼';
        text(ctx, `ζ ${C.z.toFixed(2)}`, C.x + 18, C.y + CHT - 18, { size: 22, family: F.mono, weight: 500 });
        text(ctx, kind, C.x + CWD - 18, C.y + CHT - 18, { size: 20, family: F.tc, align: 'right', alpha: 0.6 });
        ctx.restore();
      }
    });

    // ---- payoff target marker
    if (out > 0) {
      const tg = target(CELLS[0], t);
      ctx.save(); ctx.globalAlpha = out;
      ctx.strokeStyle = fg(0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tg.x - 120, tg.y); ctx.lineTo(tg.x + 120, tg.y); ctx.moveTo(tg.x, tg.y - 120); ctx.lineTo(tg.x, tg.y + 120); ctx.stroke();
      text(ctx, '同一個目標，九種彈簧', 48, 82, { size: 34, family: F.tcBlack, weight: 900 });
      text(ctx, 'target jumps every beat · θ += 90°', 48, 120, { size: 20, family: F.mono, alpha: 0.55 });
      // legend: ζ for the three line weights
      text(ctx, '粗線 = 低 ζ　細線 = 高 ζ', 1032, 1046, { size: 22, family: F.tc, align: 'right', alpha: 0.6 });
      ctx.restore();
    }

    // ---- payoff trails: each spring's path to the target
    if (out > 0) {
      ctx.save(); ctx.globalAlpha = out; ctx.lineJoin = 'round';
      CELLS.forEach((C, i) => {
        const tr = this.st[i].trail; if (tr.length < 4) return;
        ctx.strokeStyle = fg(lerp(0.14, 0.4, clamp(1 - C.z))); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tr[0], tr[1]); for (let j = 2; j < tr.length; j += 2) ctx.lineTo(tr[j], tr[j + 1]); ctx.stroke();
      });
      ctx.restore();
    }
    // ---- the squares (drawn last, they fly out in the payoff)
    CELLS.forEach((C, i) => {
      const s = this.st[i], sz = Math.max(4, s.s);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
      if (out < 0.02) { ctx.fillStyle = fg(1); ctx.fillRect(-sz / 2, -sz / 2, sz, sz); }
      else {
        const w = lerp(1, 5, clamp(1 - C.z, 0, 1) / 0.85);
        ctx.fillStyle = fg(1 - out); ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.strokeStyle = fg(lerp(0.45, 1, clamp(1 - C.z / 1.5))); ctx.lineWidth = w;
        ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
      }
      ctx.restore();
    });
  },
});
