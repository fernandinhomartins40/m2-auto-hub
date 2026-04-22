import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogIn, Shield } from "lucide-react";

import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { InstallBanner } from "@moria/ui/pwa-install";

interface AdminLoginDialogProps {
  showInstallBanner?: boolean;
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTarget = getSafeRedirect(location.search);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email, password);

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

    toast({
      title: "Login realizado com sucesso!",
      description: "Bem-vindo ao painel administrativo.",
    });

    navigate(redirectTarget ?? result.redirectTo ?? "/store-panel", { replace: true });
  };

  const handleAutoFill = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-100 p-4">
      <div className="w-full max-w-md space-y-4">
        {showInstallBanner && <InstallBanner appName="M2 Center Auto Admin" variant="admin" />}

        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-moria-orange/10 rounded-full mb-4">
              <Shield className="w-8 h-8 text-moria-orange" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel Administrativo</h1>
            <p className="text-gray-600">Faca login para acessar o painel da loja, oficina e equipe</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@m2centerauto.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting || isLoading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar no Painel
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">Acesso rapido para testes:</p>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9"
                onClick={() => handleAutoFill("admin@m2centerauto.com.br", "Test123!")}
                disabled={isSubmitting}
              >
                <Shield className="mr-2 h-3 w-3" />
                Super Admin - Senha: Test123!
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9"
                onClick={() => handleAutoFill("gerente@m2centerauto.com.br", "Test123!")}
                disabled={isSubmitting}
              >
                <Shield className="mr-2 h-3 w-3" />
                Gerente - Senha: Test123!
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9"
                onClick={() => handleAutoFill("mecanico@m2centerauto.com.br", "Test123!")}
                disabled={isSubmitting}
              >
                <Shield className="mr-2 h-3 w-3" />
                Mecanico - Senha: Test123!
              </Button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">© 2026 M2 Center Auto</p>
        </div>
      </div>
    </div>
  );
}
