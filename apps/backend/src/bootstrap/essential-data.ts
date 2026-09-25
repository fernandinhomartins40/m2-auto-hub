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
 * Uma vez criada a conta, o deploy nao
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

/**
 * A conta padrao so e criada quando o banco nao tem nenhum SUPER_ADMIN. Antes o
 * upsert era por email: quem trocava o email do admin no painel ganhava, no
 * deploy seguinte, uma segunda conta SUPER_ADMIN com a senha padrao conhecida.
 *
 * Com ADMIN_PASSWORD_RESYNC, a senha e ressincronizada na conta padrao ou, se o
 * email dela foi trocado, no SUPER_ADMIN mais antigo.
 */
export async function ensureDefaultAdmins(): Promise<void> {
  const hashedPassword = await HashUtil.hashPassword(getBootstrapPassword());
  const resync = shouldResyncPassword();

  for (const seed of defaultAdminSeeds) {
    const target =
      (await prisma.admin.findUnique({ where: { email: seed.email } })) ??
      (await prisma.admin.findFirst({
        where: { role: seed.role },
        orderBy: { createdAt: 'asc' },
      }));

    if (!target) {
      await prisma.admin.create({
        data: {
          email: seed.email,
          password: hashedPassword,
          name: seed.name,
          role: seed.role,
          status: AdminStatus.ACTIVE,
          permissions: [...seed.permissions],
        },
      });
      logger.warn('Default admin account created', { email: seed.email });
      continue;
    }

    if (resync) {
      await prisma.admin.update({
        where: { id: target.id },
        data: { password: hashedPassword, status: AdminStatus.ACTIVE },
      });
      logger.warn(
        'ADMIN_PASSWORD_RESYNC ativo: senha redefinida a partir de DEFAULT_ADMIN_PASSWORD. Desligue a flag apos entrar.',
        { email: target.email }
      );
    }
  }
}

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * A edicao de usuario em Configuracoes > Usuarios gravava a senha em texto puro
 * (corrigido no mesmo commit). Essas contas ficavam inacessiveis, porque o login
 * compara via bcrypt. Aqui a senha salva vira hash, e o usuario volta a entrar
 * com a mesma senha que digitou. Idempotente: hashes validos sao ignorados.
 */
export async function hashPlaintextAdminPasswords(): Promise<void> {
  const admins = await prisma.admin.findMany({ select: { id: true, email: true, password: true } });
  const plaintext = admins.filter((admin) => admin.password && !BCRYPT_HASH.test(admin.password));

  for (const admin of plaintext) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: await HashUtil.hashPassword(admin.password) },
    });
  }

  if (plaintext.length > 0) {
    logger.warn('Senhas de admin em texto puro convertidas para hash', {
      emails: plaintext.map((admin) => admin.email),
    });
  }
}

export async function ensureEssentialData(): Promise<void> {
  await ensureLandingPageConfig();
  await hashPlaintextAdminPasswords();
  await ensureDefaultAdmins();
  await ensureRelationshipCategories();
}
