import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Bell, BellOff, TrendingDown, Package, Tag } from "lucide-react";
import { useFavoriteNotifications } from "../../hooks";

export function FavoriteNotificationSettings() {
  const {
    settings,
    updateSettings,
    requestNotificationPermission,
    checkForUpdates,
    isChecking,
    hasNotificationsEnabled
  } = useFavoriteNotifications();

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      checkForUpdates();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações de Favoritos
            </CardTitle>
            <CardDescription>
              Receba alertas quando produtos favoritos tiverem atualizações
            </CardDescription>
          </div>
          <Badge variant={hasNotificationsEnabled ? "default" : "secondary"}>
            {hasNotificationsEnabled ? "Ativas" : "Inativas"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Browser Notification Permission */}
        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <BellOff className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Permissão necessária
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Habilite notificações do navegador para receber alertas em tempo real
                </p>
                <Button
                  size="sm"
                  onClick={handleEnableNotifications}
                  className="mt-2"
                >
                  Habilitar Notificações
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        <div className="space-y-4">
          {/* Price Drops */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Quedas de Preço</p>
                <p className="text-sm text-muted-foreground">
                  Notificar quando o preço de um favorito diminuir
                </p>
              </div>
            </div>
            <Switch
              checked={settings.priceDrops}
              onCheckedChange={(checked) => updateSettings({ priceDrops: checked })}
            />
          </div>

          {/* Back in Stock */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Volta ao Estoque</p>
                <p className="text-sm text-muted-foreground">
                  Notificar quando um produto indisponível voltar ao estoque
                </p>
              </div>
            </div>
            <Switch
              checked={settings.backInStock}
              onCheckedChange={(checked) => updateSettings({ backInStock: checked })}
            />
          </div>

          {/* New Promotions */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium">Novas Promoções</p>
                <p className="text-sm text-muted-foreground">
                  Notificar quando um favorito entrar em promoção
                </p>
              </div>
            </div>
            <Switch
              checked={settings.newPromotions}
              onCheckedChange={(checked) => updateSettings({ newPromotions: checked })}
            />
          </div>
        </div>

        {/* Check Now Button */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={checkForUpdates}
            disabled={isChecking || !hasNotificationsEnabled}
            className="w-full"
          >
            {isChecking ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Verificando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Verificar Atualizações Agora
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Verificação automática a cada hora
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
