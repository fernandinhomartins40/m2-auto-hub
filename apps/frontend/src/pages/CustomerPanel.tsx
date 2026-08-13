import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { CartDrawer } from "../components/CartDrawer";
import { CustomerCoupons } from "../components/customer/CustomerCoupons";
import { CustomerDashboard } from "../components/customer/CustomerDashboard";
import { CustomerFavorites } from "../components/customer/CustomerFavorites";
import { CustomerLayout } from "../components/customer/CustomerLayout";
import { customerSlugFromTab, customerTabFromSlug } from "../components/customer/customerNavigation";
import { CustomerOrders } from "../components/customer/CustomerOrders";
import { CustomerProfile } from "../components/customer/CustomerProfile";
import { CustomerQuotes } from "../components/customer/CustomerQuotes";
import { CustomerRevisions } from "../components/customer/CustomerRevisions";
import { CustomerVehicles } from "../components/customer/CustomerVehicles";
import { SupportDashboard } from "../components/customer/support/SupportDashboard";
import "../styles/cliente.css";

export default function CustomerPanel() {
  const { customer, isLoading } = useAuth();
  const navigate = useNavigate();
  const { tab: tabSlug } = useParams<{ tab: string }>();

  // A URL e a fonte de verdade da aba: o voltar do celular funciona e o
  // cliente pode recarregar sem perder a tela em que estava.
  const currentTab = customerTabFromSlug(tabSlug);

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
        return <CustomerDashboard />;
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
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <>
      <CustomerLayout currentTab={currentTab} onTabChange={handleTabChange}>
        {renderTabContent()}
      </CustomerLayout>

      <CartDrawer />
    </>
  );
}
