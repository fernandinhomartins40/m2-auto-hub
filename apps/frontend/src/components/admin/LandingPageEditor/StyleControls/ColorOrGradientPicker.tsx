/**
 * ColorOrGradientPicker - Componente reutilizável para escolher entre cor sólida ou gradiente
 * Permite configurar cores sólidas com ColorPicker ou gradientes complexos com GradientPicker
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Droplet, Palette } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { GradientPicker, MORIA_GRADIENT_PRESETS } from './GradientPicker';
import { GradientConfig } from '@/types/landingPage';
import { sanitizeColorValue, stringToColorOrGradient } from '@/utils/colorHelpers';

export interface ColorOrGradientValue {
  type: 'solid' | 'gradient';
  solid?: string; // Cor sólida (ex: "#FF6B35")
  gradient?: GradientConfig; // Configuração do gradiente
}

interface ColorOrGradientPickerProps {
  label: string;
  value: ColorOrGradientValue;
  onChange: (value: ColorOrGradientValue) => void;
  description?: string;
  defaultGradientPreset?: keyof typeof MORIA_GRADIENT_PRESETS;
  showPreview?: boolean;
}

const SHOULD_LOG_SANITIZATION_WARNINGS = import.meta.env.DEV;

// Helper para converter preset readonly para mutable
const getPresetAsGradientConfig = (presetKey: keyof typeof MORIA_GRADIENT_PRESETS): GradientConfig => {
  const preset = MORIA_GRADIENT_PRESETS[presetKey];

  // Validação: se preset não existe, usar fallback
  if (!preset) {
    console.error('[getPresetAsGradientConfig] Preset inválido:', presetKey);
    const fallbackPreset = MORIA_GRADIENT_PRESETS['goldMetallic'];
    return {
      ...fallbackPreset,
      colors: [...fallbackPreset.colors],
    };
  }

  return {
    ...preset,
    colors: [...preset.colors], // Converter readonly array para mutable array
  };
};

export const ColorOrGradientPicker = ({
  label,
  value,
  onChange,
  description,
  defaultGradientPreset = 'goldMetallic',
  showPreview = true,
}: ColorOrGradientPickerProps) => {
  // Validação: garantir que value existe e tem estrutura mínima
  // IMPORTANTE: converter valores antigos (strings) para novo formato
  const convertedValue = stringToColorOrGradient(value);

  // DEBUG: log para ver o que está chegando
  if (!convertedValue || (convertedValue.type === 'gradient' && (!convertedValue.gradient || !convertedValue.gradient?.colors))) {
    console.error('[ColorOrGradientPicker] Valor inválido detectado:', { original: value, converted: convertedValue });
  }

  const safeValue: ColorOrGradientValue = convertedValue || {
    type: 'solid',
    solid: '#FF6B35',
  };

  const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>(safeValue.type || 'solid');

  const handleTabChange = (tab: string) => {
    const newType = tab as 'solid' | 'gradient';
    setActiveTab(newType);

    // Atualizar o tipo e garantir valores padrão
    if (newType === 'solid') {
      onChange({
        type: 'solid',
        solid: safeValue.solid || '#FF6B35',
        gradient: safeValue.gradient,
      });
    } else {
      onChange({
        type: 'gradient',
        solid: safeValue.solid,
        gradient: safeValue.gradient || getPresetAsGradientConfig(defaultGradientPreset),
      });
    }
  };

  const handleSolidChange = (color: string) => {
    onChange({
      ...safeValue,
      type: 'solid',
      solid: color,
    });
  };

  const handleGradientChange = (gradient: GradientConfig) => {
    onChange({
      ...safeValue,
      type: 'gradient',
      gradient,
    });
  };

  // Gerar CSS para preview
  const getPreviewStyle = (): React.CSSProperties => {
    if (safeValue.type === 'gradient' && safeValue.gradient) {
      const { type, angle, direction, colors } = safeValue.gradient;

      // Validação: garantir que colors existe e tem elementos
      if (!colors || colors.length === 0) {
        return { backgroundColor: '#FF6B35' };
      }

      let backgroundImage = '';
      if (type === 'linear') {
        const angleOrDirection = direction || `${angle || 90}deg`;
        backgroundImage = `linear-gradient(${angleOrDirection}, ${colors.join(', ')})`;
      } else if (type === 'radial') {
        backgroundImage = `radial-gradient(circle, ${colors.join(', ')})`;
      }

      return { backgroundImage };
    }

    return { backgroundColor: safeValue.solid || '#FF6B35' };
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="solid" className="flex items-center gap-2">
            <Droplet className="h-4 w-4" />
            Cor Sólida
          </TabsTrigger>
          <TabsTrigger value="gradient" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Gradiente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="solid" className="space-y-4 mt-4">
          <ColorPicker
            label="Cor"
            value={safeValue.solid || '#FF6B35'}
            onChange={handleSolidChange}
          />
        </TabsContent>

        <TabsContent value="gradient" className="space-y-4 mt-4">
          <GradientPicker
            label="Gradiente"
            value={safeValue.gradient || getPresetAsGradientConfig(defaultGradientPreset)}
            onChange={handleGradientChange}
            presetName={defaultGradientPreset}
          />
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {showPreview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Preview</Label>
            <Badge variant="outline" className="text-xs">
              {safeValue.type === 'solid' ? 'Cor Sólida' : 'Gradiente'}
            </Badge>
          </div>
          <div
            className="w-full h-20 rounded-lg border-2 border-gray-200 shadow-sm"
            style={getPreviewStyle()}
          />
        </div>
      )}
    </Card>
  );
};

// Helper function para converter ColorOrGradientValue em CSS
export const colorOrGradientToCSS = (
  value: ColorOrGradientValue | undefined | any,
  options?: { forText?: boolean }
): React.CSSProperties => {
  const isForText = options?.forText ?? false;

  // Validação 1: value undefined ou null
  if (!value) {
    return {};
  }

  // Sanitizar o valor para garantir segurança
  const sanitized = sanitizeColorValue(value);

  // Se a sanitização falhou, retornar fallback
  if (!sanitized) {
    if (SHOULD_LOG_SANITIZATION_WARNINGS) {
      console.warn('[colorOrGradientToCSS] Valor não pôde ser sanitizado:', value);
    }
    return isForText ? { color: '#FF6B35' } : { backgroundColor: '#FF6B35' };
  }

  // Usar o valor sanitizado daqui em diante
  const safeValue = sanitized;

  // Tipo: gradient
  if (safeValue.type === 'gradient') {
    // Como o valor foi sanitizado, gradient já está validado
    if (!safeValue.gradient) {
      return isForText ? { color: '#FF6B35' } : { backgroundColor: '#FF6B35' };
    }

    // Extrair propriedades com segurança
    const { type, angle, direction, colors } = safeValue.gradient;

    // Validação adicional: verificar se colors existe
    if (!colors || !Array.isArray(colors) || colors.length === 0) {
      if (SHOULD_LOG_SANITIZATION_WARNINGS) {
        console.warn('[colorOrGradientToCSS] Colors inválido após sanitização:', safeValue.gradient);
      }
      return isForText ? { color: '#FF6B35' } : { backgroundColor: '#FF6B35' };
    }

    // Gerar gradiente CSS
    let gradient = '';
    if (type === 'linear') {
      const angleOrDirection = direction || `${angle || 90}deg`;
      gradient = `linear-gradient(${angleOrDirection}, ${colors.join(', ')})`;
    } else if (type === 'radial') {
      gradient = `radial-gradient(circle, ${colors.join(', ')})`;
    }

    // Retornar CSS apropriado
    if (isForText) {
      return {
        background: gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };
    }

    return { backgroundImage: gradient };
  }

  // Tipo: solid (cor sólida)
  if (safeValue.type === 'solid') {
    const solidColor = safeValue.solid || '#FF6B35';

    if (isForText) {
      return { color: solidColor };
    }

    return { backgroundColor: solidColor };
  }

  // Fallback (não deveria chegar aqui após sanitização)
  return isForText ? { color: '#FF6B35' } : { backgroundColor: '#FF6B35' };
};
