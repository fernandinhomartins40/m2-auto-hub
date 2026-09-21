// WCAG 1.4.4 (zoom 200%) e 1.4.10 (reflow 320px) + alvos de toque 2.5.8
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({storageState:'.a11y/state_admin.json'});
 const p=await ctx.newPage();
 // 1.4.10 reflow: 1280 com zoom 200% == 640 CSS px
 for (const [w,rot] of [[640,'reflow 1280@200% (=640px)'],[320,'320px']]) {
  await p.setViewportSize({width:w,height:900});
  await p.goto('http://localhost:8080/store-panel/produtos',{waitUntil:'networkidle'}).catch(()=>{});
  await p.waitForTimeout(1600);
  const r=await p.evaluate(()=>{
   const de=document.documentElement;
   return {hscroll:de.scrollWidth>de.clientWidth+1, over:de.scrollWidth-de.clientWidth};
  });
  console.log(rot+': scroll horizontal='+r.hscroll+(r.hscroll?(' (+'+r.over+'px)'):''));
 }
 // 1.4.4 zoom de texto 200%
 await p.setViewportSize({width:1280,height:900});
 await p.goto('http://localhost:8080/store-panel/produtos',{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
 const antes=await p.evaluate(()=>document.documentElement.scrollWidth);
 await p.evaluate(()=>{document.documentElement.style.fontSize='200%';});
 await p.waitForTimeout(1200);
 const dep=await p.evaluate(()=>{
  const de=document.documentElement;
  const cortados=Array.from(document.querySelectorAll('p,span,h1,h2,h3,button,label'))
    .filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+1).length;
  return {scrollW:de.scrollWidth, clientW:de.clientWidth, hscroll:de.scrollWidth>de.clientWidth+1, cortados};
 });
 console.log('texto 200%: hscroll='+dep.hscroll+' textos cortados='+dep.cortados);
 // 2.5.8 alvos de toque em mobile
 await p.evaluate(()=>{document.documentElement.style.fontSize='';});
 await p.setViewportSize({width:390,height:844});
 await p.goto('http://localhost:8080/store-panel/produtos',{waitUntil:'networkidle'}); await p.waitForTimeout(1600);
 const alvos=await p.evaluate(()=>{
  const r=Array.from(document.querySelectorAll('a,button,input,[role=tab],[role=button]'))
   .map(e=>{const b=e.getBoundingClientRect();return {t:(e.textContent||'').trim().slice(0,20),w:Math.round(b.width),h:Math.round(b.height)};})
   .filter(x=>x.w>0&&x.h>0&&(x.w<24||x.h<24));
  return {total:r.length, exemplos:r.slice(0,5)};
 });
 console.log('alvos <24px em 390px: '+alvos.total+' '+JSON.stringify(alvos.exemplos));
 await b.close();
})();
