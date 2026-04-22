import { X, User, Car, Heart, Gift, MessageCircle, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  customer: {
    name?: string;
    email?: string;
    totalSpent: number;
  };
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function MobileDrawer({
  open,
  onClose,
  customer,
  currentTab,
  onTabChange,
  onLogout,
}: MobileDrawerProps) {
  const getInitials = (name?: string) => {
    if (!name) return "CL";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMembershipLevel = (totalSpent: number) => {
    if (totalSpent >= 5000) {
      return { level: "Platinum", color: "bg-purple-100 text-purple-800" };
    }
    if (totalSpent >= 2000) {
      return { level: "Gold", color: "bg-yellow-100 text-yellow-800" };
    }
    if (totalSpent >= 500) {
      return { level: "Silver", color: "bg-gray-100 text-gray-800" };
    }
    return { level: "Bronze", color: "bg-orange-100 text-orange-800" };
  };

  const membership = getMembershipLevel(customer.totalSpent);

  const menuItems = [
    { id: "profile", label: "Meu Perfil", icon: User },
    { id: "vehicles", label: "Meus Veiculos", icon: Car },
    { id: "favorites", label: "Favoritos", icon: Heart },
    { id: "coupons", label: "Cupons", icon: Gift },
    { id: "support", label: "Suporte", icon: MessageCircle },
  ];

  const handleItemClick = (itemId: string) => {
    onTabChange(itemId);
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegacao"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-gradient-to-br from-moria-orange/10 to-moria-orange/5">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14">
              <AvatarImage src="" />
              <AvatarFallback className="bg-moria-orange text-white text-lg font-bold">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {customer.name}
              </p>
              <p className="text-sm text-gray-600 truncate">{customer.email}</p>
              <Badge
                className={`text-xs mt-1 ${membership.color}`}
                variant="secondary"
              >
                Cliente {membership.level}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-manipulation",
                    isActive
                      ? "bg-moria-orange/10 text-moria-orange font-medium"
                      : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <Separator />

        <div className="p-4">
          <Button
            variant="outline"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
        </div>
      </div>
    </>
  );
}
