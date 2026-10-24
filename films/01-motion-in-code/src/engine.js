'use strict';
/* ==========================================================================
   MOTION, IN CODE — engine
   Everything on screen is a pure-ish function of time t.
   Output: 1080×1920 (9:16), 30 fps. 120 BPM → beat 0.5 s, bar 2 s.
   ========================================================================== */
const W = 1080, H = 1920, FPS = 30, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
const TAU = Math.PI * 2;
const M = { W, H, FPS, BPM, BEAT, BAR, scenes: [], record: false, glScale: 1, cues: [] };

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => (x - a) / (b - a);
const remap = (x, a, b, c, d) => lerp(c, d, clamp(inv(a, b, x)));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = x => x - Math.floor(x);
const E = {
  lin: t => t,
  inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t),
  inCubic: t => t * t * t, outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inOutQuint: t => t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2,
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: t => { const c1 = 1.70158; return (c1 + 1) * t * t * t - c1 * t * t; },
};
const ease = (fn, a, b, x) => fn(clamp((x - a) / (b - a)));

/* cubic-bezier(x1,y1,x2,y2) like CSS, solved by Newton + bisection */
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

/* damped harmonic oscillator, closed form. Returns position going 0→1 (step response).
   k stiffness, c damping, m mass, v0 initial velocity (in units/s). */
function spring(t, k = 170, c = 26, m = 1, v0 = 0) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
  const x0 = -1; // offset from target
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    const env = Math.exp(-z * w0 * t);
    return 1 + env * (x0 * Math.cos(wd * t) + ((z * w0 * x0 + v0) / wd) * Math.sin(wd * t));
  } else if (z === 1) {
    return 1 + Math.exp(-w0 * t) * (x0 + (v0 + w0 * x0) * t);
  } else {
    const r1 = -w0 * (z - Math.sqrt(z * z - 1)), r2 = -w0 * (z + Math.sqrt(z * z - 1));
    const B = (v0 - r1 * x0) / (r2 - r1), A = x0 - B;
    return 1 + A * Math.exp(r1 * t) + B * Math.exp(r2 * t);
  }
}

/* seeded RNG */
function rng(seed = 1) {
  let a = seed >>> 0;
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.range = (a, b) => a + (b - a) * r();
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  return r;
}

/* Perlin "improved" noise, seeded */
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

/* ---------- color ---------- */
const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const rgba = (c, a = 1) => { const [r, g, b] = typeof c === 'string' ? hex(c) : c; return `rgba(${r | 0},${g | 0},${b | 0},${a})`; };
const mixc = (a, b, t) => { a = typeof a === 'string' ? hex(a) : a; b = typeof b === 'string' ? hex(b) : b; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };

/* Shared palette — "graphite & signal". Scenes may add their own. */
const P = {
  ink: '#0d0e10', ink2: '#16181c', graphite: '#24272d', ash: '#8b8f98', paper: '#efece6', bone: '#f6f4ef',
  coral: '#ff5a3c', amber: '#ffb000', cobalt: '#2b4bff', mint: '#2fd6a6', violet: '#7a5cff', rose: '#ff7aa8', cyan: '#3ad1ff',
};

/* ---------- fonts ---------- */
const F = { latin: '"Archivo", sans-serif', mono: '"JBMono", "NotoTC", ui-monospace, monospace', tc: '"NotoTC", "Noto Sans TC", sans-serif', tcBlack: '"NotoTCBlack", "Noto Sans TC", sans-serif' };
function font(ctx, size, family = F.latin, weight = 400) { ctx.font = `${weight} ${size}px ${family}`; }
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  font(ctx, o.size || 40, o.family || F.latin, o.weight || 400);
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  if (o.spacing !== undefined) ctx.letterSpacing = o.spacing + 'px';
  ctx.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, x, y);
  ctx.restore();
}

/* Variable-font outlines (Archivo): exact piecewise-bilinear interpolation over
   instances at wdth {62,100,125} × wght {100,400,900}. Returns {path, adv} in font units. */
