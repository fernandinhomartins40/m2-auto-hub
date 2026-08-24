import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Customer,
  Vehicle,
  ChecklistCategory,
  ChecklistItem,
  Revision,
  DEFAULT_CHECKLIST_CATEGORIES,
  DEFAULT_CHECKLIST_ITEMS
} from '../types/revisions';
import checklistService, {
  type ChecklistCategory as ApiChecklistCategory
} from '../api/checklistService';
import revisionService from '../api/revisionService';
import { useAuth } from './AuthContext';
import { useAdminAuth } from './AdminAuthContext';

interface RevisionsContextData {
  // Customers
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;

  // Vehicles
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Vehicle;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  getVehicle: (id: string) => Vehicle | undefined;
  getVehiclesByCustomer: (customerId: string) => Vehicle[];

  // Checklist Categories & Items
  //
  // Todas as mutacoes vao ao backend e devolvem Promise: a personalizacao do
  // lojista precisa sobreviver ao F5. Antes eram `setState` locais, entao o
  // item criado sumia no primeiro recarregamento da lista.
  categories: ChecklistCategory[];
  isLoadingCategories: boolean;
  reloadCategories: () => Promise<void>;
  addCategory: (category: Omit<ChecklistCategory, 'id' | 'createdAt'>) => Promise<ChecklistCategory>;
  updateCategory: (id: string, category: Partial<ChecklistCategory>) => Promise<void>;
  toggleCategoryEnabled: (id: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategory: (id: string) => ChecklistCategory | undefined;

  addItemToCategory: (categoryId: string, item: Omit<ChecklistItem, 'id' | 'categoryId' | 'createdAt'>) => Promise<ChecklistItem>;
  updateItem: (categoryId: string, itemId: string, item: Partial<ChecklistItem>) => Promise<void>;
  toggleItemEnabled: (categoryId: string, itemId: string) => Promise<void>;
  deleteItem: (categoryId: string, itemId: string) => Promise<void>;

  // Revisions
  revisions: Revision[];
  isLoadingRevisions: boolean;
  loadRevisions: () => Promise<void>;
  addRevision: (revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt'>) => Revision;
  updateRevision: (id: string, revision: Partial<Revision>) => void;
  deleteRevision: (id: string) => void;
  getRevision: (id: string) => Revision | undefined;
  getRevisionsByVehicle: (vehicleId: string) => Revision[];
  getRevisionsByCustomer: (customerId: string) => Revision[];
}

const RevisionsContext = createContext<RevisionsContextData>({} as RevisionsContextData);

/** Converte o formato da API para o tipo usado nas telas. */
function paraCategoriaLocal(cat: ApiChecklistCategory): ChecklistCategory {
  return {
    id: cat.id,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    order: cat.order,
    isDefault: cat.isDefault,
    isEnabled: cat.isEnabled,
    createdAt: new Date(cat.createdAt),
    items: (cat.items || []).map(item => ({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      order: item.order,
      isDefault: item.isDefault,
      isEnabled: item.isEnabled,
      createdAt: new Date(item.createdAt)
    }))
  };
}

/**
 * Catalogo embutido, usado so quando nao ha sessao ou a API falhou. Os ids sao
 * sinteticos: servem para exibir, nunca para gravar.
 */
function categoriasPadrao(): ChecklistCategory[] {
  const agora = Date.now();
  return DEFAULT_CHECKLIST_CATEGORIES.map((cat, index) => {
    const categoryId = `cat-${agora}-${index}`;
    return {
      ...cat,
      id: categoryId,
      createdAt: new Date(),
      items: (DEFAULT_CHECKLIST_ITEMS[cat.name] || []).map((item, itemIndex) => ({
        ...item,
        id: `item-${agora}-${index}-${itemIndex}`,
        categoryId,
        createdAt: new Date()
      }))
    };
  });
}

export function RevisionsProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const { admin } = useAdminAuth();

  // Load from localStorage
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const stored = localStorage.getItem('moria_customers');
    return stored ? JSON.parse(stored) : [];
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const stored = localStorage.getItem('moria_vehicles');
    return stored ? JSON.parse(stored) : [];
  });

  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Revisions - load from API instead of localStorage
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);

  // Load categories from backend
  const reloadCategories = useCallback(async () => {
    // Sem sessao nao ha o que consultar: mostra o catalogo padrao so para a
    // tela nao ficar vazia (vitrine/demo). Esses ids sao locais e nao servem
    // para gravar nada.
    if (!admin && !customer) {
      setCategories(categoriasPadrao());
      setIsLoadingCategories(false);
      return;
    }

    setIsLoadingCategories(true);
    try {
      // Admin usa a rota de gerenciamento (`/categories?includeItems=true`),
      // que traz tambem o que esta desabilitado — sem isso o gerenciador nao
      // consegue religar um item escondido.
      const categorias = admin
        ? await checklistService.getCategories()
        : (await checklistService.getChecklistStructure()).categories;

      setCategories(categorias.map(paraCategoriaLocal));
    } catch (error) {
      console.error('Error loading checklist categories:', error);
      setCategories(categoriasPadrao());
    } finally {
      setIsLoadingCategories(false);
    }
  }, [admin, customer]);

  useEffect(() => {
    reloadCategories();
  }, [reloadCategories]);

  // Load revisions from API when customer is authenticated
  const loadRevisions = async () => {
    if (!customer) {
      setRevisions([]);
      return;
    }

    try {
      setIsLoadingRevisions(true);
      const result = await revisionService.getCustomerRevisions();

      // Transform backend data to match frontend types
      const transformedRevisions: Revision[] = result.data.map((rev: any) => ({
        id: rev.id,
        customerId: rev.customerId,
        vehicleId: rev.vehicleId,
        vehicle: rev.vehicle ? {
          id: rev.vehicle.id,
          customerId: rev.customerId,
          brand: rev.vehicle.brand,
          model: rev.vehicle.model,
          year: rev.vehicle.year,
          plate: rev.vehicle.plate,
          color: rev.vehicle.color,
          createdAt: new Date()
        } : undefined,
        date: new Date(rev.date),
        mileage: rev.mileage,
        status: rev.status.toLowerCase(),
        checklistItems: rev.checklistItems || [],
        generalNotes: rev.generalNotes,
        recommendations: rev.recommendations,
        assignedMechanicId: rev.assignedMechanicId,
        mechanicName: rev.mechanicName,
        mechanicNotes: rev.mechanicNotes,
        createdAt: new Date(rev.createdAt),
        updatedAt: new Date(rev.updatedAt),
        completedAt: rev.completedAt ? new Date(rev.completedAt) : undefined
      }));

      setRevisions(transformedRevisions);
    } catch (error) {
      console.error('Error loading revisions:', error);
      setRevisions([]);
    } finally {
      setIsLoadingRevisions(false);
    }
  };

  useEffect(() => {
    loadRevisions();
  }, [customer?.id]);

  // Save to localStorage (except categories and revisions, which come from backend)
  useEffect(() => {
    localStorage.setItem('moria_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('moria_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  // Customer methods
  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCustomer: Customer = {
      ...customer,
      id: `customer-${Date.now()}`,
      createdAt: new Date()
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev =>
      prev.map(customer =>
        customer.id === id ? { ...customer, ...updates } : customer
      )
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(customer => customer.id !== id));
  };

  const getCustomer = (id: string) => {
    return customers.find(customer => customer.id === id);
  };

  // Vehicle methods
  const addVehicle = (vehicle: Omit<Vehicle, 'id' | 'createdAt'>): Vehicle => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: `vehicle-${Date.now()}`,
      createdAt: new Date()
    };
    setVehicles(prev => [...prev, newVehicle]);
    return newVehicle;
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles(prev =>
      prev.map(vehicle =>
        vehicle.id === id ? { ...vehicle, ...updates } : vehicle
      )
    );
  };

  const deleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(vehicle => vehicle.id !== id));
  };

  const getVehicle = (id: string) => {
    return vehicles.find(vehicle => vehicle.id === id);
  };

  const getVehiclesByCustomer = (customerId: string) => {
    return vehicles.filter(vehicle => vehicle.customerId === customerId);
  };

  // =========================================================================
  // Checklist: categorias e itens
  //
  // Tudo aqui grava no backend e recarrega a lista. A versao anterior so
  // mexia no estado local, entao a personalizacao do lojista existia apenas
  // ate o proximo recarregamento.
  // =========================================================================

  const addCategory = async (
    category: Omit<ChecklistCategory, 'id' | 'createdAt'>
  ): Promise<ChecklistCategory> => {
    const criada = await checklistService.createCategory({
      name: category.name,
      description: category.description || undefined,
      icon: category.icon || undefined
    });

    await reloadCategories();
    return paraCategoriaLocal({ ...criada, items: [] });
  };

  const updateCategory = async (id: string, updates: Partial<ChecklistCategory>) => {
    await checklistService.updateCategory(id, {
      name: updates.name,
      description: updates.description ?? undefined,
      icon: updates.icon ?? undefined,
      order: updates.order,
      isEnabled: updates.isEnabled
    });
    await reloadCategories();
  };

  const toggleCategoryEnabled = async (id: string) => {
    const atual = categories.find(c => c.id === id);
    if (!atual) return;

    await checklistService.updateCategory(id, { isEnabled: !atual.isEnabled });
    await reloadCategories();
  };

  const deleteCategory = async (id: string) => {
    await checklistService.deleteCategory(id);
    await reloadCategories();
  };

  const getCategory = (id: string) => {
    return categories.find(category => category.id === id);
  };

  const addItemToCategory = async (
    categoryId: string,
    item: Omit<ChecklistItem, 'id' | 'categoryId' | 'createdAt'>
  ): Promise<ChecklistItem> => {
    const criado = await checklistService.createItem({
      categoryId,
      name: item.name,
      description: item.description || undefined
    });

    await reloadCategories();
    return {
      id: criado.id,
      categoryId: criado.categoryId,
      name: criado.name,
      description: criado.description,
      order: criado.order,
      isDefault: criado.isDefault,
      isEnabled: criado.isEnabled,
      createdAt: new Date(criado.createdAt)
    };
  };

  const updateItem = async (
    _categoryId: string,
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => {
    await checklistService.updateItem(itemId, {
      name: updates.name,
      description: updates.description ?? undefined,
      order: updates.order,
      isEnabled: updates.isEnabled
    });
    await reloadCategories();
  };

  const toggleItemEnabled = async (categoryId: string, itemId: string) => {
    const atual = categories
      .find(c => c.id === categoryId)
      ?.items.find(i => i.id === itemId);
    if (!atual) return;

    await checklistService.updateItem(itemId, { isEnabled: !atual.isEnabled });
    await reloadCategories();
  };

  const deleteItem = async (_categoryId: string, itemId: string) => {
    await checklistService.deleteItem(itemId);
    await reloadCategories();
  };

  // Revision methods
  const addRevision = (revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt'>): Revision => {
    const newRevision: Revision = {
      ...revision,
      id: `revision-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setRevisions(prev => [...prev, newRevision]);
    return newRevision;
  };

  const updateRevision = (id: string, updates: Partial<Revision>) => {
    setRevisions(prev =>
      prev.map(revision =>
        revision.id === id
          ? { ...revision, ...updates, updatedAt: new Date() }
          : revision
      )
    );
  };

  const deleteRevision = (id: string) => {
    setRevisions(prev => prev.filter(revision => revision.id !== id));
  };

  const getRevision = (id: string) => {
    return revisions.find(revision => revision.id === id);
  };

  const getRevisionsByVehicle = (vehicleId: string) => {
    return revisions.filter(revision => revision.vehicleId === vehicleId);
  };

  const getRevisionsByCustomer = (customerId: string) => {
    return revisions.filter(revision => revision.customerId === customerId);
  };

  return (
    <RevisionsContext.Provider
      value={{
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomer,
        vehicles,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        getVehicle,
        getVehiclesByCustomer,
        categories,
        isLoadingCategories,
        reloadCategories,
        addCategory,
        updateCategory,
        toggleCategoryEnabled,
        deleteCategory,
        getCategory,
        addItemToCategory,
        updateItem,
        toggleItemEnabled,
        deleteItem,
        revisions,
        isLoadingRevisions,
        loadRevisions,
        addRevision,
        updateRevision,
        deleteRevision,
        getRevision,
        getRevisionsByVehicle,
        getRevisionsByCustomer
      }}
    >
      {children}
    </RevisionsContext.Provider>
  );
}

export function useRevisions() {
  const context = useContext(RevisionsContext);
  if (!context) {
    throw new Error('useRevisions must be used within a RevisionsProvider');
  }
  return context;
}
