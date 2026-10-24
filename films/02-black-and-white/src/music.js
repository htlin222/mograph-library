'use strict';
/* ==========================================================================
   Soundtrack — Web Audio synthesis only (no samples). 120 BPM throughout.
   Each chapter has its own key, progression and arrangement; every segment
   breathes in for 2 bars (no drums) then plays full; scenes add their own cues.
   Rendered in chapter-sized chunks (OfflineAudioContext), stitched and
   calibrated to −14 LUFS integrated / −1 dBTP by the build tools.
   ========================================================================== */
const MUS = { SR: 48000 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/* progressions: [root, pad notes (relative to root), bell notes (relative)] per bar */
const PROG = {
  minor9: [[0, [12, 15, 19, 22, 26], [24, 27, 31, 34, 38]], [-4, [12, 16, 19, 23, 26], [28, 31, 35, 36, 40]], [-7, [12, 15, 19, 22, 26], [27, 31, 34, 36, 39]], [-5, [12, 17, 19, 22, 28], [24, 29, 31, 34, 40]]],
  dorian: [[0, [12, 15, 19, 22, 26], [24, 26, 27, 31, 34]], [5, [7, 11, 14, 17, 21], [19, 23, 26, 29, 31]], [0, [12, 15, 19, 22, 26], [24, 27, 31, 33, 34]], [-2, [14, 17, 21, 24, 28], [26, 29, 33, 36, 38]]],
  lydian: [[0, [12, 16, 19, 23, 26], [24, 28, 30, 31, 35]], [2, [10, 14, 17, 21, 24], [26, 28, 31, 33, 36]], [0, [12, 16, 19, 23, 30], [28, 30, 31, 35, 38]], [-3, [15, 19, 22, 26, 29], [27, 31, 34, 36, 39]]],
  suspended: [[0, [12, 17, 19, 24, 26], [24, 26, 29, 31, 36]], [-2, [14, 19, 21, 26, 28], [26, 28, 31, 33, 38]], [-5, [17, 22, 24, 29, 31], [29, 31, 34, 36, 41]], [-7, [19, 24, 26, 31, 33], [31, 33, 36, 38, 43]]],
};
/* per-chapter arrangement */
MUS.CH = {
  0: { key: 38, prog: 'suspended', pad: 1, bells: 'sparse' },
  1: { key: 38, prog: 'minor9', kick: 'half', bass: 'whole', hats: 8, pad: .55, bells: 'sparse' },
  2: { key: 40, prog: 'dorian', kick: 'four', bass: 'eighth', hats: 16, pad: .35, bells: 'arp' },
  3: { key: 36, prog: 'lydian', kick: 'four', bass: 'pump', hats: 8, clap: 1, pad: .4, bells: 'beats' },
  4: { key: 41, prog: 'minor9', kick: 'four', bass: 'eighth', hats: 16, clap: 1, pad: .3, bells: 'arp' },
  5: { key: 37, prog: 'suspended', bass: 'sub', pad: 1, bells: 'shimmer', kick: 'half' },
  6: { key: 39, prog: 'dorian', kick: 'half', bass: 'whole', hats: 8, pad: .7, bells: 'sparse' },
  7: { key: 38, prog: 'minor9', kick: 'four', bass: 'pump', hats: 16, clap: 1, pad: .25, bells: 'beats', grit: 1 },
  8: { key: 36, prog: 'lydian', kick: 'half', bass: 'whole', pad: .8, bells: 'shimmer' },
  9: { key: 40, prog: 'dorian', kick: 'four', bass: 'eighth', hats: 16, clap: 1, pad: .35, bells: 'arp' },
};

MUS.build = function (ac, t0, t1) {
  /* schedules everything that starts in [t0 - 0.05, t1) of the global timeline, at (time - t0) */
  const out = ac.destination, r = rng(2026 + Math.round(t0));
  const master = ac.createGain(); master.gain.value = 0.8;
  const glue = ac.createDynamicsCompressor();
  glue.threshold.value = -16; glue.knee.value = 8; glue.ratio.value = 2.5; glue.attack.value = 0.01; glue.release.value = 0.18;
  master.connect(glue); glue.connect(out);
  const irLen = Math.floor(ac.sampleRate * 3.0), ir = ac.createBuffer(2, irLen, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch), rr = rng(77 + ch); for (let i = 0; i < irLen; i++) { const tt = i / ac.sampleRate; d[i] = (rr() * 2 - 1) * Math.pow(1 - i / irLen, 2.2) * Math.exp(-tt * 1.2); } }
  const verb = ac.createConvolver(); verb.buffer = ir;
  const verbIn = ac.createGain(); verbIn.gain.value = 0.5;
  const verbHP = ac.createBiquadFilter(); verbHP.type = 'highpass'; verbHP.frequency.value = 300;
  verbIn.connect(verbHP); verbHP.connect(verb); verb.connect(master);
  const dl = ac.createDelay(2), dr = ac.createDelay(2), fbL = ac.createGain(), fbR = ac.createGain(), merger = ac.createChannelMerger(2), dIn = ac.createGain();
  dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.75; fbL.gain.value = 0.38; fbR.gain.value = 0.38; dIn.gain.value = 0.3;
  const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 4000;
  dIn.connect(dlp); dlp.connect(dl); dl.connect(fbL); fbL.connect(dr); dr.connect(fbR); fbR.connect(dl);
  dl.connect(merger, 0, 0); dr.connect(merger, 0, 1); merger.connect(master); merger.connect(verbIn);
  const duck = ac.createGain(); duck.gain.value = 1; duck.connect(master);
  const drums = ac.createGain(); drums.gain.value = 1; drums.connect(master);

  const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  { const d = noiseBuf.getChannelData(0), rr = rng(5); for (let i = 0; i < d.length; i++) d[i] = rr() * 2 - 1; }
  const noise = (t, dur) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, r() * 1.5); s.stop(t + dur + 0.05); return s; };
  const pan = (node, p) => { const pn = ac.createStereoPanner(); pn.pan.value = p; node.connect(pn); return pn; };
  const OK = t => t >= -0.001;

  const kick = (t, v = 1) => {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11); o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.95 * v, t + 0.003); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(gn); gn.connect(drums); o.start(t); o.stop(t + 0.5);
    duck.gain.setValueAtTime(0.4, t); duck.gain.setTargetAtTime(1, t + 0.02, 0.09);
  };
  const clap = (t, v = 1) => {
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.9;
    const gn = ac.createGain(); gn.gain.value = 0;
    [0, 0.011, 0.023].forEach(o => { gn.gain.setValueAtTime(0.42 * v, t + o); gn.gain.exponentialRampToValueAtTime(0.05, t + o + 0.01); });
    gn.gain.setValueAtTime(0.32 * v, t + 0.034); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    const n = noise(t, 0.3); n.connect(bp); bp.connect(gn); gn.connect(drums);
    const s = ac.createGain(); s.gain.value = 0.22; gn.connect(s); s.connect(verbIn);
  };
  const hat = (t, v = 1, open = false) => {
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
    const gn = ac.createGain(), d = open ? 0.16 : 0.03;
    gn.gain.setValueAtTime(0.11 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d);
    const n = noise(t, d + 0.02); n.connect(hp); hp.connect(gn); pan(gn, (r() - .5) * 0.5).connect(drums);
  };
  const bass = (t, midi, dur, v = 1, cut = 650) => {
    const f = mtof(midi), gn = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2.5; lp.frequency.setValueAtTime(cut * 2, t); lp.frequency.setTargetAtTime(cut * 0.5, t, 0.08);
    [-7, 7].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); });
    const sub = ac.createOscillator(); sub.frequency.value = f; const sg = ac.createGain(); sg.gain.value = 0.9; sub.connect(sg); sg.connect(gn); sub.start(t); sub.stop(t + dur + 0.1);
    lp.connect(gn);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.28 * v, t + 0.006); gn.gain.setTargetAtTime(0.2 * v, t + 0.01, 0.1);
    gn.gain.setValueAtTime(0.2 * v, t + Math.max(0.02, dur - 0.02)); gn.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    gn.connect(duck);
  };
  const pad = (t, notes, dur, v = 1) => {
    const gn = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 0.3;
    notes.forEach(m => [-9, 0, 9].forEach((dt, j) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt + (r() - .5) * 4;
      const pg = ac.createGain(); pg.gain.value = 0.016; o.connect(pg); pan(pg, (j - 1) * 0.6).connect(lp); o.start(t); o.stop(t + dur + 1.6);
    }));
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v, t + 0.6); gn.gain.setValueAtTime(v, t + dur); gn.gain.linearRampToValueAtTime(0, t + dur + 1.5);
    lp.connect(gn); gn.connect(duck); const s = ac.createGain(); s.gain.value = 0.5; gn.connect(s); s.connect(verbIn);
  };
  const bell = (t, midi, v = 1, p = 0, dec = 2.4) => {
    const f = mtof(midi), car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), gn = ac.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.6);
    mod.connect(mg); mg.connect(car.frequency); car.connect(gn);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.1 * v, t + 0.002); gn.gain.exponentialRampToValueAtTime(0.0008, t + dec);
    const o = pan(gn, p); o.connect(duck); o.connect(verbIn); const ds = ac.createGain(); ds.gain.value = 0.5; o.connect(ds); ds.connect(dIn);
    [car, mod].forEach(x => { x.start(t); x.stop(t + dec + 0.1); });
  };
  const impact = (t, v = 1) => {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.frequency.setValueAtTime(85, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.2);
    gn.gain.setValueAtTime(0.8 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    o.connect(gn); gn.connect(drums); o.start(t); o.stop(t + 1.6);
    const n = noise(t, 1.4), lp = ac.createBiquadFilter(), ng = ac.createGain(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 1.1);
    ng.gain.setValueAtTime(0.28 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    n.connect(lp); lp.connect(ng); ng.connect(drums); const s = ac.createGain(); s.gain.value = 0.5; ng.connect(s); s.connect(verbIn);
  };
  const riser = (ta, tb, v = 1) => {
    const n = noise(ta, tb - ta), bp = ac.createBiquadFilter(), gn = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(300, ta); bp.frequency.exponentialRampToValueAtTime(8000, tb);
    gn.gain.setValueAtTime(0.0001, ta); gn.gain.exponentialRampToValueAtTime(0.22 * v, tb - 0.02); gn.gain.linearRampToValueAtTime(0, tb);
    n.connect(bp); bp.connect(gn); gn.connect(master); gn.connect(verbIn);
  };
  const tick = (t, v = 1) => { const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'triangle'; o.frequency.value = 2400; gn.gain.setValueAtTime(0.1 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.04); o.connect(gn); pan(gn, (r() - .5) * .8).connect(master); o.start(t); o.stop(t + 0.05); };
  const thud = (t, v = 1) => { const o = ac.createOscillator(), gn = ac.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15); gn.gain.setValueAtTime(0.45 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(gn); gn.connect(drums); o.start(t); o.stop(t + 0.3); };
  const whoosh = (t, v = 1, dur = 0.5) => { const n = noise(t, dur), bp = ac.createBiquadFilter(), gn = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3500, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(800, t + dur); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.25 * v, t + dur * 0.5); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(bp); bp.connect(gn); pan(gn, (r() - .5)).connect(master); };
  const glitch = (t, v = 1) => { for (let k = 0; k < 5; k++) { const tt = t + k * 0.025, o = ac.createOscillator(), gn = ac.createGain(); o.type = 'square'; o.frequency.value = 200 + r() * 2000; gn.gain.setValueAtTime(0.05 * v, tt); gn.gain.setValueAtTime(0, tt + 0.02); o.connect(gn); pan(gn, (r() - .5) * 1.4).connect(master); o.start(tt); o.stop(tt + 0.025); } };
  const pop = (t, v = 1) => { const o = ac.createOscillator(), gn = ac.createGain(); o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.06); gn.gain.setValueAtTime(0.16 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.connect(gn); pan(gn, (r() - .5) * .6).connect(master); o.start(t); o.stop(t + 0.1); };
  const V = { kick, clap, hat, bass, pad, bell, impact, riser, tick, thud, whoosh, glitch, pop };

  const inWin = t => t >= t0 - 0.05 && t < t1;
  for (const s of M.timeline) {
    if (s.end <= t0 - 4 || s.start >= t1) continue;
    const chn = s.kind === 'seg' || s.kind === 'card' ? s.ch : 0;
    const A = MUS.CH[chn] || MUS.CH[0], prog = PROG[A.prog];
    const chordAt = gt => { const c = prog[Math.floor(gt / BAR + 1e-6) % 4]; return { root: A.key + c[0], pad: c[1].map(n => A.key + c[0] + n), bell: c[2].map(n => A.key + c[0] + n) }; };
    const segFull = s.kind === 'seg';
    for (let b = s.start; b < s.end - 1e-6; b += BEAT) {
      if (!inWin(b)) continue;
      const T = b - t0, bi = Math.round((b - s.start) / BEAT), inBar = Math.round(b / BEAT) % 4, ch = chordAt(b);
      const barIdx = Math.floor(bi / 4);
      const full = !segFull || barIdx >= 2;            // 2-bar breath at the start of each segment
      const last = segFull && b >= s.end - BAR - 1e-6;  // last bar: thin out
      if (s.id === 'intro' || s.id === 'outro') {
        if (inBar === 0) pad(T, ch.pad, BAR, 0.7);
        if (inBar === 0 && barIdx % 2 === 0) bell(T + BEAT * 0.5, ch.bell[2], 0.5, -.3, 3.5);
        continue;
      }
      if (s.kind === 'card') { if (inBar === 0) pad(T, ch.pad, BAR, 0.5); continue; }
      if (full && !last && A.kick === 'four') kick(T, inBar === 0 ? 1 : 0.9);
      if (full && !last && A.kick === 'half' && inBar % 2 === 0) kick(T, 0.95);
      if (full && !last && A.clap && (inBar === 1 || inBar === 3)) clap(T);
      if (full && A.hats) { const sub = A.hats === 16 ? 4 : 2; for (let k = 0; k < sub; k++) { const off = k === sub / 2; hat(T + k * BEAT / sub, off ? 1 : (k % 2 ? 0.4 : 0.65), off && inBar === 3 && A.hats === 16); } }
      if (full && A.grit && bi % 8 === 7) glitch(T + BEAT * 0.5, 0.6);
      if (A.bass === 'eighth' && full) { bass(T, ch.root + (inBar === 3 ? 12 : 0), BEAT * 0.42); bass(T + BEAT / 2, ch.root + 12, BEAT * 0.4, 0.8); }
      else if (A.bass === 'pump' && full) bass(T + BEAT / 2, ch.root + 12 * (inBar % 2), BEAT * 0.45, 0.95);
      else if (A.bass === 'whole' && inBar === 0) bass(T, ch.root, BAR * 0.95, 0.85, 400);
      else if (A.bass === 'sub' && inBar === 0) bass(T, ch.root, BAR, 0.7, 220);
      if (inBar === 0 && A.pad) pad(T, ch.pad, BAR, 0.7 * A.pad * (full ? 1 : 1.3));
      if (A.bells === 'arp' && full) { const seq = [0, 2, 4, 1, 3, 2, 4, 3]; const k = bi % 8; if (bi % 2 === 0 || k === 3) bell(T + (bi % 2 ? BEAT / 2 : 0), ch.bell[seq[k]], 0.45, (k % 3 - 1) * .5, 1.5); }
      if (A.bells === 'beats' && full) bell(T, ch.bell[inBar === 0 ? 0 : (bi * 3) % 5], inBar === 0 ? 0.6 : 0.32, (inBar - 1.5) * .3, 1.1);
      if (A.bells === 'sparse' && inBar === 0 && barIdx % 2 === 0) bell(T + BEAT * 0.5, ch.bell[(barIdx / 2) % 5 | 0], 0.45, -.3, 3.2);
      if (A.bells === 'shimmer' && bi % 2 === 0) bell(T, ch.bell[(bi * 2) % 5] + (bi % 4 ? 12 : 0), 0.3, (r() - .5) * 1.2, 3);
    }
    for (const c of (s.cues || [])) {
      const at = s.start + c.t; if (!inWin(at)) continue;
      const T = at - t0, ch = chordAt(at);
      if (c.type === 'bell') bell(T, c.midi || ch.bell[c.i === undefined ? Math.floor(r() * 5) : c.i % 5], c.v || 0.55, c.pan || 0, c.dec || 2);
      else if (c.type === 'riser') riser(T, s.start + c.t1 - t0, c.v || 1);
      else if (c.type === 'whoosh') whoosh(T, c.v || 1, c.dur || 0.5);
      else if (V[c.type]) V[c.type](T, c.v || 1);
    }
  }
};