const GLYPHS = /*GLYPHS_JSON*/null;
function glyphAt(ch, wdth, wght = 800) {
  const g = GLYPHS.glyphs[ch]; if (!g) return null;
  const seg = (arr, v) => { let i = 0; while (i < arr.length - 2 && v > arr[i + 1]) i++; return [i, clamp((v - arr[i]) / (arr[i + 1] - arr[i]))]; };
  const [i, u] = seg(GLYPHS.wdth, wdth), [j, v] = seg(GLYPHS.wght, wght);
  const A = g.pts[i][j], B = g.pts[i + 1][j], C = g.pts[i][j + 1], D = g.pts[i + 1][j + 1];
  const n = A.length, pts = new Float32Array(n);
  for (let k = 0; k < n; k++) pts[k] = lerp(lerp(A[k], B[k], u), lerp(C[k], D[k], u), v);
  const adv = lerp(lerp(g.adv[i][j], g.adv[i + 1][j], u), lerp(g.adv[i][j + 1], g.adv[i + 1][j + 1], u), v);
  return { pts, adv, ops: g.ops, n: g.n };
}
/* trace glyph into a 2D path (y flipped). TrueType qCurveTo with implied on-curve points. */
function traceGlyph(ctx, gl, x, y, scale) {
  const P_ = gl.pts; let k = 0, cx = 0, cy = 0, sx = 0, sy = 0;
  const X = i => x + P_[i * 2] * scale, Y = i => y - P_[i * 2 + 1] * scale;
  for (let o = 0; o < gl.ops.length; o++) {
    const op = gl.ops[o], cnt = gl.n[o];
    if (op === 'M') { cx = X(k); cy = Y(k); sx = cx; sy = cy; ctx.moveTo(cx, cy); k++; }
    else if (op === 'L') { cx = X(k); cy = Y(k); ctx.lineTo(cx, cy); k++; }
    else if (op === 'Q') {
      // cnt points: cnt-1 off-curve then final on-curve (final may be null for closed contour w/o on-curve — not in Archivo)
      for (let q = 0; q < cnt - 1; q++) {
        const ox = X(k + q), oy = Y(k + q);
        let ex, ey;
        if (q < cnt - 2) { ex = (ox + X(k + q + 1)) / 2; ey = (oy + Y(k + q + 1)) / 2; }
        else { ex = X(k + cnt - 1); ey = Y(k + cnt - 1); }
        ctx.quadraticCurveTo(ox, oy, ex, ey);
      }
      k += cnt;
    }
    else if (op === 'C') { ctx.bezierCurveTo(X(k), Y(k), X(k + 1), Y(k + 1), X(k + 2), Y(k + 2)); k += 3; }
    else if (op === 'Z') { ctx.closePath(); }
  }
}

/* ---------- canvas helpers ---------- */
function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function grain(ctx, amt = 0.06, seed = 0) {
  // cached film grain tiles, picked per frame
  if (!M._grain) {
    M._grain = [];
    for (let s = 0; s < 6; s++) {
      const c = makeCanvas(256, 256), g = c.getContext('2d'), id = g.createImageData(256, 256), r = rng(100 + s);
      for (let i = 0; i < id.data.length; i += 4) { const v = (r() * 255) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0); M._grain.push(c);
    }
  }
  const tile = M._grain[seed % 6];
  ctx.save(); ctx.globalAlpha = amt; ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(tile, 'repeat'); ctx.fillStyle = pat; ctx.translate((seed * 37) % 256, (seed * 91) % 256); ctx.fillRect(-256, -256, W + 512, H + 512);
  ctx.restore();
}
function vignette(ctx, a = 0.45, color = '0,0,0') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/* ---------- WebGL2 ---------- */
const G = {};
G.init = function () {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
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
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdTorus(vec3 p, vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
vec3 aces(vec3 x){ const float a=2.51,b=.03,c=2.43,d=.59,e=.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
vec3 toSRGB(vec3 c){ return pow(clamp(c,0.,1.), vec3(1./2.2)); }
/* CIE 1931 colour matching, multi-lobe Gaussian fit (Wyman, Sloan, Shirley 2013) */
vec3 cieXYZ(float l){
  float t1=(l-442.0)*((l<442.0)?0.0624:0.0374), t2=(l-599.8)*((l<599.8)?0.0264:0.0323), t3=(l-501.1)*((l<501.1)?0.0490:0.0382);
  float x= 0.362*exp(-.5*t1*t1)+1.056*exp(-.5*t2*t2)-0.065*exp(-.5*t3*t3);
  float u1=(l-568.8)*((l<568.8)?0.0213:0.0247), u2=(l-530.9)*((l<530.9)?0.0613:0.0322);
  float y= 0.821*exp(-.5*u1*u1)+0.286*exp(-.5*u2*u2);
  float v1=(l-437.0)*((l<437.0)?0.0845:0.0278), v2=(l-459.0)*((l<459.0)?0.0385:0.0725);
  float z= 1.217*exp(-.5*v1*v1)+0.681*exp(-.5*v2*v2);
  return vec3(x,y,z);
}
vec3 xyz2rgb(vec3 c){ return mat3(3.2406,-0.9689,0.0557, -1.5372,1.8758,-0.2040, -0.4986,0.0415,1.0570)*c; }
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
/* render target: {tex, fb, w, h} */
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
/* upload a 2D canvas as texture */
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
/* size the shared GL canvas: scale × the output resolution */
G.size = function (scale = 1) {
  const w = Math.round(W * scale * M.glScale), h = Math.round(H * scale * M.glScale);
  if (G.c.width !== w || G.c.height !== h) { G.c.width = w; G.c.height = h; }
  return [w, h];
};
/* full-screen pass. target null = canvas */
G.draw = function (pr, u, target = null) {
  const gl = G.gl;
  gl.useProgram(pr.p);
  if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); gl.viewport(0, 0, target.w, target.h); }
  else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, G.c.width, G.c.height); }
  G.set(pr, Object.assign({ uRes: target ? [target.w, target.h] : [G.c.width, G.c.height] }, u));
  gl.bindVertexArray(G.tri); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
};
G.blit = function (ctx, x = 0, y = 0, w = W, h = H) { ctx.drawImage(G.c, 0, 0, G.c.width, G.c.height, x, y, w, h); };

