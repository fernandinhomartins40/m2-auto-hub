import { useEffect, useState } from 'react';
import {
  Bell,
  KeyRound,
  Loader2,
  LogOut,
  Save,
  ShieldCheck,
  User,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { isPasswordStrong } from '@/lib/passwordUtils';
import { readApiError } from '@/lib/apiError';

import { AdminPageHeader } from './AdminPageHeader';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PasswordInput } from '../ui/password-input';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const API_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');

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

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  STAFF: 'Mecânico',
};

function formatDateTime(value?: string | null) {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminAccountContent() {
  const { admin, logout, refreshProfile } = useAdminAuth();

  const [name, setName] = useState(admin?.name || '');
  const [email, setEmail] = useState(admin?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Mantém o formulário em sincronia quando o perfil chega/é atualizado.
  useEffect(() => {
    setName(admin?.name || '');
    setEmail(admin?.email || '');
  }, [admin?.name, admin?.email]);

  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoadingPreferences(true);
      try {
        const response = await fetch(`${API_URL}/auth/admin/preferences`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setPreferences(data.data);
        } else {
          toast.error(await readApiError(response, 'Erro ao carregar preferências'));
        }
      } catch {
        toast.error('Erro ao carregar preferências');
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    void loadPreferences();
  }, []);

  const emailChanged = email.trim().toLowerCase() !== (admin?.email || '').toLowerCase();

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (name.trim().length < 3) {
      toast.error('O nome deve ter pelo menos 3 caracteres');
      return;
    }

    if (!email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    if (emailChanged && !profilePassword) {
      toast.error('Informe a senha atual para alterar o email');
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch(`${API_URL}/auth/admin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          ...(emailChanged ? { currentPassword: profilePassword } : {}),
        }),
      });

      if (response.ok) {
        toast.success('Perfil atualizado com sucesso');
        setProfilePassword('');
        await refreshProfile();
      } else {
        toast.error(await readApiError(response, 'Erro ao atualizar perfil'));
      }
    } catch {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      toast.error('A nova senha não atende aos requisitos mínimos de segurança');
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
        toast.success('Senha alterada com sucesso');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(await readApiError(response, 'Erro ao alterar senha'));
      }
    } catch {
      toast.error('Erro ao alterar senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSavePreferences = async () => {
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
        toast.success('Preferências salvas com sucesso');
      } else {
        toast.error(await readApiError(response, 'Erro ao salvar preferências'));
      }
    } catch {
      toast.error('Erro ao salvar preferências');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOutAll(true);
    try {
      await logout();
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader
        icon={UserCog}
        title="Minha Conta"
        description="Gerencie seus dados pessoais, senha e preferências de uso do painel."
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Preferências</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Atualize seu nome e email de acesso ao painel.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Nome</Label>
                    <Input
                      id="account-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      disabled={isSavingProfile}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-email">Email</Label>
                    <Input
                      id="account-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                      disabled={isSavingProfile}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este é o email usado para entrar no painel.
                    </p>
                  </div>
                </div>

                {emailChanged && (
                  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Label htmlFor="account-email-password">
                      Senha atual (necessária para alterar o email)
                    </Label>
                    <PasswordInput
                      id="account-email-password"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      disabled={isSavingProfile}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Função</Label>
                    <div>
                      <Badge variant="secondary">
                        {roleLabels[admin?.role || ''] || admin?.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status da conta</Label>
                    <div>
                      <Badge variant={admin?.status === 'ACTIVE' ? 'default' : 'destructive'}>
                        {admin?.status === 'ACTIVE' ? 'Ativa' : admin?.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <Button type="submit" disabled={isSavingProfile} className="w-full sm:w-auto">
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 shrink-0" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="account-current-password">Senha Atual</Label>
                  <PasswordInput
                    id="account-current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    disabled={isChangingPassword}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-new-password">Nova Senha</Label>
                  <PasswordInput
                    id="account-new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    disabled={isChangingPassword}
                    showStrengthIndicator
                    showRequirements
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-confirm-password">Confirmar Nova Senha</Label>
                  <PasswordInput
                    id="account-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    disabled={isChangingPassword}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-600">As senhas não coincidem</p>
                  )}
                </div>

                <Separator />

                <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto">
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 shrink-0" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Sessão e Acesso
              </CardTitle>
              <CardDescription>
                Informações sobre o acesso da sua conta ao painel.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Último login</p>
                  <p className="mt-1 font-medium">{formatDateTime(admin?.lastLoginAt)}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Conta criada em</p>
                  <p className="mt-1 font-medium">{formatDateTime(admin?.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Permissões</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {roleLabels[admin?.role || ''] || admin?.role}
                  </Badge>
                  {(admin?.permissions || []).map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Encerrar sessão</p>
                  <p className="text-sm text-muted-foreground">
                    Você precisará entrar novamente com email e senha.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isLoggingOutAll}
                  className="w-full sm:w-auto"
                >
                  {isLoggingOutAll ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saindo...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair da conta
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferências
              </CardTitle>
              <CardDescription>
                Configure notificações e preferências de exibição do painel.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoadingPreferences ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : preferences ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notificações</h3>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="pref-new-revision">Nova revisão atribuída</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba um alerta quando uma nova revisão for atribuída a você.
                        </p>
                      </div>
                      <Switch
                        id="pref-new-revision"
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

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="pref-deadline">Lembrete de prazo</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba lembretes sobre prazos de revisões.
                        </p>
                      </div>
                      <Switch
                        id="pref-deadline"
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

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label htmlFor="pref-email">Notificações por email</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba notificações também por email.
                        </p>
                      </div>
                      <Switch
                        id="pref-email"
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

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Exibição</h3>
                    <Label>Tema</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['light', 'dark', 'system'] as const).map((theme) => (
                        <Button
                          key={theme}
                          type="button"
                          variant={preferences.display.theme === theme ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setPreferences({
                              ...preferences,
                              display: { ...preferences.display, theme },
                            })
                          }
                        >
                          {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleSavePreferences}
                    disabled={isSavingPreferences}
                    className="w-full sm:w-auto"
                  >
                    {isSavingPreferences ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Preferências
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
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