/* render a window of the global timeline (with a tail) → Float32 L/R */
MUS.renderRange = async function (t0, t1, tail = 4) {
  const len = Math.ceil((t1 - t0 + tail) * MUS.SR);
  const ac = new OfflineAudioContext(2, len, MUS.SR);
  MUS.build(ac, t0, t1);
  const buf = await ac.startRendering();
  return [buf.getChannelData(0), buf.getChannelData(1)];
};
/* 32-bit float stereo WAV, base64 */
MUS.wavF32 = function (L, R) {
  const n = L.length, ab = new ArrayBuffer(44 + n * 8), v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 8, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, 2, true);
  v.setUint32(24, MUS.SR, true); v.setUint32(28, MUS.SR * 8, true); v.setUint16(32, 8, true); v.setUint16(34, 32, true); w(36, 'data'); v.setUint32(40, n * 8, true);
  for (let i = 0; i < n; i++) { v.setFloat32(44 + i * 8, L[i], true); v.setFloat32(48 + i * 8, R[i], true); }
  const bytes = new Uint8Array(ab); let s = ''; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
};
/* live playback: render the chapter around time t on demand, cached */
MUS.cache = new Map();
MUS.chunkFor = function (gt) {
  const s = M.sceneAt(gt); const chn = s.kind === 'seg' || s.kind === 'card' ? s.ch : (s.id === 'intro' ? 0 : 99);
  const list = M.timeline.filter(q => (q.kind === 'seg' || q.kind === 'card') ? q.ch === chn : q.id === s.id);
  return { key: chn, t0: list[0].start, t1: list[list.length - 1].end };
};
