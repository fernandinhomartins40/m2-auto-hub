// Teclado: ordem de tabulação, foco visível, trap em modal, Escape.
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({storageState:'.a11y/state_admin.json'});
 const p=await ctx.newPage(); await p.setViewportSize({width:1280,height:900});
 await p.goto('http://localhost:8080/store-panel/produtos',{waitUntil:'networkidle'}); await p.waitForTimeout(1800);

 // 1) foco visivel: tabula 12x e checa se ha outline/ring
 console.log('=== foco visivel (12 tabs) ===');
 let semAnel=0, itens=[];
 for(let i=0;i<12;i++){
  await p.keyboard.press('Tab'); await p.waitForTimeout(160);
  const f=await p.evaluate(()=>{
   const e=document.activeElement; if(!e||e===document.body) return null;
   const cs=getComputedStyle(e);
   const anel = (cs.outlineStyle!=='none' && parseFloat(cs.outlineWidth)>0) ||
                (cs.boxShadow&&cs.boxShadow!=='none');
   return {tag:e.tagName, txt:(e.textContent||'').trim().slice(0,22), anel,
           outline:cs.outlineStyle+' '+cs.outlineWidth, shadow:(cs.boxShadow||'none').slice(0,40)};
  });
  if(f){ itens.push(f.tag+'"'+f.txt+'"'+(f.anel?'':' [SEM ANEL]')); if(!f.anel) semAnel++; }
 }
 console.log(itens.join(' -> '));
 console.log('sem indicador de foco: '+semAnel+'/12');

 // 2) modal: trap de foco e Escape
 console.log('');
 console.log('=== modal: foco e Escape ===');
 await p.getByRole('button',{name:/novo produto/i}).first().click({timeout:9000}).catch(()=>{});
 await p.waitForTimeout(1600);
 const dentro = await p.evaluate(()=>{
  const d=document.querySelector('[role="dialog"]');
  const a=document.activeElement;
  return {temDialog:!!d, focoDentro: d? d.contains(a):false, foco:a?a.tagName:'-',
          ariaModal:d?d.getAttribute('aria-modal'):null, rotulado: d? (!!d.getAttribute('aria-labelledby')||!!d.getAttribute('aria-label')):false};
 });
 console.log('ao abrir: '+JSON.stringify(dentro));
 // tabula 25x e ve se escapa do modal
 let fugas=0;
 for(let i=0;i<25;i++){ await p.keyboard.press('Tab'); await p.waitForTimeout(60);
  const f=await p.evaluate(()=>{const d=document.querySelector('[role="dialog"]');return d?d.contains(document.activeElement):true;});
  if(!f) fugas++;
 }
 console.log('tabulacoes que escaparam do modal (25 tabs): '+fugas);
 await p.keyboard.press('Escape'); await p.waitForTimeout(1000);
 const fechou=await p.evaluate(()=>!document.querySelector('[role="dialog"]'));
 console.log('Escape fecha o modal: '+fechou);
 const devolveu=await p.evaluate(()=>{const a=document.activeElement;return a?a.tagName+':'+(a.textContent||'').trim().slice(0,20):'-';});
 console.log('foco apos fechar: '+devolveu);
 await b.close();
})();
