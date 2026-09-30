import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { privacyService } from '@/api/privacyService';

const STORAGE_KEY = 'm2_privacy_preferences_v1';
const POLICY_VERSION = '2026-09-30' as const;

function subjectKey() {
  const key = 'm2_privacy_subject';
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

export function CookiePreferences() {
  const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const save = async (choices: { analytics: boolean; marketing: boolean }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ policyVersion: POLICY_VERSION, ...choices, savedAt: new Date().toISOString() }));
    setOpen(false);
    try { await privacyService.recordConsent({ subjectKey: subjectKey(), policyVersion: POLICY_VERSION, choices }); } catch { /* preferência local permanece válida */ }
    window.dispatchEvent(new CustomEvent('privacy-preferences-changed', { detail: choices }));
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="sm:max-w-lg" hideCloseButton>
        <DialogHeader>
          <DialogTitle>Suas escolhas de privacidade</DialogTitle>
          <DialogDescription>
            Usamos armazenamento essencial para login e funcionamento. Medição e marketing são opcionais e ficam desligados até você autorizar.
          </DialogDescription>
        </DialogHeader>
        {customizing && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-4"><div><Label>Essenciais</Label><p className="text-sm text-muted-foreground">Segurança, sessão e carrinho.</p></div><Switch checked disabled /></div>
            <div className="flex items-center justify-between gap-4"><div><Label htmlFor="privacy-analytics">Medição</Label><p className="text-sm text-muted-foreground">Ajuda a entender o uso da aplicação.</p></div><Switch id="privacy-analytics" checked={analytics} onCheckedChange={setAnalytics} /></div>
            <div className="flex items-center justify-between gap-4"><div><Label htmlFor="privacy-marketing">Marketing</Label><p className="text-sm text-muted-foreground">Comunicação personalizada e campanhas.</p></div><Switch id="privacy-marketing" checked={marketing} onCheckedChange={setMarketing} /></div>
          </div>
        )}
        <a className="text-sm text-primary underline" href="/privacidade">Leia o aviso de privacidade</a>
        <DialogFooter className="gap-2 sm:justify-between">
          {!customizing ? <Button variant="outline" onClick={() => setCustomizing(true)}>Personalizar</Button> : <Button variant="outline" onClick={() => void save({ analytics, marketing })}>Salvar escolhas</Button>}
          <div className="flex gap-2"><Button variant="ghost" onClick={() => void save({ analytics: false, marketing: false })}>Só essenciais</Button><Button onClick={() => void save({ analytics: true, marketing: true })}>Aceitar opcionais</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
