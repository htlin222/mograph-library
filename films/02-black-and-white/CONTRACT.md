# 黑白動態全書 — scene contract

A 25-minute vertical film (1080×1920, 30 fps, 120 BPM: beat 0.5 s, bar 2 s) that demonstrates 72 motion-design
techniques, **20 seconds each**, in **black and white only**. Every pixel and every sound is computed by code.
Each segment shows the effect in a 1080×1080 stage, and the engine prints underneath: title, the **prompt** that
would produce it, three **做法 (how)** lines and one **練習 (exercise)** line — all written by you, in Traditional Chinese.

Read first: `src/engine.js` (all helpers), `src/scenes/e01.js` (reference segment), then this file.

## File shape — `src/scenes/eNN.js` (one file per segment)
The build wraps each file in its own IIFE (top-level consts are private). Globals: `M, G, W, H, SW, SH, SY, FPS, BPM,
BEAT, BAR, TAU, K, P, g, fg, bg, F, E, clamp, lerp, inv, remap, smooth, fract, ease, bezierEase, spring, rng,
makeNoise, noise, font, text, wrapText, glyphAt, traceGlyph, glyphContours, makeCanvas, mask, grain, vignette, Matter`.

```js
M.def({
  id: 'e17', num: 17, ch: 3, title: '路徑描繪', en: 'DRAW-ON / TRIM PATHS', dur: 20, ground: 'light',
  prompt: '……',            // the prompt a person would give Opus to get THIS segment. ≤ 100 CJK chars (4 lines max)
  how: ['……', '……', '……'],  // exactly 3 lines, each ≤ 30 full-width chars: the concrete technique (algorithm, parameters)
  practice: '……',          // one exercise, ≤ 28 chars
  cues: [{ t: 4.0, type: 'pop' }],   // optional sound cues (scene seconds): bell(i|midi,v,pan,dec) pop tick thud whoosh(dur) glitch impact riser(t1) clap kick
  init() {},               // once (compile shaders, build masks, precompute)
  frame(ctx, t, s) {},     // t = 0..20 s. Draw in STAGE-LOCAL coordinates: (0,0)–(1080,1080). The engine clips & translates.
});
```
- The engine already painted the whole frame with the ground colour; you paint the stage (repaint its background yourself
  if you use `ground` other than flat). `ground: 'dark'` → ink is white; `'light'` → ink is black. Use `fg(a)` / `bg(a)`
  for ink / ground with alpha, `g(v,a)` for a grey of value v (0 black … 1 white), constants `K` (black) and `P` (white).
  `text()` defaults to the current ink colour.
- **Black and white only.** No hue anywhere (the engine converts every finished frame to grayscale anyway, so design in
  tone: solid black/white, greys, line weight, dithering, halftone, density, texture, motion). Avoid muddy mid-grey
  fields: the best B&W motion is high-contrast with deliberate greys.
- Deterministic: frame(t) is a pure function of t. Randomness only via `rng(seed)` / `noise`. Simulations use
  `M.sim(this_scene, t, stepFn, hz)` (fixed step, auto-reset on rewind; keep a reference: `const S = M.def({...})`).
- Inside the stage you may print small teaching readouts (parameter values, labels, curves) in `F.mono` ≥ 18 px — they
  make a segment instructive. Keep a 40 px margin from stage edges for text.

## 20 seconds = a mini lesson with an arc
0–2 s establish the effect fast (motion in the first 0.3 s) · 2–14 s show 2–4 variations / parameter changes that teach
what the knob does (label them on stage) · 14–20 s a payoff (the best-looking moment). The panel text types in during the
first ~6 s, so the stage should be readable on its own. Changes should land on beats/bars (every 0.5 s / 2 s).
Quality bar: a premium motion-design reel, clean typography, generous spacing, no clutter, no cheap glow.

