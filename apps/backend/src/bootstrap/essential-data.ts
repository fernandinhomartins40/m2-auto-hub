import { AdminRole, AdminStatus, type LandingPageConfig } from '@prisma/client';

import { prisma } from '@config/database.js';
import { HashUtil } from '@shared/utils/hash.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { ensureRelationshipCategories } from './relationship-categories.js';

const EMPTY_SECTION_JSON = JSON.stringify({});
const DEFAULT_ADMIN_PASSWORD = 'Test123!';

// Uma unica conta administrativa. Antes eram tres: gerente e mecanico nasciam
// ACTIVE, com a MESMA senha do admin, e ninguem as usava — tres credenciais
// validas para o valor de uma. Quem precisar de um perfil MANAGER ou STAFF
// cria pelo painel, com senha propria.
const defaultAdminSeeds = [
  {
    email: 'admin@m2centerauto.com.br',
    name: 'Administrador M2',
    role: AdminRole.SUPER_ADMIN,
    permissions: ['ALL'],
  },
] as const;

function getBootstrapPassword(): string {
  const password = process.env.DEFAULT_ADMIN_PASSWORD?.trim();
  return password && password.length > 0 ? password : DEFAULT_ADMIN_PASSWORD;
}

function getEmptyLandingConfigData() {
  return {
    header: EMPTY_SECTION_JSON,
    hero: EMPTY_SECTION_JSON,
    marquee: EMPTY_SECTION_JSON,
    about: EMPTY_SECTION_JSON,
    products: EMPTY_SECTION_JSON,
    services: EMPTY_SECTION_JSON,
    contactPage: EMPTY_SECTION_JSON,
    aboutPage: EMPTY_SECTION_JSON,
    contact: EMPTY_SECTION_JSON,
    footer: EMPTY_SECTION_JSON,
  };
}

export async function ensureLandingPageConfig(): Promise<LandingPageConfig> {
  const existingConfig = await prisma.landingPageConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  if (existingConfig) {
    return existingConfig;
  }

  logger.warn('Landing page config missing, creating default empty config');

  return prisma.landingPageConfig.create({
    data: getEmptyLandingConfigData(),
  });
}

/**
 * `update: {}` no upsert e deliberado: uma vez criada a conta, o deploy nao
 * mexe mais nela, para nao reverter a senha que o operador trocou no painel.
 *
 * O efeito colateral e que uma senha perdida vira uma conta inacessivel — o
 * bootstrap roda a cada deploy e nunca a corrige. Por isso existe
 * ADMIN_PASSWORD_RESYNC: com `true`, este deploy ressincroniza a senha das
 * contas padrao a partir de DEFAULT_ADMIN_PASSWORD. E uma chave para destravar
 * o acesso, ligada uma vez e desligada em seguida: deixa-la ligada faria todo
 * deploy desfazer a troca de senha feita no painel.
 */
function shouldResyncPassword(): boolean {
  return process.env.ADMIN_PASSWORD_RESYNC?.trim().toLowerCase() === 'true';
}

export async function ensureDefaultAdmins(): Promise<void> {
  const hashedPassword = await HashUtil.hashPassword(getBootstrapPassword());
  const resync = shouldResyncPassword();

  await prisma.$transaction(
    defaultAdminSeeds.map((admin) =>
      prisma.admin.upsert({
        where: { email: admin.email },
        update: resync ? { password: hashedPassword, status: AdminStatus.ACTIVE } : {},
        create: {
          email: admin.email,
          password: hashedPassword,
          name: admin.name,
          role: admin.role,
          status: AdminStatus.ACTIVE,
          permissions: admin.permissions,
        },
      })
    )
  );

  if (resync) {
    logger.warn(
      'ADMIN_PASSWORD_RESYNC ativo: senha das contas padrao redefinida a partir de DEFAULT_ADMIN_PASSWORD. Desligue a flag apos entrar.',
      { emails: defaultAdminSeeds.map((admin) => admin.email) }
    );
  }

  logger.warn('Ensured default admin accounts are available', {
    emails: defaultAdminSeeds.map((admin) => admin.email),
  });
}

export async function ensureEssentialData(): Promise<void> {
  await ensureLandingPageConfig();
  await ensureDefaultAdmins();
  await ensureRelationshipCategories();
}
