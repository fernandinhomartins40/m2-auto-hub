import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/apiClient';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AdminPageHeader } from './AdminPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PrivacyRequest = { id: string; type: string; status: string; details?: string; dueAt: string; customer: { name: string; email: string } };
type Incident = { id: string; title: string; severity: string; status: string; detectedAt: string };

export default function PrivacyGovernanceContent() {
  const { hasMinRole } = useAdminAuth();
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  const load = async () => {
    try {
      setRequests((await apiClient.get('/privacy/admin/requests')).data);
      if (hasMinRole('ADMIN')) setIncidents((await apiClient.get('/privacy/admin/incidents')).data);
    } catch { toast.error('Não foi possível carregar a governança de privacidade.'); }
  };

  useEffect(() => { void load(); }, []);

  const closeRequest = async (id: string, status: 'COMPLETED' | 'REJECTED') => {
    const response = window.prompt(status === 'COMPLETED' ? 'Resposta entregue ao titular:' : 'Fundamento da recusa:');
    if (!response) return;
    await apiClient.patch(`/privacy/admin/requests/${id}`, { status, response, identityVerified: true });
    toast.success('Solicitação atualizada.');
    void load();
  };

  const createIncident = async () => {
    if (title.trim().length < 3 || description.trim().length < 10) return toast.error('Informe título e descrição do incidente.');
    await apiClient.post('/privacy/admin/incidents', { title, description, severity, detectedAt: new Date().toISOString() });
    setTitle(''); setDescription('');
    toast.success('Incidente registrado.');
    void load();
  };

  return <div className="space-y-6">
    <AdminPageHeader icon={ShieldCheck} title="Segurança e LGPD" description="Direitos dos titulares, prazos e registro de incidentes." />
    <Tabs defaultValue="requests">
      <TabsList><TabsTrigger value="requests">Solicitações ({requests.length})</TabsTrigger>{hasMinRole('ADMIN') && <TabsTrigger value="incidents">Incidentes ({incidents.length})</TabsTrigger>}</TabsList>
      <TabsContent value="requests" className="space-y-3">
        {requests.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma solicitação registrada.</CardContent></Card>}
        {requests.map(item => <Card key={item.id}><CardContent className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong>{item.customer.name}</strong><Badge variant="outline">{item.type}</Badge><Badge>{item.status}</Badge></div><p className="text-sm text-muted-foreground">{item.customer.email} · prazo {new Date(item.dueAt).toLocaleDateString('pt-BR')}</p>{item.details && <p className="mt-2 text-sm">{item.details}</p>}</div>{!['COMPLETED', 'REJECTED'].includes(item.status) && <div className="flex gap-2"><Button size="sm" onClick={() => void closeRequest(item.id, 'COMPLETED')}>Concluir</Button><Button size="sm" variant="outline" onClick={() => void closeRequest(item.id, 'REJECTED')}>Recusar</Button></div>}</CardContent></Card>)}
      </TabsContent>
      {hasMinRole('ADMIN') && <TabsContent value="incidents" className="space-y-4">
        <Card><CardHeader><CardTitle>Registrar incidente</CardTitle></CardHeader><CardContent className="grid gap-4"><div><Label htmlFor="incident-title">Título</Label><Input id="incident-title" value={title} onChange={e => setTitle(e.target.value)} /></div><div><Label htmlFor="incident-description">Descrição e evidências</Label><Textarea id="incident-description" value={description} onChange={e => setDescription(e.target.value)} /></div><div><Label>Severidade</Label><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['LOW','MEDIUM','HIGH','CRITICAL'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><Button onClick={() => void createIncident()}>Registrar incidente</Button></CardContent></Card>
        {incidents.map(item => <Card key={item.id}><CardContent className="flex items-center justify-between py-5"><div><strong>{item.title}</strong><p className="text-sm text-muted-foreground">Detectado em {new Date(item.detectedAt).toLocaleString('pt-BR')}</p></div><div className="flex gap-2"><Badge variant="outline">{item.severity}</Badge><Badge>{item.status}</Badge></div></CardContent></Card>)}
      </TabsContent>}
    </Tabs>
  </div>;
}
