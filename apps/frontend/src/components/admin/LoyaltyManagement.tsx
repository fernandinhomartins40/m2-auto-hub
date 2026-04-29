import { useEffect, useState } from 'react';
import {
  adjustPoints,
  createReward,
  deleteReward,
  getAdminLoyaltySettings,
  getAdminLoyaltyStats,
  getAdminRedemptions,
  getAdminRewards,
  getCustomersWithPoints,
  markRewardAsUsed,
  updateLoyaltySettings,
  updateReward,
} from '@/api/loyaltyService';
import {
  type AdminLoyaltyStats,
  type LoyaltyReward,
  type LoyaltySettings,
  type RedeemedReward,
  type LoyaltyTier,
} from '@moria/types';
import { Badge } from '../ui/badge';
import { AdminPageHeader } from './AdminPageHeader';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import {
  CircleDollarSign,
  Gift,
  Medal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react';

type RewardFormState = {
  name: string;
  description: string;
  type: 'DISCOUNT' | 'PRODUCT' | 'SERVICE' | 'GIFT';
  pointsCost: number;
  discountValue: number;
  minLevel: LoyaltyTier;
  status: 'ACTIVE' | 'INACTIVE';
  usageInstructions: string;
  expiresAt: string;
};

type CustomerPointsRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  level: LoyaltyTier;
};

const TIER_FIELDS: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

