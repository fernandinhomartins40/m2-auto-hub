import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PanelWorkspaceTabs } from "./PanelWorkspaceTabs";

describe("PanelWorkspaceTabs", () => {
  it("identifica a secao atual e navega sem remover os demais destinos", () => {
    const onTabChange = vi.fn();

    render(
      <PanelWorkspaceTabs
        label="Seções de Compras"
        tabs={[
          { id: "orders", label: "Pedidos" },
          { id: "quotes", label: "Orçamentos" },
        ]}
        activeTab="orders"
        onTabChange={onTabChange}
      />
    );

    expect(screen.getByRole("button", { name: "Pedidos" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Orçamentos" }));
    expect(onTabChange).toHaveBeenCalledWith("quotes");
  });
});
