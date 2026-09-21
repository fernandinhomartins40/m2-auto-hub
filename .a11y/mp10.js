// MP-10: verifica landmarks, skip link, h1 unico e nav em lista.
// Mede as mesmas rotas da auditoria, com o sistema rodando.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.A11Y_BASE || 'http://localhost:8080';

(async () => {
  const state = process.argv[2];
  const targets = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const b = await chromium.launch();
  const ctx = state === 'none' ? await b.newContext() : await b.newContext({ storageState: state });
  const p = await ctx.newPage();
  p.on('pageerror', () => {});
  await p.setViewportSize({ width: parseInt(process.env.A11Y_W||'1280',10), height: 900 });

  for (const t of targets) {
    await p.goto(BASE + t.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(3500);

    const m = await p.evaluate(() => {
      const vis = (el) => el.getBoundingClientRect().height > 0;
      const hs = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
        .filter(vis).map(h => ({ n: +h.tagName[1], t: (h.textContent || '').trim().slice(0, 30) }));
      const saltos = [];
      for (let i = 1; i < hs.length; i++)
        if (hs[i].n - hs[i - 1].n > 1) saltos.push(hs[i - 1].n + '->' + hs[i].n + ' em "' + hs[i].t + '"');
      const skip = document.querySelector('a[href="#conteudo"]');
      return {
        main: document.querySelectorAll('main').length,
        mainId: document.querySelector('main') ? document.querySelector('main').id : null,
        h1: hs.filter(h => h.n === 1).length,
        h1Texto: hs.filter(h => h.n === 1).map(h => h.t),
        saltos,
        skipLink: !!skip,
        navItensEmLista: document.querySelectorAll('nav ul, nav li').length,
        navEl: document.querySelectorAll('nav').length,
      };
    });

    // Tabs ate o conteudo: o skip link deve ser o 1o focavel e levar ao <main>
    await p.keyboard.press('Tab');
    await p.waitForTimeout(200);
    const primeiroTab = await p.evaluate(() => {
      const e = document.activeElement;
      return e ? e.tagName + ' "' + (e.textContent || '').trim().slice(0, 28) + '"' : '-';
    });
    let dentroMain = false;
    if (m.skipLink) {
      await p.keyboard.press('Enter');
      await p.waitForTimeout(300);
      dentroMain = await p.evaluate(() => {
        const mn = document.querySelector('main'), a = document.activeElement;
        return !!(mn && a && (mn === a || mn.contains(a)));
      });
    }

    const ok = m.main === 1 && m.h1 === 1 && m.saltos.length === 0;
    console.log(
      (ok ? 'OK  ' : 'FALHA ') + t.id.padEnd(15) +
      ' main=' + m.main + ' (id=' + m.mainId + ')' +
      ' h1=' + m.h1 + ' saltos=' + m.saltos.length +
      ' skip=' + m.skipLink + ' navLista=' + m.navItensEmLista
    );
    console.log('      1o Tab: ' + primeiroTab + (m.skipLink ? ' | Enter leva ao main: ' + dentroMain : ''));
    if (m.h1 !== 1) console.log('      h1 encontrados: ' + JSON.stringify(m.h1Texto));
    if (m.saltos.length) console.log('      saltos: ' + m.saltos.join(' ; '));
  }
  await b.close();
})();
