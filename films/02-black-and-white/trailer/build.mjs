// Build trailer/build/trailer.html = the film page (dist/index.html, same engine and scenes) + plan + renderer + score.
// Run from films/02-black-and-white:  node tools/build.mjs && node trailer/build.mjs
import fs from 'fs';
const R = p => fs.readFileSync(p, 'utf8');
const base = R('dist/index.html');
const code = [R('trailer/plan.js'), R('trailer/trailer.js'), R('trailer/music.js'), `
(async function () {
  while (!(window.M && M.readyFlag)) await new Promise(r => setTimeout(r, 50));
  const c = document.createElement('canvas'); c.width = T.W; c.height = T.H; c.style.width = '480px'; document.body.appendChild(c);
  const ctx = c.getContext('2d');
  window.T = T; window.PLAN = PLAN; window.TMUS = TMUS;
  T.frameURL = i => { T.render(ctx, i); return c.toDataURL('image/png'); };
  T.prepare();
  T.readyFlag = true;
})();`].join('\n\n').replace(/<\/script/gi, '<\\/script');
const i = base.lastIndexOf('</body>');
fs.mkdirSync('trailer/build', { recursive: true });
fs.writeFileSync('trailer/build/trailer.html', base.slice(0, i) + '<script>\n' + code + '\n</script>\n' + base.slice(i));
console.log('built trailer/build/trailer.html');
