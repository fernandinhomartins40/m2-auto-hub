import { useEffect, useState } from "react";
import { Bell, CheckCheck, Eye, RefreshCw } from "lucide-react";

import customerService, { type CustomerNotification } from "../../api/customerService";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../../hooks/use-toast";
import { PanelPageHeader } from "../layout/PanelPageHeader";
import { PanelPage } from "../layout/PanelPage";

export function CustomerNotifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    setHasError(false);
    try {
      setNotifications(await customerService.getMyNotifications());
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await customerService.markNotificationAsRead(notificationId);
      setNotifications((current) =>
        current.map((item) => item.id === notificationId ? { ...item, read: true } : item),
      );
    } catch {
      toast({ title: "Não foi possível marcar como lida", variant: "destructive" });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await customerService.markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      toast({ title: "Notificações marcadas como lidas" });
    } catch {
      toast({ title: "Não foi possível atualizar as notificações", variant: "destructive" });
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <PanelPage>
      <PanelPageHeader icon={Bell} title="Notificações" description={unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? "atualização não lida" : "atualizações não lidas"}`
              : "Você está em dia com suas atualizações"} actions={unreadCount > 0 ? (
          <Button variant="outline" onClick={() => void handleMarkAllAsRead()}>
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        ) : undefined} />

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando notificações...</CardContent></Card>
      ) : hasError ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <div><p className="font-medium">Não foi possível carregar as notificações</p><p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p></div>
            <Button variant="outline" onClick={() => void loadNotifications()}><RefreshCw className="h-4 w-4" />Tentar novamente</Button>
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Bell className="mx-auto mb-3 h-10 w-10 opacity-50" /><p>Nenhuma notificação encontrada</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.read ? "opacity-70" : "border-l-4 border-l-moria-orange"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><CardTitle className="text-base">{notification.title}</CardTitle><CardDescription className="mt-1">{notification.message}</CardDescription></div>
                  {!notification.read && <Button variant="ghost" size="sm" aria-label={`Marcar ${notification.title} como lida`} onClick={() => void handleMarkAsRead(notification.id)}><Eye className="h-4 w-4" /></Button>}
                </div>
              </CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString("pt-BR")}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </PanelPage>
  );
}
