// Geometria da navegacao: a conversao para ul/li nao pode mover nada de lugar.
const { chromium } = require('playwright');
const BASE = process.env.A11Y_BASE || 'http://localhost:8096';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.argv[2] });
  for (const w of [390, 768, 1280, 1440]) {
    const p = await ctx.newPage();
    p.on('pageerror', () => {});
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto(BASE + process.argv[3], { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(3500);
    const g = await p.evaluate(() => {
      const nav = document.querySelector('nav');
      if (!nav) return { erro: 'sem nav' };
      const btns = Array.from(nav.querySelectorAll('button, a')).filter(e => e.getBoundingClientRect().height > 0);
      const nb = nav.getBoundingClientRect();
      return {
        nav: [Math.round(nb.x), Math.round(nb.y), Math.round(nb.width), Math.round(nb.height)],
        n: btns.length,
        primeiros: btns.slice(0, 3).map(e => {
          const r = e.getBoundingClientRect();
          return (e.textContent || '').trim().slice(0, 14) + '@' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height);
        }),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    console.log(w + 'px: ' + JSON.stringify(g));
    await p.close();
  }
  await b.close();
})();
