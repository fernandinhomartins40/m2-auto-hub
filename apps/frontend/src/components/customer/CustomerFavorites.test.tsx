import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { favoriteService, productService } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useFavoritesContext } from "../../contexts/FavoritesContext";
import { CustomerFavorites } from "./CustomerFavorites";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../contexts/CartContext", () => ({ useCart: vi.fn() }));
vi.mock("../../contexts/FavoritesContext", () => ({ useFavoritesContext: vi.fn() }));
vi.mock("../../api", () => ({
  favoriteService: { getFavoriteStats: vi.fn() },
  productService: { getProductsByIds: vi.fn() },
}));
vi.mock("../FavoriteButton", () => ({ FavoriteButton: () => null }));

const favorites = [
  { id: "fav-1", customerId: "customer-1", productId: "product-1", createdAt: "2026-01-01T00:00:00Z" },
  { id: "fav-2", customerId: "customer-1", productId: "product-2", createdAt: "2026-01-02T00:00:00Z" },
];

const products = [
  { id: "product-1", name: "Pneu Goodyear", category: "Pneus", salePrice: 500, promoPrice: 400, stock: 10, status: "ACTIVE", images: [] },
  { id: "product-2", name: "Óleo Motor Castrol", category: "Óleos", salePrice: 80, promoPrice: null, stock: 0, status: "INACTIVE", images: [] },
];

function favoritesContext(overrides = {}) {
  return {
    favorites,
    favoriteProductIds: favorites.map((favorite) => favorite.productId),
    loading: false,
    error: null,
    totalCount: favorites.length,
    fetchFavorites: vi.fn(),
    fetchFavoriteProductIds: vi.fn(),
    addToFavorites: vi.fn().mockResolvedValue(true),
    removeFromFavorites: vi.fn().mockResolvedValue(true),
    removeFavoriteById: vi.fn().mockResolvedValue(true),
    isFavorite: vi.fn().mockReturnValue(true),
    checkIsFavorite: vi.fn().mockResolvedValue(true),
    toggleFavorite: vi.fn().mockResolvedValue(true),
    clearError: vi.fn(),
    clearFavorites: vi.fn(),
    ...overrides,
  };
}

describe("CustomerFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(useCart).mockReturnValue({ addItem: vi.fn(), openCart: vi.fn() } as ReturnType<typeof useCart>);
    vi.mocked(useFavoritesContext).mockReturnValue(favoritesContext());
    vi.mocked(favoriteService.getFavoriteStats).mockResolvedValue({ totalFavorites: 2, favoritesByCategory: {}, recentlyAdded: [] });
    vi.mocked(productService.getProductsByIds).mockResolvedValue(products as never);
  });

  it("orienta o visitante quando não está autenticado", () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    vi.mocked(useFavoritesContext).mockReturnValue(favoritesContext({ favorites: [] }));
    render(<CustomerFavorites />);
    expect(screen.getByText("Login necessário")).toBeInTheDocument();
  });

  it("apresenta o estado de carregamento", () => {
    vi.mocked(useFavoritesContext).mockReturnValue(favoritesContext({ favorites: [], loading: true }));
    vi.mocked(favoriteService.getFavoriteStats).mockReturnValue(new Promise(() => {}));
    render(<CustomerFavorites />);
    expect(screen.getByText("Produtos que você salvou para depois")).toBeInTheDocument();
  });

  it("carrega os produtos em lote e mostra disponibilidade e desconto", async () => {
    render(<CustomerFavorites />);
    expect(await screen.findByText("Pneu Goodyear")).toBeInTheDocument();
    expect(screen.getByText("Óleo Motor Castrol")).toBeInTheDocument();
    expect(screen.getByText("-20%")).toBeInTheDocument();
    expect(screen.getAllByText("Indisponível").length).toBeGreaterThan(0);
    expect(productService.getProductsByIds).toHaveBeenCalledWith(["product-1", "product-2"]);
  });

  it("filtra favoritos pelo nome", async () => {
    render(<CustomerFavorites />);
    await screen.findByText("Pneu Goodyear");
    fireEvent.change(screen.getByPlaceholderText("Buscar produtos..."), { target: { value: "pneu" } });
    expect(screen.getByText("Pneu Goodyear")).toBeInTheDocument();
    expect(screen.queryByText("Óleo Motor Castrol")).not.toBeInTheDocument();
  });

  it("mostra estado vazio sem confundir com erro", async () => {
    vi.mocked(useFavoritesContext).mockReturnValue(favoritesContext({ favorites: [], favoriteProductIds: [], totalCount: 0 }));
    render(<CustomerFavorites />);
    expect(await screen.findByText("Nenhum produto favorito")).toBeInTheDocument();
    expect(screen.getByText("Explorar Produtos")).toBeInTheDocument();
  });

  it("permite repetir a consulta quando o contexto falha", async () => {
    const fetchFavorites = vi.fn();
    vi.mocked(useFavoritesContext).mockReturnValue(favoritesContext({ favorites: [], error: "Falha ao carregar", fetchFavorites }));
    render(<CustomerFavorites />);
    fireEvent.click(screen.getByText("Tentar Novamente"));
    await waitFor(() => expect(fetchFavorites).toHaveBeenCalled());
  });
});
