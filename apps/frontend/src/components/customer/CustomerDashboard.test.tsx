import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { favoriteService, couponService } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { CustomerDashboard } from "./CustomerDashboard";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../api", () => ({
  favoriteService: { getFavoriteCount: vi.fn() },
  couponService: { getActiveCouponCount: vi.fn() },
}));

const getOrders = vi.fn();

describe("CustomerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      customer: {
        id: "customer-1",
        name: "Maria Cliente",
        totalOrders: 1,
        totalSpent: 600,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      getOrders,
    } as ReturnType<typeof useAuth>);
    getOrders.mockResolvedValue({ success: true, data: [] });
    vi.mocked(favoriteService.getFavoriteCount).mockResolvedValue(2);
    vi.mocked(couponService.getActiveCouponCount).mockResolvedValue(3);
  });

  it("leva os atalhos para os fluxos correspondentes", async () => {
    const onTabChange = vi.fn();
    const onBrowseProducts = vi.fn();

    render(
      <CustomerDashboard
        onTabChange={onTabChange}
        onBrowseProducts={onBrowseProducts}
      />,
    );

    await screen.findByText("O que você quer fazer?");

    fireEvent.click(screen.getByRole("button", { name: /nova compra/i }));
    fireEvent.click(screen.getByRole("button", { name: /rastrear pedido/i }));
    fireEvent.click(screen.getByRole("button", { name: /cuidar do veículo/i }));
    fireEvent.click(screen.getByRole("button", { name: /ver todos/i }));

    expect(onBrowseProducts).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith("orders");
    expect(onTabChange).toHaveBeenCalledWith("revisions");
  }, 10_000);

  it("explica falha parcial e permite tentar novamente", async () => {
    vi.mocked(favoriteService.getFavoriteCount).mockRejectedValueOnce(new Error("offline"));

    render(
      <CustomerDashboard
        onTabChange={vi.fn()}
        onBrowseProducts={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Algumas informações não puderam ser atualizadas",
    );

    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    await waitFor(() => {
      expect(favoriteService.getFavoriteCount).toHaveBeenCalledTimes(2);
    });
  });
});