/* ---------- scenes & timeline ---------- */
M.def = s => { s.state = null; M.scenes.push(s); };
M.layout = function () {
  let t = 0; M.timeline = [];
  for (const s of M.scenes) { s.start = t; t += s.dur; s.end = t; M.timeline.push(s); }
  M.duration = t; M.frames = Math.round(t * FPS);
};
M.sceneAt = gt => { for (const s of M.timeline) if (gt < s.end) return s; return M.timeline[M.timeline.length - 1]; };

/* stateful scenes (simulations) advance with fixed steps; rewinding resets them. */
M.sim = function (s, t, step, hz) {
  const dt = 1 / hz;
  if (!s.sim || t + 1e-9 < s.sim.t) { s.sim = { t: 0, n: 0 }; s.reset && s.reset(); }
  let guard = 0;
  while (s.sim.t + dt <= t + 1e-9 && guard++ < hz * 120) { step(dt, s.sim.n, s.sim.t); s.sim.t += dt; s.sim.n++; }
};

/* ---------- HUD ---------- */
M.hud = function (ctx, s, t, gt) {
  if (!s.num) return;
  const dark = s.hud === 'dark';
  const fg = dark ? '#121316' : '#f4f2ee', sub = dark ? 'rgba(18,19,22,.55)' : 'rgba(244,242,238,.6)';
  const inA = ease(E.outExpo, 0.05, 0.75, t), out = 1 - ease(E.inCubic, s.dur - 0.28, s.dur - 0.02, t);
  const a = inA * out;
  ctx.save();
  ctx.globalAlpha = a;
  const x = 84, y = 196;
  // chapter number with a ticking counter feel
  text(ctx, s.num, x, y, { size: 30, family: F.mono, weight: 500, color: fg, spacing: 2 });
  ctx.fillStyle = fg; ctx.fillRect(x + 62, y - 11, 40 * inA, 2);
  text(ctx, '12', x + 116, y, { size: 30, family: F.mono, weight: 400, color: sub, spacing: 2 });
  // title: clip-reveal from below
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 10, y + 22, 900, 118); ctx.clip();
  const dy = (1 - E.outExpo(clamp((t - 0.08) / 0.7))) * 110;
  text(ctx, s.title, x - 4, y + 112 + dy, { size: 92, family: F.tcBlack, weight: 900, color: fg, spacing: 4 });
  ctx.restore();
  text(ctx, s.en, x, y + 172, { size: 26, family: F.mono, weight: 500, color: sub, spacing: 7, alpha: ease(E.outCubic, 0.25, 0.9, t) });
  // tech tags at the bottom
  const tags = s.tags || [];
  let ty = H - 250;
  tags.forEach((tag, i) => {
    const ta = ease(E.outCubic, 0.35 + i * 0.12, 0.95 + i * 0.12, t);
    text(ctx, tag, x + (1 - ta) * -30, ty + i * 46, { size: 27, family: F.mono, weight: 400, color: sub, alpha: ta, spacing: 0.5 });
  });
  ctx.restore();
  // chapter progress (always visible within numbered scenes)
  ctx.save();
  const n = 12, gap = 8, bw = (W - 168 - gap * (n - 1)) / n, by = H - 92;
  for (let i = 0; i < n; i++) {
    const sc = M.timeline.find(q => q.num === String(i + 1).padStart(2, '0'));
    const p = sc ? clamp((gt - sc.start) / sc.dur) : 0;
    ctx.fillStyle = dark ? 'rgba(18,19,22,.18)' : 'rgba(255,255,255,.18)';
    ctx.fillRect(84 + i * (bw + gap), by, bw, 3);
    ctx.fillStyle = fg; ctx.fillRect(84 + i * (bw + gap), by, bw * p, 3);
  }
  ctx.restore();
};

/* ---------- frame ---------- */
M.render = function (ctx, gt) {
  const s = M.sceneAt(gt), t = gt - s.start;
  if (!s.ready) { s.init && s.init(); s.ready = true; }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  s.frame(ctx, t, { dur: s.dur, p: t / s.dur, gt, beat: t / BEAT, bar: t / BAR, frame: Math.round(gt * FPS) });
  ctx.restore();
  ctx.save(); M.hud(ctx, s, t, gt); ctx.restore();
  // cut flash: 2 frames of luminance lift on every scene boundary
  const since = t;
  if (s.num && since < 2 / FPS) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
};

M.boot = async function (canvas) {
  M.canvas = canvas; M.ctx = canvas.getContext('2d');
  G.init();
  await document.fonts.ready;
  await Promise.all(['900 40px NotoTCBlack', '400 40px NotoTC', '500 40px JBMono', '800 40px Archivo', '400 40px Archivo'].map(f => document.fonts.load(f, '時間ABC')));
  M.layout();
};
