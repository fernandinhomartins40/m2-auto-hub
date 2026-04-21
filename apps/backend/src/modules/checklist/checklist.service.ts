import { ChecklistCategory, ChecklistItem } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { logger } from '@shared/utils/logger.util.js';

export type CategoryWithItems = ChecklistCategory & {
  items: ChecklistItem[];
};

export class ChecklistService {
  // =============================================================================
  // CATEGORIES
  // =============================================================================

  /**
   * Get all categories
   */
  async getCategories(includeItems: boolean = false): Promise<CategoryWithItems[]> {
    return prisma.checklistCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        items: includeItems
          ? {
              where: { isEnabled: true },
              orderBy: { order: 'asc' },
            }
          : false,
      },
    }) as Promise<CategoryWithItems[]>;
  }

  /**
   * Get enabled categories only
   */
  async getEnabledCategories(includeItems: boolean = true): Promise<CategoryWithItems[]> {
    return prisma.checklistCategory.findMany({
      where: { isEnabled: true },
      orderBy: { order: 'asc' },
      include: {
        items: includeItems
          ? {
              where: { isEnabled: true },
              orderBy: { order: 'asc' },
            }
          : false,
      },
    }) as Promise<CategoryWithItems[]>;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<CategoryWithItems> {
    const category = await prisma.checklistCategory.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    return category as CategoryWithItems;
  }

  /**
   * Create category
   */
  async createCategory(dto: CreateCategoryDto): Promise<ChecklistCategory> {
    const category = await prisma.checklistCategory.create({
      data: dto,
    });

    logger.info(`Checklist category created: ${category.name}`);

    return category;
  }

  /**
   * Update category
   */
  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<ChecklistCategory> {
    // Verify category exists
    await this.getCategoryById(id);

    const category = await prisma.checklistCategory.update({
      where: { id },
      data: dto,
    });

    logger.info(`Checklist category updated: ${category.name}`);

    return category;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    // Verify category exists
    const category = await this.getCategoryById(id);

    // Prevent deletion of default categories
    if (category.isDefault) {
      throw ApiError.badRequest('Cannot delete default category');
    }

    // Check if category has items
    if (category.items.length > 0) {
      throw ApiError.badRequest(
        'Cannot delete category with items. Please delete items first or move them to another category.'
      );
    }

    await prisma.checklistCategory.delete({
      where: { id },
    });

    logger.info(`Checklist category deleted: ${id}`);
  }

  // =============================================================================
  // ITEMS
  // =============================================================================

  /**
   * Get all items
   */
  async getItems(): Promise<ChecklistItem[]> {
    return prisma.checklistItem.findMany({
      orderBy: [{ categoryId: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * Get items by category
   */
  async getItemsByCategory(categoryId: string): Promise<ChecklistItem[]> {
    // Verify category exists
    await this.getCategoryById(categoryId);

    return prisma.checklistItem.findMany({
      where: { categoryId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get item by ID
   */
  async getItemById(id: string): Promise<ChecklistItem> {
    const item = await prisma.checklistItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw ApiError.notFound('Checklist item not found');
    }

    return item;
  }

  /**
   * Create item
   */
  async createItem(dto: CreateItemDto): Promise<ChecklistItem> {
    // Verify category exists
    await this.getCategoryById(dto.categoryId);

    const item = await prisma.checklistItem.create({
      data: dto,
    });

    logger.info(`Checklist item created: ${item.name} in category ${dto.categoryId}`);

    return item;
  }

  /**
   * Update item
   */
  async updateItem(id: string, dto: UpdateItemDto): Promise<ChecklistItem> {
    // Verify item exists
    await this.getItemById(id);

    // If changing category, verify new category exists
    if (dto.categoryId) {
      await this.getCategoryById(dto.categoryId);
    }

    const item = await prisma.checklistItem.update({
      where: { id },
      data: dto,
    });

    logger.info(`Checklist item updated: ${item.name}`);

    return item;
  }

  /**
   * Delete item
   */
  async deleteItem(id: string): Promise<void> {
    // Verify item exists
    const item = await this.getItemById(id);

    // Prevent deletion of default items
    if (item.isDefault) {
      throw ApiError.badRequest('Cannot delete default checklist item');
    }

    await prisma.checklistItem.delete({
      where: { id },
    });

    logger.info(`Checklist item deleted: ${id}`);
  }

  /**
   * Bulk update items order
   */
  async updateItemsOrder(items: { id: string; order: number }[]): Promise<void> {
    // Update all items in a transaction
    await prisma.$transaction(
      items.map(item =>
        prisma.checklistItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    logger.info(`Updated order for ${items.length} checklist items`);
  }

  /**
   * Bulk update categories order
   */
  async updateCategoriesOrder(categories: { id: string; order: number }[]): Promise<void> {
    // Update all categories in a transaction
    await prisma.$transaction(
      categories.map(category =>
        prisma.checklistCategory.update({
          where: { id: category.id },
          data: { order: category.order },
        })
      )
    );

    logger.info(`Updated order for ${categories.length} categories`);
  }

  /**
   * Get complete checklist structure (for use in revisions)
   */
  async getChecklistStructure() {
    const categories = await this.getEnabledCategories(true);

    const totalCategories = categories.length;
    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const enabledCategories = categories.filter(cat => cat.isEnabled).length;
    const enabledItems = categories.reduce((sum, cat) =>
      sum + cat.items.filter(item => item.isEnabled).length, 0
    );

    return {
      categories,
      totalCategories,
      totalItems,
      enabledCategories,
      enabledItems
    };
  }
}
