'use strict';
/* ==========================================================================
   Soundtrack — synthesized with Web Audio, no samples.
   Kick, clap, hats, bass, pad, FM glass bells, risers, impacts.
   Rendered in an OfflineAudioContext, then limited and calibrated to
   −14 LUFS integrated (ITU-R BS.1770-4 gating) with a −1 dBFS ceiling.
   ========================================================================== */
const MUS = {};
MUS.SR = 48000;
MUS.TARGET_LUFS = -14;

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
/* Dm9 – Bbmaj9 – Gm9 – A7sus4→A7, one chord per bar */
MUS.CHORDS = [
  { root: 38, pad: [50, 53, 57, 60, 64], bell: [74, 77, 81, 84, 88] },
  { root: 34, pad: [46, 50, 53, 57, 60], bell: [74, 77, 81, 82, 86] },
  { root: 31, pad: [43, 46, 50, 53, 57], bell: [74, 77, 79, 82, 86] },
  { root: 33, pad: [45, 50, 52, 55, 61], bell: [73, 76, 79, 81, 85] },
];

/* per-section arrangement (by scene num or id) */
MUS.ARR = {
  intro: { pad: 1, bells: 'sparse', riserEnd: 1 },
  '01': { kick: 'half', bass: 'whole', pad: .6, bells: 'cues' },
  '02': { kick: 'four', bass: 'eighth', hats: 8, pad: .4 },
  '03': { kick: 'four', bass: 'eighth', hats: 16, clap: 1, bells: 'cues' },
  '04': { kick: 'four', bass: 'eighth', hats: 16, clap: 1, bells: 'arp', pad: .35 },
  '05': { kick: 'four', bass: 'pump', hats: 16, clap: 1, bells: 'beats' },
  '06': { kick: 'four', bass: 'eighth', hats: 8, pad: .7, filter: 'sweep', bells: 'sparse' },
  '07': { bass: 'sub', pad: 1, bells: 'shimmer' },
  '08': { bass: 'sub', pad: 1, bells: 'shimmer', roll: 1 },
  '09': { kick: 'four', bass: 'eighth', hats: 16, clap: 1, impactStart: 1, bells: 'cues' },
  '10': { kick: 'four', bass: 'pump', hats: 16, clap: 1, bells: 'arp' },
  '11': { kick: 'four', bass: 'eighth', hats: 16, clap: 1, bells: 'cues' },
  '12': { kick: 'four', bass: 'eighth', hats: 16, clap: 1, bells: 'cues' },
  outro: { pad: 1, bells: 'final', impactStart: 1 },
};

