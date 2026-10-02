import { stdin } from 'node:process';

import { prisma } from '../config/database.js';
import { HashUtil } from '../shared/utils/hash.util.js';

const email = process.env.RESET_ADMIN_EMAIL?.trim().toLowerCase();

async function readPassword(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8').replace(/[\r\n]+$/, '');
}

function validatePassword(password: string): void {
  if (password.length < 12) {
    throw new Error('A nova senha deve ter pelo menos 12 caracteres');
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('A nova senha deve conter letras maiúsculas, minúsculas e números');
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password)) {
    throw new Error('A nova senha deve conter pelo menos um caractere especial');
  }
}

async function main(): Promise<void> {
  if (!email) {
    throw new Error('Defina RESET_ADMIN_EMAIL com o e-mail exato da conta');
  }

  const password = await readPassword();
  validatePassword(password);

  const admin = await prisma.admin.findUnique({
    where: { email },
    select: { id: true, email: true, status: true },
  });
  if (!admin) {
    throw new Error(`Administrador não encontrado: ${email}`);
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: await HashUtil.hashPassword(password) },
  });

  console.log(`Senha redefinida para ${admin.email}. Status preservado: ${admin.status}.`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`Falha ao redefinir senha: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