## Text rules (Traditional Chinese, plain and specific)
- `prompt`: written as the real instruction to an AI, using concrete parameters (seconds, counts, curve names, px).
  Say what moves, how, timing, feel, composition, style (黑白). Example: 「三顆球從同一高度落下：橡膠球、保齡球、氣球。不准改造型，只准改時距與間距……」
- `how`: three short lines naming the real technique (e.g. 「SDF 平滑聯集 smin，k 從 0.1 到 0.6」). Must be TRUE of your code.
- `practice`: a small exercise the viewer can try.
- The engine warns in the console if text overflows; fix any warning.

## WebGL
`G.size(scale)` sizes the shared GL canvas to scale × 1080×1080 (use 0.5–0.75 for ray marching), `G.prog(frag)`
(GLSL ES 3.00; precision/COMMON/#version prepended; declare `out vec4 o;` and `in vec2 vUv;` yourself), `G.draw(prog,
uniforms, target)`, `G.target(w,h,{float:true})`, `G.texFrom(canvas)`, then `G.blit(ctx)` draws it onto the stage.
COMMON has hash11/21/22, vnoise, fbm3, rot, smin, sdBox, sdTorus, luma, aces, toSRGB. For gl.POINTS use `G.gl` directly.

## Performance (CPU renderer — SwiftShader on 2 cores — 43,000 frames to render)
**Budget: ≤ 0.6 s per frame on average across your segments, never above 1.0 s** (the stills tool prints ms per frame;
the first still includes init). Canvas2D: avoid per-pixel JS loops over the full stage every frame (use ≤ 270×270
offscreen buffers scaled up, or WebGL). Cache static things in init(). Avoid huge path counts with shadows/filters.

## Build & check (use YOUR OWN output file)
```
cd films/02-black-and-white
flock build/.lock env OUT=dist/agentN.html ONLY=e17,e18 node tools/build.mjs
HTML=dist/agentN.html node tools/render.mjs stills e17 0.5,4,9,14,19.5      # → build/stills/e17_sheet.jpg (+ timings, console warnings)
```
Then Read the sheet and at least one full-size PNG (build/stills/e17_19.50.png) and judge them hard: is the effect
unmistakable, beautiful, readable at phone size, purely black-and-white, not clipped, no text overlapping? Iterate.
Do not edit engine.js / music.js / curriculum.js / page.html / tools / other people's scenes. If you need a helper, put it
in your scene file. If you believe an engine change is needed, say so in your final message.

## The 72 (chapter · id · title · concept). Concepts are a starting point — improve them.
**一 時間與緩動 (ch 1)**
- e01 時距與間距 TIMING & SPACING — (done: reference)
- e02 緩動曲線 EASING CURVES — six dots race the same distance with linear / sine / cubic / quint / expo / back; each lane plots its curve live; then the same curves drive scale, rotation.
- e03 彈簧 SPRING — a 3×3 grid of squares springing to target; stiffness rows × damping columns labelled; step-response curves; damping ratio ζ readout.
- e04 擠壓與伸展 SQUASH & STRETCH — bouncing ball with onion skins, volume preserved, contrasted with a rigid ball.
- e05 預備、跟隨與重疊 ANTICIPATION & FOLLOW-THROUGH — a character-like block crouches, jumps, lands; antenna / tail lag (overlap) with a chain of springs.
- e06 交錯 STAGGER — 12×12 bars; stagger orders: left→right, centre-out, diagonal, random, by distance; delay formula shown.
- e07 對拍 BEAT SYNC — shapes hit on every beat / bar of 120 BPM; a beat counter and a waveform-like metronome; downbeat accents.
- e08 無縫循環 SEAMLESS LOOP — a perfect loop (bees-and-bombs style rotating squares / waves); a ring shows loop phase; reveal t mod period.

**二 程序與模擬 (ch 2)**
- e09 振盪與諧振圖 OSCILLATION & HARMONOGRAPH — sine oscillators → Lissajous → damped harmonograph drawn as a pen.
- e10 雜訊 PERLIN NOISE — 1D noise line → 2D field → fBm octaves added one by one; labels per octave.
- e11 流場 FLOW FIELD — thousands of particles leave hairline traces along a noise field; the field rotates over time.
- e12 群集 BOIDS — flock of ~300 arrows: separation, alignment, cohesion toggled in turn (labelled).
- e13 剛體物理 RIGID BODIES — matter.js at 240 Hz: boxes, circles and letters fall, stack, a ball smashes, gravity flips.
- e14 布料 CLOTH (VERLET) — a hanging grid cloth in wind, pinned corners released one by one; Verlet integration.
- e15 反應擴散 REACTION–DIFFUSION — Gray–Scott on GPU, black/white; feed/kill parameters morph between spots, stripes, coral.
- e16 細胞自動機 CELLULAR AUTOMATA — Rule 30 cascading down, then Game of Life glider gun.

**三 形狀與圖形 (ch 3)**
- e17 路徑描繪 DRAW-ON / TRIM PATHS — line-art (geometric emblem / a glyph outline) draws on with trim start/end, dash offset flow.
- e18 形狀變形 SHAPE MORPH — circle → square → triangle → star via polar r(θ) interpolation + spring.
- e19 遮罩揭示 MASK REVEALS — circle iris, wipe, venetian stripes, text-shaped mask revealing a pattern.
- e20 融合球 METABALLS — 2D gooey blobs merging/splitting (marching squares or threshold field), black on white.
- e21 重複器 REPEATERS & ARRAYS — radial / grid arrays with per-copy offsets (rotation, scale, delay) building op-art.
- e22 布林運算 BOOLEANS — union / subtract / intersect / XOR of moving shapes (even-odd fill), labelled.
- e23 碎裂 SHATTER — a square breaks into Voronoi shards that fly and reassemble.
- e24 等角 ISOMETRIC — isometric cube field with a wave; cubes extrude in rhythm.

**四 動態字體 (ch 4)**
- e25 動態字體 KINETIC TYPOGRAPHY — a short phrase (中英) choreographed word by word to the beat, scale contrasts.
- e26 可變字體 VARIABLE FONT AXES — Archivo outlines (glyphAt) breathing on wdth 62–125 and wght 100–900; axis sliders.
- e27 打字機與解碼 TYPEWRITER & SCRAMBLE — terminal typewriter with cursor, then scramble-decode of a headline.
- e28 拆字交錯 SPLIT-TEXT STAGGER — letters flip / rise / rotate in with staggered delays; several presets.
- e29 文字遮罩 TEXT AS MASK — giant letters as windows onto moving patterns (stripes, noise, rings); knockout.
- e30 文字路徑 TYPE ON PATH — text running around a circle, along a sine, and as a rotating 3D cylinder.
- e31 數字滾動 COUNTERS & ODOMETERS — odometer digits rolling, count-up with ease-out, tabular figures.
- e32 文字粒子化 TEXT DISINTEGRATION — a word sampled into particles that dissolve and re-form.

**五 3D 與光 (ch 5)**
- e33 SDF 與平滑聯集 SDF SMOOTH UNION — ray-marched primitives morphing and merging with smin; k labelled.
- e34 柔和陰影與環境光遮蔽 SOFT SHADOWS & AO — white matte objects on white floor, sun moves; penumbra k and AO shown.
- e35 無限晶格 DOMAIN REPETITION — camera flies through an infinite repeated lattice, fog to black.
- e36 線框地形 WIREFRAME TERRAIN — noise terrain as wire grid scrolling toward camera (projected in Canvas).
- e37 點雲 POINT CLOUD — torus knot / sphere made of points, rotating, depth-sized dots.
- e38 體積光 GOD RAYS — light shafts through a rotating slotted object, volumetric fog.
- e39 折射玻璃 GLASS REFRACTION — a glass sphere/blob refracting a stripe/checker background (B&W).
- e40 卡通著色與描邊 TOON SHADING & OUTLINE — 2–3 tone bands + ink outline on rotating object, hatching option.

**六 生成演算法 (ch 6)**
- e41 沃羅諾伊 VORONOI — moving seeds, cells, Lloyd relaxation steps.
- e42 德勞內三角化 DELAUNAY — points to triangle mesh, low-poly shading in greys.
- e43 圓填充 CIRCLE PACKING — circles grow until touching, filling a shape (a glyph or circle).
- e44 特魯謝磚 TRUCHET TILES — quarter-arc tiles randomly rotating into flowing mazes; tiles flip on beats.
- e45 L 系統 L-SYSTEM — a plant/tree grows by rewriting rules; generation counter.
- e46 差分增長 DIFFERENTIAL GROWTH — a closed curve grows into a coral-like crumple.
- e47 奇異吸引子 STRANGE ATTRACTOR — Lorenz / Clifford attractor accumulating density.
- e48 碎形縮放 FRACTAL ZOOM — Mandelbrot infinite zoom in B&W bands (shader).

**七 後製與風格化 (ch 7)** (render one base scene, then post-process)
- e49 遞色 DITHERING — Bayer 2/4/8 vs Floyd–Steinberg-like error diffusion on a moving gradient/3D form.
- e50 半色調 HALFTONE — dot screen angle/frequency changes, lines screen, AM vs FM.
- e51 ASCII — the same moving form rendered as characters sorted by density; ramp shown.
- e52 像素排序 PIXEL SORTING — bright spans sorted downward/sideways; threshold slider.
- e53 故障 GLITCH — slice displacement, block corruption, scanline tear on the beat.
- e54 底片與 CRT FILM & CRT — grain, gate weave, flicker, scanlines, vignette, curvature.
- e55 回饋殘影 FEEDBACK ECHO — each frame re-draws the last one scaled/rotated: tunnels, trails.
- e56 狹縫掃描 SLIT-SCAN — time displacement: rows show different moments of a moving form.

**八 構成、鏡頭、轉場 (ch 8)**
- e57 構圖法則 COMPOSITION — thirds, centre, golden ratio, negative space shown with a moving subject; grid overlays.
- e58 視差與 2.5D PARALLAX — layered landscape planes moving at different speeds; camera pan/dolly.
- e59 推軌變焦 DOLLY ZOOM — subject stays same size while background perspective stretches (projected grid/columns).
- e60 無限縮放 INFINITE ZOOM — Droste-like nested frames zooming forever.
- e61 穿越轉場 ZOOM-THROUGH TRANSITION — camera dives through a letter/hole into the next scene, repeatedly.
- e62 擦除與遮罩轉場 WIPES & MASK TRANSITIONS — wipe, iris, clock, blinds, shape-mask between B&W scenes.
- e63 匹配剪接 MATCH CUT — circle → wheel → eye → moon etc. matching shape across cuts.
- e64 分割畫面 SPLIT SCREEN — grid splits and recombines, panels slide on beats.

**九 介面、資料、聲音 (ch 9)**
- e65 微互動 MICRO-INTERACTIONS — toggle, like-heart burst, checkbox draw, button press with springs.
- e66 共享元素轉換 SHARED-ELEMENT TRANSITION — list card expands to detail view and back (container transform).
- e67 載入與骨架屏 LOADERS & SKELETONS — skeleton shimmer, spinners, progress, dot loaders.
- e68 資料動畫 DATA ANIMATION — bar chart race / line chart draw / pie morph, all B&W with patterns.
- e69 音訊視覺化 AUDIO VISUALIZER — spectrum bars, circular visualizer, waveform driven by a beat-synced synthetic signal.
- e70 捲動敘事 SCROLL-DRIVEN STORY — a phone-like frame scrolling; sticky section, progress-linked animation.
- e71 動態設計系統 MOTION TOKENS — duration tokens (150/300/600 ms) and easing tokens demoed side by side on UI pieces.
- e72 frame = f(t) — finale: t scrubs; the same function produces a mosaic of earlier ideas; ends on "frame = f(t)".
