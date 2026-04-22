// src/components/CustomerLevel.tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Crown, Star, Award, Trophy } from "lucide-react";
import { Customer } from "@/contexts/AuthContext";

interface CustomerLevelProps {
  customer: Customer;
  className?: string;
}

interface LevelInfo {
  name: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  minSpent: number;
  maxSpent?: number;
  benefits: string[];
  discountPercentage: number;
}

const LEVELS: Record<Customer['level'], LevelInfo> = {
  BRONZE: {
    name: "Bronze",
    color: "text-orange-600",
    bgColor: "bg-orange-100 border-orange-200",
    icon: <Award className="h-4 w-4" />,
    minSpent: 0,
    maxSpent: 500,
    benefits: ["Frete grátis acima de R$ 150", "Suporte prioritário"],
    discountPercentage: 0
  },
  SILVER: {
    name: "Prata",
    color: "text-gray-600",
    bgColor: "bg-gray-100 border-gray-200",
    icon: <Star className="h-4 w-4" />,
    minSpent: 500,
    maxSpent: 1500,
    benefits: ["Frete grátis acima de R$ 100", "5% de desconto", "Suporte prioritário", "Acesso antecipado a promoções"],
    discountPercentage: 5
  },
  GOLD: {
    name: "Ouro",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 border-yellow-200",
    icon: <Crown className="h-4 w-4" />,
    minSpent: 1500,
    maxSpent: 5000,
    benefits: ["Frete grátis em todas as compras", "10% de desconto", "Suporte VIP", "Acesso antecipado", "Cupons exclusivos"],
    discountPercentage: 10
  },
  PLATINUM: {
    name: "Platina",
    color: "text-purple-600",
    bgColor: "bg-purple-100 border-purple-200",
    icon: <Trophy className="h-4 w-4" />,
    minSpent: 5000,
    benefits: ["Frete grátis premium", "15% de desconto permanente", "Suporte VIP 24/7", "Produtos exclusivos", "Cashback de 2%"],
    discountPercentage: 15
  }
};

export function CustomerLevel({ customer, className = "" }: CustomerLevelProps) {
  const currentLevel = LEVELS[customer.level];

  // Find next level
  const levelOrder: Customer['level'][] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = levelOrder.indexOf(customer.level);
  const nextLevel = currentIndex < levelOrder.length - 1 ? levelOrder[currentIndex + 1] : null;
  const nextLevelInfo = nextLevel ? LEVELS[nextLevel] : null;

  // Calculate progress to next level
  const progressToNext = nextLevelInfo
    ? Math.min(100, ((customer.totalSpent - currentLevel.minSpent) / (nextLevelInfo.minSpent - currentLevel.minSpent)) * 100)
    : 100;

  const remainingToNext = nextLevelInfo
    ? Math.max(0, nextLevelInfo.minSpent - customer.totalSpent)
    : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <Card className={`${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Current Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${currentLevel.bgColor} ${currentLevel.color} font-semibold px-3 py-1`}
              >
                {currentLevel.icon}
                <span className="ml-1">{currentLevel.name}</span>
              </Badge>
              <span className="text-sm text-muted-foreground">
                {customer.totalOrders} {customer.totalOrders === 1 ? 'pedido' : 'pedidos'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total gasto</p>
              <p className="font-semibold">{formatPrice(customer.totalSpent)}</p>
            </div>
          </div>

          {/* Progress to Next Level */}
          {nextLevelInfo && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Progresso para {nextLevelInfo.name}
                </span>
                <span className="font-medium">
                  {formatPrice(remainingToNext)} restantes
                </span>
              </div>
              <Progress value={progressToNext} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Gaste mais {formatPrice(remainingToNext)} para alcançar o nível {nextLevelInfo.name}
              </p>
            </div>
          )}

          {/* Current Level Benefits */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Seus benefícios atuais:</h4>
            <ul className="space-y-1">
              {currentLevel.benefits.map((benefit, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-current opacity-50" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Next Level Preview */}
          {nextLevelInfo && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <span className={nextLevelInfo.color}>{nextLevelInfo.icon}</span>
                Próximo nível: {nextLevelInfo.name}
              </h4>
              <ul className="space-y-1">
                {nextLevelInfo.benefits.slice(0, 3).map((benefit, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-current opacity-30" />
                    {benefit}
                  </li>
                ))}
                {nextLevelInfo.benefits.length > 3 && (
                  <li className="text-xs text-muted-foreground">
                    +{nextLevelInfo.benefits.length - 3} benefícios adicionais
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Platinum Achievement */}
          {customer.level === 'PLATINUM' && (
            <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-yellow-50 rounded-lg border border-purple-200">
              <Trophy className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-purple-800">
                Parabéns! Você alcançou o nível máximo!
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Aproveite todos os benefícios exclusivos
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}