import { createContext, useContext, useReducer, useEffect, ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import type { CartItem, CouponInfo } from "@moria/types";
import promotionCalculatorService, { type ApplicablePromotion } from "../api/promotionCalculatorService";
import { toast } from "sonner";

// Re-export for backward compatibility
export type { CartItem, CouponInfo } from "@moria/types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  appliedCoupon: CouponInfo | null;
  autoPromotions: ApplicablePromotion[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'APPLY_COUPON'; payload: CouponInfo }
  | { type: 'REMOVE_COUPON' }
  | { type: 'SET_AUTO_PROMOTIONS'; payload: ApplicablePromotion[] };

const CART_STORAGE_KEY = 'moria_cart';

// Carregar carrinho do localStorage
const loadCartFromStorage = (): CartState => {
  // Check if localStorage is available (browser environment)
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      items: [],
      isOpen: false,
      appliedCoupon: null,
      autoPromotions: [],
    };
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        items: parsed.items || [],
        isOpen: false, // Sempre começa fechado
        appliedCoupon: parsed.appliedCoupon || null,
        autoPromotions: [], // Sempre recalcula promoções
      };
    }
  } catch (error) {
    console.error('Error loading cart from storage:', error);
  }
  return {
    items: [],
    isOpen: false,
    appliedCoupon: null,
    autoPromotions: [],
  };
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };

    case 'UPDATE_QUANTITY':
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload.id),
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        appliedCoupon: null,
        autoPromotions: [],
      };

    case 'APPLY_COUPON':
      return {
        ...state,
        appliedCoupon: action.payload,
      };

    case 'REMOVE_COUPON':
      return {
        ...state,
        appliedCoupon: null,
      };

    case 'SET_AUTO_PROMOTIONS':
      return {
        ...state,
        autoPromotions: action.payload,
      };

    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen,
      };

    case 'OPEN_CART':
      return {
        ...state,
        isOpen: true,
      };

    case 'CLOSE_CART':
      return {
        ...state,
        isOpen: false,
      };

    default:
      return state;
  }
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
  appliedCoupon: CouponInfo | null;
  autoPromotions: ApplicablePromotion[];
  promotionDiscount: number;
  discountAmount: number;
  totalWithDiscount: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (coupon: CouponInfo) => void;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // Use lazy initialization to avoid accessing localStorage during module load
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCartFromStorage);
  const location = useLocation();
  const [isCalculatingPromotions, setIsCalculatingPromotions] = useState(false);

  // Fechar carrinho ao mudar de rota
  useEffect(() => {
    if (state.isOpen) {
      dispatch({ type: 'CLOSE_CART' });
    }
  }, [location.pathname]);

  // Auto-calcular promoções quando o carrinho mudar
  useEffect(() => {
    const calculatePromotions = async () => {
      if (state.items.length === 0) {
        dispatch({ type: 'SET_AUTO_PROMOTIONS', payload: [] });
        return;
      }

      setIsCalculatingPromotions(true);
      try {
        const totalPrice = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const items = state.items.map(item => ({
          productId: item.type !== 'service' ? item.id : undefined,
          serviceId: item.type === 'service' ? item.id : undefined,
          quantity: item.quantity,
          price: item.price,
          category: item.category,
        }));

        const result = await promotionCalculatorService.calculateForCart(items, totalPrice);

        // Only update if promotions changed
        if (JSON.stringify(result.applicablePromotions) !== JSON.stringify(state.autoPromotions)) {
          dispatch({ type: 'SET_AUTO_PROMOTIONS', payload: result.applicablePromotions });

          // Show toast notification if new promotions applied
          if (result.applicablePromotions.length > 0 && state.autoPromotions.length === 0) {
            const totalDiscount = result.totalDiscount;
            toast.success(
              `🎉 Você ganhou ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDiscount)} de desconto!`,
              { duration: 5000 }
            );
          }
        }
      } catch (error) {
        console.error('Error calculating promotions:', error);
      } finally {
        setIsCalculatingPromotions(false);
      }
    };

    // Debounce para evitar muitas requisições
    const timeoutId = setTimeout(calculatePromotions, 500);
    return () => clearTimeout(timeoutId);
  }, [state.items]);

  // Salvar no localStorage sempre que items ou appliedCoupon mudar
  useEffect(() => {
    // Only save if localStorage is available
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
        items: state.items,
        appliedCoupon: state.appliedCoupon,
      }));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }, [state.items, state.appliedCoupon]);

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Calculate promotion discount
  const promotionDiscount = state.autoPromotions.reduce((sum, promo) => sum + promo.discountAmount, 0);

  // Calculate coupon discount
  const couponDiscount = state.appliedCoupon ? state.appliedCoupon.discountAmount : 0;

  // Total discount (promotions + coupon)
  const discountAmount = promotionDiscount + couponDiscount;
  const totalWithDiscount = Math.max(0, totalPrice - discountAmount);

  const contextValue: CartContextType = {
    items: state.items,
    isOpen: state.isOpen,
    totalItems,
    totalPrice,
    appliedCoupon: state.appliedCoupon,
    autoPromotions: state.autoPromotions,
    promotionDiscount,
    discountAmount,
    totalWithDiscount,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', payload: item }),
    removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', payload: id }),
    updateQuantity: (id, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    toggleCart: () => dispatch({ type: 'TOGGLE_CART' }),
    openCart: () => dispatch({ type: 'OPEN_CART' }),
    closeCart: () => dispatch({ type: 'CLOSE_CART' }),
    applyCoupon: (coupon) => dispatch({ type: 'APPLY_COUPON', payload: coupon }),
    removeCoupon: () => dispatch({ type: 'REMOVE_COUPON' }),
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}