MUS.build = function (ac, T) {
  const out = ac.destination;
  const r = rng(2024);
  /* ---- buses ---- */
  const master = ac.createGain(); master.gain.value = 0.8;
  const glue = ac.createDynamicsCompressor();
  glue.threshold.value = -16; glue.knee.value = 8; glue.ratio.value = 2.5; glue.attack.value = 0.01; glue.release.value = 0.18;
  master.connect(glue); glue.connect(out);

  // generated stereo reverb impulse (exponential noise tail with early reflections)
  const irLen = Math.floor(ac.sampleRate * 3.2), ir = ac.createBuffer(2, irLen, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch), rr = rng(77 + ch);
    for (let i = 0; i < irLen; i++) { const tt = i / ac.sampleRate; d[i] = (rr() * 2 - 1) * Math.pow(1 - i / irLen, 2.2) * Math.exp(-tt * 1.1); }
    for (let k = 0; k < 12; k++) { const at = Math.floor(rr() * 0.08 * ac.sampleRate); d[at] += (rr() * 2 - 1) * 0.6; }
  }
  const verb = ac.createConvolver(); verb.buffer = ir;
  const verbIn = ac.createGain(); verbIn.gain.value = 0.55;
  const verbHP = ac.createBiquadFilter(); verbHP.type = 'highpass'; verbHP.frequency.value = 280;
  verbIn.connect(verbHP); verbHP.connect(verb); verb.connect(master);

  // ping-pong delay (dotted eighth)
  const dl = ac.createDelay(2), dr = ac.createDelay(2), fbL = ac.createGain(), fbR = ac.createGain(), merger = ac.createChannelMerger(2), dIn = ac.createGain();
  dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.75; fbL.gain.value = 0.42; fbR.gain.value = 0.42; dIn.gain.value = 0.35;
  const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 4200;
  dIn.connect(dlp); dlp.connect(dl); dl.connect(fbL); fbL.connect(dr); dr.connect(fbR); fbR.connect(dl);
  dl.connect(merger, 0, 0); dr.connect(merger, 0, 1); merger.connect(master); merger.connect(verbIn);

  // music bus with sidechain duck + master filter (for sweeps)
  const musFilter = ac.createBiquadFilter(); musFilter.type = 'lowpass'; musFilter.frequency.value = 20000; musFilter.Q.value = 0.7;
  const duck = ac.createGain(); duck.gain.value = 1;
  duck.connect(musFilter); musFilter.connect(master);
  const drums = ac.createGain(); drums.gain.value = 1; drums.connect(master);

  const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  { const d = noiseBuf.getChannelData(0), rr = rng(5); for (let i = 0; i < d.length; i++) d[i] = rr() * 2 - 1; }
  const noise = (t, dur) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, r() * 1.5); s.stop(t + dur + 0.05); return s; };
  const env = (g, t, a, peak, d, sus = 0) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(sus, t + a, d / 4); };
  const pan = (node, p) => { const pn = ac.createStereoPanner(); pn.pan.value = p; node.connect(pn); return pn; };

  /* ---- voices ---- */
  const kick = (t, v = 1) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11); o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.0 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    const sh = ac.createWaveShaper(); const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * 1.8); } sh.curve = c;
    o.connect(sh); sh.connect(g); g.connect(drums); o.start(t); o.stop(t + 0.5);
    const n = noise(t, 0.02), ng = ac.createGain(), hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    ng.gain.setValueAtTime(0.25 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015); n.connect(hp); hp.connect(ng); ng.connect(drums);
    // sidechain duck on the music bus
    duck.gain.setValueAtTime(0.35, t); duck.gain.setTargetAtTime(1, t + 0.02, 0.09);
  };
  const clap = (t, v = 1) => {
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.9;
    const g = ac.createGain(); g.gain.value = 0;
    [0, 0.011, 0.023].forEach((o, i) => { g.gain.setValueAtTime(0.5 * v, t + o); g.gain.exponentialRampToValueAtTime(0.05, t + o + 0.01); });
    g.gain.setValueAtTime(0.4 * v, t + 0.034); g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    const n = noise(t, 0.3); n.connect(bp); bp.connect(g); g.connect(drums);
    const s = ac.createGain(); s.gain.value = 0.25; g.connect(s); s.connect(verbIn);
  };
  const hat = (t, v = 1, open = false) => {
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
    const g = ac.createGain(), d = open ? 0.18 : 0.035;
    g.gain.setValueAtTime(0.16 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    const n = noise(t, d + 0.02); n.connect(hp); hp.connect(g); pan(g, (r() - .5) * 0.5).connect(drums);
  };
  const bass = (t, midi, dur, v = 1, cut = 700) => {
    const f = mtof(midi), g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(cut * 2.2, t); lp.frequency.setTargetAtTime(cut * 0.5, t, 0.08);
    [-7, 7].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); });
    const sub = ac.createOscillator(); sub.frequency.value = f; const sg = ac.createGain(); sg.gain.value = 0.9; sub.connect(sg); sg.connect(g); sub.start(t); sub.stop(t + dur + 0.1);
    lp.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * v, t + 0.006); g.gain.setTargetAtTime(0.22 * v, t + 0.01, 0.1);
    g.gain.setValueAtTime(0.22 * v, t + dur - 0.02); g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    g.connect(duck);
  };
  const pad = (t, notes, dur, v = 1) => {
    const g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.3;
    notes.forEach((m, i) => [-9, 0, 9].forEach((dt, j) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt + (r() - .5) * 4;
      const pg = ac.createGain(); pg.gain.value = 0.018; o.connect(pg); pan(pg, (j - 1) * 0.6).connect(lp); o.start(t); o.stop(t + dur + 1.6);
    }));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.6); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 1.5);
    lp.connect(g); g.connect(duck); const s = ac.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(verbIn);
  };
  /* FM glass bell: inharmonic modulator ratio, fast-decaying index */
  const bell = (t, midi, v = 1, p = 0, dec = 2.6) => {
    const f = mtof(midi), car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    const p2 = ac.createOscillator(), g2 = ac.createGain(); p2.frequency.value = f * 2.756; g2.gain.setValueAtTime(0.25, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    p2.connect(g2); g2.connect(g);
    car.connect(g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0008, t + dec);
    const o = pan(g, p); o.connect(duck); o.connect(verbIn); const ds = ac.createGain(); ds.gain.value = 0.6; o.connect(ds); ds.connect(dIn);
    [car, mod, p2].forEach(x => { x.start(t); x.stop(t + dec + 0.1); });
  };
  const impact = (t, v = 1) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.2);
    g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    o.connect(g); g.connect(drums); o.start(t); o.stop(t + 1.7);
    const n = noise(t, 1.6), lp = ac.createBiquadFilter(), ng = ac.createGain(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(6000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    ng.gain.setValueAtTime(0.35 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    n.connect(lp); lp.connect(ng); ng.connect(drums); const s = ac.createGain(); s.gain.value = 0.6; ng.connect(s); s.connect(verbIn);
  };
  const riser = (t0, t1, v = 1) => {
    const n = noise(t0, t1 - t0), bp = ac.createBiquadFilter(), g = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(9000, t1);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.28 * v, t1 - 0.02); g.gain.linearRampToValueAtTime(0, t1);
    n.connect(bp); bp.connect(g); pan(g, 0).connect(master); g.connect(verbIn);
  };
  const tick = (t, v = 1) => { // short wood/glass tick for UI motion
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = 2400;
    g.gain.setValueAtTime(0.12 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); o.connect(g); pan(g, (r() - .5) * .8).connect(master); o.start(t); o.stop(t + 0.05);
  };
  const thud = (t, v = 1) => { // physical object landing
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g); g.connect(drums); o.start(t); o.stop(t + 0.3);
  };
  const reverse = (t0, t1, notes) => { // reversed-sounding swell: slow attack, instant cut
    notes.forEach((m, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.06, t1 - 0.01); g.gain.linearRampToValueAtTime(0, t1);
      o.connect(g); pan(g, (i / (notes.length - 1) - .5)).connect(duck); g.connect(verbIn); o.start(t0); o.stop(t1 + 0.02); });
  };
  const voice = { kick, clap, hat, bass, pad, bell, impact, riser, tick, thud, reverse };

  /* ---- arrangement ---- */
  const chordAt = gt => MUS.CHORDS[Math.floor(gt / BAR + 1e-6) % 4];
  for (const s of M.timeline) {
    const key = s.num || s.id, a = MUS.ARR[key] || {};
    const t0 = s.start, t1 = s.end;
    for (let b = t0; b < t1 - 1e-6; b += BEAT) {
      const bi = Math.round((b - t0) / BEAT), inBar = Math.round(b / BEAT) % 4, ch = chordAt(b);
      if (a.kick === 'four' || (a.kick === 'half' && inBar % 2 === 0)) kick(b, inBar === 0 ? 1 : 0.92);
      if (a.clap && (inBar === 1 || inBar === 3)) clap(b);
      if (a.hats) {
        const sub = a.hats === 16 ? 4 : 2;
        for (let k = 0; k < sub; k++) { const ht = b + k * BEAT / sub; const off = (k === sub / 2); hat(ht, off ? 1 : (k % 2 ? 0.45 : 0.7), off && inBar === 3 && a.hats === 16); }
      }
      if (a.bass === 'eighth') { bass(b, ch.root + (inBar === 3 ? 12 : 0), BEAT * 0.42); bass(b + BEAT / 2, ch.root + 12, BEAT * 0.4, 0.8); }
      else if (a.bass === 'pump') { bass(b + BEAT / 2, ch.root + 12 * (inBar % 2), BEAT * 0.45, 0.95); }
      else if (a.bass === 'whole' && inBar === 0) bass(b, ch.root, BAR * 0.95, 0.9, 400);
      else if (a.bass === 'sub' && inBar === 0) bass(b, ch.root, BAR, 0.75, 220);
      if (inBar === 0 && a.pad) pad(b, ch.pad, BAR, 0.7 * a.pad);
      if (a.bells === 'arp') { const seq = [0, 2, 4, 1, 3, 2, 4, 3]; const k = bi % 8; if (bi % 2 === 0 || k === 3) bell(b + (bi % 2 ? BEAT / 2 : 0), ch.bell[seq[k]], 0.55, (k % 3 - 1) * .5, 1.6); }
      if (a.bells === 'beats') bell(b, ch.bell[inBar === 0 ? 0 : (bi * 3) % 5], inBar === 0 ? 0.8 : 0.45, (inBar - 1.5) * .3, 1.2);
      if (a.bells === 'sparse' && inBar === 0) bell(b + BEAT * 0.5, ch.bell[2], 0.5, -.3, 3.5);
      if (a.bells === 'shimmer') { for (let k = 0; k < 2; k++) { const n = ch.bell[(bi * 2 + k * 3) % 5] + (k ? 12 : 0); bell(b + k * BEAT / 2, n, 0.35 + 0.1 * (inBar === 0), (r() - .5) * 1.2, 3.2); } }
    }
    if (a.filter === 'sweep') { musFilter.frequency.setValueAtTime(600, t0); musFilter.frequency.exponentialRampToValueAtTime(18000, t1 - 0.05); musFilter.frequency.setValueAtTime(20000, t1); }
    if (a.riserEnd) riser(t1 - BAR, t1, 1);
    if (a.roll) { for (let k = 0; k < 16; k++) { const tt = t1 - BAR + k * BAR / 16; clap(tt, 0.15 + 0.6 * k / 16); } }
    if (a.impactStart) impact(t0, 1);
    if (a.bells === 'final') {
      const fin = [62, 69, 74, 77, 81, 88];
      fin.forEach((m, i) => bell(t0 + 0.08 * i, m, 0.7, (i / 5 - .5), 5.5));
      pad(t0, [38, 50, 57, 62, 64, 69], t1 - t0 - 1.2, 0.8);
      bass(t0, 26, t1 - t0 - 1, 0.7, 180);
    }
    // scene-authored cues (scene-relative seconds)
    for (const c of (s.cues || [])) {
      const t = t0 + c.t, ch = chordAt(t);
      if (c.type === 'bell') bell(t, c.midi || ch.bell[c.i === undefined ? Math.floor(r() * 5) : c.i % 5], c.v || 0.6, c.pan || 0, c.dec || 2);
      else if (voice[c.type]) {
        if (c.type === 'riser') riser(t, t0 + c.t1, c.v || 1);
        else if (c.type === 'reverse') reverse(t, t0 + c.t1, c.notes || ch.pad.map(n => n + 12));
        else voice[c.type](t, c.v || 1);
      }
    }
  }
};

