# Motion, in Code — scene contract

A 84-second vertical film (1080×1920, 30 fps, 120 BPM: beat 0.5 s, bar 2 s), every pixel and every
sound computed from code. Each chapter is one file `src/scenes/sNN.js`. Read `src/engine.js` (helpers),
`src/scenes/s01.js` (reference implementation, Canvas2D) and `src/scenes/intro.js` before starting.

## File shape
Each file is wrapped by the build in its own IIFE, so top-level `const`s are private. Globals available:
`M, G, W, H, FPS, BPM, BEAT, BAR, TAU, P (palette), F (fonts), E (easings), clamp, lerp, inv, remap, smooth,
fract, ease, bezierEase, spring, rng, makeNoise, noise, hex, rgba, mixc, font, text, glyphAt, traceGlyph,
makeCanvas, grain, vignette, Matter` (matter.js is inlined).

```js
M.def({
  id: 's07', num: '07', title: '液態玻璃', en: 'LIQUID GLASS', dur: 6,   // s12 is dur: 8, all others 6
  hud: 'light',            // 'light' = HUD text drawn in bone white (dark scene). 'dark' for light backgrounds.
  tags: ['SDF smooth-min metaballs', 'refraction · 7-wavelength dispersion', '...'],  // 3 short mono lines, honest tech
  cues: [{ t: 2.0, type: 'impact' }],   // optional, scene-relative seconds; types: bell(i|midi,v,pan,dec), impact, riser(t1), tick, thud, reverse(t1), kick, clap
  init() {},               // once (compile shaders, allocate targets)
  frame(ctx, t, s) {}      // t = scene-local seconds 0..dur; s = {dur, p, gt, beat, bar, frame}
});
```
`frame` must paint the WHOLE 1080×1920 canvas every call (no reliance on the previous frame), and must be
a deterministic function of `t`. Simulations (reaction–diffusion, physics) use `M.sim(sceneObj, t, stepFn, hz)`
(fixed step, auto-reset on rewind — see engine). Use `this` inside frame/init for the scene object, or keep
a reference: `const S = M.def(...)` does NOT return it — instead use `M.scenes[M.scenes.length-1]` right after def, or `this`.

## Layout safe zones (9:16)
- HUD (engine draws it, don't): number + Chinese title + English label at y 160–380 on the left; three mono
  tech tags at y ≈ 1660–1760; a 12-segment progress bar at y ≈ 1828. Keep important content in y 420–1600.
  Full-bleed backgrounds and effects can and should run edge-to-edge behind the HUD.
- Make the HUD readable: if your scene is bright behind the HUD, darken those bands subtly (gradient).

## WebGL
`G.size(scale)` sizes the shared WebGL2 canvas (scale × 1080×1920; use 0.5–0.75 for heavy ray marching and
let `G.blit(ctx)` upscale, 1.0 for light shaders). `G.prog(fragSrc)` compiles a full-screen fragment shader
(GLSL ES 3.00; `precision`, `G.COMMON` helpers and `#version` are prepended automatically; write `out vec4 o;`
and `void main()` yourself; `uRes` is set automatically; `vUv` 0..1 varying is available as `in vec2 vUv;`).
`G.draw(prog, uniforms, target)`; `G.target(w,h,{float:true})` render targets; `G.texFrom(canvas)` uploads a
2D canvas (e.g. text masks). For custom vertex shaders (particles) use `G.gl` directly. COMMON includes
hash, vnoise, rot, smin, sdBox, sdTorus, aces, toSRGB, cieXYZ(λ nm), xyz2rgb.

Rendering is done in headless Chromium on SwiftShader (CPU). Budget: ≤ ~2.5 s per frame at the final
render resolution for the heaviest scenes; aim lower. Measure with stills (timing is printed).
In live playback (real GPU) `M.glScale` shrinks adaptively, so always size via `G.size()`.

## Look
Premium motion-reel quality. Each chapter has its own palette, but they must feel like one film: deep,
considered backgrounds, restrained accent colour, film grain (`grain(ctx, .04, s.frame)`) at the end.
Every chapter opens with motion in the first 0.3 s (cuts land on the downbeat) and should have a clear arc
(build → peak → resolve/exit) across its 6 s. Avoid flat pure #000 / #fff; avoid cheap glow.
No logos, no copyrighted characters, no external assets; text only via the embedded fonts (Archivo variable
latin, JBMono, NotoTC / NotoTCBlack for Chinese — Chinese characters you use are subset automatically).

## Build & check (use your own output file so we don't clobber each other)
```
cd films/01-motion-in-code
flock build/.lock env OUT=dist/agentX.html node tools/build.mjs
HTML=dist/agentX.html node tools/render.mjs stills s07 0.2,1.5,3,4.5,5.8      # → build/stills/s07_sheet.jpg
```
Then Read the sheet image and look at it critically. Iterate until it is genuinely beautiful. Also check a
full-size still (build/stills/s07_3.00.png) for detail and aliasing. Check console errors printed by the tool.
Do not edit engine.js / music.js / page.html / tools — if you need a helper, put it in your scene file.
If you believe an engine change is needed, say so in your final message.
