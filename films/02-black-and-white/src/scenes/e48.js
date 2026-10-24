/* 48 碎形縮放 — Mandelbrot zoom ×250,000 to a period-39 minibrot, with perturbation theory:
   the reference orbit is iterated on the CPU in double precision, the GPU iterates only the small offset δ in float. */
const NUC = [-0.7436423016578859, 0.13182651981259472];      // period-39 nucleus in Seahorse Valley (found by Newton)
const SZ = [1.8429064856913806e-06, 1.1377722690678135e-06];  // complex size estimate of that minibrot
const W0 = 3.4, W1 = Math.hypot(...SZ) * 4.2, REFN = 2048;
const STYLES = [
  [0, '① 逃逸時間：n mod 2 黑白交替'],
  [5, '② 平滑迭代 ν：log ν 等高線'],
  [10, '③ 二元分解：Im(z) 正負翻轉'],
  [15, '④ 距離估計：邊界畫成墨線'],
];
let prog = null, refTex = null;
const FS = `
uniform sampler2D uRef; uniform int uRefN, uMax; uniform float uW, uPix; uniform vec2 uRot, uOff, uC; uniform vec4 uMix;
in vec2 vUv; out vec4 o;
vec2 cm(vec2 a, vec2 b){ return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
float stripe(float x){ float w = fwidth(x); return smoothstep(.5 - w, .5 + w, fract(x)); }
float line(float x){ float w = fwidth(x) * 1.6; return smoothstep(.5 - w, .5, abs(fract(x) - .5)); }
void main(){
  vec2 uv = vUv - .5;
  vec2 dc = uOff + cm(uRot, uv * uW);
  vec2 d = vec2(0.), z = vec2(0.), der = vec2(0.), zs = vec2(9.);
  int m = 0, i = 0; bool esc = false, inside = false;
  // shallow views: main cardioid / period-2 bulb are interior, skip them
  vec2 c = uC + dc; float q = dot(c - vec2(.25, 0.), c - vec2(.25, 0.));
  if (q * (q + (c.x - .25)) < .25 * c.y * c.y || dot(c + vec2(1., 0.), c + vec2(1., 0.)) < .0625) inside = true;
  vec2 Z = vec2(0.);
  for (i = 0; i < 6000; i++) {
    if (i >= uMax || inside) break;
    der = 2. * cm(Z + d, der) + vec2(1., 0.);                    // dz/dc on the full orbit
    d = cm(2. * Z + d, d) + dc; m++;
    Z = texelFetch(uRef, ivec2(m, 0), 0).xy;
    z = Z + d;
    float r2 = dot(z, z);
    if (r2 > 1e6) { esc = true; break; }
    if (r2 < dot(d, d) || m >= uRefN - 1) { d = z; m = 0; Z = vec2(0.); }   // rebase: avoids glitches with one reference
    if (i % 39 == 38) { if (dot(z - zs, z - zs) < 1e-12) inside = true; zs = z; }  // attracting 39-cycle = minibrot interior
  }
  if (!esc) { o = vec4(vec3(uMix.w), 1.); return; }                // interior: black, white in the ink style
  float lz = length(z);
  float nu = float(i) + 1. - log2(log(lz));
  float de = lz * log(lz) / max(length(der), 1e-30);              // exterior distance estimate
  float ink = smoothstep(.15, 1.4, de / uPix);                     // 0 at the filaments, 1 in open space
  float busy = clamp(fwidth(nu) * 1.4 - .5, 0., 1.);              // where bands would alias, draw ink instead of grey
  float A = mix(stripe(nu * .5), ink, busy);
  float B = mix(line(log(nu) * 14.), ink, busy) * ink;
  float bin = z.y > 0. ? 1. : 0.;
  float C = mix(abs(stripe(nu * .5) - bin), ink, busy);
  float D = ink * (1. - .45 * line(log(nu) * 10.) * (1. - busy));
  float v = dot(uMix, vec4(A, B, C, D));
  o = vec4(vec3(v), 1.);
}`;

