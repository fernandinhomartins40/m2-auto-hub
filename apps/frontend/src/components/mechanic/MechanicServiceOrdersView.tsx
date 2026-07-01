import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { ServiceOrdersContent } from '@/components/admin/ServiceOrdersContent';

/**
 * Painel do mecânico: mostra apenas as OS atribuídas ao mecânico logado,
 * reaproveitando o mesmo componente do admin em modo restrito.
 */
export default function MechanicServiceOrdersView() {
  const { admin } = useAdminAuth();
  if (!admin) return null;
  return <ServiceOrdersContent mechanicId={admin.id} restricted />;
}
