import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import type { Address } from "../../contexts/AuthContext";
import type { AddressPayload } from "@/api/addressService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import {
  User,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Home,
  Briefcase,
  Save,
  Loader2,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "../ui/password-input";
import { isPasswordStrong } from "@/lib/passwordUtils";

const emptyAddressForm: AddressPayload = {
  type: 'HOME',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  isDefault: false,
};

export function CustomerProfile() {
  const { customer, updateProfile, addAddress, updateAddress, deleteAddress } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    cpf: customer?.cpf || '',
    birthDate: customer?.birthDate || '',
  });

  const [addressForm, setAddressForm] = useState<AddressPayload>(emptyAddressForm);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!customer) return null;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateProfile(profileForm);
      if (result.success) {
        toast.success("Perfil atualizado com sucesso!");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Erro ao atualizar perfil");
      }
    } catch {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await addAddress(addressForm);
      if (result.success) {
        toast.success("Endereço adicionado com sucesso!");
        setShowAddressDialog(false);
        resetAddressForm();
      } else {
        toast.error(result.error || "Erro ao adicionar endereço");
      }
    } catch {
      toast.error("Erro ao adicionar endereço");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddress) return;

    setIsLoading(true);

    try {
      const result = await updateAddress(editingAddress.id, addressForm);
      if (result.success) {
        toast.success("Endereço atualizado com sucesso!");
        setEditingAddress(null);
        setShowAddressDialog(false);
        resetAddressForm();
      } else {
        toast.error(result.error || "Erro ao atualizar endereço");
      }
    } catch {
      toast.error("Erro ao atualizar endereço");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if ((customer.addresses?.length || 0) <= 1) {
      toast.error("Você deve ter pelo menos um endereço");
      return;
    }

    try {
      const result = await deleteAddress(addressId);
      if (result.success) {
        toast.success("Endereço removido com sucesso!");
      } else {
        toast.error(result.error || "Erro ao remover endereço");
      }
    } catch {
      toast.error("Erro ao remover endereço");
    }
  };

  const resetAddressForm = () => {
    setAddressForm(emptyAddressForm);
  };

  const openAddressDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        type: address.type,
        street: address.street,
        number: address.number,
        complement: address.complement || '',
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        isDefault: address.isDefault,
      });
    } else {
      setEditingAddress(null);
      resetAddressForm();
    }
    setShowAddressDialog(true);
  };

  const getAddressTypeIcon = (type: Address['type']) => {
    switch (type) {
      case 'HOME':
        return Home;
      case 'WORK':
        return Briefcase;
      default:
        return MapPin;
    }
  };

  const getAddressTypeLabel = (type: Address['type']) => {
    switch (type) {
      case 'HOME':
        return 'Casa';
      case 'WORK':
        return 'Trabalho';
      default:
        return 'Outro';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      toast.error("A nova senha não atende aos requisitos mínimos de segurança");
      return;
    }

    setIsChangingPassword(true);

    try {
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      if (response.ok) {
        toast.success("Senha alterada com sucesso");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao alterar senha");
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error("Erro ao alterar senha");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e endereços</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="addresses">Endereços</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Informações Pessoais
                  </CardTitle>
                  <CardDescription>
                    Atualize seus dados pessoais e de contato
                  </CardDescription>
                </div>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => {
                    if (isEditing) {
                      setProfileForm({
                        name: customer.name || '',
                        email: customer.email || '',
                        phone: customer.phone || '',
                        cpf: customer.cpf || '',
                        birthDate: customer.birthDate || '',
                      });
                    }
                    setIsEditing(!isEditing);
                  }}
                >
                  {isEditing ? "Cancelar" : "Editar"}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Seu nome completo"
                        className="pl-10"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing || isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing || isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing || isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        className="pl-10"
                        value={profileForm.cpf}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, cpf: e.target.value }))}
                        disabled={!isEditing || isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="birthDate"
                        type="date"
                        className="pl-10"
                        value={profileForm.birthDate}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, birthDate: e.target.value }))}
                        disabled={!isEditing || isLoading}
                      />
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-moria-orange hover:bg-moria-orange/90"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <PasswordInput
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    disabled={isChangingPassword}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    disabled={isChangingPassword}
                    showStrengthIndicator
                    showRequirements
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    disabled={isChangingPassword}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-600">As senhas não coincidem</p>
                  )}
                </div>

                <Separator />

                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full sm:w-auto"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando Senha...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Meus Endereços
                  </CardTitle>
                  <CardDescription>
                    Gerencie seus endereços de entrega
                  </CardDescription>
                </div>
                <Button onClick={() => openAddressDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Endereço
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {!customer.addresses || customer.addresses.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">Nenhum endereço cadastrado</p>
                  <Button variant="outline" className="mt-4" onClick={() => openAddressDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Primeiro Endereço
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {customer.addresses.map((address) => {
                    const TypeIcon = getAddressTypeIcon(address.type);

                    return (
                      <Card key={address.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <TypeIcon className="mt-1 h-5 w-5 text-muted-foreground" />
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">
                                    {getAddressTypeLabel(address.type)}
                                  </span>
                                  {address.isDefault && (
                                    <Badge variant="secondary" className="text-xs">
                                      Principal
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {address.street}, {address.number}
                                  {address.complement && `, ${address.complement}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {address.neighborhood} - {address.city}, {address.state}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  CEP: {address.zipCode}
                                </p>
                              </div>
                            </div>

                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAddressDialog(address)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteAddress(address.id)}
                                disabled={(customer.addresses?.length || 0) <= 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
            </DialogTitle>
            <DialogDescription>
              {editingAddress
                ? 'Atualize as informações do endereço'
                : 'Adicione um novo endereço de entrega'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editingAddress ? handleUpdateAddress : handleAddAddress}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address-type">Tipo do Endereço</Label>
                <Select
                  value={addressForm.type}
                  onValueChange={(value) => setAddressForm(prev => ({ ...prev, type: value as Address['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOME">Casa</SelectItem>
                    <SelectItem value="WORK">Trabalho</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    placeholder="Nome da rua"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    placeholder="123"
                    value={addressForm.number}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, number: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complement">Complemento (opcional)</Label>
                <Input
                  id="complement"
                  placeholder="Apto, sala, etc."
                  value={addressForm.complement || ''}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, complement: e.target.value }))}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  placeholder="Nome do bairro"
                  value={addressForm.neighborhood}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Cidade"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    placeholder="SP"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                    disabled={isLoading}
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  placeholder="00000-000"
                  value={addressForm.zipCode}
                  onChange={(e) => setAddressForm(prev => ({ ...prev, zipCode: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddressDialog(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-moria-orange hover:bg-moria-orange/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingAddress ? 'Atualizando...' : 'Salvando...'}
                  </>
                ) : (
                  editingAddress ? 'Atualizar' : 'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
