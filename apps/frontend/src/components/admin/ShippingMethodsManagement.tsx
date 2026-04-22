import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useToast } from "../ui/use-toast";
import { Truck, Plus, Edit, Trash2, Power, RefreshCw } from "lucide-react";
import shippingService, { ShippingMethod, CreateShippingMethodDto } from "@/api/shippingService";

export function ShippingMethodsManagement() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [formData, setFormData] = useState<CreateShippingMethodDto>({
    name: "",
    type: "CORREIOS",
    trackingUrl: "",
    isActive: true,
    order: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      setLoading(true);
      const data = await shippingService.getAllMethods(false);
      setMethods(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao carregar métodos de envio",
        variant: "destructive",
      });
      setMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (method?: ShippingMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        type: method.type,
        trackingUrl: method.trackingUrl || "",
        isActive: method.isActive,
        order: method.order,
      });
    } else {
      setEditingMethod(null);
      setFormData({
        name: "",
        type: "CORREIOS",
        trackingUrl: "",
        isActive: true,
        order: Array.isArray(methods) ? methods.length : 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMethod(null);
    setFormData({
      name: "",
      type: "CORREIOS",
      trackingUrl: "",
      isActive: true,
      order: 0,
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        toast({
          title: "Erro",
          description: "Nome é obrigatório",
          variant: "destructive",
        });
        return;
      }

      if (editingMethod) {
        await shippingService.updateMethod(editingMethod.id, formData);
        toast({
          title: "Sucesso",
          description: "Método de envio atualizado com sucesso",
        });
      } else {
        await shippingService.createMethod(formData);
        toast({
          title: "Sucesso",
          description: "Método de envio criado com sucesso",
        });
      }

      handleCloseDialog();
      loadMethods();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao salvar método de envio",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (method: ShippingMethod) => {
    try {
      await shippingService.toggleActive(method.id);
      toast({
        title: "Sucesso",
        description: `Método ${method.isActive ? 'desativado' : 'ativado'} com sucesso`,
      });
      loadMethods();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao alterar status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (method: ShippingMethod) => {
    if (!confirm(`Tem certeza que deseja excluir "${method.name}"?`)) {
      return;
    }

    try {
      await shippingService.deleteMethod(method.id);
      toast({
        title: "Sucesso",
        description: "Método de envio excluído com sucesso",
      });
      loadMethods();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao excluir método de envio",
        variant: "destructive",
      });
    }
  };

  const handleSeedDefault = async () => {
    try {
      await shippingService.seedDefaultMethods();
      toast({
        title: "Sucesso",
        description: "Métodos padrão criados com sucesso",
      });
      loadMethods();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao criar métodos padrão",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CORREIOS: "Correios",
      TRANSPORTADORA: "Transportadora",
      MOTOBOY: "Motoboy",
      RETIRADA: "Retirada na Loja",
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      CORREIOS: "bg-blue-500",
      TRANSPORTADORA: "bg-purple-500",
      MOTOBOY: "bg-green-500",
      RETIRADA: "bg-orange-500",
    };
    return colors[type] || "bg-gray-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Métodos de Envio
              </CardTitle>
              <CardDescription>
                Gerencie os métodos de envio disponíveis para rastreamento
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSeedDefault}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Padrões
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Método
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {methods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum método de envio cadastrado.
                <br />
                Clique em "Criar Padrões" para adicionar os métodos padrão.
              </div>
            ) : (
              methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{method.name}</h3>
                      <Badge className={getTypeBadgeColor(method.type)}>
                        {getTypeLabel(method.type)}
                      </Badge>
                      {method.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    {method.trackingUrl && (
                      <p className="text-sm text-muted-foreground mt-1">
                        URL: {method.trackingUrl}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(method)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(method)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(method)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-4rem)]">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? "Editar Método de Envio" : "Novo Método de Envio"}
            </DialogTitle>
            <DialogDescription>
              Configure as informações do método de envio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Correios PAC"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORREIOS">Correios</SelectItem>
                  <SelectItem value="TRANSPORTADORA">Transportadora</SelectItem>
                  <SelectItem value="MOTOBOY">Motoboy</SelectItem>
                  <SelectItem value="RETIRADA">Retirada na Loja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingUrl">URL de Rastreamento</Label>
              <Input
                id="trackingUrl"
                placeholder="https://rastreamento.com.br?codigo={code}"
                value={formData.trackingUrl}
                onChange={(e) => setFormData({ ...formData, trackingUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{code}"} onde o código de rastreio deve aparecer
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Ordem de Exibição</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingMethod ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
