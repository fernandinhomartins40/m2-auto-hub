import { useState, forwardRef } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Progress } from "./progress";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordStrength, type PasswordStrength } from "@/lib/passwordUtils";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showStrengthIndicator?: boolean;
  showRequirements?: boolean;
  onStrengthChange?: (strength: PasswordStrength) => void;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showStrengthIndicator = false,
      showRequirements = false,
      onStrengthChange,
      value = "",
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const password = String(value);
    const strength = getPasswordStrength(password);

    // Notify parent of strength changes
    if (onStrengthChange && password) {
      onStrengthChange(strength);
    }

    const requirements = [
      { label: "Mínimo 8 caracteres", met: strength.requirements.minLength },
      { label: "Uma letra maiúscula", met: strength.requirements.hasUppercase },
      { label: "Uma letra minúscula", met: strength.requirements.hasLowercase },
      { label: "Um número", met: strength.requirements.hasNumber },
      { label: "Um caractere especial (!@#$%...)", met: strength.requirements.hasSpecial },
    ];

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
            ref={ref}
            value={value}
            onChange={onChange}
            autoComplete="current-password"
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>

        {/* Strength Indicator */}
        {showStrengthIndicator && password && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Força da senha:</span>
              <span
                className={cn(
                  "font-medium",
                  strength.score === 0 && "text-red-600",
                  strength.score > 0 && strength.score <= 2 && "text-red-600",
                  strength.score === 3 && "text-yellow-600",
                  strength.score === 4 && "text-blue-600",
                  strength.score === 5 && "text-green-600"
                )}
              >
                {strength.label.charAt(0).toUpperCase() + strength.label.slice(1)}
              </span>
            </div>
            <Progress value={strength.percentage} className="h-2" />
          </div>
        )}

        {/* Requirements Checklist */}
        {showRequirements && password && (
          <div className="space-y-1 text-xs">
            {requirements.map((req, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  req.met ? "text-green-600" : "text-gray-500"
                )}
              >
                {req.met ? (
                  <Check className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <X className="h-3 w-3 flex-shrink-0" />
                )}
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