const emptyRewardForm: RewardFormState = {
  name: '',
  description: '',
  type: 'DISCOUNT',
  pointsCost: 100,
  discountValue: 10,
  minLevel: 'BRONZE',
  status: 'ACTIVE',
  usageInstructions: '',
  expiresAt: '',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function LoyaltyManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingReward, setSavingReward] = useState(false);
  const [adjustingPoints, setAdjustingPoints] = useState(false);
  const [usingRedemption, setUsingRedemption] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminLoyaltyStats | null>(null);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [customers, setCustomers] = useState<CustomerPointsRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedeemedReward[]>([]);

  const [rewardsPage, setRewardsPage] = useState(1);
  const [rewardsTotalPages, setRewardsTotalPages] = useState(1);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersTotalPages, setCustomersTotalPages] = useState(1);
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const [redemptionsTotalPages, setRedemptionsTotalPages] = useState(1);
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState('all');

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPointsRow | null>(null);

  const [settingsForm, setSettingsForm] = useState<LoyaltySettings>({
    programName: '',
    programDescription: '',
    pointsPerReal: 1,
    minPurchaseForPoints: 50,
    revisionBonusPoints: 25,
    signupBonusPoints: 0,
    birthdayBonusPoints: 0,
    pointsValidityDays: null,
    isActive: true,
    tierMultipliers: {
      BRONZE: 1,
      SILVER: 1.1,
      GOLD: 1.25,
      PLATINUM: 1.5,
    },
    termsAndConditions: '',
  });
  const [rewardForm, setRewardForm] = useState<RewardFormState>(emptyRewardForm);
  const [pointsForm, setPointsForm] = useState({
    points: 0,
    description: '',
  });

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    void loadRewards(rewardsPage);
  }, [rewardsPage]);

  useEffect(() => {
    void loadCustomers(customersPage);
  }, [customersPage]);

  useEffect(() => {
    void loadRedemptions(redemptionsPage, redemptionStatusFilter);
  }, [redemptionsPage, redemptionStatusFilter]);

  async function loadOverview() {
    try {
      setLoading(true);
      const [statsData, settingsData] = await Promise.all([
        getAdminLoyaltyStats(),
        getAdminLoyaltySettings(),
      ]);

      setStats(statsData);
      setSettings(settingsData);
      setSettingsForm(settingsData);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar fidelidade',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel carregar o programa de fidelidade.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadRewards(page: number) {
    try {
      const response = await getAdminRewards(page, 12);
      setRewards(response.data);
      setRewardsTotalPages(response.totalPages);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar recompensas',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel carregar as recompensas.',
        variant: 'destructive',
      });
    }
  }

  async function loadCustomers(page: number) {
    try {
      const response = await getCustomersWithPoints(page, 10);
      setCustomers(response.data as CustomerPointsRow[]);
      setCustomersTotalPages(response.totalPages);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel carregar os clientes com pontos.',
        variant: 'destructive',
      });
    }
  }

  async function loadRedemptions(page: number, status: string) {
    try {
      const response = await getAdminRedemptions(page, 10, status === 'all' ? undefined : status);
      setRedemptions(response.data);
      setRedemptionsTotalPages(response.totalPages);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar resgates',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel carregar os resgates.',
        variant: 'destructive',
      });
    }
  }

  async function handleSaveSettings() {
    try {
      setSavingSettings(true);
      const updated = await updateLoyaltySettings(settingsForm);
      setSettings(updated);
      setSettingsForm(updated);
      await loadOverview();
      toast({
        title: 'Programa atualizado',
        description: 'As regras do programa de fidelidade foram salvas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar configuracoes',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel salvar as regras do programa.',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveReward() {
    try {
      setSavingReward(true);
      if (editingReward) {
        await updateReward(editingReward.id, rewardForm);
      } else {
        await createReward(rewardForm);
      }

      setRewardDialogOpen(false);
      setEditingReward(null);
      setRewardForm(emptyRewardForm);
      await Promise.all([loadRewards(rewardsPage), loadOverview()]);

      toast({
        title: editingReward ? 'Recompensa atualizada' : 'Recompensa criada',
        description: 'A vitrine de resgates foi atualizada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar recompensa',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel salvar a recompensa.',
        variant: 'destructive',
      });
    } finally {
      setSavingReward(false);
    }
  }

  async function handleDeleteReward(rewardId: string) {
    if (!confirm('Deseja remover esta recompensa do programa de fidelidade?')) {
      return;
    }

    try {
      await deleteReward(rewardId);
      await Promise.all([loadRewards(rewardsPage), loadOverview()]);
      toast({
        title: 'Recompensa removida',
        description: 'A recompensa foi excluÃ­da do catÃ¡logo.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir recompensa',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel excluir a recompensa.',
        variant: 'destructive',
      });
    }
  }

  async function handleAdjustPoints() {
    if (!selectedCustomer) {
      return;
    }

    try {
      setAdjustingPoints(true);
      await adjustPoints({
        customerId: selectedCustomer.id,
        points: Number(pointsForm.points),
        description: pointsForm.description,
        type: Number(pointsForm.points) >= 0 ? 'EARN_MANUAL' : 'ADJUST_MANUAL',
      });

      setPointsDialogOpen(false);
      setSelectedCustomer(null);
      setPointsForm({ points: 0, description: '' });
      await Promise.all([loadCustomers(customersPage), loadOverview()]);
      toast({
        title: 'Pontos ajustados',
        description: 'O saldo do cliente foi atualizado.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao ajustar pontos',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel ajustar os pontos do cliente.',
        variant: 'destructive',
      });
    } finally {
      setAdjustingPoints(false);
    }
  }

  async function handleUseRedemption(code: string) {
    try {
      setUsingRedemption(code);
      await markRewardAsUsed(code);
      await Promise.all([loadRedemptions(redemptionsPage, redemptionStatusFilter), loadOverview()]);
      toast({
        title: 'Resgate confirmado',
        description: 'O resgate foi marcado como utilizado.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao usar resgate',
        description: error.response?.data?.error || 'NÃ£o foi possÃ­vel marcar este resgate como utilizado.',
        variant: 'destructive',
      });
    } finally {
      setUsingRedemption(null);
    }
  }

  function openRewardDialog(reward?: LoyaltyReward) {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        name: reward.name,
        description: reward.description,
        type: reward.type,
        pointsCost: reward.pointsCost,
        discountValue: Number(reward.discountValue || 0),
        minLevel: reward.minLevel,
        status: reward.status,
        usageInstructions: reward.usageInstructions || '',
        expiresAt: reward.expiresAt ? reward.expiresAt.slice(0, 16) : '',
      });
    } else {
      setEditingReward(null);
      setRewardForm(emptyRewardForm);
    }

    setRewardDialogOpen(true);
  }

  function openPointsDialog(customer: CustomerPointsRow) {
    setSelectedCustomer(customer);
    setPointsDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Gift}
        title="Programa de Fidelidade"
        description="Defina regras de pontuacao, recompensas, saldo dos clientes e acompanhamento dos resgates."
        badge={
          <Badge variant="outline" className="gap-2">
            <Star className="h-3.5 w-3.5" />
            Fidelizacao e pos-venda
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => void Promise.all([loadOverview(), loadRewards(rewardsPage), loadCustomers(customersPage), loadRedemptions(redemptionsPage, redemptionStatusFilter)])}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={() => openRewardDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova recompensa
            </Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes com saldo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomersWithPoints || 0}</div>
            <p className="text-xs text-muted-foreground">Clientes acumulando vantagens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos distribuidos</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPointsDistributed || 0}</div>
            <p className="text-xs text-muted-foreground">Total gerado em compras e revisoes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos resgatados</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPointsRedeemed || 0}</div>
            <p className="text-xs text-muted-foreground">Convertidos em beneficios</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resgates</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRedemptions || 0}</div>
            <p className="text-xs text-muted-foreground">Historico de trocas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do programa</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-2xl font-bold">{settingsForm.isActive ? 'Ativo' : 'Pausado'}</div>
            <p className="text-xs text-muted-foreground">{stats?.activeRewards || 0} recompensas em operacao</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-auto min-w-max flex-nowrap items-center justify-start gap-2 rounded-xl bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="min-h-[40px] whitespace-nowrap rounded-lg px-3 py-2 text-sm sm:px-4"
            >
              Visao geral
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="min-h-[40px] whitespace-nowrap rounded-lg px-3 py-2 text-sm sm:px-4"
            >
              Regras
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="min-h-[40px] whitespace-nowrap rounded-lg px-3 py-2 text-sm sm:px-4"
            >
              Recompensas
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              className="min-h-[40px] whitespace-nowrap rounded-lg px-3 py-2 text-sm sm:px-4"
            >
              Clientes
            </TabsTrigger>
            <TabsTrigger
              value="redemptions"
              className="min-h-[40px] whitespace-nowrap rounded-lg px-3 py-2 text-sm sm:px-4"
            >
              Resgates
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>{settingsForm.programName || 'Programa de fidelidade'}</CardTitle>
                <CardDescription>{settingsForm.programDescription || 'Sem descricao configurada.'}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Pontuacao por venda</p>
                  <p className="mt-2 text-2xl font-semibold">{settingsForm.pointsPerReal} ponto(s) por R$ 1,00</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Compra minima: {formatCurrency(settingsForm.minPurchaseForPoints)}
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Bonus de revisao concluida</p>
                  <p className="mt-2 text-2xl font-semibold">{settingsForm.revisionBonusPoints} pontos</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Media por cliente: {stats?.averagePointsPerCustomer || 0} pontos
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4 md:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">Multiplicadores por nivel</p>
                    <Medal className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {TIER_FIELDS.map((tier) => (
                      <div key={tier} className="rounded-lg border bg-background p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{tier}</p>
                        <p className="mt-1 text-xl font-semibold">{settingsForm.tierMultipliers[tier]}x</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo operacional</CardTitle>
                <CardDescription>Indicadores rapidos para acompanhar a saude do programa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Clientes com saldo</p>
                  <p className="mt-1 text-3xl font-bold">{stats?.totalCustomersWithPoints || 0}</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Recompensas ativas</p>
                  <p className="mt-1 text-3xl font-bold">{stats?.activeRewards || 0}</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Resgates aguardando uso</p>
                  <p className="mt-1 text-3xl font-bold">
                    {redemptions.filter((item) => item.status === 'AVAILABLE').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras e comunicacao do programa</CardTitle>
              <CardDescription>
                Defina como o cliente acumula pontos e quais mensagens aparecem ao apresentar o programa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="loyalty-program-name">Nome do programa</Label>
                  <Input
                    id="loyalty-program-name"
                    value={settingsForm.programName}
                    onChange={(e) => setSettingsForm((current) => ({ ...current, programName: e.target.value }))}
                    placeholder="Ex: Clube Fidelidade M2"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Programa ativo</p>
                    <p className="text-sm text-muted-foreground">
                      Quando desligado, os pontos param de ser oferecidos e novos resgates ficam bloqueados.
                    </p>
                  </div>
                  <Switch
                    checked={settingsForm.isActive}
                    onCheckedChange={(checked) => setSettingsForm((current) => ({ ...current, isActive: checked }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="loyalty-program-description">DescriÃ§Ã£o curta</Label>
                <Textarea
                  id="loyalty-program-description"
                  value={settingsForm.programDescription}
                  onChange={(e) => setSettingsForm((current) => ({ ...current, programDescription: e.target.value }))}
                  rows={3}
                  placeholder="Explique em uma frase como o cliente ganha e troca pontos."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="loyalty-points-per-real">Pontos por R$ 1,00</Label>
                  <Input
                    id="loyalty-points-per-real"
                    type="number"
                    min="0"
                    step="0.1"
                    value={settingsForm.pointsPerReal}
                    onChange={(e) =>
                      setSettingsForm((current) => ({
                        ...current,
                        pointsPerReal: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="loyalty-min-purchase">Compra minima para pontuar</Label>
                  <Input
                    id="loyalty-min-purchase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={settingsForm.minPurchaseForPoints}
                    onChange={(e) =>
                      setSettingsForm((current) => ({
                        ...current,
                        minPurchaseForPoints: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="loyalty-revision-bonus">Bonus por revisao</Label>
                  <Input
                    id="loyalty-revision-bonus"
                    type="number"
                    min="0"
                    step="1"
                    value={settingsForm.revisionBonusPoints}
                    onChange={(e) =>
                      setSettingsForm((current) => ({
                        ...current,
                        revisionBonusPoints: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Multiplicadores por nivel</Label>
                  <p className="text-sm text-muted-foreground">
                    Use um fator maior nos niveis superiores para reforcar recorrencia e recompra.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {TIER_FIELDS.map((tier) => (
                    <div key={tier} className="grid gap-2">
                      <Label htmlFor={`tier-${tier}`}>{tier}</Label>
                      <Input
                        id={`tier-${tier}`}
                        type="number"
                        min="0"
                        step="0.05"
                        value={settingsForm.tierMultipliers[tier]}
                        onChange={(e) =>
                          setSettingsForm((current) => ({
                            ...current,
                            tierMultipliers: {
                              ...current.tierMultipliers,
                              [tier]: Number(e.target.value || 0),
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="loyalty-terms">Termos e orientacoes internas</Label>
                <Textarea
                  id="loyalty-terms"
                  value={settingsForm.termsAndConditions || ''}
                  onChange={(e) => setSettingsForm((current) => ({ ...current, termsAndConditions: e.target.value }))}
                  rows={5}
                  placeholder="Use este campo para deixar regras internas, criterios de validacao ou observacoes para a equipe."
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => void handleSaveSettings()} disabled={savingSettings}>
                  {savingSettings ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar regras
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {rewards.map((reward) => (
              <Card key={reward.id}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{reward.name}</CardTitle>
                      <CardDescription>{reward.description}</CardDescription>
                    </div>
                    <Badge variant={reward.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {reward.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{reward.pointsCost} pontos</Badge>
                    <Badge variant="outline">{reward.minLevel}</Badge>
                    <Badge variant="outline">{reward.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reward.discountValue ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      Valor vinculado: {reward.type === 'DISCOUNT' ? `${reward.discountValue}%` : formatCurrency(Number(reward.discountValue))}
                    </div>
                  ) : null}

                  {reward.usageInstructions ? (
                    <p className="text-sm text-muted-foreground">{reward.usageInstructions}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem instrucoes operacionais cadastradas.</p>
                  )}

                  <div className="flex justify-between gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => openRewardDialog(reward)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" className="flex-1 text-destructive" onClick={() => void handleDeleteReward(reward.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!rewards.length ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhuma recompensa cadastrada ainda. Crie a primeira opÃ§Ã£o de troca para ativar o catÃ¡logo do cliente.
              </CardContent>
            </Card>
          ) : null}

          {rewardsTotalPages > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" disabled={rewardsPage === 1} onClick={() => setRewardsPage((current) => current - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                PÃ¡gina {rewardsPage} de {rewardsTotalPages}
              </span>
              <Button
                variant="outline"
                disabled={rewardsPage === rewardsTotalPages}
                onClick={() => setRewardsPage((current) => current + 1)}
              >
                Proxima
              </Button>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes com saldo de pontos</CardTitle>
              <CardDescription>
                Acompanhe quem esta acumulando saldo e faÃ§a ajustes manuais quando necessario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Cliente</th>
                      <th className="px-4 py-3 text-left font-medium">Nivel</th>
                      <th className="px-4 py-3 text-right font-medium">Saldo</th>
                      <th className="px-4 py-3 text-right font-medium">Ganhos</th>
                      <th className="px-4 py-3 text-right font-medium">Resgatados</th>
                      <th className="px-4 py-3 text-right font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">{customer.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{customer.level}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{customer.loyaltyPoints}</td>
                        <td className="px-4 py-3 text-right">{customer.totalPointsEarned}</td>
                        <td className="px-4 py-3 text-right">{customer.totalPointsRedeemed}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => openPointsDialog(customer)}>
                            Ajustar pontos
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!customers.length ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                  Ainda nao ha clientes com pontos gerados.
                </div>
              ) : null}

              {customersTotalPages > 1 ? (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" disabled={customersPage === 1} onClick={() => setCustomersPage((current) => current - 1)}>
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    PÃ¡gina {customersPage} de {customersTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={customersPage === customersTotalPages}
                    onClick={() => setCustomersPage((current) => current + 1)}
                  >
                    Proxima
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redemptions" className="space-y-4">
          <Card>
            <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Fila de resgates</CardTitle>
                <CardDescription>
                  Controle os cupons, brindes e servicos que ja foram trocados pelos clientes.
                </CardDescription>
              </div>

              <div className="w-full lg:w-56">
                <Label className="mb-2 block text-sm">Status</Label>
                <Select
                  value={redemptionStatusFilter}
                  onValueChange={(value) => {
                    setRedemptionStatusFilter(value);
                    setRedemptionsPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="AVAILABLE">Disponiveis</SelectItem>
                    <SelectItem value="USED">Utilizados</SelectItem>
                    <SelectItem value="EXPIRED">Expirados</SelectItem>
                    <SelectItem value="CANCELLED">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {redemptions.map((redemption) => (
                  <div key={redemption.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{redemption.reward?.name || 'Recompensa removida'}</p>
                          <Badge variant={redemption.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                            {redemption.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {redemption.customer?.name || 'Cliente'} â€¢ codigo {redemption.code} â€¢ {redemption.pointsSpent} pontos
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Criado em {formatDate(redemption.createdAt)} â€¢ validade {formatDate(redemption.expiresAt)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {redemption.status === 'AVAILABLE' ? (
                          <Button
                            onClick={() => void handleUseRedemption(redemption.code)}
                            disabled={usingRedemption === redemption.code}
                          >
                            {usingRedemption === redemption.code ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-2 h-4 w-4" />
                            )}
                            Marcar como utilizado
                          </Button>
                        ) : (
                          <Button variant="outline" disabled>
                            {redemption.status === 'USED' ? 'Ja utilizado' : 'Sem acao'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!redemptions.length ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                  Nenhum resgate encontrado para o filtro atual.
                </div>
              ) : null}

              {redemptionsTotalPages > 1 ? (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" disabled={redemptionsPage === 1} onClick={() => setRedemptionsPage((current) => current - 1)}>
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    PÃ¡gina {redemptionsPage} de {redemptionsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={redemptionsPage === redemptionsTotalPages}
                    onClick={() => setRedemptionsPage((current) => current + 1)}
                  >
                    Proxima
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-4rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Editar recompensa' : 'Nova recompensa'}</DialogTitle>
            <DialogDescription>
              Cadastre o que o cliente pode trocar com pontos e como a equipe deve operacionalizar o beneficio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="reward-name">Nome</Label>
              <Input
                id="reward-name"
                value={rewardForm.name}
                onChange={(e) => setRewardForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Ex: Troca de oleo com desconto"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reward-description">DescriÃ§Ã£o</Label>
              <Textarea
                id="reward-description"
                rows={3}
                value={rewardForm.description}
                onChange={(e) => setRewardForm((current) => ({ ...current, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="reward-type">Tipo</Label>
                <Select
                  value={rewardForm.type}
                  onValueChange={(value: RewardFormState['type']) =>
                    setRewardForm((current) => ({ ...current, type: value }))
                  }
                >
                  <SelectTrigger id="reward-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISCOUNT">Desconto</SelectItem>
                    <SelectItem value="PRODUCT">Produto</SelectItem>
                    <SelectItem value="SERVICE">Servico</SelectItem>
                    <SelectItem value="GIFT">Brinde</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reward-status">Status</Label>
                <Select
                  value={rewardForm.status}
                  onValueChange={(value: RewardFormState['status']) =>
                    setRewardForm((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger id="reward-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativa</SelectItem>
                    <SelectItem value="INACTIVE">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="reward-points">Custo em pontos</Label>
                <Input
                  id="reward-points"
                  type="number"
                  min="1"
                  value={rewardForm.pointsCost}
                  onChange={(e) =>
                    setRewardForm((current) => ({ ...current, pointsCost: Number(e.target.value || 0) }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reward-discount-value">Valor de apoio</Label>
                <Input
                  id="reward-discount-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rewardForm.discountValue}
                  onChange={(e) =>
                    setRewardForm((current) => ({ ...current, discountValue: Number(e.target.value || 0) }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reward-min-level">Nivel minimo</Label>
                <Select
                  value={rewardForm.minLevel}
                  onValueChange={(value: LoyaltyTier) =>
                    setRewardForm((current) => ({ ...current, minLevel: value }))
                  }
                >
                  <SelectTrigger id="reward-min-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRONZE">BRONZE</SelectItem>
                    <SelectItem value="SILVER">SILVER</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                    <SelectItem value="PLATINUM">PLATINUM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reward-instructions">Orientacoes internas de uso</Label>
              <Textarea
                id="reward-instructions"
                rows={3}
                value={rewardForm.usageInstructions}
                onChange={(e) =>
                  setRewardForm((current) => ({ ...current, usageInstructions: e.target.value }))
                }
                placeholder="Ex: validar placa do veiculo, aplicar no caixa e registrar observacao no atendimento."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reward-expires-at">Validade opcional</Label>
              <Input
                id="reward-expires-at"
                type="datetime-local"
                value={rewardForm.expiresAt}
                onChange={(e) => setRewardForm((current) => ({ ...current, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveReward()} disabled={savingReward}>
              {savingReward ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar recompensa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar saldo de pontos</DialogTitle>
            <DialogDescription>
              {selectedCustomer ? (
                <>
                  Cliente: <strong>{selectedCustomer.name}</strong>
                  <br />
                  Saldo atual: <strong>{selectedCustomer.loyaltyPoints} pontos</strong>
                </>
              ) : (
                'Selecione um cliente para ajustar o saldo.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="points-adjust-value">Pontos</Label>
              <Input
                id="points-adjust-value"
                type="number"
                value={pointsForm.points}
                onChange={(e) =>
                  setPointsForm((current) => ({ ...current, points: Number(e.target.value || 0) }))
                }
                placeholder="Use negativo para remover pontos"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="points-adjust-description">Motivo</Label>
              <Textarea
                id="points-adjust-description"
                rows={3}
                value={pointsForm.description}
                onChange={(e) =>
                  setPointsForm((current) => ({ ...current, description: e.target.value }))
                }
                placeholder="Ex: campanha de relacionamento, ajuste de atendimento, correcao manual."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleAdjustPoints()} disabled={adjustingPoints}>
              {adjustingPoints ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


