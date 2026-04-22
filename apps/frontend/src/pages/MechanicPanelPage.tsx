import { ProtectedMechanicRoute } from '@/components/mechanic/ProtectedMechanicRoute';
import MechanicPanel from '@/components/mechanic/MechanicPanel';

export default function MechanicPanelPage() {
  return (
    <ProtectedMechanicRoute>
      <MechanicPanel />
    </ProtectedMechanicRoute>
  );
}
