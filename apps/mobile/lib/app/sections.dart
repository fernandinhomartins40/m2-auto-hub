import 'package:flutter/material.dart';

/// Seções do painel admin (espelham as tabs do painel web em AdminContent.tsx).
///
/// `implemented` indica se a tela nativa já existe ou se é placeholder.
class AdminSection {
  const AdminSection({
    required this.id,
    required this.label,
    required this.icon,
    this.implemented = false,
  });

  final String id;
  final String label;
  final IconData icon;
  final bool implemented;

  String get route => '/section/$id';
}

const kAdminSections = <AdminSection>[
  AdminSection(id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard),
  AdminSection(
    id: 'plate-lookup',
    label: 'Consulta por Placa',
    icon: Icons.pin_outlined,
    implemented: true,
  ),
  AdminSection(id: 'service-orders', label: 'Ordens de Serviço', icon: Icons.build),
  AdminSection(id: 'products', label: 'Produtos', icon: Icons.inventory_2),
  AdminSection(id: 'services', label: 'Serviços', icon: Icons.handyman),
  AdminSection(id: 'orders', label: 'Pedidos', icon: Icons.shopping_cart),
  AdminSection(id: 'quotes', label: 'Orçamentos', icon: Icons.request_quote),
  AdminSection(id: 'customers', label: 'Clientes', icon: Icons.people),
  AdminSection(id: 'relationship', label: 'Relacionamento', icon: Icons.favorite),
  AdminSection(id: 'revisions', label: 'Revisões', icon: Icons.fact_check),
  AdminSection(id: 'loyalty', label: 'Fidelidade', icon: Icons.card_giftcard),
  AdminSection(id: 'coupons', label: 'Cupons', icon: Icons.local_offer),
  AdminSection(id: 'promotions', label: 'Promoções', icon: Icons.campaign),
  AdminSection(id: 'marketplaces', label: 'Marketplaces', icon: Icons.storefront),
  AdminSection(id: 'support', label: 'Suporte', icon: Icons.support_agent),
  AdminSection(id: 'reports', label: 'Relatórios', icon: Icons.bar_chart),
  AdminSection(id: 'users', label: 'Usuários', icon: Icons.admin_panel_settings),
  AdminSection(id: 'settings', label: 'Configurações', icon: Icons.settings),
];

AdminSection sectionById(String id) =>
    kAdminSections.firstWhere((s) => s.id == id, orElse: () => kAdminSections.first);
