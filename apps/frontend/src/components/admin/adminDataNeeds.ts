export interface AdminDataNeeds {
  dashboard: boolean;
  orders: boolean;
  quotes: boolean;
  customers: boolean;
}

export function getAdminDataNeeds(tab: string): AdminDataNeeds {
  const dashboard = tab === "dashboard";
  return {
    dashboard,
    orders: dashboard || tab === "orders" || tab === "service-center",
    quotes: dashboard || tab === "quotes" || tab === "service-center",
    customers: dashboard || tab === "customers",
  };
}
