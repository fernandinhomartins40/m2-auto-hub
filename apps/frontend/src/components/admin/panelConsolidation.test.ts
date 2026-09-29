import { describe, expect, it } from "vitest";

import { getAdminDataNeeds } from "./adminDataNeeds";
import { slugFromTab, tabFromSlug } from "./adminNavigation";
import { mechanicSlugFromTab, mechanicTabFromSlug } from "../mechanic/mechanicNavigation";

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
});
