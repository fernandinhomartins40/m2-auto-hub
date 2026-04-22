import { useState } from "react";
import { useCart } from "../contexts/CartContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { CheckoutDrawer } from "./CheckoutDrawer";
import { Trash2, Plus, Minus, MessageCircle, ShoppingBag, X, Wrench, Package } from "lucide-react";

export function CartDrawer() {
  const { items, isOpen, totalItems, totalPrice, closeCart, removeItem, updateQuantity, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const products = items.filter(item => item.type !== 'service');
  const services = items.filter(item => item.type === 'service');
  const hasProducts = products.length > 0;
  const hasServices = services.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={() => closeCart()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b z-10">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-moria-orange/10 p-2 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-moria-orange" />
                </div>
                <div>
                  <SheetTitle className="text-xl">Carrinho de Compras</SheetTitle>
                  {totalItems > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                    </p>
                  )}
                </div>
              </div>
              {totalItems > 0 && (
                <Badge className="bg-moria-orange text-white px-3 py-1">
                  {totalItems}
                </Badge>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-4">
                <div className="bg-muted rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Carrinho vazio</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Adicione produtos ao seu carrinho para continuar com a compra
                  </p>
                </div>
                <Button onClick={closeCart} className="bg-moria-orange hover:bg-moria-orange/90">
                  Continuar Comprando
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-6 space-y-4">
                  {items.map((item) => {
                    const isService = item.type === 'service';
                    const ItemIcon = isService ? Wrench : Package;
                    
                    return (
                      <div key={item.id} className={`group relative border rounded-xl p-4 transition-all hover:shadow-md ${
                        isService ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex gap-4">
                          {/* Item Icon */}
                          <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isService ? 'bg-orange-100' : 'bg-muted'
                          }`}>
                            <ItemIcon className={`h-6 w-6 ${
                              isService ? 'text-orange-600' : 'text-muted-foreground'
                            }`} />
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                                  {item.name}
                                </h4>
                                {item.category && (
                                  <Badge 
                                    variant="secondary" 
                                    className={`mt-1 text-xs ${
                                      isService ? 'bg-orange-200 text-orange-800' : ''
                                    }`}
                                  >
                                    {item.category}
                                  </Badge>
                                )}
                                {isService && item.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3">
                              <div className="text-lg font-bold">
                                {isService ? (
                                  <span className="text-orange-600">Orçamento</span>
                                ) : (
                                  <span className="text-moria-orange">{formatPrice(item.price)}</span>
                                )}
                              </div>
                              
                              {/* Quantity Controls */}
                              <div className="flex items-center bg-muted rounded-lg p-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-background"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                
                                <span className="px-3 py-1 text-sm font-semibold min-w-[2rem] text-center">
                                  {item.quantity}
                                </span>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-background"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 bg-white border-t">
                <div className="p-4 space-y-3">
                  {/* Summary */}
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <div className="space-y-2">
                      {hasProducts && (
                        <div className="flex justify-between items-center text-sm">
                          <span>Produtos ({products.length})</span>
                          <span className="font-medium">{formatPrice(totalPrice)}</span>
                        </div>
                      )}
                      {hasServices && (
                        <div className="flex justify-between items-center text-sm">
                          <span>Serviços ({services.length})</span>
                          <span className="text-orange-600 font-medium">Orçamento</span>
                        </div>
                      )}
                    </div>
                    
                    {hasProducts && hasServices && <Separator />}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">
                        {hasProducts ? 'Total Produtos' : 'Itens'}
                      </span>
                      <span className="text-xl font-bold text-moria-orange">
                        {hasProducts ? formatPrice(totalPrice) : `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
                      </span>
                    </div>
                    
                    {hasServices && hasProducts && (
                      <p className="text-xs text-muted-foreground">
                        * Serviços serão orçados separadamente
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => setShowCheckout(true)}
                      className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                      size="sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Finalizar {hasServices && hasProducts ? 'Pedido e Orçamento' : hasServices ? 'Orçamento' : 'Compra'}
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={clearCart}
                        className="flex-1 h-9 rounded-lg text-sm"
                        size="sm"
                      >
                        Limpar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={closeCart}
                        className="flex-1 h-9 rounded-lg text-sm"
                        size="sm"
                      >
                        Continuar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
      
      <CheckoutDrawer 
        open={showCheckout} 
        onOpenChange={setShowCheckout}
      />
    </Sheet>
  );
}