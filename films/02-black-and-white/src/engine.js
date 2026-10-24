'use strict';
/* ==========================================================================
   BLACK & WHITE — 72 motion techniques, each 20 s, every pixel from code.
   Frame: 1080×1920 (9:16), 30 fps, 120 BPM (beat 0.5 s, bar 2 s).
   Layout: header (y 0–170) · stage 1080×1080 (y 180–1260) · panel (y 1290–1880).
   Every finished frame passes through a grayscale filter: colour cannot leak.
   ========================================================================== */
const W = 1080, H = 1920, FPS = 30, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
const SW = 1080, SH = 1080, SY = 180;          // stage size and its top in the frame
const TAU = Math.PI * 2;
const M = { W, H, FPS, BPM, BEAT, BAR, scenes: [], record: false, glScale: 1, CH: [] };

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => (x - a) / (b - a);
const remap = (x, a, b, c, d) => lerp(c, d, clamp(inv(a, b, x)));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = x => x - Math.floor(x);
const E = {
  lin: t => t,
  inSine: t => 1 - Math.cos(t * Math.PI / 2), outSine: t => Math.sin(t * Math.PI / 2),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t), inOutQuad: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  inCubic: t => t * t * t, outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inQuart: t => t ** 4, outQuart: t => 1 - Math.pow(1 - t, 4), inOutQuart: t => t < .5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2,
  inQuint: t => t ** 5, outQuint: t => 1 - Math.pow(1 - t, 5), inOutQuint: t => t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2,
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10), outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inCirc: t => 1 - Math.sqrt(1 - t * t), outCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: t => { const c1 = 1.70158; return (c1 + 1) * t * t * t - c1 * t * t; },
  inOutBack: t => { const c2 = 1.70158 * 1.525; return t < .5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2; },
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1,
  outBounce: t => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + .75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + .9375; return n1 * (t -= 2.625 / d1) * t + .984375; },
};
const ease = (fn, a, b, x) => fn(clamp((x - a) / (b - a)));

function bezierEase(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  const f = x => {
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) return sy(t); const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 30; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (x > v) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
  f.pts = [x1, y1, x2, y2];
  return f;
}

/* damped spring step response 0→1 (closed form). k stiffness, c damping, m mass */
function spring(t, k = 170, c = 26, m = 1, v0 = 0) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m)), x0 = -1;
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z), env = Math.exp(-z * w0 * t);
    return 1 + env * (x0 * Math.cos(wd * t) + ((z * w0 * x0 + v0) / wd) * Math.sin(wd * t));
  } else if (Math.abs(z - 1) < 1e-9) {
    return 1 + Math.exp(-w0 * t) * (x0 + (v0 + w0 * x0) * t);
  } else {
    const r1 = -w0 * (z - Math.sqrt(z * z - 1)), r2 = -w0 * (z + Math.sqrt(z * z - 1));
    const B = (v0 - r1 * x0) / (r2 - r1), A = x0 - B;
    return 1 + A * Math.exp(r1 * t) + B * Math.exp(r2 * t);
  }
}

function rng(seed = 1) {
  let a = seed >>> 0;
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  return r;
}

function makeNoise(seed = 7) {
  const r = rng(seed), p = new Uint8Array(512), perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y, z) => { const u = (h & 15) < 8 ? x : y, v = (h & 15) < 4 ? y : ((h & 15) === 12 || (h & 15) === 14) ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  const n3 = (x, y, z = 0) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u), lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u), lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  };
  n3.fbm = (x, y, z = 0, oct = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * n3(x * f, y * f, z * f); f *= 2; a *= .5; } return s; };
  return n3;
}
const noise = makeNoise(11);

