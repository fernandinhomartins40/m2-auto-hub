import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

import { CustomerAuthCard } from "@/components/customer/CustomerAuthCard";
import { useAuth } from "@/contexts/AuthContext";
import { usePwaLoginBackGuard } from "@/hooks/usePwaLoginBackGuard";

export default function CustomerLoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  usePwaLoginBackGuard(!isAuthenticated);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-moria-orange mx-auto mb-4" />
          <p className="text-gray-600">Verificando autenticacao...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/customer" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
      <CustomerAuthCard showInstallBanner />
    </div>
  );
}
