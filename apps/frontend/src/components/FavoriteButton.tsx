// src/components/FavoriteButton.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  productId: string;
  productName?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  disabled?: boolean;
  className?: string;
  onToggle?: (isFavorite: boolean) => void;
}

export function FavoriteButton({
  productId,
  productName = "produto",
  variant = "ghost",
  size = "icon",
  showText = false,
  disabled = false,
  className = "",
  onToggle
}: FavoriteButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite, loading, error } = useFavoritesContext();
  const { toast } = useToast();

  const isCurrentlyFavorite = isFavorite(productId);
  const isLoading = loading || isProcessing;

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login necessário",
        description: "Faça login para adicionar produtos aos favoritos.",
        variant: "destructive"
      });
      return;
    }

    if (isLoading || disabled) return;

    setIsProcessing(true);

    try {
      const success = await toggleFavorite(productId);

      if (success) {
        const newFavoriteState = !isCurrentlyFavorite;

        toast({
          title: newFavoriteState ? "Adicionado aos favoritos" : "Removido dos favoritos",
          description: newFavoriteState
            ? `${productName} foi adicionado aos seus favoritos.`
            : `${productName} foi removido dos seus favoritos.`,
          variant: "default"
        });

        onToggle?.(newFavoriteState);
      } else {
        throw new Error(error || "Erro ao atualizar favoritos");
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: error || "Não foi possível atualizar os favoritos. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className={cn("animate-spin", showText ? "mr-2 h-4 w-4" : "h-4 w-4")} />
          {showText && "Carregando..."}
        </>
      );
    }

    return (
      <>
        <Heart
          className={cn(
            showText ? "mr-2 h-4 w-4" : "h-4 w-4",
            isCurrentlyFavorite
              ? "fill-red-500 text-red-500"
              : "text-muted-foreground hover:text-red-500"
          )}
        />
        {showText && (isCurrentlyFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos")}
      </>
    );
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={disabled || isLoading}
      className={cn(
        "transition-colors",
        isCurrentlyFavorite && variant === "ghost" && "text-red-500 hover:text-red-600",
        className
      )}
      title={
        !isAuthenticated
          ? "Faça login para adicionar aos favoritos"
          : isCurrentlyFavorite
            ? `Remover ${productName} dos favoritos`
            : `Adicionar ${productName} aos favoritos`
      }
    >
      {getButtonContent()}
    </Button>
  );
}