/* ---------- tone (black & white only) ---------- */
/* K = ink black, P = paper white. g(v, a) = grey of value v (0 black … 1 white) with alpha a. */
const K = '#0b0b0b', P = '#f2f2f0';
const g = (v, a = 1) => { const c = Math.round(lerp(11, 242, clamp(v))); return `rgba(${c},${c},${c},${a})`; };
let FG = P, BG = K;                     // current scene's ink / ground (set by the engine per scene)
const fg = (a = 1) => FG === P ? `rgba(242,242,240,${a})` : `rgba(11,11,11,${a})`;
const bg = (a = 1) => BG === K ? `rgba(11,11,11,${a})` : `rgba(242,242,240,${a})`;

/* ---------- fonts & text ---------- */
const F = { latin: '"Archivo", "NotoTC", sans-serif', mono: '"JBMono", "NotoTC", ui-monospace, monospace', tc: '"NotoTC", "Noto Sans TC", sans-serif', tcBlack: '"NotoTCBlack", "Noto Sans TC", sans-serif' };
function font(ctx, size, family = F.latin, weight = 400) { ctx.font = `${weight} ${size}px ${family}`; }
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  font(ctx, o.size || 40, o.family || F.latin, o.weight || 400);
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = (o.spacing || 0) + 'px';
  ctx.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
  ctx.fillStyle = o.color || FG;
  ctx.fillText(s, x, y);
  ctx.restore();
}
/* line breaking for mixed CJK / Latin: CJK breaks anywhere, Latin by word, no line-initial closing punctuation */
const NO_START = '，。、；：！？）」』》〉】,.;:!?)]}%·…';
function tokenize(s) {
  const out = []; let buf = '';
  for (const ch of s) {
    if (/[⺀-鿿豈-﫿＀-￯　-〿]/.test(ch)) { if (buf) { out.push(buf); buf = ''; } out.push(ch); }
    else if (ch === ' ') { buf += ch; out.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}
function wrapText(ctx, s, maxW) {
  const toks = tokenize(s), lines = []; let line = '';
  for (const tk of toks) {
    const test = line + tk;
    if (ctx.measureText(test.trimEnd()).width > maxW && line) {
      if (NO_START.includes(tk[0])) { line += tk; continue; }
      lines.push(line.trimEnd()); line = tk.trimStart();
    } else line = test;
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

/* Archivo variable outlines: piecewise-bilinear over wdth {62,100,125} × wght {100,400,900}. A–Z, 0–9. */
const GLYPHS = /*GLYPHS_JSON*/null;
function glyphAt(ch, wdth = 100, wght = 800) {
  const gl = GLYPHS.glyphs[ch]; if (!gl) return null;
  const seg = (arr, v) => { let i = 0; while (i < arr.length - 2 && v > arr[i + 1]) i++; return [i, clamp((v - arr[i]) / (arr[i + 1] - arr[i]))]; };
  const [i, u] = seg(GLYPHS.wdth, wdth), [j, v] = seg(GLYPHS.wght, wght);
  const A = gl.pts[i][j], B = gl.pts[i + 1][j], C = gl.pts[i][j + 1], D = gl.pts[i + 1][j + 1];
  const n = A.length, pts = new Float32Array(n);
  for (let k = 0; k < n; k++) pts[k] = lerp(lerp(A[k], B[k], u), lerp(C[k], D[k], u), v);
  const adv = lerp(lerp(gl.adv[i][j], gl.adv[i + 1][j], u), lerp(gl.adv[i][j + 1], gl.adv[i + 1][j + 1], u), v);
  return { pts, adv, ops: gl.ops, n: gl.n, upm: GLYPHS.upm };
}
/* trace into the current path; (x, y) = baseline origin, scale = px per font unit */
function traceGlyph(ctx, gl, x, y, scale) {
  const P_ = gl.pts; let k = 0;
  const X = i => x + P_[i * 2] * scale, Y = i => y - P_[i * 2 + 1] * scale;
  for (let o = 0; o < gl.ops.length; o++) {
    const op = gl.ops[o], cnt = gl.n[o];
    if (op === 'M') { ctx.moveTo(X(k), Y(k)); k++; }
    else if (op === 'L') { ctx.lineTo(X(k), Y(k)); k++; }
    else if (op === 'Q') {
      for (let q = 0; q < cnt - 1; q++) {
        const ox = X(k + q), oy = Y(k + q);
        let ex, ey;
        if (q < cnt - 2) { ex = (ox + X(k + q + 1)) / 2; ey = (oy + Y(k + q + 1)) / 2; } else { ex = X(k + cnt - 1); ey = Y(k + cnt - 1); }
        ctx.quadraticCurveTo(ox, oy, ex, ey);
      }
      k += cnt;
    }
    else if (op === 'C') { ctx.bezierCurveTo(X(k), Y(k), X(k + 1), Y(k + 1), X(k + 2), Y(k + 2)); k += 3; }
    else if (op === 'Z') ctx.closePath();
  }
}
/* flatten a glyph into polylines (array of contours of [x,y]) in font units — for morphs, particles, paths */
function glyphContours(gl, steps = 8) {
  const P_ = gl.pts, out = []; let cur = null, k = 0;
  const pt = i => [P_[i * 2], P_[i * 2 + 1]];
  for (let o = 0; o < gl.ops.length; o++) {
    const op = gl.ops[o], cnt = gl.n[o];
    if (op === 'M') { cur = [pt(k)]; out.push(cur); k++; }
    else if (op === 'L') { cur.push(pt(k)); k++; }
    else if (op === 'Q') {
      let s = cur[cur.length - 1];
      for (let q = 0; q < cnt - 1; q++) {
        const c = pt(k + q); const e = q < cnt - 2 ? [(c[0] + pt(k + q + 1)[0]) / 2, (c[1] + pt(k + q + 1)[1]) / 2] : pt(k + cnt - 1);
        for (let i = 1; i <= steps; i++) { const t = i / steps, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t; cur.push([a * s[0] + b * c[0] + d * e[0], a * s[1] + b * c[1] + d * e[1]]); }
        s = e;
      }
      k += cnt;
    }
    else if (op === 'C') { const s = cur[cur.length - 1], c1 = pt(k), c2 = pt(k + 1), e = pt(k + 2); for (let i = 1; i <= steps; i++) { const t = i / steps, u = 1 - t; cur.push([u * u * u * s[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * e[0], u * u * u * s[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * e[1]]); } k += 3; }
  }
  return out;
}

/* ---------- canvas helpers ---------- */
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/* rasterise text (or anything) into an offscreen mask and return {canvas, data} for sampling */
function mask(w, h, draw) { const c = makeCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true }); draw(x, w, h); return { canvas: c, data: x.getImageData(0, 0, w, h).data, w, h }; }
function grain(ctx, amt = 0.05, seed = 0, w = SW, h = SH) {
  if (!M._grain) {
    M._grain = [];
    for (let s = 0; s < 6; s++) {
      const c = makeCanvas(256, 256), x = c.getContext('2d'), id = x.createImageData(256, 256), r = rng(100 + s);
      for (let i = 0; i < id.data.length; i += 4) { const v = (r() * 255) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      x.putImageData(id, 0, 0); M._grain.push(c);
    }
  }
  ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(M._grain[seed % 6], 'repeat');
  ctx.translate((seed * 37) % 256, (seed * 91) % 256); ctx.fillRect(-256, -256, w + 512, h + 512);
  ctx.restore();
}
function vignette(ctx, a = 0.4, w = SW, h = SH) {
  const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
}

/* ---------- WebGL2 (one shared canvas; scenes draw into the stage) ---------- */
const G = {};
G.init = function () {
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const gl = c.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: true, alpha: true });
  if (!gl) { G.ok = false; return; }
  G.ok = true; G.c = c; G.gl = gl;
  G.floatOK = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  G.tri = gl.createVertexArray(); gl.bindVertexArray(G.tri);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
};
G.VS = `#version 300 es
layout(location=0) in vec2 p; out vec2 vUv;
void main(){ vUv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;
G.COMMON = `
#define PI 3.14159265359
#define TAU 6.28318530718
float hash11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vnoise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  float n=dot(i,vec3(1.,57.,113.));
  return mix(mix(mix(hash11(n),hash11(n+1.),f.x),mix(hash11(n+57.),hash11(n+58.),f.x),f.y),
             mix(mix(hash11(n+113.),hash11(n+114.),f.x),mix(hash11(n+170.),hash11(n+171.),f.x),f.y),f.z); }
float fbm3(vec3 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=.5; } return s; }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdTorus(vec3 p, vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
float luma(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }
vec3 aces(vec3 x){ const float a=2.51,b=.03,c=2.43,d=.59,e=.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
vec3 toSRGB(vec3 c){ return pow(clamp(c,0.,1.), vec3(1./2.2)); }
`;
G.prog = function (fs, vs = G.VS) {
  const gl = G.gl;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); console.error(src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); throw new Error('shader: ' + log); } return s; };
  const fsrc = fs.includes('#version') ? fs : `#version 300 es\nprecision highp float;\nprecision highp int;\n${G.COMMON}\n${fs}`;
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsrc));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const locs = {};
  return { p, loc: n => (n in locs) ? locs[n] : (locs[n] = gl.getUniformLocation(p, n)) };
};
G.set = function (pr, u) {
  const gl = G.gl; let unit = 0;
  for (const k in u) {
    const v = u[k], l = pr.loc(k); if (l === null) continue;
    if (v instanceof WebGLTexture) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(l, unit++); }
    else if (v && v.tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(l, unit++); }
    else if (typeof v === 'number') gl.uniform1f(l, v);
    else if (typeof v === 'boolean') gl.uniform1i(l, v ? 1 : 0);
    else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v);
    else if (v.length === 9) gl.uniformMatrix3fv(l, false, v); else if (v.length === 16) gl.uniformMatrix4fv(l, false, v);
    else gl.uniform1fv(l, v);
  }
};
G.target = function (w, h, o = {}) {
  const gl = G.gl, tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const fl = o.float && G.floatOK;
  gl.texImage2D(gl.TEXTURE_2D, 0, fl ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, fl ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  const f = o.nearest ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  const wrap = o.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fb, w, h };
};
G.texFrom = function (src, tex) {
  const gl = G.gl; tex = tex || gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
};
/* size the GL canvas to scale × the 1080×1080 stage (× adaptive live-playback factor) */
G.size = function (scale = 1) {
  const s = Math.round(SW * scale * M.glScale);
  if (G.c.width !== s || G.c.height !== s) { G.c.width = s; G.c.height = s; }
  return [s, s];
};
G.draw = function (pr, u, target = null) {
  const gl = G.gl;
  gl.useProgram(pr.p);
  if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h); }
  else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, G.c.width, G.c.height); }
  G.set(pr, Object.assign({ uRes: target ? [target.w, target.h] : [G.c.width, G.c.height] }, u));
  gl.bindVertexArray(G.tri); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
};
/* draw the GL canvas onto the stage (scene-local coordinates) */
G.blit = function (ctx, x = 0, y = 0, w = SW, h = SH) { ctx.drawImage(G.c, 0, 0, G.c.width, G.c.height, x, y, w, h); };

