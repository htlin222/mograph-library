/* Trailer score — 150 BPM, F minor, synthesized in an OfflineAudioContext. Structure follows PLAN.sections.
   Palette: braams (detuned saw stacks through a waveshaper), 4/4 kick with side-chain, clap, 16th hats,
   distorted reese bass, supersaw pluck arp, risers, reverse swells, impacts, whooshes, glitch stutters. */
const TMUS = { SR: 48000 };
TMUS.build = function (ac) {
  const SPB = TBEAT, r = rng(150);
  const at = b => b * SPB;
  const master = ac.createGain(); master.gain.value = 0.5;
  const glue = ac.createDynamicsCompressor(); glue.threshold.value = -14; glue.knee.value = 6; glue.ratio.value = 3; glue.attack.value = 0.005; glue.release.value = 0.12;
  const shelf = ac.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 8000; shelf.gain.value = -4;   // tame the fizz
  master.connect(shelf); shelf.connect(glue); glue.connect(ac.destination);
  // reverb
  const irLen = Math.floor(ac.sampleRate * 3.5), ir = ac.createBuffer(2, irLen, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c), rr = rng(31 + c); for (let i = 0; i < irLen; i++) d[i] = (rr() * 2 - 1) * Math.pow(1 - i / irLen, 2.6) * Math.exp(-i / ac.sampleRate * 1.1); }
  const verb = ac.createConvolver(); verb.buffer = ir; const verbIn = ac.createGain(); verbIn.gain.value = 0.45;
  const vhp = ac.createBiquadFilter(); vhp.type = 'highpass'; vhp.frequency.value = 250; verbIn.connect(vhp); vhp.connect(verb); verb.connect(master);
  // buses: everything melodic goes through `duck` (side-chained by the kick)
  const duck = ac.createGain(); duck.connect(master);
  const drums = ac.createGain(); drums.gain.value = 1.0; drums.connect(master);
  const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  { const d = noiseBuf.getChannelData(0), rr = rng(9); for (let i = 0; i < d.length; i++) d[i] = rr() * 2 - 1; }
  const noise = (t, dur) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, r() * 1.5); s.stop(t + dur + 0.05); return s; };
  const pan = (node, p) => { const pn = ac.createStereoPanner(); pn.pan.value = p; node.connect(pn); return pn; };
  const shaper = amt => { const ws = ac.createWaveShaper(), n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * amt) / Math.tanh(amt); } ws.curve = c; ws.oversample = '2x'; return ws; };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const KEY = 41;                                       // F2
  const PROG = [[0, [0, 3, 7]], [-4, [0, 4, 7]], [3, [0, 4, 7]], [-2, [0, 4, 7]]];   // Fm · Db · Ab · Eb
  const chord = b => { const c = PROG[Math.floor(b / 4) % 4]; return { root: KEY + c[0], notes: c[1].map(n => KEY + c[0] + n) }; };

  const kick = (t, v = 1, hard = false) => {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.frequency.setValueAtTime(hard ? 190 : 160, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.07); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(1.0 * v, t + 0.002); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    const ws = shaper(hard ? 3 : 1.6); o.connect(gn); gn.connect(ws); ws.connect(drums); o.start(t); o.stop(t + 0.4);
    const n = noise(t, 0.02), hp = ac.createBiquadFilter(), ng = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 2500; ng.gain.setValueAtTime(0.25 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015); n.connect(hp); hp.connect(ng); ng.connect(drums);
    duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(0.25, t); duck.gain.setTargetAtTime(1, t + 0.03, 0.07);
  };
  const clap = (t, v = 1) => {
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.8;
    const gn = ac.createGain(); gn.gain.value = 0;
    [0, 0.009, 0.019].forEach(o => { gn.gain.setValueAtTime(0.5 * v, t + o); gn.gain.exponentialRampToValueAtTime(0.06, t + o + 0.008); });
    gn.gain.setValueAtTime(0.4 * v, t + 0.028); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    const n = noise(t, 0.25); n.connect(bp); bp.connect(gn); gn.connect(drums); const s = ac.createGain(); s.gain.value = 0.3; gn.connect(s); s.connect(verbIn);
    const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.05); og.gain.setValueAtTime(0.25 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.connect(og); og.connect(drums); o.start(t); o.stop(t + 0.1);
  };
  const snare = (t, v = 1) => { const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200; const gn = ac.createGain(); gn.gain.setValueAtTime(0.32 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.09); const n = noise(t, 0.1); n.connect(hp); hp.connect(gn); gn.connect(drums); };
  const hat = (t, v = 1, open = false) => {
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
    const gn = ac.createGain(), d = open ? 0.14 : 0.028; gn.gain.setValueAtTime(0.07 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d);
    const n = noise(t, d + 0.02); n.connect(hp); hp.connect(gn); pan(gn, (r() - .5) * .6).connect(drums);
  };
  const reese = (t, midi, dur, v = 1, open = 700, dist = 2.5) => {
    const f = mtof(midi), lp = ac.createBiquadFilter(), gn = ac.createGain(), ws = shaper(dist);
    lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(open * 2.2, t); lp.frequency.setTargetAtTime(open * 0.6, t, 0.05);
    [-14, -5, 5, 14].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(ws); o.start(t); o.stop(t + dur + 0.05); });
    const sub = ac.createOscillator(), sg = ac.createGain(); sub.frequency.value = f / 2; sg.gain.value = 0.7; sub.connect(sg); sg.connect(gn); sub.start(t); sub.stop(t + dur + 0.05);
    ws.connect(lp); lp.connect(gn);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.22 * v, t + 0.005); gn.gain.setValueAtTime(0.22 * v, t + dur - 0.02); gn.gain.linearRampToValueAtTime(0, t + dur + 0.03);
    gn.connect(duck);
  };
  const pluck = (t, midi, v = 1, p = 0) => {
    const f = mtof(midi), lp = ac.createBiquadFilter(), gn = ac.createGain();
    lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(6000, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.18);
    [-18, -7, 0, 7, 18].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + 0.3); });
    gn.gain.setValueAtTime(0.045 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    lp.connect(gn); const o = pan(gn, p); o.connect(duck); const s = ac.createGain(); s.gain.value = 0.35; o.connect(s); s.connect(verbIn);
  };
  const braam = (t, midis, dur, v = 1) => {
    const lp = ac.createBiquadFilter(), gn = ac.createGain(), ws = shaper(4);
    lp.type = 'lowpass'; lp.Q.value = 1.5; lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(1600, t + 0.35); lp.frequency.exponentialRampToValueAtTime(300, t + dur);
    midis.forEach(m => [-12, 0, 12].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt; o.connect(ws); o.start(t); o.stop(t + dur + 0.6); }));
    ws.connect(lp); lp.connect(gn);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.16 * v, t + 0.08); gn.gain.setTargetAtTime(0.0001, t + dur * 0.5, dur * 0.35);
    gn.connect(master); const s = ac.createGain(); s.gain.value = 0.6; gn.connect(s); s.connect(verbIn);
  };
  const pad = (t, notes, dur, v = 1) => {
    const gn = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    notes.forEach(m => [-10, 0, 10].forEach((dt, j) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m + 12); o.detune.value = dt; const pg = ac.createGain(); pg.gain.value = 0.014; o.connect(pg); pan(pg, (j - 1) * 0.7).connect(lp); o.start(t); o.stop(t + dur + 1.2); }));
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v, t + 0.4); gn.gain.setValueAtTime(v, t + dur); gn.gain.linearRampToValueAtTime(0, t + dur + 1);
    lp.connect(gn); gn.connect(duck); const s = ac.createGain(); s.gain.value = 0.6; gn.connect(s); s.connect(verbIn);
  };
  const impact = (t, v = 1) => {
    const o = ac.createOscillator(), gn = ac.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.4);
    gn.gain.setValueAtTime(0.9 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 1.8); const ws = shaper(2.5); o.connect(gn); gn.connect(ws); ws.connect(drums); o.start(t); o.stop(t + 1.9);
    const n = noise(t, 1.8), lp = ac.createBiquadFilter(), ng = ac.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(7000, t); lp.frequency.exponentialRampToValueAtTime(150, t + 1.4);
    ng.gain.setValueAtTime(0.35 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 1.7); n.connect(lp); lp.connect(ng); ng.connect(drums); const s = ac.createGain(); s.gain.value = 0.8; ng.connect(s); s.connect(verbIn);
  };
  const riser = (ta, tb, v = 1) => {
    const n = noise(ta, tb - ta), bp = ac.createBiquadFilter(), gn = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 5;
    bp.frequency.setValueAtTime(250, ta); bp.frequency.exponentialRampToValueAtTime(9000, tb);
    gn.gain.setValueAtTime(0.0001, ta); gn.gain.exponentialRampToValueAtTime(0.26 * v, tb - 0.01); gn.gain.linearRampToValueAtTime(0, tb);
    n.connect(bp); bp.connect(gn); gn.connect(master); gn.connect(verbIn);
    const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(mtof(KEY + 12), ta); o.frequency.exponentialRampToValueAtTime(mtof(KEY + 48), tb);
    og.gain.setValueAtTime(0.0001, ta); og.gain.exponentialRampToValueAtTime(0.05 * v, tb - 0.01); og.gain.linearRampToValueAtTime(0, tb);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; o.connect(lp); lp.connect(og); og.connect(master); o.start(ta); o.stop(tb + 0.01);
  };
  const reverseSwell = (ta, tb, v = 1) => { const n = noise(ta, tb - ta), hp = ac.createBiquadFilter(), gn = ac.createGain(); hp.type = 'highpass'; hp.frequency.value = 3000; gn.gain.setValueAtTime(0.0001, ta); gn.gain.exponentialRampToValueAtTime(0.3 * v, tb - 0.005); gn.gain.linearRampToValueAtTime(0, tb); n.connect(hp); hp.connect(gn); pan(gn, 0).connect(master); };
  const whoosh = (t, dur = 0.4, v = 1) => { const n = noise(t, dur), bp = ac.createBiquadFilter(), gn = ac.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(4500, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(900, t + dur); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.22 * v, t + dur * 0.5); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); n.connect(bp); bp.connect(gn); pan(gn, (r() - .5) * 1.2).connect(master); };
  const glitch = (t, v = 1) => { for (let k = 0; k < 6; k++) { const tt = t + k * 0.022, o = ac.createOscillator(), gn = ac.createGain(); o.type = 'square'; o.frequency.value = 180 + r() * 2400; gn.gain.setValueAtTime(0.06 * v, tt); gn.gain.setValueAtTime(0, tt + 0.018); o.connect(gn); pan(gn, (r() - .5) * 1.6).connect(master); o.start(tt); o.stop(tt + 0.02); } };
  const tick = (t, v = 1) => { const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'triangle'; o.frequency.value = 2200; gn.gain.setValueAtTime(0.07 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.035); o.connect(gn); pan(gn, (r() - .5)).connect(master); o.start(t); o.stop(t + 0.04); };
  const subDrop = (t, v = 1) => { const o = ac.createOscillator(), gn = ac.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.2); gn.gain.setValueAtTime(0.7 * v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 1.6); o.connect(gn); gn.connect(master); o.start(t); o.stop(t + 1.7); };

  /* section dynamics on the master: quiet intro, rising build, full drops, a real dip for the break, and two
     hard gaps (beat 31 and 111) where only the voice is left */
  const mg = master.gain; mg.setValueAtTime(0.5, 0);
  mg.setValueAtTime(0.5, at(16)); mg.linearRampToValueAtTime(0.72, at(30.9));
  mg.setValueAtTime(0.72, at(30.95)); mg.linearRampToValueAtTime(0.02, at(31.02)); mg.setValueAtTime(0.02, at(31.98)); mg.linearRampToValueAtTime(0.8, at(32));
  mg.setValueAtTime(0.8, at(63.95)); mg.linearRampToValueAtTime(0.42, at(64.05)); mg.setValueAtTime(0.42, at(71.9)); mg.linearRampToValueAtTime(0.8, at(72));
  mg.setValueAtTime(0.8, at(104)); mg.setValueAtTime(0.6, at(104.02)); mg.linearRampToValueAtTime(0.85, at(110.95)); mg.linearRampToValueAtTime(0.02, at(111.02));
  mg.setValueAtTime(0.02, at(111.98)); mg.linearRampToValueAtTime(0.85, at(112));
  const sec = b => PLAN.sections.find(s => b >= s.b && b < s.b + s.n)?.name;
  const ARP = [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 3, 2, 1, 2, 1];
  for (let q = 0; q < PLAN.beats * 4; q++) {                // 16th-note grid
    const b = q / 4, t = at(b), s = sec(b), bi = Math.floor(b), sub = q % 4, ch = chord(b), inBar = bi % 4;
    if (s === 'intro') {
      if (q === 0) { braam(t, [KEY, KEY + 7], 3.0, 1); subDrop(t, 0.6); }
      if (q === 8 * 4) braam(t, [KEY - 4, KEY + 3], 3.0, 1);
      if (sub === 0 && bi >= 4 && bi < 14) tick(t, bi % 2 ? 0.5 : 0.8);
      if (q === 12 * 4) reverseSwell(t, at(14), 1);
      if (q === 14 * 4) { impact(t, 1); braam(t, [KEY, KEY + 3, KEY + 7], 1.6, 1.2); }
    }
    if (s === 'build') {
      if (sub === 0 && (bi < 24 ? inBar % 2 === 0 : bi < 31)) kick(t, 0.9);
      if (bi < 31 && sub % 2 === 0) hat(t, sub === 2 ? 1 : 0.5);
      if (sub === 0 && bi < 31) reese(t, ch.root, SPB * 0.9, 0.7, 300 + (b - 16) * 60, 1.5);
      if (bi >= 20 && bi < 31 && sub % 2 === 0) pluck(t, ch.notes[ARP[(q / 2) % 16 | 0] % 3] + 24, 0.7, ((q / 2) % 3 - 1) * 0.4);
      if (bi >= 28 && bi < 31) snare(t, 0.4 + (b - 28) * 0.2);                        // snare roll
      if (bi >= 30 && bi < 31 && sub % 2 === 1) snare(t, 0.9);
      if (q === 16 * 4) impact(t, 0.8);
      if (q === 24 * 4) riser(t, at(31), 1);
    }
    if (s === 'drop1' || s === 'drop2') {
      const two = s === 'drop2';
      if (sub === 0) kick(t, inBar === 0 ? 1 : 0.92, inBar === 0);
      if (sub === 0 && (inBar === 1 || inBar === 3)) clap(t);
      hat(t, sub === 2 ? 1 : 0.45, sub === 2 && inBar === 3);
      if (two && sub % 2 === 1) hat(t + SPB / 8, 0.3);                              // 32nd shimmer in drop 2
      if (sub === 2 || (sub === 3 && inBar === 3)) reese(t, ch.root + (sub === 3 ? 12 : 0), SPB * 0.22, 1, two ? 1100 : 800, two ? 4 : 3);
      if (sub === 0 && inBar === 0) reese(t, ch.root - 12, SPB * 0.45, 0.8, 300, 2);
      pluck(t, ch.notes[ARP[q % 16] % 3] + 24 + (ARP[q % 16] === 3 ? 12 : 0), sub === 0 ? 1 : 0.65, ((q % 3) - 1) * 0.5);
      if (sub === 0 && inBar === 0 && bi % 8 === 0) pad(t, ch.notes, TBAR * 2 - 0.1, 0.5);
      if (q % (two ? 2 : 4) === 0 && PLAN.shots.some(sh => Math.abs(sh.b - b) < 1e-6 && sh.n >= 2)) whoosh(t - 0.18, 0.3, 0.7);
      if ([32, 48, 72, 84, 96].includes(b)) { impact(t, 0.9); subDrop(t, 0.5); }
      if ((b === 61 || b === 101) ) riser(t, at(b + 3), 0.8);
      if (bi === 63 && sub >= 2) snare(t, 0.8);
      if (bi >= 102 && bi < 104) snare(t, 0.5 + (b - 102) * 0.25);
    }
    if (s === 'break') {
      if (q === 64 * 4) { braam(t, [KEY, KEY + 7], 3.2, 1.1); subDrop(t, 0.6); pad(t, chord(64).notes, TBAR * 2, 0.6); }
      if (q === 68 * 4) { braam(t, [KEY + 3, KEY + 10], 3.2, 1); }
      if ([70.5, 71, 71.5].includes(b)) glitch(t, 1.2);
      if (sub === 0 && bi >= 66) tick(t, 0.6);
      if (q === 70 * 4) reverseSwell(t, at(72), 1.2);
    }
    if (s === 'rise') {
      if (sub === 0) kick(t, 0.85);
      const rate = b < 108 ? 2 : 1; if (q % rate === 0) snare(t, 0.3 + (b - 104) * 0.09);
      if (q === 104 * 4) riser(t, at(111), 1.3);
      if (sub === 0) reese(t, ch.root + Math.floor((b - 104)), SPB * 0.8, 0.6, 400 + (b - 104) * 200, 2);
      if (q % 2 === 0 && b < 111) pluck(t, ch.notes[(q / 2) % 3] + 24 + Math.floor(b - 104), 0.6, 0);
    }
    if (s === 'outro') {
      if (q === 112 * 4) { impact(t, 1.2); braam(t, [KEY, KEY + 7, KEY + 12], 4.5, 1.3); subDrop(t, 0.9); pad(t, chord(112).notes, TBAR * 2, 0.6); }
      if (q === 120 * 4) { impact(t, 0.7); braam(t, [KEY - 4, KEY + 3], 4.0, 0.9); pad(t, [KEY - 4, KEY, KEY + 3], TBAR * 2, 0.5); }
      if (sub === 0 && b >= 113 && b < 127 && inBar === 0) pluck(t, KEY + 36, 0.5, 0);
    }
  }
};
TMUS.render = async function () {
  const len = Math.ceil((PLAN.beats * TBEAT + 1) * TMUS.SR), ac = new OfflineAudioContext(2, len, TMUS.SR);
  TMUS.build(ac); const buf = await ac.startRendering();
  return MUS.wavF32(buf.getChannelData(0), buf.getChannelData(1));
};
