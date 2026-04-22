import { useState, useEffect } from 'react';
import { useSupport } from '../../../hooks/useSupport';
import { useFAQ } from '../../../hooks/useFAQ';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  MessageCircle,
  Plus,
  Search,
  PhoneCall,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { CreateTicketModal } from './CreateTicketModal';
import { TicketList } from './TicketList';
import { FAQSection } from './FAQSection';
import { QuickContactCard } from './QuickContactCard';
import { TicketDetails } from './TicketDetails';

export function SupportDashboard() {
  const { stats, loadStats, currentTicket, loadTicket } = useSupport();
  const { config } = useFAQ();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [activeView, setActiveView] = useState<'tickets' | 'faq'>('tickets');

  useEffect(() => {
    loadStats({ silent: true }).catch(() => {
      // Silently fail - user might not be on support page yet
    });
  }, [loadStats]);

  const handleOpenTicket = async (ticketId: string) => {
    await loadTicket(ticketId);
    setShowTicketDetails(true);
  };

  const handleWhatsAppSupport = () => {
    if (config) {
      const message = config.contacts.whatsapp.message;
      const number = config.contacts.whatsapp.number;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suporte ao Cliente</h1>
          <p className="text-muted-foreground">Como podemos te ajudar hoje?</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-moria-orange hover:bg-moria-orange/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abertos</p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolvidos</p>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avaliação Média</p>
                  <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickContactCard
          title="WhatsApp"
          description="Fale conosco agora mesmo"
          icon={MessageCircle}
          color="bg-green-500"
          action="Abrir Chat"
          onClick={handleWhatsAppSupport}
        />

        <QuickContactCard
          title="Email"
          description={config?.contacts.email || 'suporte@moriapecas.com.br'}
          icon={Mail}
          color="bg-blue-500"
          action="Enviar Email"
          onClick={() => window.location.href = `mailto:${config?.contacts.email}`}
        />

        <QuickContactCard
          title="Telefone"
          description={config?.contacts.phone || '(11) 99999-9999'}
          icon={PhoneCall}
          color="bg-purple-500"
          action="Ligar Agora"
          onClick={() => window.location.href = `tel:${config?.contacts.phone}`}
        />
      </div>

      {/* Status Online/Offline */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários de Atendimento
              <Badge variant={config.status.isOnline ? 'default' : 'secondary'} className={config.status.isOnline ? 'bg-green-500' : 'bg-gray-500'}>
                {config.status.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-medium">{config.businessHours.weekdays.label}</p>
                <p className="text-sm text-muted-foreground">{config.businessHours.weekdays.hours}</p>
              </div>
              <div>
                <p className="font-medium">{config.businessHours.saturday.label}</p>
                <p className="text-sm text-muted-foreground">{config.businessHours.saturday.hours}</p>
              </div>
              <div>
                <p className="font-medium">{config.businessHours.sunday.label}</p>
                <p className="text-sm text-muted-foreground">{config.businessHours.sunday.hours}</p>
              </div>
            </div>
            {!config.status.isOnline && (
              <p className="text-sm text-muted-foreground mt-4">
                Próximo horário disponível: {new Date(config.status.nextAvailable).toLocaleString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs: Tickets / FAQ */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeView === 'tickets' ? 'default' : 'ghost'}
          onClick={() => setActiveView('tickets')}
          className={activeView === 'tickets' ? 'bg-moria-orange' : ''}
        >
          Meus Tickets
        </Button>
        <Button
          variant={activeView === 'faq' ? 'default' : 'ghost'}
          onClick={() => setActiveView('faq')}
          className={activeView === 'faq' ? 'bg-moria-orange' : ''}
        >
          Central de Ajuda (FAQ)
        </Button>
      </div>

      {/* Conteúdo */}
      {activeView === 'tickets' ? (
        <TicketList onOpenTicket={handleOpenTicket} />
      ) : (
        <FAQSection onCreateTicket={() => setShowCreateModal(true)} />
      )}

      {/* Modals */}
      <CreateTicketModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      {currentTicket && (
        <TicketDetails
          open={showTicketDetails}
          onOpenChange={setShowTicketDetails}
          ticket={currentTicket}
        />
      )}
    </div>
  );
}
