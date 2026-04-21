import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';

export class FAQService {
  /**
   * Listar todas as categorias com itens ativos
   */
  async getFAQCategories(includeInactive = false) {
    const categories = await prisma.fAQCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        items: {
          where: includeInactive ? undefined : { isActive: true },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return categories;
  }

  /**
   * Buscar no FAQ
   */
  async searchFAQ(query: string) {
    const searchTerm = query.toLowerCase();

    const items = await prisma.fAQItem.findMany({
      where: {
        isActive: true,
        OR: [
          {
            question: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            answer: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
      take: 20,
    });

    return items;
  }

  /**
   * Marcar FAQ como útil/não útil
   */
  async markFAQHelpful(faqId: string, isHelpful: boolean) {
    const item = await prisma.fAQItem.findUnique({
      where: { id: faqId },
    });

    if (!item) {
      throw ApiError.notFound('Item FAQ não encontrado');
    }

    const updated = await prisma.fAQItem.update({
      where: { id: faqId },
      data: isHelpful
        ? { helpfulYes: { increment: 1 } }
        : { helpfulNo: { increment: 1 } },
    });

    return updated;
  }

  /**
   * Incrementar visualizações
   */
  async incrementFAQView(faqId: string) {
    const updated = await prisma.fAQItem.update({
      where: { id: faqId },
      data: {
        views: { increment: 1 },
      },
    });

    return updated;
  }

  /**
   * Admin: Criar categoria FAQ
   */
  async createCategory(data: {
    name: string;
    description?: string;
    icon?: string;
    order: number;
  }) {
    const category = await prisma.fAQCategory.create({
      data,
    });

    return category;
  }

  /**
   * Admin: Atualizar categoria FAQ
   */
  async updateCategory(
    categoryId: string,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      order?: number;
      isActive?: boolean;
    }
  ) {
    const category = await prisma.fAQCategory.update({
      where: { id: categoryId },
      data,
    });

    return category;
  }

  /**
   * Admin: Deletar categoria FAQ
   */
  async deleteCategory(categoryId: string) {
    await prisma.fAQCategory.delete({
      where: { id: categoryId },
    });
  }

  /**
   * Admin: Criar item FAQ
   */
  async createItem(data: {
    categoryId: string;
    question: string;
    answer: string;
    order: number;
    keywords?: string[];
  }) {
    const item = await prisma.fAQItem.create({
      data: {
        ...data,
        keywords: data.keywords,
      },
      include: {
        category: true,
      },
    });

    return item;
  }

  /**
   * Admin: Atualizar item FAQ
   */
  async updateItem(
    itemId: string,
    data: {
      question?: string;
      answer?: string;
      order?: number;
      isActive?: boolean;
      keywords?: string[];
    }
  ) {
    const item = await prisma.fAQItem.update({
      where: { id: itemId },
      data,
      include: {
        category: true,
      },
    });

    return item;
  }

  /**
   * Admin: Deletar item FAQ
   */
  async deleteItem(itemId: string) {
    await prisma.fAQItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Admin: Estatísticas FAQ
   */
  async getFAQStats() {
    const [totalCategories, totalItems, topViewed, topHelpful, topUnhelpful] = await Promise.all([
      prisma.fAQCategory.count({ where: { isActive: true } }),
      prisma.fAQItem.count({ where: { isActive: true } }),
      prisma.fAQItem.findMany({
        where: { isActive: true },
        orderBy: { views: 'desc' },
        take: 10,
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.fAQItem.findMany({
        where: { isActive: true },
        orderBy: { helpfulYes: 'desc' },
        take: 10,
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.fAQItem.findMany({
        where: { isActive: true },
        orderBy: { helpfulNo: 'desc' },
        take: 10,
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      totalCategories,
      totalItems,
      topViewed,
      topHelpful,
      topUnhelpful,
    };
  }
}