/* ---------- scenes ---------- */
/* chapters: filled by the curriculum (order of M.CH defines chapter cards) */
M.chapter = c => M.CH.push(c);
M.def = s => { s.kind = s.kind || 'seg'; M.scenes.push(s); return s; };
M.layout = function () {
  const segs = M.scenes.filter(s => s.kind === 'seg').sort((a, b) => a.num - b.num);
  const intro = M.scenes.find(s => s.id === 'intro'), outro = M.scenes.find(s => s.id === 'outro');
  const tl = [];
  if (intro) tl.push(intro);
  for (const ch of M.CH) {
    const mine = segs.filter(s => s.ch === ch.n);
    if (!mine.length) continue;
    ch.segs = mine;
    tl.push(M.chapterCard(ch));
    tl.push(...mine);
  }
  if (outro) tl.push(outro);
  let t = 0;
  for (const s of tl) { s.start = t; t += s.dur; s.end = t; }
  M.timeline = tl; M.duration = t; M.frames = Math.round(t * FPS);
  M.segs = segs; M.total = 72;
};
M.sceneAt = gt => { for (const s of M.timeline) if (gt < s.end - 1e-9) return s; return M.timeline[M.timeline.length - 1]; };
/* fixed-step simulation with automatic reset on rewind */
M.sim = function (s, t, step, hz) {
  const dt = 1 / hz;
  if (!s.sim || t + 1e-9 < s.sim.t) { s.sim = { t: 0, n: 0 }; s.reset && s.reset(); }
  let guard = 0;
  while (s.sim.t + dt <= t + 1e-9 && guard++ < hz * 40) { step(dt, s.sim.n, s.sim.t); s.sim.t += dt; s.sim.n++; }
};

