import MechanicRevisionsView from './MechanicRevisionsView';
import MechanicSettingsView from './MechanicSettingsView';

interface MechanicContentProps {
  activeTab: string;
}

export function MechanicContent({ activeTab }: MechanicContentProps) {
  switch (activeTab) {
    case 'revisions':
      return <MechanicRevisionsView />;
    case 'settings':
      return <MechanicSettingsView />;
    default:
      return <MechanicRevisionsView />;
  }
}
