import MechanicSettingsView from './MechanicSettingsView';
import MechanicWorkQueue from './MechanicWorkQueue';

interface MechanicContentProps {
  activeTab: string;
}

export function MechanicContent({ activeTab }: MechanicContentProps) {
  switch (activeTab) {
    case 'work':
      return <MechanicWorkQueue />;
    case 'revisions':
      return <MechanicWorkQueue initialView="revisions" />;
    case 'service-orders':
      return <MechanicWorkQueue initialView="service-orders" />;
    case 'settings':
      return <MechanicSettingsView />;
    default:
      return <MechanicWorkQueue />;
  }
}
