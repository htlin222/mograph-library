// Build dist/index.html: concatenate engine + music + scenes, inline fonts/glyphs/matter.js.
import fs from 'fs';
import { execFileSync } from 'child_process';
const R = p => fs.readFileSync(p, 'utf8');
const B64 = p => fs.readFileSync(p).toString('base64');

const ORDER = ['intro', 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 'outro'];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const sceneSrc = ORDER.filter(n => fs.existsSync(`src/scenes/${n}.js`)).map(n => {
  if (only && !only.includes(n)) return `/* ${n} skipped */`;
  return `/* ===== ${n} ===== */\n(() => {\n${R(`src/scenes/${n}.js`)}\n})();`;
}).join('\n\n');

const srcFiles0 = ['src/engine.js', 'src/music.js', 'src/page.html', ...ORDER.map(n => `src/scenes/${n}.js`).filter(f => fs.existsSync(f))];
const STATS = { chars: srcFiles0.reduce((a, f) => a + R(f).length, 0), lines: srcFiles0.reduce((a, f) => a + R(f).split('\n').length, 0) };
let engine = R('src/engine.js').replace('/*GLYPHS_JSON*/null', R('build/glyphs.json'));
const app = [engine, `M.STATS = ${JSON.stringify(STATS)};`, R('src/music.js'), sceneSrc].join('\n\n');

// CJK subset: every Han / CJK punctuation / fullwidth char used anywhere in the sources
const all = app + R('src/page.html');
const cjk = [...new Set([...all].filter(c => /[　-〿㐀-鿿＀-￯—…·−]/.test(c)))].join('') + Array.from({length: 95}, (_, i) => String.fromCharCode(32 + i)).join('') + '「」，、。：；！？（）×–→←↑↓';
fs.writeFileSync('build/cjk.txt', cjk);
const sub = (ttc, idx, out) => execFileSync('python3', ['-c', `
from fontTools.ttLib import TTCollection
from fontTools import subset
f=TTCollection('${ttc}').fonts[${idx}]
o=subset.Options(); o.flavor='woff2'; o.layout_features=['*']
s=subset.Subsetter(o); s.populate(text=open('build/cjk.txt').read()); s.subset(f)
f.flavor='woff2'; f.save('${out}')`]);
const stamp = 'build/cjk.stamp';
if (!fs.existsSync(stamp) || R(stamp) !== cjk) {
  sub('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 3, 'build/tc-regular.woff2');
  sub('/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', 3, 'build/tc-black.woff2');
  fs.writeFileSync(stamp, cjk);
}
const nm = 'node_modules/';
const faces = `
@font-face { font-family: "Archivo"; src: url(data:font/woff2;base64,${B64(nm + '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2')}) format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: "JBMono"; src: url(data:font/woff2;base64,${B64(nm + '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2')}) format("woff2"); font-weight: 400; }
@font-face { font-family: "JBMono"; src: url(data:font/woff2;base64,${B64(nm + '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2')}) format("woff2"); font-weight: 500; }
@font-face { font-family: "NotoTC"; src: url(data:font/woff2;base64,${B64('build/tc-regular.woff2')}) format("woff2"); font-weight: 400; }
@font-face { font-family: "NotoTCBlack"; src: url(data:font/woff2;base64,${B64('build/tc-black.woff2')}) format("woff2"); font-weight: 900; }
`;
const libs = R(nm + 'matter-js/build/matter.min.js').replace(/<\/script/gi, '<\\/script');
const html = R('src/page.html')
  .replace('/*FONTFACES*/', () => faces)
  .replace('/*LIBS*/', () => libs)
  .replace('/*APP*/', () => app.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync(process.env.OUT || 'dist/index.html', html);
// code stats: hand-written sources only (no fonts/libs)
const srcFiles = ['src/engine.js', 'src/music.js', 'src/page.html', ...ORDER.map(n => `src/scenes/${n}.js`).filter(f => fs.existsSync(f))];
const chars = srcFiles.reduce((a, f) => a + R(f).length, 0), lines = srcFiles.reduce((a, f) => a + R(f).split('\n').length, 0);
fs.writeFileSync('build/stats.json', JSON.stringify({ chars, lines }));
console.log('built', (html.length / 1024).toFixed(0) + 'KB', { chars, lines, cjk: cjk.length });
