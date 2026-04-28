import { useEffect } from "react";
import { Loader2, Shield, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";

export default function PwaEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated: isCustomerAuthenticated, isLoading: isCustomerLoading } = useAuth();
  const { admin, isAuthenticated: isAdminAuthenticated, isLoading: isAdminLoading } = useAdminAuth();

  useEffect(() => {
    if (isAdminLoading || isCustomerLoading) {
      return;
    }

    if (isAdminAuthenticated && admin) {
      navigate(admin.role === "STAFF" ? "/mechanic-panel?source=pwa" : "/store-panel?source=pwa", {
        replace: true,
      });
      return;
    }

    if (isCustomerAuthenticated) {
      navigate("/customer?source=pwa", { replace: true });
      return;
    }

    const app = new URLSearchParams(location.search).get("app");
    if (app === "admin") {
      navigate("/admin-login/?source=pwa-admin", { replace: true });
      return;
    }

    if (app === "mechanic") {
      navigate("/admin-login/?source=pwa-mechanic", { replace: true });
    }
  }, [
    admin,
    isAdminAuthenticated,
    isAdminLoading,
    isCustomerAuthenticated,
    isCustomerLoading,
    location.search,
    navigate,
  ]);

  if (isAdminLoading || isCustomerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <Loader2 className="h-10 w-10 animate-spin text-moria-orange" />
          <div>
            <h1 className="text-xl font-semibold">Abrindo o aplicativo</h1>
            <p className="text-sm text-gray-500">Validando sua sessao e carregando a area correta.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-orange-50 px-6">
      <div className="w-full max-w-xl rounded-3xl border bg-white p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Escolha a area do app</h1>
          <p className="text-gray-600 mt-2">
            A instalacao foi separada em apps independentes para cliente, lojista e mecanico.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <a href="/customer-login/" className="block">
            <Button variant="outline" className="w-full h-auto min-h-[120px] flex-col gap-3 rounded-2xl border-2">
              <User className="h-8 w-8 text-moria-orange" />
              <div className="text-center">
                <div className="font-semibold">Cliente</div>
                <div className="text-xs text-muted-foreground">Pedidos, veiculos e revisoes</div>
              </div>
            </Button>
          </a>

          <a href="/admin-login/" className="block">
            <Button variant="outline" className="w-full h-auto min-h-[120px] flex-col gap-3 rounded-2xl border-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <div className="font-semibold">Lojista</div>
                <div className="text-xs text-muted-foreground">Vendas, operacao e gestao</div>
              </div>
            </Button>
          </a>

          <a href="/admin-login/?source=pwa-mechanic" className="block">
            <Button variant="outline" className="w-full h-auto min-h-[120px] flex-col gap-3 rounded-2xl border-2">
              <Shield className="h-8 w-8 text-emerald-600" />
              <div className="text-center">
                <div className="font-semibold">Mecanico</div>
                <div className="text-xs text-muted-foreground">Checklist, revisoes e oficina</div>
              </div>
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