/* ---------- chapter card (3 s, generated) ---------- */
const CN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
M.chapterCard = function (ch) {
  return {
    id: 'ch' + ch.n, kind: 'card', dur: 3, ch: ch.n, ground: 'dark', label: `第${CN[ch.n]}章 ${ch.title}`,
    cues: [{ t: 0, type: 'impact', v: 0.6 }],
    frame(ctx, t) {
      ctx.fillStyle = K; ctx.fillRect(0, 0, W, H);
      const a = ease(E.outExpo, 0, 0.6, t), out = ease(E.inCubic, 2.6, 2.98, t);
      ctx.save(); ctx.globalAlpha = 1 - out;
      // huge numeral, clipped reveal
      ctx.save(); ctx.beginPath(); ctx.rect(0, 270, W, 590); ctx.clip();
      { const digits = String(ch.n).padStart(2, '0'), sc = 0.78, wd = lerp(112, 72, ease(E.inOutCubic, 0.1, 1.6, t)); let x = 60;
        ctx.fillStyle = P; ctx.beginPath();
        for (const d of digits) { const gl = glyphAt(d, wd, 820); traceGlyph(ctx, gl, x, 840 + (1 - a) * 560, sc); x += gl.adv * sc; }
        ctx.fill(); }
      ctx.restore();
      text(ctx, `CHAPTER ${String(ch.n).padStart(2, '0')} · 第${CN[ch.n]}章`, 72, 230, { size: 26, family: F.mono, weight: 500, color: P, spacing: 8, alpha: a });
      ctx.fillStyle = P; ctx.fillRect(72, 860, 936 * ease(E.inOutCubic, 0.1, 0.9, t), 3);
      text(ctx, ch.title, 72, 990, { size: 96, family: F.tcBlack, weight: 900, color: P, alpha: ease(E.outCubic, 0.2, 0.7, t) });
      text(ctx, ch.en, 76, 1050, { size: 26, family: F.mono, weight: 500, color: g(.6), spacing: 8, alpha: ease(E.outCubic, 0.3, 0.8, t) });
      // list of this chapter's segments
      (ch.segs || []).forEach((s, i) => {
        const col = i % 2, row = Math.floor(i / 2), x = 72 + col * 480, y = 1190 + row * 92;
        const aa = ease(E.outCubic, 0.4 + i * 0.07, 0.9 + i * 0.07, t);
        text(ctx, String(s.num).padStart(2, '0'), x, y + (1 - aa) * 20, { size: 26, family: F.mono, weight: 500, color: g(.55), alpha: aa });
        text(ctx, s.title, x + 58, y + (1 - aa) * 20, { size: 38, family: F.tc, weight: 400, color: P, alpha: aa });
        text(ctx, s.en, x + 60, y + 34 + (1 - aa) * 20, { size: 18, family: F.mono, color: g(.5), alpha: aa, spacing: 2 });
      });
      ctx.restore();
    },
  };
};