/* ---- offline render → limiter → loudness calibration ---- */
MUS.render = async function () {
  const T = M.duration + 0.5, sr = MUS.SR;
  const ac = new OfflineAudioContext(2, Math.ceil(T * sr), sr);
  MUS.build(ac, T);
  const buf = await ac.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let gain = 1, lufs = 0;
  for (let it = 0; it < 4; it++) {
    lufs = MUS.lufs(L, R, sr);
    const g = Math.pow(10, (MUS.TARGET_LUFS - lufs) / 20);
    for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }
    gain *= g;
    MUS.limit(L, R, sr, Math.pow(10, -1.2 / 20));
  }
  lufs = MUS.lufs(L, R, sr);
  // short fade at the very end
  const fade = Math.floor(0.4 * sr); for (let i = 0; i < fade; i++) { const k = i / fade; L[L.length - 1 - i] *= k; R[R.length - 1 - i] *= k; }
  MUS.buffer = buf; MUS.measured = lufs;
  let peak = 0; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  MUS.peakDb = 20 * Math.log10(peak);
  return buf;
};
/* ITU-R BS.1770-4 integrated loudness (K-weighting at 48 kHz, 400 ms blocks, 75% overlap, abs −70 / rel −10 LU gates) */
MUS.lufs = function (L, R, sr) {
  const biq = (x, b, a) => { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  const s1b = [1.53512485958697, -2.69169618940638, 1.19839281085285], s1a = [1, -1.69065929318241, 0.73248077421585];
  const s2b = [1, -2, 1], s2a = [1, -1.99004745483398, 0.99007225036621];
  const kL = biq(biq(L, s1b, s1a), s2b, s2a), kR = biq(biq(R, s1b, s1a), s2b, s2a);
  const blk = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), z = [];
  for (let s = 0; s + blk <= kL.length; s += hop) { let a = 0; for (let i = s; i < s + blk; i++) a += kL[i] * kL[i] + kR[i] * kR[i]; z.push(a / blk); }
  const lk = v => -0.691 + 10 * Math.log10(v);
  const abs = z.filter(v => lk(v) > -70); if (!abs.length) return -70;
  const rel = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const g = abs.filter(v => lk(v) > rel);
  return lk(g.reduce((a, b) => a + b, 0) / g.length);
};
/* look-ahead brickwall limiter (5 ms look-ahead, 120 ms release), 4× oversampled peak estimate */
MUS.limit = function (L, R, sr, ceil) {
  const n = L.length, la = Math.round(0.005 * sr), rel = Math.exp(-1 / (0.12 * sr));
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    if (i > 0) { // inter-sample peak estimate (linear midpoints + cubic bump)
      const mL = Math.abs((L[i] + L[i - 1]) * 0.5) * 1.06, mR = Math.abs((R[i] + R[i - 1]) * 0.5) * 1.06; p = Math.max(p, mL, mR);
    }
    need[i] = p > ceil ? ceil / p : 1;
  }
  // running minimum over the look-ahead window (deque)
  const minf = new Float32Array(n), dq = new Int32Array(n); let h = 0, t = 0;
  for (let i = 0; i < n + la; i++) {
    if (i < n) { while (t > h && need[dq[t - 1]] >= need[i]) t--; dq[t++] = i; }
    const o = i - la; if (o >= 0) { while (dq[h] < o - la) h++; minf[o] = need[dq[h]]; }
  }
  let g = 1;
  for (let i = 0; i < n; i++) {
    const target = minf[i];
    g = target < g ? target : target + (g - target) * rel;
    L[i] *= g; R[i] *= g;
  }
};
/* 16-bit PCM WAV with TPDF dither, as base64 (for the recorder) */
MUS.wavBase64 = function () {
  const buf = MUS.buffer, L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, sr = buf.sampleRate;
  const ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab), rr = rng(9);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    for (const [c, x] of [[0, L[i]], [1, R[i]]]) { const d = (rr() - rr()) / 32768; v.setInt16(44 + i * 4 + c * 2, Math.max(-32768, Math.min(32767, Math.round((x + d) * 32767))), true); }
  }
  const bytes = new Uint8Array(ab); let s = ''; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
};
