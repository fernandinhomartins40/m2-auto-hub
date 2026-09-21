// Formulario dentro do modal: labels, required, e como o erro e anunciado
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({storageState:'.a11y/state_admin.json'});
 const p=await ctx.newPage(); await p.setViewportSize({width:1400,height:900});
 await p.goto('http://localhost:8080/store-panel/produtos',{waitUntil:'networkidle'}); await p.waitForTimeout(1800);
 await p.getByRole('button',{name:/novo produto/i}).first().click({timeout:9000}).catch(()=>{});
 await p.waitForTimeout(1800);

 const antes=await p.evaluate(()=>{
  const d=document.querySelector('[role=dialog]'); if(!d) return {erro:'sem dialog'};
  const campos=Array.from(d.querySelectorAll('input,select,textarea')).filter(e=>e.type!=='hidden');
  const semNome=campos.filter(e=>{const id=e.id;const l=id?d.querySelector('label[for="'+CSS.escape(id)+'"]'):null;
    return !(l||e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.closest('label'));});
  return {campos:campos.length, semNome:semNome.length,
    semNomeEx:semNome.slice(0,5).map(e=>e.placeholder||e.name||e.tagName),
    required:d.querySelectorAll('[required],[aria-required=true]').length,
    labelsComAsterisco:Array.from(d.querySelectorAll('label')).filter(l=>/\*/.test(l.textContent||'')).length,
    totalLabels:d.querySelectorAll('label').length};
 });
 console.log('modal ANTES de submeter: '+JSON.stringify(antes));

 // submeter vazio para forcar erros
 const salvar=p.locator('[role=dialog] button').filter({hasText:/salvar|criar|cadastrar|adicionar/i}).last();
 await salvar.click({timeout:6000}).catch(e=>console.log('clique falhou'));
 await p.waitForTimeout(2200);

 const dep=await p.evaluate(()=>{
  const d=document.querySelector('[role=dialog]');
  const txt=document.body.innerText;
  return {
   dialogAberto:!!d,
   ariaInvalid:document.querySelectorAll('[aria-invalid="true"]').length,
   ariaDescribedby:d?d.querySelectorAll('[aria-describedby]').length:0,
   roleAlert:document.querySelectorAll('[role=alert]').length,
   ariaLive:document.querySelectorAll('[aria-live]').length,
   focoApos:document.activeElement?document.activeElement.tagName+':'+(document.activeElement.getAttribute('placeholder')||(document.activeElement.textContent||'').trim().slice(0,20)):'-',
   temToast:/obrigat|preencha|inv[aá]lid|erro|required/i.test(txt),
   trechoErro:(txt.match(/[^\n]*(obrigat|preencha|inv[aá]lid|erro)[^\n]*/i)||[''])[0].slice(0,90)
  };
 });
 console.log('modal DEPOIS de submeter vazio: '+JSON.stringify(dep));
 await b.close();
})();
