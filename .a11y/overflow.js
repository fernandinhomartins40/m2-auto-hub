const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({storageState:'.a11y/state_cust.json'});
 for(const url of ['/customer/inicio','/customer/perfil','/customer/veiculos','/customer/suporte']){
   const p=await ctx.newPage(); p.on('pageerror',()=>{});
   await p.setViewportSize({width:390,height:900});
   await p.goto('http://localhost:8096'+url,{waitUntil:'networkidle'});
   await p.waitForTimeout(5000);
   const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth,
     bodySw: document.body.scrollWidth}));
   console.log(url+' -> scrollW='+r.sw+' clientW='+r.cw+' bodyScrollW='+r.bodySw+(r.sw>r.cw?'  OVERFLOW':'  ok'));
   await p.close();
 }
 await b.close();
})();
