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

/**
 * O backend responde `{ success, data }` em todas as rotas do checklist. Metade
 * dos metodos aqui devolvia `response.data` cru e entregava o envelope inteiro
 * no lugar do objeto — desempacotar num so lugar evita repetir o erro.
 */
const conteudo = <T,>(response: { data: unknown }): T => {
  const corpo = response.data as { data?: T } | T;
  return corpo && typeof corpo === 'object' && 'data' in corpo
    ? ((corpo as { data: T }).data ?? (corpo as T))
    : (corpo as T);
};

class ChecklistService {
  /**
   * Get complete checklist structure (For authenticated customers)
   */
  async getChecklistStructure(): Promise<ChecklistStructureResponse> {
    return conteudo(await apiClient.get('/checklist/structure/customer'));
  }

  /**
   * Get complete checklist structure (Admin only)
   */
  async getChecklistStructureAdmin(): Promise<ChecklistStructureResponse> {
    return conteudo(await apiClient.get('/checklist/structure'));
  }

  /**
   * Get only enabled categories with enabled items (Admin)
   */
  async getEnabledCategories(): Promise<ChecklistCategory[]> {
    return conteudo(await apiClient.get('/checklist/categories/enabled'));
  }

  /**
   * Todas as categorias, com os itens inclusive desabilitados: e a visao que a
   * tela de gerenciamento precisa para religar o que foi escondido.
   */
  async getCategories(): Promise<ChecklistCategory[]> {
    return conteudo(
      await apiClient.get('/checklist/categories', { params: { includeItems: 'true' } })
    );
  }

  /**
   * Get category by ID (Admin)
   */
  async getCategoryById(id: string): Promise<ChecklistCategory> {
    return conteudo(await apiClient.get(`/checklist/categories/${id}`));
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
    return conteudo(await apiClient.post('/checklist/categories', data));
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
    return conteudo(await apiClient.put(`/checklist/categories/${id}`, data));
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
    return conteudo(await apiClient.get('/checklist/items'));
  }

  /**
   * Get items by category (Admin)
   */
  async getItemsByCategory(categoryId: string): Promise<ChecklistItem[]> {
    return conteudo(await apiClient.get(`/checklist/categories/${categoryId}/items`));
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
    return conteudo(await apiClient.post('/checklist/items', data));
  }

  /**
   * Update item (Admin - Manager+)
   */
  async updateItem(
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      order?: number;
      isEnabled?: boolean;
    }
  ): Promise<ChecklistItem> {
    return conteudo(await apiClient.put(`/checklist/items/${id}`, data));
  }

  /**
   * Delete item (Admin - Admin only)
   */
  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/checklist/items/${id}`);
  }

  /**
   * Update categories order (Admin - Manager+)
   *
   * A API espera `{ categories: [{ id, order }] }`; a versao antiga mandava uma
   * lista de ids e era rejeitada pelo Zod.
   */
  async updateCategoriesOrder(categoryIds: string[]): Promise<void> {
    await apiClient.put('/checklist/categories/reorder', {
      categories: categoryIds.map((id, order) => ({ id, order })),
    });
  }

  /**
   * Update items order (Admin - Manager+)
   */
  async updateItemsOrder(itemIds: string[]): Promise<void> {
    await apiClient.put('/checklist/items/reorder', {
      items: itemIds.map((id, order) => ({ id, order })),
    });
  }
}

export default new ChecklistService();
