import { describe, expect, it } from "vitest";

import { getAdminDataNeeds } from "./adminDataNeeds";
import { adminSidebarItems, slugFromTab, tabFromSlug } from "./adminNavigation";
import { mechanicSlugFromTab, mechanicTabFromSlug } from "../mechanic/mechanicNavigation";
import { customerPrimaryNavigation, customerWorkspaces, isCustomerNavigationActive } from "../customer/customerNavigation";

describe("consolidação dos painéis", () => {
  it("mantém uma rota estável para a central de atendimentos", () => {
    expect(slugFromTab("service-center")).toBe("atendimentos");
    expect(tabFromSlug("atendimentos")).toBe("service-center");
  });

  it("usa trabalho como entrada principal do mecânico e preserva rotas legadas", () => {
    expect(mechanicTabFromSlug(undefined)).toBe("work");
    expect(mechanicSlugFromTab("work")).toBe("trabalho");
    expect(mechanicTabFromSlug("revisoes")).toBe("revisions");
    expect(mechanicTabFromSlug("ordens-de-servico")).toBe("service-orders");
  });

  it("carrega somente os dados necessários para cada contexto administrativo", () => {
    expect(getAdminDataNeeds("dashboard")).toEqual({ dashboard: true, orders: true, quotes: true, customers: true });
    expect(getAdminDataNeeds("service-center")).toEqual({ dashboard: false, orders: true, quotes: true, customers: false });
    expect(getAdminDataNeeds("products")).toEqual({ dashboard: false, orders: false, quotes: false, customers: false });
  });
  it("reduces the admin menu while keeping grouped features reachable", () => {
    expect(adminSidebarItems).toHaveLength(7);
    expect(adminSidebarItems.find((item) => item.id === "service-center")?.activeTabs)
      .toEqual(expect.arrayContaining(["orders", "quotes", "service-orders", "revisions"]));
    expect(adminSidebarItems.find((item) => item.id === "settings")?.activeTabs)
      .toEqual(expect.arrayContaining(["account", "pwa-settings", "users"]));
  });

  it("organizes the customer panel into six destinations with contextual tabs", () => {
    expect(customerPrimaryNavigation).toHaveLength(6);
    expect(customerWorkspaces.flatMap((workspace) => workspace.tabs.map((tab) => tab.id)))
      .toEqual(expect.arrayContaining(["orders", "quotes", "vehicles", "revisions", "favorites", "coupons", "profile", "notifications"]));
    expect(isCustomerNavigationActive("orders", "quotes")).toBe(true);
    expect(isCustomerNavigationActive("profile", "notifications")).toBe(true);
  });
});
