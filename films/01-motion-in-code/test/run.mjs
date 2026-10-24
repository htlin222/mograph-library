import { chromium } from 'playwright';
const b = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p = await b.newPage();
await p.goto('file://'+process.cwd()+'/test/gltest.html');
console.log(await p.evaluate(()=>window.info));
for (const [w,h] of [[720,1280],[1080,1920]]) {
  await p.evaluate(([w,h])=>{const c=document.getElementById('c');c.width=w;c.height=h;},[w,h]);
  let t0=Date.now(); for(let i=0;i<5;i++) await p.evaluate(i=>frame(i*.1),i);
  console.log(w,h,'ms/frame',(Date.now()-t0)/5);
  t0=Date.now(); for(let i=0;i<3;i++) await p.evaluate(()=>document.getElementById('c').toDataURL('image/png').length);
  console.log('png ms',(Date.now()-t0)/3);
}
await b.close();
