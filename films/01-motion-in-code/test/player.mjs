import { chromium } from 'playwright';
const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport:{width:420,height:860}});
const errs=[]; p.on('console',m=>{if(['error','warning'].includes(m.type()))errs.push(m.text())}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/dist/index.html');
await p.waitForTimeout(15000);
await p.screenshot({path:'build/player.png'});
console.log('errors:', errs.slice(0,10));
await b.close();
