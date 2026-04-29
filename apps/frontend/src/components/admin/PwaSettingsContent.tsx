import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, Save, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { clearSettingsCache } from '@/hooks/useStoreSettings';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { PwaSettingsSection, type PwaField } from './settings/PwaSettingsSection';

const defaultProfileConfig = {
  name: '',
  shortName: '',
  description: '',
  themeColor: '#0f172a',
  backgroundColor: '#0f172a',
  display: 'standalone' as const,
  icon192Url: '',
  icon512Url: '',
  desktopIconUrl: '',
  appleTouchIconUrl: '',
  maskableIconUrl: '',
};

export function PwaSettingsContent() {
  const { settings, loading, updateSettings, resetSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [profiles, setProfiles] = useState({
    customer: { ...defaultProfileConfig },
    admin: { ...defaultProfileConfig },
    mechanic: { ...defaultProfileConfig },
  });

  useEffect(() => {
    if (!settings) return;

    setStoreName(settings.storeName || '');
    setProfiles({
      customer: {
        name: settings.pwaName || `${settings.storeName || 'M2 Center Auto'} Cliente`,
        shortName: settings.pwaShortName || `${(settings.storeName || 'M2').slice(0, 8)} Cliente`,
        description: settings.pwaDescription || '',
        themeColor: settings.pwaThemeColor || '#0f172a',
        backgroundColor: settings.pwaBackgroundColor || '#0f172a',
        display: settings.pwaDisplay || 'standalone',
        icon192Url: settings.pwaIcon192Url || '',
        icon512Url: settings.pwaIcon512Url || '',
        desktopIconUrl: settings.pwaDesktopIconUrl || '',
        appleTouchIconUrl: settings.pwaAppleTouchIconUrl || '',
        maskableIconUrl: settings.pwaMaskableIconUrl || '',
      },
      admin: {
        name: settings.pwaAdminName || `${settings.storeName || 'M2 Center Auto'} Painel`,
        shortName: settings.pwaAdminShortName || `${(settings.storeName || 'M2').slice(0, 8)} Painel`,
        description: settings.pwaAdminDescription || '',
        themeColor: settings.pwaAdminThemeColor || '#0f172a',
        backgroundColor: settings.pwaAdminBackgroundColor || '#0f172a',
        display: settings.pwaAdminDisplay || 'standalone',
        icon192Url: settings.pwaAdminIcon192Url || '',
        icon512Url: settings.pwaAdminIcon512Url || '',
        desktopIconUrl: settings.pwaAdminDesktopIconUrl || '',
        appleTouchIconUrl: settings.pwaAdminAppleTouchIconUrl || '',
        maskableIconUrl: settings.pwaAdminMaskableIconUrl || '',
      },
      mechanic: {
        name: settings.pwaMechanicName || `${settings.storeName || 'M2 Center Auto'} Mecanico`,
        shortName: settings.pwaMechanicShortName || `${(settings.storeName || 'M2').slice(0, 8)} Oficina`,
        description: settings.pwaMechanicDescription || '',
        themeColor: settings.pwaMechanicThemeColor || '#0f172a',
        backgroundColor: settings.pwaMechanicBackgroundColor || '#0f172a',
        display: settings.pwaMechanicDisplay || 'standalone',
        icon192Url: settings.pwaMechanicIcon192Url || '',
        icon512Url: settings.pwaMechanicIcon512Url || '',
        desktopIconUrl: settings.pwaMechanicDesktopIconUrl || '',
        appleTouchIconUrl: settings.pwaMechanicAppleTouchIconUrl || '',
        maskableIconUrl: settings.pwaMechanicMaskableIconUrl || '',
      },
    });
  }, [settings]);

  const handleInputChange = (field: PwaField, value: string) => {
    const apply = <T extends typeof defaultProfileConfig>(profileKey: keyof typeof profiles, key: keyof T) => {
      setProfiles((prev) => ({
        ...prev,
        [profileKey]: {
          ...prev[profileKey],
          [key]: value,
        },
      }));
    };

    switch (field) {
      case 'pwaName':
        apply('customer', 'name');
        break;
      case 'pwaShortName':
        apply('customer', 'shortName');
        break;
      case 'pwaDescription':
        apply('customer', 'description');
        break;
      case 'pwaThemeColor':
        apply('customer', 'themeColor');
        break;
      case 'pwaBackgroundColor':
        apply('customer', 'backgroundColor');
        break;
      case 'pwaDisplay':
        apply('customer', 'display');
        break;
      case 'pwaIcon192Url':
        apply('customer', 'icon192Url');
        break;
      case 'pwaIcon512Url':
        apply('customer', 'icon512Url');
        break;
      case 'pwaDesktopIconUrl':
        apply('customer', 'desktopIconUrl');
        break;
      case 'pwaAppleTouchIconUrl':
        apply('customer', 'appleTouchIconUrl');
        break;
      case 'pwaMaskableIconUrl':
        apply('customer', 'maskableIconUrl');
        break;
      case 'pwaAdminName':
        apply('admin', 'name');
        break;
      case 'pwaAdminShortName':
        apply('admin', 'shortName');
        break;
      case 'pwaAdminDescription':
        apply('admin', 'description');
        break;
      case 'pwaAdminThemeColor':
        apply('admin', 'themeColor');
        break;
      case 'pwaAdminBackgroundColor':
        apply('admin', 'backgroundColor');
        break;
      case 'pwaAdminDisplay':
        apply('admin', 'display');
        break;
      case 'pwaAdminIcon192Url':
        apply('admin', 'icon192Url');
        break;
      case 'pwaAdminIcon512Url':
        apply('admin', 'icon512Url');
        break;
      case 'pwaAdminDesktopIconUrl':
        apply('admin', 'desktopIconUrl');
        break;
      case 'pwaAdminAppleTouchIconUrl':
        apply('admin', 'appleTouchIconUrl');
        break;
      case 'pwaAdminMaskableIconUrl':
        apply('admin', 'maskableIconUrl');
        break;
      case 'pwaMechanicName':
        apply('mechanic', 'name');
        break;
      case 'pwaMechanicShortName':
        apply('mechanic', 'shortName');
        break;
      case 'pwaMechanicDescription':
        apply('mechanic', 'description');
        break;
      case 'pwaMechanicThemeColor':
        apply('mechanic', 'themeColor');
        break;
      case 'pwaMechanicBackgroundColor':
        apply('mechanic', 'backgroundColor');
        break;
      case 'pwaMechanicDisplay':
        apply('mechanic', 'display');
        break;
      case 'pwaMechanicIcon192Url':
        apply('mechanic', 'icon192Url');
        break;
      case 'pwaMechanicIcon512Url':
        apply('mechanic', 'icon512Url');
        break;
      case 'pwaMechanicDesktopIconUrl':
        apply('mechanic', 'desktopIconUrl');
        break;
      case 'pwaMechanicAppleTouchIconUrl':
        apply('mechanic', 'appleTouchIconUrl');
        break;
      case 'pwaMechanicMaskableIconUrl':
        apply('mechanic', 'maskableIconUrl');
        break;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        pwaName: profiles.customer.name.trim(),
        pwaShortName: profiles.customer.shortName.trim(),
        pwaDescription: profiles.customer.description.trim(),
        pwaThemeColor: profiles.customer.themeColor,
        pwaBackgroundColor: profiles.customer.backgroundColor,
        pwaDisplay: profiles.customer.display,
        pwaIcon192Url: profiles.customer.icon192Url.trim() || null,
        pwaIcon512Url: profiles.customer.icon512Url.trim() || null,
        pwaDesktopIconUrl: profiles.customer.desktopIconUrl.trim() || null,
        pwaAppleTouchIconUrl: profiles.customer.appleTouchIconUrl.trim() || null,
        pwaMaskableIconUrl: profiles.customer.maskableIconUrl.trim() || null,
        pwaAdminName: profiles.admin.name.trim(),
        pwaAdminShortName: profiles.admin.shortName.trim(),
        pwaAdminDescription: profiles.admin.description.trim(),
        pwaAdminThemeColor: profiles.admin.themeColor,
        pwaAdminBackgroundColor: profiles.admin.backgroundColor,
        pwaAdminDisplay: profiles.admin.display,
        pwaAdminIcon192Url: profiles.admin.icon192Url.trim() || null,
        pwaAdminIcon512Url: profiles.admin.icon512Url.trim() || null,
        pwaAdminDesktopIconUrl: profiles.admin.desktopIconUrl.trim() || null,
        pwaAdminAppleTouchIconUrl: profiles.admin.appleTouchIconUrl.trim() || null,
        pwaAdminMaskableIconUrl: profiles.admin.maskableIconUrl.trim() || null,
        pwaMechanicName: profiles.mechanic.name.trim(),
        pwaMechanicShortName: profiles.mechanic.shortName.trim(),
        pwaMechanicDescription: profiles.mechanic.description.trim(),
        pwaMechanicThemeColor: profiles.mechanic.themeColor,
        pwaMechanicBackgroundColor: profiles.mechanic.backgroundColor,
        pwaMechanicDisplay: profiles.mechanic.display,
        pwaMechanicIcon192Url: profiles.mechanic.icon192Url.trim() || null,
        pwaMechanicIcon512Url: profiles.mechanic.icon512Url.trim() || null,
        pwaMechanicDesktopIconUrl: profiles.mechanic.desktopIconUrl.trim() || null,
        pwaMechanicAppleTouchIconUrl: profiles.mechanic.appleTouchIconUrl.trim() || null,
        pwaMechanicMaskableIconUrl: profiles.mechanic.maskableIconUrl.trim() || null,
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
    <div className="min-w-0 max-w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-moria-orange" />
            Configurações do PWA
          </CardTitle>
          <CardDescription>
            Gerencie textos, ícones, manifesto e identidade visual dos PWAs do cliente, do lojista e do mecânico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PwaSettingsSection storeName={storeName} profiles={profiles} onChange={handleInputChange} />

          <Separator />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 sm:w-auto"
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
            <Button className="w-full bg-moria-orange hover:bg-moria-orange/90 sm:w-auto" onClick={handleSave} disabled={isSaving || isResetting}>
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
