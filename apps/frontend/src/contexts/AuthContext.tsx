import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  authService,
  addressService,
  orderService,
  favoriteService,
  handleApiError
} from "@/api";
import type { AddressPayload } from "@/api/addressService";
import type { Customer, Address, Order, OrderItem, RegisterRequest } from "@moria/types";

export type { Customer, Address, Order, OrderItem } from "@moria/types";
export type RegisterData = RegisterRequest;

interface AuthState {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<Customer>) => Promise<{ success: boolean; error?: string }>;
  addAddress: (address: AddressPayload) => Promise<{ success: boolean; error?: string }>;
  updateAddress: (id: string, address: Partial<AddressPayload>) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (id: string) => Promise<{ success: boolean; error?: string }>;
  getOrders: () => Promise<{ success: boolean; data?: Order[]; error?: string }>;
  getFavorites: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
  addToFavorites: (productId: string) => Promise<{ success: boolean; error?: string }>;
  removeFromFavorites: (productId: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CUSTOMER_SESSION_HINT_KEY = 'moria_customer_session_active';

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<AuthState>({
    customer: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const [, setFavorites] = useState<string[]>([]);
  const isInitializing = useRef(false);

  const refreshCustomerProfile = async (): Promise<Customer> => {
    const customer = await authService.getProfile();
    localStorage.setItem(CUSTOMER_SESSION_HINT_KEY, 'true');

    setState(prev => ({
      ...prev,
      customer,
      isAuthenticated: true,
    }));

    return customer;
  };

  useEffect(() => {
    if (isInitializing.current) return;

    const pathname = location.pathname;
    const isAdminRoute = pathname.startsWith('/store-panel') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/mechanic-panel');
    const isCustomerProtectedRoute = pathname.startsWith('/customer') || pathname.startsWith('/my-account');
    const isCustomerLoginRoute = pathname.startsWith('/customer-login');
    const isPwaLaunchRoute = pathname.startsWith('/app');
    const hasSessionHint = localStorage.getItem(CUSTOMER_SESSION_HINT_KEY) === 'true';
    const shouldCheckProfile =
      isPwaLaunchRoute ||
      isCustomerProtectedRoute ||
      isCustomerLoginRoute ||
      (!state.isAuthenticated && hasSessionHint);

    if (isAdminRoute) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (!shouldCheckProfile) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    if (state.isAuthenticated && state.customer) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    isInitializing.current = true;

    const initializeAuth = async () => {
      try {
        const customer = await authService.getProfile();
        localStorage.setItem(CUSTOMER_SESSION_HINT_KEY, 'true');
        setState({
          customer,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        if (error?.response?.status === 401) {
          localStorage.removeItem(CUSTOMER_SESSION_HINT_KEY);
        }
        if (error?.response?.status !== 401) {
          console.error('Error initializing customer auth:', error);
        }
        setState(prev => ({ ...prev, isLoading: false }));
      } finally {
        isInitializing.current = false;
      }
    };

    initializeAuth();
  }, [location.pathname, state.customer, state.isAuthenticated]);

  const login = async (identifier: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await authService.login({ identifier, password });
      localStorage.setItem(CUSTOMER_SESSION_HINT_KEY, 'true');

      setState({
        customer: response.data.customer,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: apiError.message };
    }
  };

  const register = async (data: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await authService.register(data);
      localStorage.setItem(CUSTOMER_SESSION_HINT_KEY, 'true');

      setState({
        customer: response.data.customer,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: apiError.message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      localStorage.removeItem(CUSTOMER_SESSION_HINT_KEY);
      setState({
        customer: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const updateProfile = async (data: Partial<Customer>) => {
    if (!state.customer) return { success: false, error: "Usuário não autenticado" };

    try {
      const updatedCustomer = await authService.updateProfile(data);
      setState(prev => ({
        ...prev,
        customer: updatedCustomer,
      }));
      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, error: apiError.message };
    }
  };

  const addAddress = async (address: AddressPayload) => {
    if (!state.customer) return { success: false, error: "Usuário não autenticado" };

    try {
      await addressService.createAddress(address);
      await refreshCustomerProfile();
      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, error: apiError.message };
    }
  };

  const updateAddress = async (id: string, addressData: Partial<AddressPayload>) => {
    if (!state.customer) return { success: false, error: "Usuário não autenticado" };

    try {
      await addressService.updateAddress(id, addressData);
      await refreshCustomerProfile();
      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, error: apiError.message };
    }
  };

  const deleteAddress = async (id: string) => {
    if (!state.customer) return { success: false, error: "Usuário não autenticado" };

    try {
      await addressService.deleteAddress(id);
      await refreshCustomerProfile();
      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, error: apiError.message };
    }
  };

  const getOrders = async () => {
    try {
      const response = await orderService.getOrders();
      return { success: true, data: response.data };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, error: apiError.message };
    }
  };

  const getFavorites = async () => {
    try {
      const favoriteIds = await favoriteService.getFavoriteProductIds();
      setFavorites(favoriteIds);
      return { success: true, data: favoriteIds };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, error: apiError.message };
    }
  };

  const addToFavorites = async (productId: string) => {
    try {
      await favoriteService.addToFavorites(productId);
      setFavorites(prev => [...prev, productId]);
      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, error: apiError.message };
    }
  };

  const removeFromFavorites = async (productId: string) => {
    try {
      await favoriteService.removeFromFavorites(productId);
      setFavorites(prev => prev.filter(id => id !== productId));
      return { success: true };
    } catch (error) {
      const apiError = handleApiError(error);
      return { success: false, error: apiError.message };
    }
  };

  const contextValue: AuthContextType = {
    customer: state.customer,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    logout,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    getOrders,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
