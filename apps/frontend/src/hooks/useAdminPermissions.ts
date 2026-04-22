import { useAdminAuth } from '@/contexts/AdminAuthContext';

/**
 * Hook for granular permission checking
 * ✅ SECURITY ENHANCEMENT: Fine-grained UI control
 */
export function useAdminPermissions() {
  const { admin, hasMinRole, hasRole } = useAdminAuth();

  if (!admin) {
    return {
      // User Management
      canCreateUser: false,
      canEditUser: false,
      canDeleteUser: false,
      canViewUsers: false,
      canManageAdmins: false,
      canCreateAdmins: false,
      canCreateSuperAdmin: false,
      canUpdateAdmins: false,
      canDeleteAdmins: false,

      // Products
      canCreateProduct: false,
      canEditProduct: false,
      canDeleteProduct: false,
      canViewProducts: true, // STAFF pode ver

      // Orders
      canEditOrder: false,
      canCancelOrder: false,
      canViewAllOrders: false,

      // Revisions
      canAssignMechanic: false,
      canViewAllRevisions: false,
      canViewOwnRevisionsOnly: false,
      canEditRevision: true,
      canDeleteRevision: false,

      // Quotes
      canApproveQuote: false,
      canRejectQuote: false,
      canEditQuotePrices: false,

      // General
      role: null,
      isStaff: false,
      isManager: false,
      isAdmin: false,
      isSuperAdmin: false,
    };
  }

  const isStaff = hasRole('STAFF');
  const isManager = hasMinRole('MANAGER');
  const isAdmin = hasMinRole('ADMIN');
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  return {
    // User Management
    canCreateUser: hasMinRole('ADMIN'),
    canEditUser: hasMinRole('ADMIN'),
    canDeleteUser: isSuperAdmin,
    canViewUsers: hasMinRole('ADMIN'),
    canManageAdmins: hasMinRole('ADMIN'), // Can view and manage admin users section
    canCreateAdmins: hasMinRole('ADMIN'), // Can create new admin users
    canCreateSuperAdmin: isSuperAdmin,
    canUpdateAdmins: hasMinRole('ADMIN'), // Can update admin users
    canDeleteAdmins: isSuperAdmin,

    // Products
    canCreateProduct: hasMinRole('MANAGER'),
    canEditProduct: hasMinRole('MANAGER'),
    canDeleteProduct: hasMinRole('ADMIN'),
    canViewProducts: true,

    // Orders
    canEditOrder: hasMinRole('MANAGER'),
    canCancelOrder: hasMinRole('MANAGER'),
    canViewAllOrders: true,

    // Revisions
    canAssignMechanic: hasMinRole('MANAGER'),
    canViewAllRevisions: hasMinRole('MANAGER'),
    canViewOwnRevisionsOnly: isStaff,
    canEditRevision: true, // Todos podem editar (com restrição no backend)
    canDeleteRevision: hasMinRole('ADMIN'),

    // Quotes
    canApproveQuote: hasMinRole('MANAGER'),
    canRejectQuote: hasMinRole('MANAGER'),
    canEditQuotePrices: true, // STAFF pode cotar

    // General
    role: admin.role,
    isStaff,
    isManager,
    isAdmin,
    isSuperAdmin,
  };
}
