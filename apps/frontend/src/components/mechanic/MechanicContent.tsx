import MechanicRevisionsView from './MechanicRevisionsView';
import MechanicServiceOrdersView from './MechanicServiceOrdersView';
import MechanicSettingsView from './MechanicSettingsView';

interface MechanicContentProps {
  activeTab: string;
}

export function MechanicContent({ activeTab }: MechanicContentProps) {
  switch (activeTab) {
    case 'revisions':
      return <MechanicRevisionsView />;
    case 'service-orders':
      return <MechanicServiceOrdersView />;
    case 'settings':
      return <MechanicSettingsView />;
    default:
      return <MechanicRevisionsView />;
  }
}
