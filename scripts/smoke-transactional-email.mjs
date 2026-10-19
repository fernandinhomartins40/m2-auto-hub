// Executar dentro do container backend. Sem destinatario, nao envia e-mails.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { TransactionalEmailService } from '/app/dist/shared/services/transactional-email.service.js';

const origin = process.env.APP_BASE_URL || 'https://www.m2centerauto.com.br';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(`${origin}/customer-login`, { waitUntil: 'networkidle' });
  const essentialCookies = page.getByRole('button', { name: 'Só essenciais' });
  if (await essentialCookies.isVisible()) await essentialCookies.click();
  await page.getByRole('link', { name: 'Recuperar senha por e-mail' }).click();
  await page.getByLabel('E-mail da conta').waitFor();
  assert.match(page.url(), /recuperar-senha/);
  await page.goto(`${origin}/admin-login`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Recuperar senha por e-mail' }).click();
  await page.getByLabel('E-mail da conta').waitFor();
  assert.match(page.url(), /recuperar-senha-admin/);
  assert.equal(await page.getByRole('link', { name: 'Voltar para entrar' }).getAttribute('href'), '/admin-login');
  await page.goto(`${origin}/redefinir-senha-admin#token=${'c'.repeat(64)}`, { waitUntil: 'networkidle' });
  await page.getByLabel('Nova senha', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '');
  await page.goto(`${origin}/confirmar-email#token=${'a'.repeat(64)}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Confirmar meu e-mail' }).waitFor();
  assert.equal(new URL(page.url()).hash, '');
  await page.getByRole('button', { name: 'Confirmar meu e-mail' }).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').textContent(), /expirado/);
  await page.goto(`${origin}/redefinir-senha#token=${'b'.repeat(64)}`, { waitUntil: 'networkidle' });
  await page.getByLabel('Nova senha', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '');
  console.log('Browser smoke: login recovery link, verification action, invalid-token rejection and reset form passed.');
} finally {
  await browser.close();
}

const recipient = process.argv[2];
if (recipient) {
  await TransactionalEmailService.send(recipient, 'M2 Auto Center — teste de e-mail transacional',
    'Este é um teste autorizado da integração de e-mails transacionais da M2 Auto Center. O domínio foi autenticado com SPF, DKIM e DMARC. Nenhuma senha foi alterada por esta mensagem.');
  console.log('Authorized test email accepted by Velomail. Inbox delivery must be confirmed separately.');
}
