import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { CartDrawer } from "../components/CartDrawer";
import { CustomerCoupons } from "../components/customer/CustomerCoupons";
import { CustomerDashboard } from "../components/customer/CustomerDashboard";
import { CustomerFavorites } from "../components/customer/CustomerFavorites";
import { CustomerLayout } from "../components/customer/CustomerLayout";
import { customerSlugFromTab, customerTabFromSlug, customerWorkspaces } from "../components/customer/customerNavigation";
import { Button } from "../components/ui/button";
import { CustomerOrders } from "../components/customer/CustomerOrders";
import { CustomerProfile } from "../components/customer/CustomerProfile";
import { CustomerQuotes } from "../components/customer/CustomerQuotes";
import { CustomerRevisions } from "../components/customer/CustomerRevisions";
import { CustomerVehicles } from "../components/customer/CustomerVehicles";
import { CustomerNotifications } from "../components/customer/CustomerNotifications";
import { SupportDashboard } from "../components/customer/support/SupportDashboard";
import "../styles/cliente.css";

export default function CustomerPanel() {
  const { customer, isLoading } = useAuth();
  const navigate = useNavigate();
  const { tab: tabSlug } = useParams<{ tab: string }>();

  // A URL e a fonte de verdade da aba: o voltar do celular funciona e o
  // cliente pode recarregar sem perder a tela em que estava.
  const currentTab = customerTabFromSlug(tabSlug);
  const activeWorkspace = customerWorkspaces.find((workspace) =>
    workspace.tabs.some((tab) => tab.id === currentTab)
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      navigate(`/customer/${customerSlugFromTab(tab)}`);
    },
    [navigate]
  );

  useEffect(() => {
    if (tabSlug && customerSlugFromTab(currentTab) !== tabSlug) {
      navigate(`/customer/${customerSlugFromTab(currentTab)}`, { replace: true });
    }
  }, [tabSlug, currentTab, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moria-orange mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/customer-login/?redirect=%2Fcustomer" replace />;
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <CustomerDashboard
            onTabChange={handleTabChange}
            onBrowseProducts={() => navigate("/#pecas")}
          />
        );
      case "profile":
        return <CustomerProfile />;
      case "quotes":
        return <CustomerQuotes onNavigateToProfile={() => handleTabChange("profile")} />;
      case "orders":
        return <CustomerOrders />;
      case "vehicles":
        return <CustomerVehicles />;
      case "revisions":
        return <CustomerRevisions />;
      case "favorites":
        return <CustomerFavorites />;
      case "coupons":
        return <CustomerCoupons />;
      case "support":
        return <SupportDashboard />;
      case "notifications":
        return <CustomerNotifications />;
      default:
        return (
          <CustomerDashboard
            onTabChange={handleTabChange}
            onBrowseProducts={() => navigate("/#pecas")}
          />
        );
    }
  };

  return (
    <>
      <CustomerLayout currentTab={currentTab} onTabChange={handleTabChange}>
        {activeWorkspace ? (
          <nav
            aria-label={`Seções de ${activeWorkspace.label}`}
            className="mb-4 overflow-x-auto rounded-xl border bg-white p-1 shadow-sm"
          >
            <div className="flex min-w-max gap-1">
              {activeWorkspace.tabs.map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  size="sm"
                  variant={currentTab === tab.id ? "default" : "ghost"}
                  aria-current={currentTab === tab.id ? "page" : undefined}
                  className="min-h-10 whitespace-nowrap"
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </nav>
        ) : null}
        {renderTabContent()}
      </CustomerLayout>

      <CartDrawer />
    </>
  );
}
