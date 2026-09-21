const { chromium } = require('playwright');
(async()=>{
 const who=process.argv[2]||'admin';
 const c = who==='cust' ? {url:'/api/auth/login', body:{identifier:'joao.silva@email.com',password:'Test123!'}}
        : {url:'/api/auth/admin/login', body:{email:(who==='mech'?'mecanico':'admin')+'@m2centerauto.com.br',password:'Test123!'}};
 const b=await chromium.launch(); const ctx=await b.newContext();
 const r=await ctx.request.post((process.env.A11Y_BASE||'http://localhost:8080')+c.url,{data:c.body});
 console.log(who+' -> '+r.status()); if(r.status()!==200){await b.close();process.exit(1);}
 await ctx.addInitScript((k)=>{ if(k==='cust') localStorage.setItem('moria_customer_session_active','true'); else localStorage.setItem('moria_admin_session_active','true'); },who);
 const p=await ctx.newPage(); await p.goto('http://localhost:8080/').catch(()=>{}); await p.waitForTimeout(1200);
 await ctx.storageState({path:'.a11y/state_'+who+'.json'}); console.log('salvo'); await b.close();
})();
