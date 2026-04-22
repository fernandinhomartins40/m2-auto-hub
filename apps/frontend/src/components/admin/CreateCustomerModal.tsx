import { useState } from 'react';
import { Save, Loader2, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { ResponsiveDialogContent, ResponsiveDialogHeader } from '../ui/responsive-dialog';
import adminService, { type ProvisionalUser as AdminCustomer } from '../../api/adminService';
import { useToast } from '../../hooks/use-toast';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: AdminCustomer) => void;
}

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
  });

  const validateForm = () => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      cpf: '',
    };

    let isValid = true;

    // Validar nome
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      isValid = false;
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
      isValid = false;
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
      isValid = false;
    }

    // Validar telefone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
      isValid = false;
    } else {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        newErrors.phone = 'Telefone deve ter 10 ou 11 dígitos';
        isValid = false;
      }
    }

    // Validar CPF (opcional, mas se preenchido deve ser válido)
    if (formData.cpf.trim()) {
      const cpfDigits = formData.cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        newErrors.cpf = 'CPF deve ter 11 dígitos';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const customer = await adminService.createCustomer({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        cpf: formData.cpf.trim() || undefined,
      });

      toast({
        title: 'Cliente criado com sucesso!',
        description: `${customer.name} foi cadastrado no sistema.`,
      });

      // Reset form
      setFormData({ name: '', email: '', phone: '', cpf: '' });
      setErrors({ name: '', email: '', phone: '', cpf: '' });

      onSuccess(customer);
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      const errorMessage = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'Erro ao criar cliente. Tente novamente.';

      toast({
        title: 'Erro ao criar cliente',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFormData({ name: '', email: '', phone: '', cpf: '' });
      setErrors({ name: '', email: '', phone: '', cpf: '' });
      onClose();
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, phone: value });
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, cpf: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <ResponsiveDialogContent size="lg" className="p-0 flex flex-col gap-0">
        <ResponsiveDialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-moria-orange" />
            Cadastrar Novo Cliente
          </DialogTitle>
        </ResponsiveDialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name" className="text-xs">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="João da Silva"
                disabled={isCreating}
                className={`mt-1 h-9 text-sm ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-xs">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao.silva@email.com"
                disabled={isCreating}
                className={`mt-1 h-9 text-sm ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone" className="text-xs">
                Telefone/WhatsApp <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formatPhone(formData.phone)}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                disabled={isCreating}
                className={`mt-1 h-9 text-sm ${errors.phone ? 'border-red-500' : ''}`}
                maxLength={15}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
            </div>

            <div>
              <Label htmlFor="cpf" className="text-xs">CPF (opcional)</Label>
              <Input
                id="cpf"
                value={formatCPF(formData.cpf)}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                disabled={isCreating}
                className={`mt-1 h-9 text-sm ${errors.cpf ? 'border-red-500' : ''}`}
                maxLength={14}
              />
              {errors.cpf && <p className="text-xs text-red-500 mt-0.5">{errors.cpf}</p>}
            </div>
          </div>
        </form>
        </ScrollArea>

        {/* Footer com ações */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-4 sm:px-6 py-3 border-t bg-gray-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            size="sm"
            className="w-full sm:w-auto h-8 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isCreating}
            size="sm"
            className="w-full sm:w-auto bg-moria-orange hover:bg-moria-orange/90 h-8 text-xs"
            onClick={handleSubmit}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Criar Cliente
              </>
            )}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </Dialog>
  );
}
