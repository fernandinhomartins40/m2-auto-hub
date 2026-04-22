// src/components/CouponInput.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Tag } from "lucide-react";
import { useCoupons } from "@/hooks/useCoupons";

interface CouponInputProps {
  orderTotal: number;
  appliedCoupon?: {
    code: string;
    discountAmount: number;
  } | null;
  onCouponApplied: (couponCode: string, discountAmount: number) => void;
  onCouponRemoved: () => void;
  disabled?: boolean;
  className?: string;
}

export function CouponInput({
  orderTotal,
  appliedCoupon,
  onCouponApplied,
  onCouponRemoved,
  disabled = false,
  className = ""
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const { validateCoupon, validationResult, error, clearValidation } = useCoupons();

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || orderTotal <= 0) return;

    setIsValidating(true);
    clearValidation();

    try {
      const result = await validateCoupon(couponCode.trim().toUpperCase(), orderTotal);

      if (result.valid && result.discountAmount) {
        onCouponApplied(couponCode.trim().toUpperCase(), result.discountAmount);
        setCouponCode("");
      }
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    clearValidation();
    setCouponCode("");
  };

  const handleInputChange = (value: string) => {
    setCouponCode(value);
    clearValidation();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && !isValidating) {
      handleValidateCoupon();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Applied Coupon Display */}
      {appliedCoupon && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-800">
                  Cupom aplicado: {appliedCoupon.code}
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  -R$ {appliedCoupon.discountAmount.toFixed(2)}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveCoupon}
            disabled={disabled}
            className="text-green-700 hover:text-green-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Coupon Input (only show if no coupon is applied) */}
      {!appliedCoupon && (
        <div className="space-y-2">
          <Label htmlFor="coupon-input" className="text-sm font-medium">
            Código do cupom
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="coupon-input"
                type="text"
                placeholder="Digite o código do cupom"
                value={couponCode}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={disabled || isValidating}
                className="uppercase"
                maxLength={20}
              />
            </div>
            <Button
              onClick={handleValidateCoupon}
              disabled={disabled || !couponCode.trim() || isValidating || orderTotal <= 0}
              size="default"
              className="px-6"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && !appliedCoupon && (
        <div className="space-y-2">
          {validationResult.valid ? (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Cupom válido! Desconto de R$ {validationResult.discountAmount?.toFixed(2)} será aplicado.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>
                {validationResult.error || "Cupom inválido ou expirado"}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* General Error */}
      {error && !validationResult && (
        <Alert variant="destructive">
          <X className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Help Text */}
      {!appliedCoupon && (
        <p className="text-xs text-muted-foreground">
          Os cupons de desconto são aplicados sobre o valor total da compra.
        </p>
      )}
    </div>
  );
}