/* ---------- header & panel ---------- */
M.header = function (ctx, s, t) {
  const segIdx = M.segs.indexOf(s);
  text(ctx, `${String(s.num).padStart(2, '0')} / 72`, 72, 92, { size: 28, family: F.mono, weight: 500, spacing: 2 });
  const ch = M.CH.find(c => c.n === s.ch);
  if (ch) text(ctx, `第${CN[ch.n]}章　${ch.title}`, W - 72, 92, { size: 26, family: F.tc, align: 'right', alpha: 0.75 });
  // 72-tick progress
  const n = 72, gap = 4, bw = (W - 144 - gap * (n - 1)) / n, y = 124;
  for (let i = 0; i < n; i++) {
    const x = 72 + i * (bw + gap);
    const done = i < segIdx ? 1 : i === segIdx ? clamp(t / s.dur) : 0;
    ctx.fillStyle = fg(0.18); ctx.fillRect(x, y, bw, 6);
    if (done > 0) { ctx.fillStyle = fg(1); ctx.fillRect(x, y, bw * done, 6); }
  }
};
M.cropMarks = function (ctx) {
  ctx.save(); ctx.strokeStyle = fg(0.45); ctx.lineWidth = 2;
  const L = 18, y0 = SY - 10, y1 = SY + SH + 10;
  for (const [x, y, dx, dy] of [[36, y0, 1, -1], [W - 36, y0, -1, -1], [36, y1, 1, 1], [W - 36, y1, -1, 1]]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * L, y); ctx.moveTo(x, y); ctx.lineTo(x, y + dy * -L); ctx.stroke();
  }
  ctx.restore();
};
M.PANEL = { x: 72, w: 936, titleY: 1362, enY: 1404, promptLabelY: 1462, promptY: 1512, promptLH: 46, promptSize: 34, promptLines: 4, howLabelY: 1700, howY: 1742, howLH: 38, howSize: 27, practiceY: 1886 };
M.panel = function (ctx, s, t) {
  const Pn = M.PANEL, x = Pn.x;
  // title (clip-reveal)
  ctx.save(); ctx.beginPath(); ctx.rect(x - 8, Pn.titleY - 76, Pn.w + 16, 92); ctx.clip();
  const dy = (1 - ease(E.outExpo, 0.05, 0.8, t)) * 90;
  text(ctx, s.title, x - 3, Pn.titleY + dy, { size: 68, family: F.tcBlack, weight: 900, spacing: 2 });
  ctx.restore();
  text(ctx, s.en, x, Pn.enY, { size: 22, family: F.mono, weight: 500, spacing: 6, alpha: 0.6 * ease(E.outCubic, 0.25, 0.9, t) });
  // PROMPT
  const pa = ease(E.outCubic, 0.6, 1.0, t);
  const label = (str, y, a) => {
    ctx.save(); ctx.globalAlpha *= a; font(ctx, 19, F.mono, 500); ctx.letterSpacing = '4px';
    const w = ctx.measureText(str).width + 22;
    ctx.fillStyle = FG; ctx.fillRect(x, y - 21, w, 30); ctx.fillStyle = BG; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x + 11, y + 1);
    ctx.restore();
  };
  label('PROMPT', Pn.promptLabelY, pa);
  if (!s._lines) {
    let size = Pn.promptSize, lines;
    for (; size >= 26; size -= 2) { font(ctx, size, F.tc); lines = wrapText(ctx, '「' + s.prompt + '」', Pn.w); if (lines.length <= Pn.promptLines) break; }
    if (lines.length > Pn.promptLines) console.warn(`[${s.id}] prompt too long: ${lines.length} lines at ${size}px`);
    s._lines = lines; s._psize = size;
    font(ctx, Pn.howSize, F.tc);
    s._how = (s.how || []).slice(0, 3).map(h => { const w = ctx.measureText('· ' + h).width; if (w > Pn.w) console.warn(`[${s.id}] how line too wide: ${h}`); return h; });
    font(ctx, 27, F.tc); if (ctx.measureText('練習　' + (s.practice || '')).width > Pn.w - 10) console.warn(`[${s.id}] practice too wide`);
  }
  // typed reveal: ~24 chars per second from 0.9 s
  const total = s._lines.reduce((a, l) => a + [...l].length, 0);
  let shown = Math.floor(clamp((t - 0.9) * 24, 0, total)), cursor = null;
  const lh = Pn.promptLH * s._psize / Pn.promptSize;
  s._lines.forEach((l, i) => {
    const chars = [...l], n = Math.min(chars.length, shown); shown -= n;
    if (n <= 0) return;
    const str = chars.slice(0, n).join(''), y = Pn.promptY + i * lh;
    text(ctx, str, x, y, { size: s._psize, family: F.tc });
    if (n < chars.length || (shown === 0 && t < 0.9 + total / 24 + 0.6)) { font(ctx, s._psize, F.tc); cursor = [x + ctx.measureText(str).width + 4, y]; }
  });
  if (cursor && Math.floor(t * 4) % 2 === 0) { ctx.fillStyle = FG; ctx.fillRect(cursor[0], cursor[1] - s._psize * 0.8, s._psize * 0.5, s._psize * 0.95); }
  // 做法
  const howT = Math.max(5.0, 0.9 + total / 24 + 0.4);
  label('做法 HOW', Pn.howLabelY, ease(E.outCubic, howT, howT + 0.4, t));
  s._how.forEach((h, i) => {
    const a = ease(E.outCubic, howT + 0.3 + i * 0.45, howT + 0.8 + i * 0.45, t);
    text(ctx, '· ' + h, x + (1 - a) * -24, Pn.howY + i * Pn.howLH, { size: Pn.howSize, family: F.tc, alpha: a * 0.92 });
  });
  // 練習
  const prT = howT + 2.2, pra = ease(E.outCubic, prT, prT + 0.5, t);
  if (s.practice) {
    ctx.save(); ctx.globalAlpha *= pra;
    ctx.strokeStyle = fg(0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, Pn.practiceY - 36); ctx.lineTo(x + Pn.w, Pn.practiceY - 36); ctx.stroke();
    text(ctx, '練習', x, Pn.practiceY, { size: 27, family: F.tcBlack, weight: 900 });
    text(ctx, s.practice, x + 82, Pn.practiceY, { size: 27, family: F.tc, alpha: 0.85 });
    ctx.restore();
  }
};

