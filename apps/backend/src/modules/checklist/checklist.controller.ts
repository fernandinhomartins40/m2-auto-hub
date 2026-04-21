import { Request, Response, NextFunction } from 'express';
import { ChecklistService } from './checklist.service.js';
import { createCategorySchema } from './dto/create-category.dto.js';
import { updateCategorySchema } from './dto/update-category.dto.js';
import { createItemSchema } from './dto/create-item.dto.js';
import { updateItemSchema } from './dto/update-item.dto.js';
import { z } from 'zod';

export class ChecklistController {
  private checklistService: ChecklistService;

  constructor() {
    this.checklistService = new ChecklistService();
  }

  // =============================================================================
  // CATEGORIES
  // =============================================================================

  /**
   * GET /checklist/categories
   * Get all categories
   */
  getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeItems = req.query.includeItems === 'true';
      const categories = await this.checklistService.getCategories(includeItems);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /checklist/categories/enabled
   * Get enabled categories only
   */
  getEnabledCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeItems = req.query.includeItems !== 'false'; // Default true
      const categories = await this.checklistService.getEnabledCategories(includeItems);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /checklist/categories/:id
   * Get category by ID
   */
  getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = await this.checklistService.getCategoryById(req.params.id);

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /checklist/categories
   * Create category
   */
  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = createCategorySchema.parse(req.body);
      const category = await this.checklistService.createCategory(dto);

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /checklist/categories/:id
   * Update category
   */
  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateCategorySchema.parse(req.body);
      const category = await this.checklistService.updateCategory(req.params.id, dto);

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /checklist/categories/:id
   * Delete category
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.checklistService.deleteCategory(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /checklist/categories/reorder
   * Bulk update categories order
   */
  updateCategoriesOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        categories: z.array(
          z.object({
            id: z.string().uuid(),
            order: z.number().int().min(0),
          })
        ),
      });

      const { categories } = schema.parse(req.body);
      await this.checklistService.updateCategoriesOrder(categories);

      res.status(200).json({
        success: true,
        message: 'Categories order updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // =============================================================================
  // ITEMS
  // =============================================================================

  /**
   * GET /checklist/items
   * Get all items
   */
  getItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.checklistService.getItems();

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /checklist/categories/:categoryId/items
   * Get items by category
   */
  getItemsByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.checklistService.getItemsByCategory(req.params.categoryId);

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /checklist/items/:id
   * Get item by ID
   */
  getItemById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.checklistService.getItemById(req.params.id);

      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /checklist/items
   * Create item
   */
  createItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = createItemSchema.parse(req.body);
      const item = await this.checklistService.createItem(dto);

      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /checklist/items/:id
   * Update item
   */
  updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = updateItemSchema.parse(req.body);
      const item = await this.checklistService.updateItem(req.params.id, dto);

      res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /checklist/items/:id
   * Delete item
   */
  deleteItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.checklistService.deleteItem(req.params.id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /checklist/items/reorder
   * Bulk update items order
   */
  updateItemsOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            order: z.number().int().min(0),
          })
        ),
      });

      const { items } = schema.parse(req.body);
      await this.checklistService.updateItemsOrder(items);

      res.status(200).json({
        success: true,
        message: 'Items order updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /checklist/structure
   * Get complete checklist structure
   */
  getChecklistStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const structure = await this.checklistService.getChecklistStructure();

      res.status(200).json({
        success: true,
        data: structure,
      });
    } catch (error) {
      next(error);
    }
  };
}
