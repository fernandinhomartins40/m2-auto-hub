// Quantos Tabs para chegar ao conteudo principal? Existe skip link?
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({storageState:'.a11y/state_admin.json'});
 const p=await ctx.newPage(); await p.setViewportSize({width:1280,height:900});
 await p.goto('http://localhost:8080/store-panel/produtos',{waitUntil:'networkidle'}); await p.waitForTimeout(1800);
 // skip link aparece no primeiro Tab?
 await p.keyboard.press('Tab'); await p.waitForTimeout(250);
 const primeiro=await p.evaluate(()=>{const e=document.activeElement;return e?e.tagName+' "'+(e.textContent||'').trim().slice(0,30)+'"':'-';});
 console.log('1o Tab: '+primeiro);
 // quantos tabs ate sair da navegacao e entrar no <main>
 let n=1, dentroMain=false;
 for(;n<60 && !dentroMain;n++){
  await p.keyboard.press('Tab'); await p.waitForTimeout(55);
  dentroMain=await p.evaluate(()=>{const m=document.querySelector('main');const a=document.activeElement;return !!(m&&a&&m.contains(a));});
 }
 console.log('Tabs ate o primeiro elemento do <main>: '+(dentroMain?n:'nao alcancado em 60'));
 // aria-current na navegacao?
 const nav=await p.evaluate(()=>({
   ariaCurrent: document.querySelectorAll('[aria-current]').length,
   navEl: document.querySelectorAll('nav').length,
   listaNav: document.querySelectorAll('nav ul, nav li').length
 }));
 console.log('aria-current (item ativo do menu): '+nav.ariaCurrent+' | <nav>: '+nav.navEl+' | itens em lista: '+nav.listaNav);
 await b.close();
})();
