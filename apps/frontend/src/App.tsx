import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StorefrontProvider } from "@/context/StorefrontContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { RevisionsProvider } from "./contexts/RevisionsContext";
import AdminLoginPage from "./pages/AdminLoginPage";
import CustomerLoginPage from "./pages/CustomerLoginPage";
import CustomerPanel from "./pages/CustomerPanel";
import Index from "./pages/Index";
import MechanicPanelPage from "./pages/MechanicPanelPage";
import MyAccount from "./pages/MyAccount";
import NotFound from "./pages/NotFound";
import PwaEntryPage from "./pages/PwaEntryPage";
import StorePanel from "./pages/StorePanel";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <StorefrontProvider>
            <AuthProvider>
              <AdminAuthProvider>
                <FavoritesProvider>
                  <CartProvider>
                    <RevisionsProvider>
                      <TooltipProvider>
                        <Toaster />
                        <Sonner />
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/app" element={<Navigate to="/" replace />} />
                          <Route path="/customer-login/*" element={<CustomerLoginPage />} />
                          <Route path="/admin-login/*" element={<AdminLoginPage />} />
                          <Route path="/pwa-entry" element={<PwaEntryPage />} />
                          <Route path="/customer" element={<CustomerPanel />} />
                          <Route path="/my-account" element={<MyAccount />} />
                          <Route path="/store-panel" element={<StorePanel />} />
                          <Route path="/mechanic-panel" element={<MechanicPanelPage />} />
                          <Route path="/admin" element={<Navigate to="/store-panel" replace />} />
                          <Route path="/admin/*" element={<Navigate to="/store-panel" replace />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </TooltipProvider>
                    </RevisionsProvider>
                  </CartProvider>
                </FavoritesProvider>
              </AdminAuthProvider>
            </AuthProvider>
          </StorefrontProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
