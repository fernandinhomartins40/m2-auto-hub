import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "STAFF";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
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

const API_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || "/api").replace(/\/$/, "");
const ADMIN_SESSION_HINT_KEY = "moria_admin_session_active";

const roleHierarchy = {
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
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

    const pathname = location.pathname;
    const isAdminProtectedRoute =
      pathname.startsWith("/store-panel") ||
      pathname.startsWith("/mechanic-panel") ||
      (pathname.startsWith("/admin") && !pathname.startsWith("/admin-login"));
    const isPwaLaunchRoute = pathname.startsWith("/app");
    const hasSessionHint = localStorage.getItem(ADMIN_SESSION_HINT_KEY) === "true";
    const shouldCheckProfile =
      isAdminProtectedRoute || isPwaLaunchRoute || (!state.isAuthenticated && hasSessionHint);

    if (!shouldCheckProfile) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    if (state.isAuthenticated && state.admin) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    isInitializing.current = true;

    const initializeAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/admin/profile`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem(ADMIN_SESSION_HINT_KEY, "true");

          setState({
            admin: data.data,
            isAuthenticated: true,
            isLoading: false,
          });

          return;
        }

        if (response.status === 401) {
          localStorage.removeItem(ADMIN_SESSION_HINT_KEY);
        }

        setState((prev) => ({ ...prev, isLoading: false }));
      } catch {
        localStorage.removeItem(ADMIN_SESSION_HINT_KEY);
        setState((prev) => ({ ...prev, isLoading: false }));
      } finally {
        isInitializing.current = false;
      }
    };

    void initializeAuth();
  }, [location.pathname, state.admin, state.isAuthenticated]);

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const adminData = data.data.admin;
        localStorage.setItem(ADMIN_SESSION_HINT_KEY, "true");

        setState({
          admin: adminData,
          isAuthenticated: true,
          isLoading: false,
        });

        const redirectTo = adminData.role === "STAFF" ? "/mechanic-panel" : "/store-panel";

        return { success: true, redirectTo };
      }

      setState((prev) => ({ ...prev, isLoading: false }));
      return {
        success: false,
        error: data.error || data.message || "Falha no login",
      };
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: "Erro ao conectar com o servidor" };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/admin/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      localStorage.removeItem(ADMIN_SESSION_HINT_KEY);
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

  return <AdminAuthContext.Provider value={contextValue}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }

  return context;
}
