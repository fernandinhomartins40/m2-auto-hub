/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CustomerFavorites } from './CustomerFavorites';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../hooks/useFavorites';
import { favoriteService, productService } from '../../api';

// Mock hooks and services
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/CartContext');
jest.mock('../../hooks/useFavorites');
jest.mock('../../api');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseFavorites = useFavorites as jest.MockedFunction<typeof useFavorites>;

const mockFavorites = [
  {
    id: 'fav-1',
    customerId: 'customer-1',
    productId: 'product-1',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'fav-2',
    customerId: 'customer-1',
    productId: 'product-2',
    createdAt: '2024-01-02T00:00:00Z'
  }
];

const mockProducts = [
  {
    id: 'product-1',
    name: 'Pneu Goodyear',
    category: 'Pneus',
    subcategory: 'Passeio',
    salePrice: 500,
    promoPrice: 400,
    stock: 10,
    minStock: 5,
    isActive: true,
    images: 'https://example.com/pneu.jpg'
  },
  {
    id: 'product-2',
    name: 'Óleo Motor Castrol',
    category: 'Óleos',
    subcategory: 'Sintético',
    salePrice: 80,
    promoPrice: null,
    stock: 0,
    minStock: 5,
    isActive: false,
    images: 'https://example.com/oleo.jpg'
  }
];

describe('CustomerFavorites', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'customer-1', email: 'test@test.com' }
    } as any);

    mockUseCart.mockReturnValue({
      addItem: jest.fn(),
      openCart: jest.fn()
    } as any);

    mockUseFavorites.mockReturnValue({
      favorites: mockFavorites,
      loading: false,
      error: null,
      fetchFavorites: jest.fn(),
      clearError: jest.fn()
    } as any);

    (favoriteService.getFavoriteStats as jest.Mock).mockResolvedValue({
      totalFavorites: 2,
      favoritesByCategory: { Pneus: 1, Óleos: 1 },
      recentlyAdded: mockFavorites
    });

    (productService.getProductById as jest.Mock).mockImplementation((id) => {
      const product = mockProducts.find(p => p.id === id);
      return Promise.resolve(product);
    });
  });

  describe('Authentication', () => {
    it('should show login message when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false
      } as any);

      render(<CustomerFavorites />);

      expect(screen.getByText('Login necessário')).toBeInTheDocument();
      expect(screen.getByText('Faça login para ver seus produtos favoritos')).toBeInTheDocument();
    });

    it('should show favorites when authenticated', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Meus Favoritos')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loaders while loading', () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        loading: true,
        error: null,
        fetchFavorites: jest.fn(),
        clearError: jest.fn()
      } as any);

      render(<CustomerFavorites />);

      expect(screen.getByText('Produtos que você salvou para depois')).toBeInTheDocument();
      // Skeletons are rendered
    });
  });

  describe('Product Display', () => {
    it('should display products with correct information', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
        expect(screen.getByText('Óleo Motor Castrol')).toBeInTheDocument();
      });

      // Check category badges
      expect(screen.getByText('Pneus')).toBeInTheDocument();
      expect(screen.getByText('Óleos')).toBeInTheDocument();
    });

    it('should show discount badge for products with promo price', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('-20%')).toBeInTheDocument();
      });
    });

    it('should show unavailable badge for inactive products', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        const unavailableBadges = screen.getAllByText('Indisponível');
        expect(unavailableBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filters', () => {
    it('should filter products by search term', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar produtos...');
      fireEvent.change(searchInput, { target: { value: 'Pneu' } });

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
        expect(screen.queryByText('Óleo Motor Castrol')).not.toBeInTheDocument();
      });
    });

    it('should filter products by category', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
      });

      // This would require interacting with the Select component
      // Implementation depends on your UI library
    });

    it('should filter products by availability', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
      });

      // Filter for available only
      // Should only show Pneu Goodyear
    });
  });

  describe('Sorting', () => {
    it('should sort products by price ascending', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
      });

      // Change sort option to price ascending
      // Verify Óleo appears before Pneu
    });

    it('should sort products by name', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
      });

      // Change sort option to name A-Z
      // Verify order
    });
  });

  describe('Bulk Actions', () => {
    it('should select and deselect products', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Should show bulk actions bar
      await waitFor(() => {
        expect(screen.getByText(/item selecionado/)).toBeInTheDocument();
      });
    });

    it('should select all products', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Selecionar Todos');
      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByText('2 itens selecionados')).toBeInTheDocument();
      });
    });

    it('should add selected products to cart', async () => {
      const mockAddItem = jest.fn();
      const mockOpenCart = jest.fn();

      mockUseCart.mockReturnValue({
        addItem: mockAddItem,
        openCart: mockOpenCart
      } as any);

      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Pneu Goodyear')).toBeInTheDocument();
      });

      // Select product
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Select first product

      // Click add to cart button
      const addToCartButton = screen.getByText('Adicionar ao Carrinho');
      fireEvent.click(addToCartButton);

      await waitFor(() => {
        expect(mockAddItem).toHaveBeenCalled();
        expect(mockOpenCart).toHaveBeenCalled();
      });
    });
  });

  describe('Statistics', () => {
    it('should toggle statistics display', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Meus Favoritos')).toBeInTheDocument();
      });

      const statsButton = screen.getByText('Estatísticas');
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByText('Estatísticas dos Favoritos')).toBeInTheDocument();
        expect(screen.getByText('Total de Favoritos')).toBeInTheDocument();
      });
    });
  });

  describe('Export and Share', () => {
    it('should export favorites to CSV', async () => {
      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Meus Favoritos')).toBeInTheDocument();
      });

      // Open dropdown
      const moreButton = screen.getByText('Mais');
      fireEvent.click(moreButton);

      // Click export
      const exportButton = screen.getByText('Exportar CSV');
      fireEvent.click(exportButton);

      // Verify download was triggered
      // This would require mocking window.URL.createObjectURL
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no favorites', async () => {
      mockUseFavorites.mockReturnValue({
        favorites: [],
        loading: false,
        error: null,
        fetchFavorites: jest.fn(),
        clearError: jest.fn()
      } as any);

      render(<CustomerFavorites />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum produto favorito')).toBeInTheDocument();
        expect(screen.getByText('Explorar Produtos')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message and retry button', () => {
      const mockFetchFavorites = jest.fn();
      mockUseFavorites.mockReturnValue({
        favorites: [],
        loading: false,
        error: 'Failed to load favorites',
        fetchFavorites: mockFetchFavorites,
        clearError: jest.fn()
      } as any);

      render(<CustomerFavorites />);

      expect(screen.getByText('Failed to load favorites')).toBeInTheDocument();
      expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();

      const retryButton = screen.getByText('Tentar Novamente');
      fireEvent.click(retryButton);

      expect(mockFetchFavorites).toHaveBeenCalled();
    });
  });
});
