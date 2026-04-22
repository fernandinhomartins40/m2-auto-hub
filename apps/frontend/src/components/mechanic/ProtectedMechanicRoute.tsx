import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedMechanicRouteProps {
  children: ReactNode;
}

export function ProtectedMechanicRoute({ children }: ProtectedMechanicRouteProps) {
  const { admin, isAuthenticated, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If authenticated but not STAFF, redirect to admin panel
    if (!isLoading && isAuthenticated && admin && admin.role !== 'STAFF') {
      navigate('/store-panel', { replace: true });
    }
  }, [isLoading, isAuthenticated, admin, navigate]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-moria-orange mx-auto mb-4" />
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !admin) {
    return <Navigate to="/store-panel" replace />;
  }

  // Redirect to admin panel if not STAFF
  if (admin.role !== 'STAFF') {
    return <Navigate to="/store-panel" replace />;
  }

  // User is authenticated and has STAFF role
  return <>{children}</>;
}
