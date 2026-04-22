import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  permissions?: string[];
}

interface AdminAuthState {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AdminAuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; redirectTo?: string }>;
  logout: () => void;
  hasRole: (role: string | string[]) => boolean;
  hasMinRole: (minRole: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const API_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');

// Role hierarchy for permission checking
const roleHierarchy = {
  'STAFF': 1,
  'MANAGER': 2,
  'ADMIN': 3,
  'SUPER_ADMIN': 4,
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<AdminAuthState>({
    admin: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const isInitializing = useRef(false);

  useEffect(() => {
    if (isInitializing.current) return;

    // Skip admin auth initialization on customer routes
    const pathname = location.pathname;
    const isAdminRoute = pathname.startsWith('/store-panel') ||
                         pathname.startsWith('/admin') ||
                         pathname.startsWith('/mechanic-panel') ||
                         pathname.startsWith('/admin-login') ||
                         pathname.startsWith('/app');

    if (!isAdminRoute) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (state.isAuthenticated && state.admin) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check for existing admin session (cookie-based)
    isInitializing.current = true;
    const initializeAuth = async () => {
      try {
        // Try to get admin profile using the httpOnly cookie
        const response = await fetch(`${API_URL}/auth/admin/profile`, {
          credentials: 'include', // Send cookies
        });

        if (response.ok) {
          const data = await response.json();
          setState({
            admin: data.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          // 401 is expected when not logged in - don't log as error
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        // Network errors or invalid responses - this is expected when not authenticated
        setState(prev => ({ ...prev, isLoading: false }));
      } finally {
        isInitializing.current = false;
      }
    };

    initializeAuth();
  }, [location.pathname, state.admin, state.isAuthenticated]);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send/receive cookies
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // O token agora é enviado apenas via httpOnly cookie pelo backend
        // Não precisamos mais armazenar no localStorage (segurança contra XSS)

        const adminData = data.data.admin;

        setState({
          admin: adminData,
          isAuthenticated: true,
          isLoading: false,
        });

        // Determine redirect based on role
        const redirectTo = adminData.role === 'STAFF' ? '/mechanic-panel' : '/store-panel';

        return { success: true, redirectTo };
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: data.error || 'Falha no login' };
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
  };

  const logout = async () => {
    try {
      // Chama o backend para limpar o httpOnly cookie
      await fetch(`${API_URL}/auth/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setState({
        admin: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const hasRole = (roles: string | string[]) => {
    if (!state.admin) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(state.admin.role);
  };

  const hasMinRole = (minRole: string) => {
    if (!state.admin) return false;
    const userLevel = roleHierarchy[state.admin.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[minRole as keyof typeof roleHierarchy] || 999;
    return userLevel >= requiredLevel;
  };

  const contextValue: AdminAuthContextType = {
    admin: state.admin,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    logout,
    hasRole,
    hasMinRole,
  };

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
