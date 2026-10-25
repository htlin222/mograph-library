/* Trailer edit decision list — 16:9, 1920×1080, 30 fps, 150 BPM (beat 0.4 s, bar 1.6 s).
   Every time below is in BEATS from the start. Shared by the picture (trailer.js), the music (music.js)
   and the voice-over mix (vo.py reads the exported plan.json).
   shot: { b: start beat, n: length in beats, lay: layout, ids: [segment ids], t0: [scene-local start s], fx }
   layouts: one · two · three · grid4 · grid9 · black · title · ftext · mosaic · end
   A scene may appear in several shots, but never twice at the same moment (simulations keep state). */
const TBPM = 150, TBEAT = 60 / TBPM, TBAR = TBEAT * 4;
const PLAN = {
  bpm: TBPM, beats: 132,                          // 128 beats of music + 4-beat tail
  sections: [                                     // for the music
    { name: 'intro', b: 0, n: 16 }, { name: 'build', b: 16, n: 16 }, { name: 'drop1', b: 32, n: 32 },
    { name: 'break', b: 64, n: 8 }, { name: 'drop2', b: 72, n: 32 }, { name: 'rise', b: 104, n: 8 },
    { name: 'outro', b: 112, n: 20 },
  ],
  vo: [                                           // voice-over lines (vocoded), beat = where the line starts
    { b: 2.5, text: 'Every frame', id: 'every' },
    { b: 10.5, text: 'is a function of time', id: 'function' },
    { b: 16.25, text: 'Seventy two techniques', id: 'seventytwo' },
    { b: 22.25, text: 'Two colors', id: 'twocolors' },
    { b: 26.25, text: 'Zero G U I', id: 'nogui' },
    { b: 31, text: 'Motion', id: 'motion', chop: true },
    { b: 64.25, text: 'Black', id: 'black' },
    { b: 68.25, text: 'and white', id: 'white' },
    { b: 113, text: 'Motion. In code.', id: 'outro' },
    { b: 121, text: 'Frame equals f of t', id: 'fft' },
  ],
  chops: [                                        // pitched vocal stabs (from the "motion" line), beat positions
    ...[33.5, 37.5, 41.5, 45.5, 49.5, 53.5, 57.5, 61.5].map(b => ({ b, word: 'motion', pitch: 7 })),
    ...[74.5, 78.5, 82.5, 86.5, 90.5, 94.5, 98.5].map(b => ({ b, word: 'seventytwo', pitch: 12 })),
    { b: 101, word: 'seventytwo', pitch: 0, stutter: 4 },
  ],
  shots: [],
};
(function () {
  const S = (b, n, lay, ids = [], t0 = [], fx = {}) => PLAN.shots.push({ b, n, lay, ids, t0, fx });
  const halfs = (b, ids, t0 = 14) => ids.forEach((id, i) => S(b + i * 0.5, 0.5, 'one', [id], [t0], { quick: true }));
  /* intro — slow, one image per bar, iris in */
  S(0, 2.5, 'black', [], [], { text: 'BLACK & WHITE · 72' });
  S(2.5, 3.5, 'one', ['e47'], [5], { iris: true, slow: true });
  S(6, 4, 'one', ['e15'], [9], { wipe: true, slow: true });
  S(10, 4, 'one', ['e48'], [9], { iris: true, slow: true });
  S(14, 2, 'ftext', [], [], { text: 'f(t)' });
  /* build — two beats each, then one, then halves */
  S(16, 2, 'one', ['e10'], [13]); S(18, 2, 'one', ['e11'], [15]);
  S(20, 2, 'one', ['e35'], [13]); S(22, 2, 'one', ['e36'], [13]);
  S(24, 1, 'one', ['e20'], [11]); S(25, 1, 'one', ['e44'], [14]);
  S(26, 1, 'one', ['e21'], [14]); S(27, 1, 'one', ['e19'], [12]);
  halfs(28, ['e53', 'e49', 'e50', 'e54', 'e55', 'e62'], 13);
  S(31, 1, 'black', [], [], { text: 'MOTION', stutter: true });
  /* drop 1 — a cut on every beat, a split on every downbeat */
  S(32, 2, 'three', ['e25', 'e26', 'e29'], [14, 14, 14], { flash: true });
  S(34, 1, 'one', ['e18'], [13]); S(35, 1, 'one', ['e22'], [14]);
  S(36, 2, 'two', ['e33', 'e39'], [14, 9]);
  S(38, 1, 'one', ['e40'], [14]); S(39, 1, 'one', ['e24'], [9]);
  S(40, 2, 'three', ['e41', 'e42', 'e43'], [15, 15, 15]);
  S(42, 1, 'one', ['e46'], [15]); S(43, 1, 'one', ['e23'], [4.2]);
  S(44, 2, 'two', ['e59', 'e60'], [13, 13]);
  S(46, 1, 'one', ['e61'], [6]); S(47, 1, 'one', ['e56'], [12]);
  S(48, 2, 'one', ['e13'], [9.35], { big: 'IMPACT' });
  S(50, 1, 'one', ['e14'], [10.5]); S(51, 1, 'one', ['e12'], [14.5]);
  S(52, 2, 'three', ['e09', 'e17', 'e30'], [15, 9, 16]);
  S(54, 1, 'one', ['e31'], [6]); S(55, 1, 'one', ['e52'], [12]);
  S(56, 2, 'two', ['e38', 'e34'], [14, 9]);
  S(58, 1, 'one', ['e05'], [0.9]); S(59, 1, 'one', ['e01'], [0.25]);
  S(60, 2, 'grid4', ['e04', 'e03', 'e07', 'e02'], [16, 6, 15, 14]);
  S(62, 1, 'one', ['e63'], [8]); S(63, 1, 'one', ['e64'], [12]);
  /* break — two slow images, the voice says black … and white */
  S(64, 4, 'one', ['e60'], [3], { slow: true, invertOn: [67.5] });
  S(68, 4, 'one', ['e58'], [5], { slow: true, glitch: [70.5, 71, 71.5] });
  /* drop 2 — half-beat cuts and grids */
  halfs(72, ['e48', 'e47', 'e15', 'e10', 'e44', 'e19', 'e21', 'e20'], 14);
  S(76, 2, 'grid4', ['e33', 'e35', 'e36', 'e38'], [12, 12, 12, 12], { flash: true });
  S(78, 2, 'grid4', ['e49', 'e50', 'e51', 'e52'], [12, 12, 12, 12]);
  halfs(80, ['e53', 'e54', 'e55', 'e62', 'e61', 'e59', 'e57', 'e58'], 12);
  S(84, 2, 'grid9', ['e65', 'e66', 'e67', 'e68', 'e69', 'e70', 'e71', 'e64', 'e63'], Array(9).fill(12), { flash: true });
  S(86, 2, 'grid9', ['e01', 'e02', 'e03', 'e04', 'e05', 'e06', 'e07', 'e08', 'e09'], [1, 14, 6, 15, 1.4, 12, 15, 10, 15]);
  halfs(88, ['e11', 'e12', 'e13', 'e14', 'e22', 'e23', 'e24', 'e26'], 13);
  S(92, 2, 'grid9', ['e25', 'e27', 'e28', 'e29', 'e30', 'e31', 'e32', 'e16', 'e17'], Array(9).fill(13));
  S(94, 2, 'grid9', ['e34', 'e37', 'e39', 'e40', 'e41', 'e42', 'e43', 'e45', 'e46'], Array(9).fill(14));
  halfs(96, ['e18', 'e20', 'e21', 'e44', 'e47', 'e48', 'e15', 'e10'], 15);
  S(100, 4, 'one', ['e72'], [5], { big: '72' });
  /* rise — every technique at once */
  S(104, 7, 'mosaic', [], [], {});
  S(111, 1, 'black', [], [], {});
  /* outro */
  S(112, 8, 'title', [], [], { flash: true });
  S(120, 8, 'end', ['e72'], [16], {});
  S(128, 4, 'black', [], [], {});
})();

