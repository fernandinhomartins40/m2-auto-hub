import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

import { AdminLoginDialog } from "@/components/admin/AdminLoginDialog";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { usePwaLoginBackGuard } from "@/hooks/usePwaLoginBackGuard";

export default function AdminLoginPage() {
  const { admin, isAuthenticated, isLoading } = useAdminAuth();
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

  if (isAuthenticated && admin) {
    return <Navigate to={admin.role === "STAFF" ? "/mechanic-panel" : "/store-panel"} replace />;
  }

  return <AdminLoginDialog showInstallBanner />;
}
