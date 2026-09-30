import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StorefrontProvider } from "@/context/StorefrontContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { CookiePreferences } from "./components/privacy/CookiePreferences";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { RevisionsProvider } from "./contexts/RevisionsContext";
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const CustomerLoginPage = lazy(() => import("./pages/CustomerLoginPage"));
const CustomerPanel = lazy(() => import("./pages/CustomerPanel"));
const Index = lazy(() => import("./pages/Index"));
const MechanicPanelPage = lazy(() => import("./pages/MechanicPanelPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PwaAdminInstallPage = lazy(() => import("./pages/PwaAdminInstallPage"));
const PwaEntryPage = lazy(() => import("./pages/PwaEntryPage"));
const PublicQuoteApprovalPage = lazy(() => import("./pages/PublicQuoteApprovalPage"));
const StorePanel = lazy(() => import("./pages/StorePanel"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

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
                        <CookiePreferences />
                        <Suspense fallback={<div className="flex min-h-screen items-center justify-center" role="status">Carregando aplicação...</div>}>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/app" element={<Navigate to="/" replace />} />
                          <Route path="/customer-login/*" element={<CustomerLoginPage />} />
                          <Route path="/admin-login/*" element={<AdminLoginPage />} />
                          <Route path="/pwa-entry" element={<PwaEntryPage />} />
                          <Route path="/pwa-admin" element={<PwaAdminInstallPage />} />
                          <Route path="/customer" element={<Navigate to="/customer/inicio" replace />} />
                          <Route path="/customer/:tab" element={<CustomerPanel />} />
                          <Route path="/my-account" element={<Navigate to="/customer/notificacoes" replace />} />
                          <Route path="/quote-approval/:token" element={<PublicQuoteApprovalPage />} />
                          <Route path="/privacidade" element={<PrivacyPolicy />} />
                          {/* Cada seção do painel tem a própria URL, para o voltar
                              do navegador funcionar e o link ser compartilhável. */}
                          <Route path="/store-panel" element={<Navigate to="/store-panel/dashboard" replace />} />
                          <Route path="/store-panel/:tab" element={<StorePanel />} />
                          <Route path="/mechanic-panel" element={<Navigate to="/mechanic-panel/trabalho" replace />} />
                          <Route path="/mechanic-panel/:tab" element={<MechanicPanelPage />} />
                          <Route path="/admin" element={<Navigate to="/store-panel" replace />} />
                          <Route path="/admin/*" element={<Navigate to="/store-panel" replace />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                        </Suspense>
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
