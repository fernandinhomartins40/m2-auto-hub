// Labels, tabelas, tabs, live regions, erros de formulario
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({storageState:'.a11y/state_admin.json'});
 const p=await ctx.newPage(); await p.setViewportSize({width:1400,height:900});

 for(const url of ['/store-panel/usuarios','/store-panel/produtos','/store-panel/clientes']){
  await p.goto('http://localhost:8080'+url,{waitUntil:'networkidle'}).catch(()=>{}); await p.waitForTimeout(1600);
  const r=await p.evaluate(()=>{
   const campos=Array.from(document.querySelectorAll('input,select,textarea')).filter(e=>e.type!=='hidden');
   const semNome=campos.filter(e=>{
     const id=e.id; const lbl=id?document.querySelector('label[for="'+CSS.escape(id)+'"]'):null;
     return !(lbl||e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.closest('label'));
   }).map(e=>({tag:e.tagName,type:e.type,ph:e.placeholder||'',name:e.name||''}));
   const soPlaceholder=campos.filter(e=>{
     const id=e.id; const lbl=id?document.querySelector('label[for="'+CSS.escape(id)+'"]'):null;
     return !lbl && !e.closest('label') && e.placeholder;
   }).length;
   const tabelas=Array.from(document.querySelectorAll('table')).map(t=>({
     caption:!!t.querySelector('caption'),
     th:t.querySelectorAll('th').length,
     scope:t.querySelectorAll('th[scope]').length,
     linhas:t.querySelectorAll('tbody tr').length
   }));
   return {
    url:location.pathname, totalCampos:campos.length, semNome:semNome.length, exemplos:semNome.slice(0,4),
    soPlaceholder, tabelas,
    live:document.querySelectorAll('[aria-live],[role=status],[role=alert]').length,
    tabs:document.querySelectorAll('[role=tablist]').length,
    tabsOk:Array.from(document.querySelectorAll('[role=tab]')).filter(t=>t.hasAttribute('aria-selected')).length,
    totalTabs:document.querySelectorAll('[role=tab]').length,
    required:document.querySelectorAll('[required],[aria-required=true]').length,
    ariaInvalid:document.querySelectorAll('[aria-invalid]').length,
    ariaDescribedby:document.querySelectorAll('[aria-describedby]').length,
   };
  });
  console.log(JSON.stringify(r));
  console.log('');
 }
 await b.close();
})();