/* ---------- frame ---------- */
M.render = function (out, gt) {
  const s = M.sceneAt(gt), t = gt - s.start;
  if (!s.ready) { s.init && s.init(); s.ready = true; }
  if (!M.buf) { M.buf = makeCanvas(W, H); M.bctx = M.buf.getContext('2d'); }
  const ctx = M.bctx;
  const light = s.ground === 'light';
  FG = light ? K : P; BG = light ? P : K;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const info = { dur: s.dur, p: t / s.dur, gt, beat: t / BEAT, bar: t / BAR, frame: Math.round(gt * FPS) };
  if (s.kind === 'seg') {
    ctx.save(); ctx.translate(0, SY); ctx.beginPath(); ctx.rect(0, 0, SW, SH); ctx.clip();
    s.frame(ctx, t, info);
    ctx.restore();
    FG = light ? K : P; BG = light ? P : K;       // scenes may not leave the ink changed
    ctx.save(); M.cropMarks(ctx); M.header(ctx, s, t); M.panel(ctx, s, t); ctx.restore();
  } else {
    s.frame(ctx, t, info);
  }
  ctx.restore();
  // grayscale guarantee
  out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.globalCompositeOperation = 'copy';
  out.filter = 'grayscale(1)'; out.drawImage(M.buf, 0, 0); out.filter = 'none'; out.restore();
};

M.boot = async function (canvas) {
  M.canvas = canvas; M.ctx = canvas.getContext('2d');
  G.init();
  await document.fonts.ready;
  await Promise.all(['900 40px NotoTCBlack', '400 40px NotoTC', '500 40px JBMono', '800 40px Archivo', '400 40px Archivo'].map(f => document.fonts.load(f, '時間ABC')));
  M.layout();
};
