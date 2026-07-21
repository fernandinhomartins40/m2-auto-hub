import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';

/**
 * Categorias de relacionamento "de sistema". Reproduzem os segmentos que antes
 * eram hardcoded no frontend. São criadas de forma idempotente (upsert por key)
 * e nunca sobrescrevem edições feitas pelo admin. Os templates default só são
 * inseridos quando a categoria ainda não possui nenhum template.
 */
const SYSTEM_CATEGORIES: Array<{
  key: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  sortOrder: number;
  sortBy: string;
  sortDir: string;
  defaultTemplate: string;
}> = [
  {
    key: 'birthdays',
    name: 'Aniversariantes próximos',
    description: 'Use essa lista para fortalecer o vínculo com clientes em datas especiais.',
    icon: 'Cake',
    accentColor: '#db2777',
    sortOrder: 10,
    sortBy: 'daysUntilBirthday',
    sortDir: 'asc',
    defaultTemplate:
      'Olá {{firstName}}! Passando para desejar um feliz aniversário em nome de toda a equipe. Que seu dia seja excelente e conte com a gente sempre que precisar.',
  },
  {
    key: 'inactive-sales',
    name: 'Clientes sem novas vendas',
    description: 'Clientes com histórico de compra, mas sem nova venda dentro do período.',
    icon: 'TrendingDown',
    accentColor: '#2563eb',
    sortOrder: 20,
    sortBy: 'daysSinceLastOrder',
    sortDir: 'desc',
    defaultTemplate:
      'Olá {{firstName}}! Tudo bem? Percebemos que faz um tempo desde sua última compra com a gente e gostaríamos de nos colocar à disposição para ajudar no que precisar para o seu veículo.',
  },
  {
    key: 'inactive-revisions',
    name: 'Clientes sem novas revisões',
    description: 'Clientes que já revisaram conosco, mas estão sem retorno de oficina.',
    icon: 'Wrench',
    accentColor: '#ea580c',
    sortOrder: 30,
    sortBy: 'daysSinceLastRevision',
    sortDir: 'desc',
    defaultTemplate:
      'Olá {{firstName}}! Tudo certo? Faz um tempo desde sua última revisão conosco. Se quiser, podemos te ajudar a programar a próxima manutenção do seu veículo.',
  },
  {
    key: 'post-sale',
    name: 'Fila de pós-venda',
    description: 'Clientes com atendimento recente para confirmar satisfação e abrir nova conversa.',
    icon: 'CalendarClock',
    accentColor: '#059669',
    sortOrder: 40,
    sortBy: 'daysSinceLastInteraction',
    sortDir: 'asc',
    defaultTemplate:
      'Olá {{firstName}}! Tudo bem? Estamos entrando em contato no pós-venda para saber se ficou tudo certo com seu atendimento recente e nos colocar à disposição.',
  },
  {
    key: 'vip',
    name: 'Clientes VIP em risco',
    description: 'Clientes de maior valor que estão há bastante tempo sem retornar.',
    icon: 'Crown',
    accentColor: '#7c3aed',
    sortOrder: 50,
    sortBy: 'totalSpent',
    sortDir: 'desc',
    defaultTemplate:
      'Olá {{firstName}}! Sentimos sua falta por aqui. Como cliente especial, queremos reforçar que seguimos à disposição para cuidar do seu veículo com prioridade no atendimento.',
  },
];

export async function ensureRelationshipCategories(): Promise<void> {
  for (const category of SYSTEM_CATEGORIES) {
    // rules fica vazio: o cálculo das categorias de sistema usa os parâmetros
    // dinâmicos (janelas configuráveis) via builder no service.
    const record = await prisma.relationshipCategory.upsert({
      where: { key: category.key },
      update: {},
      create: {
        key: category.key,
        name: category.name,
        description: category.description,
        icon: category.icon,
        accentColor: category.accentColor,
        isSystem: true,
        isActive: true,
        sortOrder: category.sortOrder,
        rules: [],
        sortBy: category.sortBy,
        sortDir: category.sortDir,
      },
    });

    const templateCount = await prisma.relationshipTemplate.count({
      where: { categoryId: record.id },
    });

    if (templateCount === 0) {
      await prisma.relationshipTemplate.create({
        data: {
          categoryId: record.id,
          name: 'Mensagem padrão',
          body: category.defaultTemplate,
          isDefault: true,
          isActive: true,
          sortOrder: 0,
        },
      });
    }
  }

  logger.warn('Ensured relationship categories are available', {
    keys: SYSTEM_CATEGORIES.map((category) => category.key),
  });
}
