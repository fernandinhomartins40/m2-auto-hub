import http from 'node:http';
import { chromium } from 'playwright';

/**
 * Servico de consulta de placa em navegador real.
 *
 * Existe porque a pagina de origem recusa navegador headless (HTTP 403 do
 * Cloudflare) mas responde normalmente a um Chrome de verdade. Roda headful
 * sobre Xvfb; headless:true aqui NAO funciona, por mais que seja tentador.
 *
 * E a camada de fallback: o caminho normal e a consulta assistida no navegador
 * do proprio atendente. So chega aqui quando aquela falha.
 */

const PORT = Number(process.env.PORT || 8100);
const NAV_TIMEOUT = Number(process.env.NAV_TIMEOUT_MS || 45000);
const SETTLE_MS = Number(process.env.SETTLE_MS || 6000);
// Espacamento minimo entre consultas: o cache do backend ja evita repeticao,
// e o volume real e baixo, entao nao ha motivo para bater em rajada na origem.
const MIN_INTERVAL_MS = Number(process.env.MIN_INTERVAL_MS || 4000);

let browser = null;
let ultimaConsulta = 0;
let emAndamento = Promise.resolve();

async function getBrowser() {
  if (browser && browser.isConnected()) {
    return browser;
  }

  browser = await chromium.launch({
    headless: false, // obrigatorio: headless leva 403
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  return browser;
}

function normalizePlate(plate) {
  return String(plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isValidPlate(plate) {
  return /^[A-Z]{3}\d{4}$/.test(plate) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate);
}

async function consultar(plate) {
  const nav = await getBrowser();
  const ctx = await nav.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1366, height: 768 },
  });

  try {
    const page = await ctx.newPage();
    const resp = await page.goto(`https://placafipe.com/placa/${plate.toLowerCase()}`, {
      waitUntil: 'domcontentloaded',
      timeout: NAV_TIMEOUT,
    });

    const status = resp ? resp.status() : 0;

    if (status !== 200) {
      return { ok: false, status, reason: 'blocked' };
    }

    await page.waitForTimeout(SETTLE_MS);
    const text = await page.evaluate(() => document.body.innerText);

    if (/Attention Required|you have been blocked|Just a moment/i.test(text)) {
      return { ok: false, status, reason: 'blocked' };
    }

    return { ok: true, status, text };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Serializa as consultas e respeita o intervalo minimo entre elas. */
function enfileirar(plate) {
  const resultado = emAndamento.then(async () => {
    const espera = MIN_INTERVAL_MS - (Date.now() - ultimaConsulta);
    if (espera > 0) {
      await new Promise((r) => setTimeout(r, espera));
    }

    try {
      return await consultar(plate);
    } finally {
      ultimaConsulta = Date.now();
    }
  });

  // A fila nao pode morrer por causa de um erro isolado.
  emAndamento = resultado.catch(() => {});
  return resultado;
}

function json(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { status: 'ok' });
  }

  if (req.method !== 'POST' || !req.url.startsWith('/lookup')) {
    return json(res, 404, { error: 'not found' });
  }

  let raw = '';
  req.on('data', (c) => {
    raw += c;
    if (raw.length > 4096) req.destroy();
  });

  req.on('end', async () => {
    let plate;
    try {
      plate = normalizePlate(JSON.parse(raw || '{}').plate);
    } catch {
      return json(res, 400, { error: 'invalid json' });
    }

    if (!isValidPlate(plate)) {
      return json(res, 400, { error: 'invalid plate' });
    }

    try {
      const out = await enfileirar(plate);

      if (!out.ok) {
        return json(res, 502, { error: out.reason || 'lookup failed', status: out.status });
      }

      return json(res, 200, { plate, text: out.text });
    } catch (error) {
      console.error('lookup error:', error);
      return json(res, 502, { error: 'lookup failed' });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`plate-scraper ouvindo em :${PORT}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    await browser?.close().catch(() => {});
    server.close(() => process.exit(0));
  });
}
