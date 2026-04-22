// Tipos para o sistema de Revisões Veiculares

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  createdAt: Date;
}

export interface Vehicle {
  id: string;
  customerId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  chassisNumber?: string;
  color?: string;
  mileage?: number;
  createdAt: Date;
}

export interface ChecklistItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  isDefault: boolean; // Se é item padrão do sistema
  isEnabled: boolean; // Se está habilitado
  order: number;
  createdAt: Date;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isDefault: boolean; // Se é categoria padrão do sistema
  isEnabled: boolean; // Se está habilitada
  order: number;
  items: ChecklistItem[];
  createdAt: Date;
}

export enum ItemStatus {
  NOT_CHECKED = 'NOT_CHECKED',
  OK = 'OK',
  ATTENTION = 'ATTENTION',
  CRITICAL = 'CRITICAL',
  NOT_APPLICABLE = 'NOT_APPLICABLE'
}

export interface RevisionChecklistItem {
  itemId: string;
  status: ItemStatus;
  notes?: string;
  photos?: string[];
  checkedAt?: Date;
  checkedBy?: string;
}

export interface Revision {
  id: string;
  customerId: string;
  vehicleId: string;
  vehicle?: Vehicle; // Vehicle data from API (optional for backwards compatibility)
  date: Date;
  mileage?: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  checklistItems: RevisionChecklistItem[];
  generalNotes?: string;
  recommendations?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Dados padrão do checklist
export const DEFAULT_CHECKLIST_CATEGORIES: Omit<ChecklistCategory, 'id' | 'createdAt'>[] = [
  {
    name: 'Sistema de Freios',
    description: 'Verificação completa do sistema de frenagem',
    icon: '🛑',
    isDefault: true,
    isEnabled: true,
    order: 1,
    items: []
  },
  {
    name: 'Suspensão e Direção',
    description: 'Inspeção de componentes de suspensão e direção',
    icon: '🔧',
    isDefault: true,
    isEnabled: true,
    order: 2,
    items: []
  },
  {
    name: 'Motor',
    description: 'Verificações do sistema motor',
    icon: '⚙️',
    isDefault: true,
    isEnabled: true,
    order: 3,
    items: []
  },
  {
    name: 'Sistema Elétrico',
    description: 'Inspeção elétrica e eletrônica',
    icon: '⚡',
    isDefault: true,
    isEnabled: true,
    order: 4,
    items: []
  },
  {
    name: 'Pneus e Rodas',
    description: 'Verificação de pneus, rodas e alinhamento',
    icon: '🔲',
    isDefault: true,
    isEnabled: true,
    order: 5,
    items: []
  },
  {
    name: 'Fluidos',
    description: 'Níveis e condição dos fluidos',
    icon: '💧',
    isDefault: true,
    isEnabled: true,
    order: 6,
    items: []
  },
  {
    name: 'Escapamento',
    description: 'Verificação do sistema de escapamento',
    icon: '💨',
    isDefault: true,
    isEnabled: true,
    order: 7,
    items: []
  },
  {
    name: 'Carroceria e Acabamento',
    description: 'Inspeção externa e interna',
    icon: '🚗',
    isDefault: true,
    isEnabled: true,
    order: 8,
    items: []
  },
  {
    name: 'Ar Condicionado',
    description: 'Sistema de climatização',
    icon: '❄️',
    isDefault: true,
    isEnabled: true,
    order: 9,
    items: []
  },
  {
    name: 'Transmissão',
    description: 'Caixa de câmbio e embreagem',
    icon: '⚙️',
    isDefault: true,
    isEnabled: true,
    order: 10,
    items: []
  }
];

export const DEFAULT_CHECKLIST_ITEMS: Record<string, Omit<ChecklistItem, 'id' | 'categoryId' | 'createdAt'>[]> = {
  'Sistema de Freios': [
    { name: 'Pastilhas de freio dianteiras', description: 'Verificar espessura e desgaste', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Pastilhas de freio traseiras', description: 'Verificar espessura e desgaste', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Discos de freio', description: 'Verificar desgaste e empenamento', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Fluido de freio', description: 'Verificar nível e condição', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Mangueiras de freio', description: 'Verificar vazamentos e condição', isDefault: true, isEnabled: true, order: 5 },
    { name: 'Freio de estacionamento', description: 'Testar funcionamento', isDefault: true, isEnabled: true, order: 6 },
    { name: 'Servo-freio', description: 'Verificar funcionamento', isDefault: true, isEnabled: true, order: 7 }
  ],
  'Suspensão e Direção': [
    { name: 'Amortecedores dianteiros', description: 'Verificar vazamentos e condição', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Amortecedores traseiros', description: 'Verificar vazamentos e condição', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Molas', description: 'Verificar condição e altura', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Buchas e coxins', description: 'Verificar desgaste e trincas', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Barra estabilizadora', description: 'Verificar fixação e buchas', isDefault: true, isEnabled: true, order: 5 },
    { name: 'Terminais de direção', description: 'Verificar folgas', isDefault: true, isEnabled: true, order: 6 },
    { name: 'Caixa de direção', description: 'Verificar vazamentos e folgas', isDefault: true, isEnabled: true, order: 7 },
    { name: 'Fluido de direção hidráulica', description: 'Verificar nível (se aplicável)', isDefault: true, isEnabled: true, order: 8 },
    { name: 'Geometria/Alinhamento', description: 'Verificar necessidade', isDefault: true, isEnabled: true, order: 9 }
  ],
  'Motor': [
    { name: 'Correia dentada/corrente', description: 'Verificar condição e tensão', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Correia do alternador', description: 'Verificar condição e tensão', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Velas de ignição', description: 'Verificar condição e gap', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Filtro de ar', description: 'Verificar limpeza e necessidade de troca', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Filtro de combustível', description: 'Verificar e considerar troca', isDefault: true, isEnabled: true, order: 5 },
    { name: 'Bateria', description: 'Testar carga e terminais', isDefault: true, isEnabled: true, order: 6 },
    { name: 'Velas de aquecimento (diesel)', description: 'Verificar funcionamento', isDefault: true, isEnabled: true, order: 7 },
    { name: 'Sistema de injeção', description: 'Verificar funcionamento', isDefault: true, isEnabled: true, order: 8 },
    { name: 'Mangueiras do motor', description: 'Verificar vazamentos e rachaduras', isDefault: true, isEnabled: true, order: 9 }
  ],
  'Sistema Elétrico': [
    { name: 'Faróis dianteiros', description: 'Testar funcionamento e regulagem', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Lanternas traseiras', description: 'Testar funcionamento', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Setas/Piscas', description: 'Testar funcionamento', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Luz de freio', description: 'Testar funcionamento', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Luz de ré', description: 'Testar funcionamento', isDefault: true, isEnabled: true, order: 5 },
    { name: 'Limpadores de para-brisa', description: 'Testar funcionamento e palhetas', isDefault: true, isEnabled: true, order: 6 },
    { name: 'Buzina', description: 'Testar funcionamento', isDefault: true, isEnabled: true, order: 7 },
    { name: 'Alternador', description: 'Verificar carga', isDefault: true, isEnabled: true, order: 8 },
    { name: 'Motor de arranque', description: 'Verificar funcionamento', isDefault: true, isEnabled: true, order: 9 }
  ],
  'Pneus e Rodas': [
    { name: 'Pneu dianteiro esquerdo', description: 'Verificar pressão, desgaste e avarias', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Pneu dianteiro direito', description: 'Verificar pressão, desgaste e avarias', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Pneu traseiro esquerdo', description: 'Verificar pressão, desgaste e avarias', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Pneu traseiro direito', description: 'Verificar pressão, desgaste e avarias', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Estepe', description: 'Verificar pressão e condição', isDefault: true, isEnabled: true, order: 5 },
    { name: 'Rodas', description: 'Verificar amassados e trincas', isDefault: true, isEnabled: true, order: 6 },
    { name: 'Porcas de roda', description: 'Verificar aperto', isDefault: true, isEnabled: true, order: 7 }
  ],
  'Fluidos': [
    { name: 'Óleo do motor', description: 'Verificar nível e condição', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Fluido de arrefecimento', description: 'Verificar nível e condição', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Fluido de freio', description: 'Verificar nível e cor', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Óleo da transmissão', description: 'Verificar nível e condição', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Fluido de direção hidráulica', description: 'Verificar nível (se aplicável)', isDefault: true, isEnabled: true, order: 5 },
    { name: 'Fluido do limpador', description: 'Verificar nível', isDefault: true, isEnabled: true, order: 6 }
  ],
  'Escapamento': [
    { name: 'Coletor de escape', description: 'Verificar vazamentos', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Catalisador', description: 'Verificar funcionamento e fixação', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Silenciador', description: 'Verificar furos e ferrugem', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Ponteira', description: 'Verificar fixação', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Suportes de escape', description: 'Verificar fixação', isDefault: true, isEnabled: true, order: 5 }
  ],
  'Carroceria e Acabamento': [
    { name: 'Para-choques', description: 'Verificar avarias e fixação', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Retrovisores', description: 'Verificar funcionamento e fixação', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Vidros', description: 'Verificar trincas e mecanismo', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Portas', description: 'Verificar fechamento e travas', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Capô', description: 'Verificar fechamento e trava', isDefault: true, isEnabled: true, order: 5 },
    { name: 'Porta-malas', description: 'Verificar fechamento e trava', isDefault: true, isEnabled: true, order: 6 },
    { name: 'Cintos de segurança', description: 'Verificar funcionamento', isDefault: true, isEnabled: true, order: 7 },
    { name: 'Painéis internos', description: 'Verificar fixação', isDefault: true, isEnabled: true, order: 8 }
  ],
  'Ar Condicionado': [
    { name: 'Compressor', description: 'Verificar funcionamento e ruídos', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Condensador', description: 'Verificar sujeira e avarias', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Evaporador', description: 'Verificar vazamentos', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Gás refrigerante', description: 'Verificar nível', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Filtro de ar condicionado', description: 'Verificar limpeza', isDefault: true, isEnabled: true, order: 5 },
    { name: 'Correias', description: 'Verificar tensão', isDefault: true, isEnabled: true, order: 6 }
  ],
  'Transmissão': [
    { name: 'Óleo da caixa de câmbio', description: 'Verificar nível e condição', isDefault: true, isEnabled: true, order: 1 },
    { name: 'Embreagem', description: 'Verificar funcionamento e regulagem', isDefault: true, isEnabled: true, order: 2 },
    { name: 'Acionamento da embreagem', description: 'Verificar cabo/fluido', isDefault: true, isEnabled: true, order: 3 },
    { name: 'Junta homocinética', description: 'Verificar coifas e folgas', isDefault: true, isEnabled: true, order: 4 },
    { name: 'Cardan (se aplicável)', description: 'Verificar folgas e cruzetas', isDefault: true, isEnabled: true, order: 5 }
  ]
};
