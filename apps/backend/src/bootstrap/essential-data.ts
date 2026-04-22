import { AdminRole, AdminStatus, type LandingPageConfig } from '@prisma/client';

import { prisma } from '@config/database.js';
import { HashUtil } from '@shared/utils/hash.util.js';
import { logger } from '@shared/utils/logger.util.js';

const EMPTY_SECTION_JSON = JSON.stringify({});
const DEFAULT_ADMIN_PASSWORD = 'Test123!';

const defaultAdminSeeds = [
  {
    email: 'admin@m2centerauto.com.br',
    name: 'Administrador M2',
    role: AdminRole.SUPER_ADMIN,
    permissions: ['ALL'],
  },
  {
    email: 'gerente@m2centerauto.com.br',
    name: 'Gerente M2',
    role: AdminRole.MANAGER,
    permissions: ['products', 'services', 'orders', 'customers', 'revisions'],
  },
  {
    email: 'mecanico@m2centerauto.com.br',
    name: 'Mecanico M2',
    role: AdminRole.STAFF,
    permissions: ['revisions', 'vehicles', 'checklist'],
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

export async function ensureDefaultAdmins(): Promise<void> {
  const hashedPassword = await HashUtil.hashPassword(getBootstrapPassword());

  await prisma.$transaction(
    defaultAdminSeeds.map((admin) =>
      prisma.admin.upsert({
        where: { email: admin.email },
        update: {},
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

  logger.warn('Ensured default admin accounts are available', {
    emails: defaultAdminSeeds.map((admin) => admin.email),
  });
}

export async function ensureEssentialData(): Promise<void> {
  await ensureLandingPageConfig();
  await ensureDefaultAdmins();
}
