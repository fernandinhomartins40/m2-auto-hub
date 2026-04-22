import { useState, useEffect } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  User,
  Lock,
  BarChart3,
  History,
  Bell,
  Save,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  Car,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "../ui/password-input";
import { isPasswordStrong } from "@/lib/passwordUtils";

const API_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');

interface MechanicStats {
  totalRevisions: number;
  completedRevisions: number;
  inProgressRevisions: number;
  pendingRevisions: number;
  completionRate: number;
  averageCompletionTime: number | null;
}

interface Activity {
  id: string;
  type: string;
  revisionId: string;
  vehicleInfo: string;
  customerName: string;
  status: string;
  date: string;
}

interface Preferences {
  notifications: {
    newRevisionAssigned: boolean;
    revisionDeadlineReminder: boolean;
    emailNotifications: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
}

export default function MechanicSettingsView() {
  const { admin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state
  const [name, setName] = useState(admin?.name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Stats state
  const [stats, setStats] = useState<MechanicStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Activity state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "stats") {
      loadStats();
    } else if (activeTab === "history") {
      loadActivityHistory();
    } else if (activeTab === "preferences") {
      loadPreferences();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch(`${API_URL}/auth/admin/stats`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadActivityHistory = async (page = 1) => {
    setIsLoadingActivities(true);
    try {
      const response = await fetch(`${API_URL}/auth/admin/activity-history?page=${page}&limit=10`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.data);
        setActivityPage(data.meta.page);
        setActivityTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const loadPreferences = async () => {
    setIsLoadingPreferences(true);
    try {
      const response = await fetch(`${API_URL}/auth/admin/preferences`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error("Erro ao carregar preferências");
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const response = await fetch(`${API_URL}/auth/admin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        toast.success("Perfil atualizado com sucesso");
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      toast.error("A nova senha não atende aos requisitos mínimos de segurança");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${API_URL}/auth/admin/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      if (response.ok) {
        toast.success("Senha alterada com sucesso");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao alterar senha");
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error("Erro ao alterar senha");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdatePreferences = async () => {
    if (!preferences) return;

    setIsSavingPreferences(true);
    try {
      const response = await fetch(`${API_URL}/auth/admin/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast.success("Preferências salvas com sucesso");
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao salvar preferências");
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error("Erro ao salvar preferências");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      COMPLETED: { variant: "default", label: "Concluída" },
      IN_PROGRESS: { variant: "secondary", label: "Em Andamento" },
      ASSIGNED: { variant: "outline", label: "Atribuída" },
      DRAFT: { variant: "outline", label: "Rascunho" },
      PENDING: { variant: "outline", label: "Pendente" },
    };

    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Estatísticas</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Preferências</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Gerencie suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={admin?.email || ""}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">O email não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label>Função</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {admin?.role === 'STAFF' ? 'Mecânico' : admin?.role}
                  </Badge>
                </div>
              </div>

              <Separator />

              <Button
                onClick={handleUpdateProfile}
                disabled={isUpdatingProfile}
                className="w-full sm:w-auto"
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Mantenha sua conta segura com uma senha forte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  showStrengthIndicator
                  showRequirements
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-600">As senhas não coincidem</p>
                )}
              </div>

              <Separator />

              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="w-full sm:w-auto"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Trabalho</CardTitle>
              <CardDescription>Acompanhe seu desempenho e produtividade</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Car className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total de Revisões</p>
                        <p className="text-2xl font-bold">{stats.totalRevisions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Concluídas</p>
                        <p className="text-2xl font-bold">{stats.completedRevisions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Em Andamento</p>
                        <p className="text-2xl font-bold">{stats.inProgressRevisions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pendentes</p>
                        <p className="text-2xl font-bold">{stats.pendingRevisions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Taxa de Conclusão</p>
                        <p className="text-2xl font-bold">{stats.completionRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tempo Médio</p>
                        <p className="text-2xl font-bold">
                          {stats.averageCompletionTime !== null
                            ? `${stats.averageCompletionTime}h`
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma estatística disponível
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Atividades</CardTitle>
              <CardDescription>Suas revisões mais recentes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : activities.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Car className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{activity.vehicleInfo}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Cliente: {activity.customerName}
                          </p>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(activity.status)}
                            <span className="text-xs text-gray-500">
                              {formatDate(activity.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {activityTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadActivityHistory(activityPage - 1)}
                        disabled={activityPage <= 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-gray-500">
                        Página {activityPage} de {activityTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadActivityHistory(activityPage + 1)}
                        disabled={activityPage >= activityTotalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma atividade encontrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferências</CardTitle>
              <CardDescription>Configure notificações e preferências de exibição</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreferences ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : preferences ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Notificações</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="newRevision">Nova revisão atribuída</Label>
                          <p className="text-sm text-gray-500">
                            Receba um alerta quando uma nova revisão for atribuída a você
                          </p>
                        </div>
                        <Switch
                          id="newRevision"
                          checked={preferences.notifications.newRevisionAssigned}
                          onCheckedChange={(checked) =>
                            setPreferences({
                              ...preferences,
                              notifications: {
                                ...preferences.notifications,
                                newRevisionAssigned: checked,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="deadline">Lembrete de prazo</Label>
                          <p className="text-sm text-gray-500">
                            Receba lembretes sobre prazos de revisões
                          </p>
                        </div>
                        <Switch
                          id="deadline"
                          checked={preferences.notifications.revisionDeadlineReminder}
                          onCheckedChange={(checked) =>
                            setPreferences({
                              ...preferences,
                              notifications: {
                                ...preferences.notifications,
                                revisionDeadlineReminder: checked,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email">Notificações por email</Label>
                          <p className="text-sm text-gray-500">
                            Receba notificações também por email
                          </p>
                        </div>
                        <Switch
                          id="email"
                          checked={preferences.notifications.emailNotifications}
                          onCheckedChange={(checked) =>
                            setPreferences({
                              ...preferences,
                              notifications: {
                                ...preferences.notifications,
                                emailNotifications: checked,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-4">Exibição</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tema</Label>
                        <div className="flex gap-2">
                          {(['light', 'dark', 'system'] as const).map((theme) => (
                            <Button
                              key={theme}
                              variant={preferences.display.theme === theme ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                setPreferences({
                                  ...preferences,
                                  display: {
                                    ...preferences.display,
                                    theme,
                                  },
                                })
                              }
                            >
                              {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleUpdatePreferences}
                    disabled={isSavingPreferences}
                    className="w-full sm:w-auto"
                  >
                    {isSavingPreferences ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Preferências
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Erro ao carregar preferências
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