const S = M.def({
  id: 'e48', num: 48, ch: 6, title: '碎形縮放', en: 'MANDELBROT ZOOM', dur: 20, ground: 'dark',
  prompt: '曼德博集合從全景放大 40 萬倍鑽進海馬谷，停在一顆週期 39 的小曼德博上。每 5 秒換一種黑白著色：逃逸次數條紋、平滑等高線、二元分解、距離估計墨線；鏡頭邊推邊轉正。',
  how: ['z ← z² + c，|z| > 1000 判定逃逸，迭代上限 120→1100', '微擾：CPU 雙精度算參考軌道，GPU 只迭代 δ，並重定基', '距離估計 |z|log|z| / |dz/dc| 畫墨線，fwidth 防疊紋'],
  practice: '把逃逸半徑改成 2，平滑等高線會出現什麼瑕疵？',
  cues: [{ t: 0, type: 'riser', t1: 5 }, { t: 5, type: 'bell', i: 1 }, { t: 10, type: 'bell', i: 3 }, { t: 15, type: 'impact', v: 0.7 }, { t: 15, type: 'bell', i: 4 }],
  init() {
    if (!G.ok) return;
    const gl = G.gl, data = new Float32Array(REFN * 2);
    let zx = 0, zy = 0;                                       // reference orbit in float64
    for (let i = 0; i < REFN; i++) { data[i * 2] = zx; data[i * 2 + 1] = zy; const nx = zx * zx - zy * zy + NUC[0]; zy = 2 * zx * zy + NUC[1]; zx = nx; }
    refTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, refTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, REFN, 1, 0, gl.RG, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    prog = G.prog(FS);
  },
  frame(ctx, t) {
    const u = E.inOutSine(clamp(t / 19.2)), uu = clamp(t / 19.2) * 0.25 + u * 0.75;
    const w = W0 * Math.pow(W1 / W0, uu);
    // camera turns so the minibrot ends upright, and drifts from the nucleus to the minibrot's visual centre
    const ang = Math.atan2(SZ[1], SZ[0]) * ease(E.inOutCubic, 4, 19, t);
    const k = ease(E.inOutCubic, 10, 19, t), off = [SZ[0] * -0.4 * k, SZ[1] * -0.4 * k];
    const maxIt = Math.round(lerp(120, 1100, Math.pow(uu, 1.4)));
    let si = 0; while (si + 1 < STYLES.length && STYLES[si + 1][0] <= t) si++;
    const mix = [0, 0, 0, 0], f = ease(E.inOutCubic, STYLES[si][0], STYLES[si][0] + 0.6, t);
    mix[si] = f; if (si > 0) mix[si - 1] = 1 - f; else mix[0] = 1;
    if (prog) {
      const [s] = G.size(0.42);
      G.gl.useProgram(prog.p);
      G.gl.uniform1i(prog.loc('uRefN'), REFN); G.gl.uniform1i(prog.loc('uMax'), maxIt);
      G.draw(prog, { uRef: refTex, uC: NUC, uW: w, uPix: w / s, uRot: [Math.cos(ang), Math.sin(ang)], uOff: off, uMix: mix });
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; G.blit(ctx); ctx.restore();
    }
    // readouts on black plates
    const plate = (x, y, w_, h) => { ctx.fillStyle = K; ctx.fillRect(x, y, w_, h); };
    const zoom = W0 / w, e = Math.floor(Math.log10(zoom)), mant = zoom / Math.pow(10, e);
    plate(40, 30, 470, 56); plate(SW - 330, 30, 290, 56);
    text(ctx, STYLES[si][1], 60, 67, { size: 24, family: F.tc, color: P, alpha: 0.4 + 0.6 * ease(E.outCubic, STYLES[si][0], STYLES[si][0] + 0.5, t) });
    text(ctx, `×${zoom < 1000 ? zoom.toFixed(1) : mant.toFixed(2) + 'e' + e}`, SW - 60, 69, { size: 30, family: F.mono, weight: 500, align: 'right', color: P });
    plate(40, SH - 80, 640, 48);
    text(ctx, `ITER ≤ ${maxIt}  ·  REF p = 39 (float64 → δ float32)`, 60, SH - 48, { size: 19, family: F.mono, weight: 500, color: P, alpha: 0.85 });
  },
});
