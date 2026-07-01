import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Gift,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Package,
  Palette,
  Percent,
  Settings,
  ShoppingBag,
  Smartphone,
  Store,
  Tag,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

export type AdminNavSection =
  | "Operação"
  | "Catálogo"
  | "Clientes"
  | "Marketing"
  | "Gestão";

export type AdminNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: AdminNavSection;
  requiresPermission?: string;
};

export const adminSidebarItems: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Operação" },
  { id: "orders", label: "Pedidos", icon: ShoppingBag, section: "Operação" },
  { id: "quotes", label: "Orçamentos", icon: FileText, section: "Operação" },
  { id: "service-orders", label: "Ordens de Serviço", icon: ClipboardList, section: "Operação" },
  { id: "revisions", label: "Revisões", icon: ClipboardCheck, section: "Operação" },

  { id: "products", label: "Produtos", icon: Package, section: "Catálogo" },
  { id: "services", label: "Serviços", icon: Wrench, section: "Catálogo" },
  { id: "marketplaces", label: "Marketplaces", icon: Store, section: "Catálogo" },

  { id: "customers", label: "Clientes", icon: Users, section: "Clientes" },
  { id: "relationship", label: "Relacionamento", icon: HeartHandshake, section: "Clientes" },
  { id: "support", label: "Suporte", icon: MessageCircle, section: "Clientes" },
  { id: "loyalty", label: "Fidelidade", icon: Gift, section: "Clientes" },

  { id: "coupons", label: "Cupons", icon: Tag, section: "Marketing" },
  { id: "promotions", label: "Promoções", icon: Percent, section: "Marketing" },
  { id: "landing-page", label: "Landing Page", icon: Palette, section: "Marketing" },

  { id: "reports", label: "Relatórios", icon: BarChart3, section: "Gestão" },
  { id: "pwa-settings", label: "PWA", icon: Smartphone, section: "Gestão" },
  { id: "settings", label: "Configurações", icon: Settings, section: "Gestão" },
  {
    id: "users",
    label: "Usuários",
    icon: UserCog,
    section: "Gestão",
    requiresPermission: "canManageAdmins",
  },
];

// "Produtos" fica no menu "Mais" (drawer) para liberar o centro da barra,
// onde fica o botão de Consulta por Placa.
export const adminBottomNavItems: AdminNavItem[] = [
  { id: "dashboard", label: "Início", icon: LayoutDashboard },
  { id: "orders", label: "Pedidos", icon: ShoppingBag },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "menu", label: "Mais", icon: Menu },
];
