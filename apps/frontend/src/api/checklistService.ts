import apiClient from './apiClient';

export interface ChecklistItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  order: number;
  isDefault: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
  isDefault: boolean;
  isEnabled: boolean;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistStructureResponse {
  categories: ChecklistCategory[];
  totalCategories: number;
  totalItems: number;
  enabledCategories: number;
  enabledItems: number;
}

class ChecklistService {
  /**
   * Get complete checklist structure (For authenticated customers)
   */
  async getChecklistStructure(): Promise<ChecklistStructureResponse> {
    const response = await apiClient.get('/checklist/structure/customer');
    return response.data.data || response.data;
  }

  /**
   * Get complete checklist structure (Admin only)
   */
  async getChecklistStructureAdmin(): Promise<ChecklistStructureResponse> {
    const response = await apiClient.get('/checklist/structure');
    return response.data.data || response.data;
  }

  /**
   * Get only enabled categories with enabled items (Admin)
   */
  async getEnabledCategories(): Promise<ChecklistCategory[]> {
    const response = await apiClient.get('/checklist/categories/enabled');
    return response.data;
  }

  /**
   * Get all categories (Admin)
   */
  async getCategories(): Promise<ChecklistCategory[]> {
    const response = await apiClient.get('/checklist/categories');
    return response.data;
  }

  /**
   * Get category by ID (Admin)
   */
  async getCategoryById(id: string): Promise<ChecklistCategory> {
    const response = await apiClient.get(`/checklist/categories/${id}`);
    return response.data;
  }

  /**
   * Create new category (Admin - Manager+)
   */
  async createCategory(data: {
    name: string;
    description?: string;
    icon?: string;
    order?: number;
  }): Promise<ChecklistCategory> {
    const response = await apiClient.post('/checklist/categories', data);
    return response.data;
  }

  /**
   * Update category (Admin - Manager+)
   */
  async updateCategory(
    id: string,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      order?: number;
      isEnabled?: boolean;
    }
  ): Promise<ChecklistCategory> {
    const response = await apiClient.put(`/checklist/categories/${id}`, data);
    return response.data;
  }

  /**
   * Delete category (Admin - Admin only)
   */
  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/checklist/categories/${id}`);
  }

  /**
   * Get all items (Admin)
   */
  async getItems(): Promise<ChecklistItem[]> {
    const response = await apiClient.get('/checklist/items');
    return response.data;
  }

  /**
   * Get items by category (Admin)
   */
  async getItemsByCategory(categoryId: string): Promise<ChecklistItem[]> {
    const response = await apiClient.get(`/checklist/categories/${categoryId}/items`);
    return response.data;
  }

  /**
   * Create new item (Admin - Manager+)
   */
  async createItem(data: {
    categoryId: string;
    name: string;
    description?: string;
    order?: number;
  }): Promise<ChecklistItem> {
    const response = await apiClient.post('/checklist/items', data);
    return response.data;
  }

  /**
   * Update item (Admin - Manager+)
   */
  async updateItem(
    id: string,
    data: {
      name?: string;
      description?: string;
      order?: number;
      isEnabled?: boolean;
    }
  ): Promise<ChecklistItem> {
    const response = await apiClient.put(`/checklist/items/${id}`, data);
    return response.data;
  }

  /**
   * Delete item (Admin - Admin only)
   */
  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/checklist/items/${id}`);
  }

  /**
   * Update categories order (Admin - Manager+)
   */
  async updateCategoriesOrder(categoryIds: string[]): Promise<void> {
    await apiClient.put('/checklist/categories/reorder', { categoryIds });
  }

  /**
   * Update items order (Admin - Manager+)
   */
  async updateItemsOrder(itemIds: string[]): Promise<void> {
    await apiClient.put('/checklist/items/reorder', { itemIds });
  }
}

export default new ChecklistService();
