import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { CustomerAuthCard } from "./CustomerAuthCard";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="sr-only">Area do Cliente</DialogTitle>
        </DialogHeader>

        <CustomerAuthCard onAuthenticated={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
