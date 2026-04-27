import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CreditCard, Loader2, Mail, Phone, User } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { isPasswordStrong } from "@/lib/passwordUtils";
import { toast } from "sonner";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { PasswordInput } from "../ui/password-input";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface CustomerAuthCardProps {
  showInstallBanner?: boolean;
  onAuthenticated?: () => void;
}

function getSafeRedirect(search: string, fallback: string): string {
  const params = new URLSearchParams(search);
  const redirect = params.get("redirect");
  if (!redirect || !redirect.startsWith("/")) {
    return fallback;
  }

  return redirect;
}

export function CustomerAuthCard({
  showInstallBanner = false,
  onAuthenticated,
}: CustomerAuthCardProps) {
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = getSafeRedirect(location.search, "/customer");

  const [loginForm, setLoginForm] = useState({
    phone: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    password: "",
    confirmPassword: "",
  });

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginForm.phone || !loginForm.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    const result = await login(loginForm.phone.replace(/\D/g, ""), loginForm.password);
    if (!result.success) {
      toast.error(result.error || "Telefone ou senha incorretos");
      return;
    }

    toast.success("Login realizado com sucesso!");
    onAuthenticated?.();
    navigate(redirectTarget);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerForm.name || !registerForm.email || !registerForm.phone || !registerForm.password) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error("As senhas nao coincidem");
      return;
    }

    if (!isPasswordStrong(registerForm.password)) {
      toast.error("A senha nao atende aos requisitos minimos de seguranca");
      return;
    }

    const result = await register({
      name: registerForm.name,
      email: registerForm.email,
      phone: registerForm.phone.replace(/\D/g, ""),
      cpf: registerForm.cpf ? registerForm.cpf.replace(/\D/g, "") : undefined,
      password: registerForm.password,
    });

    if (!result.success) {
      toast.error(result.error || "Erro ao criar conta");
      return;
    }

    toast.success("Conta criada com sucesso!");
    onAuthenticated?.();
    navigate(redirectTarget);
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {showInstallBanner && <PwaInstallBanner appType="customer" />}

      <Card className="border-none shadow-2xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">Area do Cliente M2</CardTitle>
          <CardDescription>Entre para acompanhar pedidos, veiculos e revisoes</CardDescription>
        </CardHeader>

        <Tabs defaultValue="login" className="w-full overflow-hidden">
          <div className="px-4 sm:px-6">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="login" className="min-w-0 px-3 text-xs sm:text-sm">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className="min-w-0 px-3 text-xs sm:text-sm">
                Cadastrar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="login" className="mt-0">
            <Card className="border-none shadow-none">
              <CardHeader className="px-6 pt-2 pb-4">
                <CardTitle className="text-lg">Fazer Login</CardTitle>
                <CardDescription>Entre com seu telefone e senha</CardDescription>
              </CardHeader>

              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 px-6">
                  <div className="space-y-2">
                    <Label htmlFor="login-phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                        value={formatPhone(loginForm.phone)}
                        onChange={(e) =>
                          setLoginForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))
                        }
                        disabled={isLoading}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <PasswordInput
                      id="login-password"
                      placeholder="Digite sua senha"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                </CardContent>

                <CardFooter className="px-6 pb-6 pt-4">
                  <Button type="submit" className="w-full bg-moria-orange hover:bg-moria-orange/90" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="mt-0">
            <Card className="border-none shadow-none">
              <CardHeader className="px-6 pt-2 pb-4">
                <CardTitle className="text-lg">Criar Conta</CardTitle>
                <CardDescription>Cadastre-se para acompanhar seus pedidos e muito mais</CardDescription>
              </CardHeader>

              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4 px-6">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-name"
                        placeholder="Seu nome completo"
                        className="pl-10"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="register-phone">Telefone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-phone"
                          placeholder="(11) 99999-9999"
                          className="pl-10"
                          value={formatPhone(registerForm.phone)}
                          onChange={(e) =>
                            setRegisterForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))
                          }
                          disabled={isLoading}
                          maxLength={15}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-cpf">CPF</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-cpf"
                          placeholder="000.000.000-00"
                          className="pl-10"
                          value={formatCPF(registerForm.cpf)}
                          onChange={(e) =>
                            setRegisterForm((prev) => ({ ...prev, cpf: e.target.value.replace(/\D/g, "") }))
                          }
                          disabled={isLoading}
                          maxLength={14}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha *</Label>
                    <PasswordInput
                      id="register-password"
                      placeholder="Crie uma senha forte"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                      disabled={isLoading}
                      showStrengthIndicator
                      showRequirements
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirmar Senha *</Label>
                    <PasswordInput
                      id="register-confirm-password"
                      placeholder="Digite a senha novamente"
                      value={registerForm.confirmPassword}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      disabled={isLoading}
                    />
                    {registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword && (
                      <p className="text-xs text-red-600">As senhas nao coincidem</p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="px-6 pb-6 pt-4">
                  <Button type="submit" className="w-full bg-moria-orange hover:bg-moria-orange/90" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
