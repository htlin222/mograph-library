// Build dist/index.html: engine + curriculum + music + scenes, fonts/glyphs/matter.js inlined.
import fs from 'fs';
import { execFileSync } from 'child_process';
const R = p => fs.readFileSync(p, 'utf8');
const B64 = p => fs.readFileSync(p).toString('base64');

const sceneFiles = fs.readdirSync('src/scenes').filter(f => f.endsWith('.js')).sort((a, b) => {
  const k = f => f === 'intro.js' ? -1 : f === 'outro.js' ? 999 : parseInt(f.slice(1)) || 500;
  return k(a) - k(b);
});
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const sceneSrc = sceneFiles.map(f => {
  const id = f.replace('.js', '');
  if (only && !only.includes(id)) return `/* ${id} skipped */`;
  return `/* ===== ${id} ===== */\n(() => {\n${R('src/scenes/' + f)}\n})();`;
}).join('\n\n');

const hand = ['src/engine.js', 'src/curriculum.js', 'src/music.js', 'src/page.html', ...sceneFiles.map(f => 'src/scenes/' + f)];
const STATS = { chars: hand.reduce((a, f) => a + R(f).length, 0), lines: hand.reduce((a, f) => a + R(f).split('\n').length, 0), scenes: sceneFiles.length };
const gain = fs.existsSync('build/gain.json') ? JSON.parse(R('build/gain.json')).gain : 1;
const engine = R('src/engine.js').replace('/*GLYPHS_JSON*/null', R('build/glyphs.json'));
const app = [engine, `M.STATS = ${JSON.stringify(STATS)};`, R('src/curriculum.js'), R('src/music.js'), `MUS.LIVE_GAIN = ${gain};`, sceneSrc].join('\n\n');

const all = hand.map(R).join('\n');   // every scene, even with ONLY set, so the font subset stays stable
const cjk = [...new Set([...all].filter(c => /[　-〿㐀-鿿＀-￯—…·−←-⇿─-╿■-◿]/.test(c) || /[\u0370-\u03ff\u2200-\u22ff\u2070-\u209f\u00b0-\u00bf\u00d7\u00f7]/.test(c)))].join('')
  + Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '「」『』，、。：；！？（）×–→←↑↓…';
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
fs.writeFileSync('build/stats.json', JSON.stringify(STATS));
console.log('built', process.env.OUT || 'dist/index.html', (html.length / 1024).toFixed(0) + 'KB', STATS, 'cjk', cjk.length);
