import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";

import { AdminLoginDialog } from "@/components/admin/AdminLoginDialog";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function AdminLoginPage() {
  const location = useLocation();
  const { admin, isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    const shell = document
      .querySelector('meta[name="moria-pwa-shell"]')
      ?.getAttribute("content");

    if (shell === "admin") {
      return;
    }

    window.location.replace(`/admin-login/${location.search}${location.hash}`);
  }, [location.hash, location.search]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
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
