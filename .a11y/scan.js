// Auditoria WCAG com axe-core em telas reais + checagens próprias
// (foco visível, hierarquia de headings, semântica).
const { chromium } = require('playwright');
const fs = require('fs');
const axePath = require.resolve('axe-core/axe.min.js');
const AXE = fs.readFileSync(axePath, 'utf8');
const BASE = process.env.A11Y_BASE || 'http://localhost:8080';

(async()=>{
 const state=process.argv[2], targets=JSON.parse(fs.readFileSync(process.argv[3],'utf8')), out=process.argv[4];
 const width=parseInt(process.argv[5]||'1280',10);
 const b=await chromium.launch();
 const ctx= state==='none'? await b.newContext(): await b.newContext({storageState:state});
 const p=await ctx.newPage(); p.on('pageerror',()=>{});
 await p.setViewportSize({width,height:900});
 const all=[];
 for(const t of targets){
  await p.goto(BASE+t.url,{waitUntil:'networkidle',timeout:30000}).catch(()=>{});
  await p.waitForTimeout(3500);
  await p.addScriptTag({content:AXE});
  const res = await p.evaluate(async ()=>{
    const r = await window.axe.run(document, {
      runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']},
      resultTypes:['violations']
    });
    return r.violations.map(v=>({
      id:v.id, impact:v.impact, help:v.help, wcag:(v.tags||[]).filter(x=>/^wcag\d/.test(x)),
      count:v.nodes.length,
      exemplos:v.nodes.slice(0,3).map(n=>({
        alvo:(n.target||[]).join(' '),
        html:(n.html||'').slice(0,120),
        resumo:(n.failureSummary||'').split('\n').filter(Boolean).slice(0,2).join(' | ').slice(0,160)
      }))
    }));
  });
  // checagens proprias
  const extra = await p.evaluate(()=>{
    const hs=Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .filter(h=>h.getBoundingClientRect().height>0)
      .map(h=>({n:+h.tagName[1], t:(h.textContent||'').trim().slice(0,32)}));
    let saltos=[];
    for(let i=1;i<hs.length;i++) if(hs[i].n-hs[i-1].n>1) saltos.push(hs[i-1].n+'->'+hs[i].n+' em "'+hs[i].t+'"');
    return {
      h1: hs.filter(h=>h.n===1).length,
      sequencia: hs.slice(0,8).map(h=>'h'+h.n),
      saltos,
      landmarks:{main:document.querySelectorAll('main').length, nav:document.querySelectorAll('nav').length,
                 header:document.querySelectorAll('header').length, footer:document.querySelectorAll('footer').length},
      skipLink: !!document.querySelector('a[href^="#"][class*="skip"], a[href="#main"], a[href="#conteudo"]'),
      langHtml: document.documentElement.getAttribute('lang'),
      divComOnClick: Array.from(document.querySelectorAll('div[onclick],span[onclick]')).length,
      imgSemAlt: Array.from(document.querySelectorAll('img')).filter(i=>!i.hasAttribute('alt')).length,
      totalImg: document.querySelectorAll('img').length,
    };
  });
  all.push({id:t.id,url:t.url,width,violations:res,extra});
  const crit=res.filter(v=>['critical','serious'].includes(v.impact));
  console.log(t.id.padEnd(16)+' violacoes='+res.length+' (graves='+crit.length+')  h1='+extra.h1+' saltos='+extra.saltos.length+' main='+extra.landmarks.main+' lang='+extra.langHtml);
  for(const v of crit.slice(0,5)) console.log('     ['+v.impact+'] '+v.id+' x'+v.count+' — '+v.help);
 }
 fs.writeFileSync(out,JSON.stringify(all,null,1));
 await b.close();
})();
