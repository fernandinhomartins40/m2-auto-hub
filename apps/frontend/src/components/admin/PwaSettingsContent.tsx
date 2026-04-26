import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, Save, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { clearSettingsCache } from '@/hooks/useStoreSettings';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { PwaSettingsSection } from './settings/PwaSettingsSection';

export function PwaSettingsContent() {
  const { settings, loading, updateSettings, resetSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    pwaName: '',
    pwaShortName: '',
    pwaDescription: '',
    pwaThemeColor: '#0f172a',
    pwaBackgroundColor: '#0f172a',
    pwaDisplay: 'standalone' as const,
    pwaIcon192Url: '',
    pwaIcon512Url: '',
    pwaAppleTouchIconUrl: '',
    pwaMaskableIconUrl: '',
  });

  useEffect(() => {
    if (!settings) return;

    setFormData({
      storeName: settings.storeName || '',
      pwaName: settings.pwaName || settings.storeName || '',
      pwaShortName: settings.pwaShortName || (settings.storeName || '').slice(0, 12),
      pwaDescription: settings.pwaDescription || '',
      pwaThemeColor: settings.pwaThemeColor || '#0f172a',
      pwaBackgroundColor: settings.pwaBackgroundColor || '#0f172a',
      pwaDisplay: settings.pwaDisplay || 'standalone',
      pwaIcon192Url: settings.pwaIcon192Url || '',
      pwaIcon512Url: settings.pwaIcon512Url || '',
      pwaAppleTouchIconUrl: settings.pwaAppleTouchIconUrl || '',
      pwaMaskableIconUrl: settings.pwaMaskableIconUrl || '',
    });
  }, [settings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        pwaName: formData.pwaName.trim(),
        pwaShortName: formData.pwaShortName.trim(),
        pwaDescription: formData.pwaDescription.trim(),
        pwaThemeColor: formData.pwaThemeColor,
        pwaBackgroundColor: formData.pwaBackgroundColor,
        pwaDisplay: formData.pwaDisplay,
        pwaIcon192Url: formData.pwaIcon192Url.trim() || null,
        pwaIcon512Url: formData.pwaIcon512Url.trim() || null,
        pwaAppleTouchIconUrl: formData.pwaAppleTouchIconUrl.trim() || null,
        pwaMaskableIconUrl: formData.pwaMaskableIconUrl.trim() || null,
      });
      clearSettingsCache();
      toast.success('Configurações do PWA salvas com sucesso.');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações do PWA', {
        description: error?.message || 'Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja restaurar as configurações do PWA para o padrão?')) {
      return;
    }

    setIsResetting(true);
    try {
      await resetSettings();
      clearSettingsCache();
      toast.success('Configurações do PWA restauradas para o padrão.');
    } catch (error: any) {
      toast.error('Erro ao restaurar configurações do PWA', {
        description: error?.message || 'Tente novamente.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-moria-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-moria-orange" />
            Configurações do PWA
          </CardTitle>
          <CardDescription>
            Gerencie manifesto, ícones e textos exibidos na instalação do aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PwaSettingsSection
            storeName={formData.storeName}
            pwaName={formData.pwaName}
            pwaShortName={formData.pwaShortName}
            pwaDescription={formData.pwaDescription}
            pwaThemeColor={formData.pwaThemeColor}
            pwaBackgroundColor={formData.pwaBackgroundColor}
            pwaDisplay={formData.pwaDisplay}
            pwaIcon192Url={formData.pwaIcon192Url}
            pwaIcon512Url={formData.pwaIcon512Url}
            pwaAppleTouchIconUrl={formData.pwaAppleTouchIconUrl}
            pwaMaskableIconUrl={formData.pwaMaskableIconUrl}
            onChange={handleInputChange}
          />

          <Separator />

          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={handleReset}
              disabled={isResetting || isSaving}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurar Padrão
                </>
              )}
            </Button>
            <Button className="bg-moria-orange hover:bg-moria-orange/90" onClick={handleSave} disabled={isSaving || isResetting}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações do PWA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
