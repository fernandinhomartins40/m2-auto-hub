import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { CustomerAuthCard } from "./CustomerAuthCard";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Formulário curto: mantém o formato de caixa também no celular. */}
      <DialogContent mobileAsSheet className="max-w-md overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Area do Cliente</DialogTitle>
        </DialogHeader>

        <CustomerAuthCard onAuthenticated={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
