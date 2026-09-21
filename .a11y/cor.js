const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({storageState:'.a11y/state_admin.json'});
 const p=await ctx.newPage(); await p.setViewportSize({width:1280,height:900});
 await p.goto('http://localhost:8080/store-panel/produtos',{waitUntil:'networkidle'}); await p.waitForTimeout(1600);
 // zoom 200%: o que corta
 await p.evaluate(()=>{document.documentElement.style.fontSize='200%';}); await p.waitForTimeout(1200);
 const cortes=await p.evaluate(()=>Array.from(document.querySelectorAll('p,span,h2,h3,button,label'))
   .filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+1)
   .map(e=>({t:(e.textContent||'').trim().slice(0,30),cw:e.clientWidth,sw:e.scrollWidth})).slice(0,6));
 console.log('cortados @200%: '+JSON.stringify(cortes,null,0));
 await p.evaluate(()=>{document.documentElement.style.fontSize='';}); await p.waitForTimeout(800);
 // status so por cor?
 const st=await p.evaluate(()=>{
  const badges=Array.from(document.querySelectorAll('[class*="badge"],[class*="Badge"]'))
   .map(e=>({txt:(e.textContent||'').trim().slice(0,18), cls:(e.className||'').toString().slice(0,60)}))
   .filter(x=>x.txt);
  return {total:badges.length, amostra:badges.slice(0,6)};
 });
 console.log('badges de status: '+st.total+' — todos com texto? '+st.amostra.every(x=>x.txt.length>0));
 console.log(JSON.stringify(st.amostra.slice(0,4)));
 await b.close();
})();
