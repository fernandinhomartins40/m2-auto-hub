import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogIn, Shield } from "lucide-react";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MAIN_CONTENT_ID } from "@/components/layout/SkipToContent";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

interface AdminLoginDialogProps {
  showInstallBanner?: boolean;
}

const LOGIN_PREFS_KEY = "m2_admin_login_prefs";

interface LoginPrefs {
  saveData: boolean;
  keepConnected: boolean;
  email: string;
}

/**
 * Preferências da tela de login. Só o e-mail fica no localStorage: a senha é
 * entregue ao gerenciador de senhas do navegador, nunca gravada pela página.
 * Qualquer falha de storage (aba privada, site data bloqueado) cai no padrão.
 */
function readLoginPrefs(): LoginPrefs {
  const fallback: LoginPrefs = { saveData: false, keepConnected: false, email: "" };
  try {
    const raw = localStorage.getItem(LOGIN_PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LoginPrefs>;
    return {
      saveData: parsed.saveData === true,
      keepConnected: parsed.keepConnected === true,
      email: parsed.saveData === true && typeof parsed.email === "string" ? parsed.email : "",
    };
  } catch {
    return fallback;
  }
}

function writeLoginPrefs(prefs: LoginPrefs) {
  try {
    localStorage.setItem(
      LOGIN_PREFS_KEY,
      JSON.stringify({ ...prefs, email: prefs.saveData ? prefs.email : "" })
    );
  } catch {
    // Sem storage a tela continua funcionando, só não lembra as escolhas.
  }
}

type PasswordCredentialCtor = new (data: { id: string; password: string; name?: string }) => Credential;

/**
 * Pede explicitamente ao navegador para salvar a credencial (Chrome, Edge,
 * Opera, Samsung Internet). Firefox e Safari não têm essa API e salvam pelo
 * próprio formulário, por isso os campos têm name/autocomplete corretos.
 */
async function storeBrowserCredential(email: string, password: string, name?: string) {
  const Ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential;
  if (!Ctor || !navigator.credentials?.store) return;
  try {
    await navigator.credentials.store(new Ctor({ id: email, password, name }));
  } catch {
    // O usuário pode recusar ou o navegador bloquear; o login já aconteceu.
  }
}

function getSafeRedirect(search: string): string | null {
  const params = new URLSearchParams(search);
  const redirect = params.get("redirect");
  if (!redirect || !redirect.startsWith("/")) {
    return null;
  }

  return redirect;
}

export function AdminLoginDialog({ showInstallBanner = false }: AdminLoginDialogProps) {
  const { login, isLoading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [initialPrefs] = useState(readLoginPrefs);
  const [email, setEmail] = useState(initialPrefs.email);
  const [password, setPassword] = useState("");
  const [saveData, setSaveData] = useState(initialPrefs.saveData);
  const [keepConnected, setKeepConnected] = useState(initialPrefs.keepConnected);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTarget = getSafeRedirect(location.search);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email, password, keepConnected);

    if (!result.success) {
      setError(result.error || "Erro ao fazer login");
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: result.error || "Erro ao fazer login. Verifique suas credenciais.",
      });
      return;
    }

    writeLoginPrefs({ saveData, keepConnected, email: email.trim().toLowerCase() });
    if (saveData) {
      await storeBrowserCredential(email.trim().toLowerCase(), password);
    }

    toast({
      title: "Login realizado com sucesso!",
      description: "Bem-vindo ao painel administrativo.",
    });

    navigate(redirectTarget ?? result.redirectTo ?? "/store-panel", { replace: true });
  };

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-stone-100 p-4 outline-none"
    >
      <div className="w-full max-w-md space-y-4">
        {showInstallBanner ? (
          <div className="space-y-3">
            <PwaInstallBanner appType="admin" />
            <PwaInstallBanner appType="mechanic" />
          </div>
        ) : null}

        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-moria-orange/10 rounded-full mb-4">
              <Shield className="w-8 h-8 text-moria-orange" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel Administrativo</h1>
            <p className="text-gray-600">Faca login para acessar o painel da loja, oficina e equipe</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" method="post" action="/admin-login">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="username"
                type="email"
                placeholder="admin@m2centerauto.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11"
                autoComplete="username"
                autoFocus={!initialPrefs.email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                autoFocus={Boolean(initialPrefs.email)}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="save-data"
                  checked={saveData}
                  onCheckedChange={(checked) => setSaveData(checked === true)}
                  disabled={isSubmitting}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="save-data" className="cursor-pointer font-normal">
                    Salvar dados de acesso
                  </Label>
                  <p className="text-xs text-gray-500">
                    Lembra seu e-mail e oferece salvar a senha no navegador.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="keep-connected"
                  checked={keepConnected}
                  onCheckedChange={(checked) => setKeepConnected(checked === true)}
                  disabled={isSubmitting}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="keep-connected" className="cursor-pointer font-normal">
                    Manter conectado
                  </Label>
                  <p className="text-xs text-gray-500">
                    Continua logado por 30 dias. Desmarcado, a sessão acaba ao fechar o navegador.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting || isLoading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 shrink-0" />
                  Entrar no Painel
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">© 2026 M2 Center Auto</p>
        </div>
      </div>
    </main>
  );
}
