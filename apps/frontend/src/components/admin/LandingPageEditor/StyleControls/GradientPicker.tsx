/**
 * GradientPicker - Editor de gradientes com múltiplos color pickers
 * Permite editar cada cor do gradiente individualmente
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette } from 'lucide-react';

export interface GradientConfig {
  type: 'linear' | 'radial';
  angle?: number; // Para gradientes lineares (ex: 45, 90, 180)
  direction?: string; // Para gradientes com direção (ex: 'to-br', 'to-r')
  colors: string[]; // Array de cores hex
}

interface GradientPickerProps {
  label: string;
  value: GradientConfig;
  onChange: (gradient: GradientConfig) => void;
  description?: string;
  presetName?: string; // Nome do preset (gold-metallic, orange-to-gold, etc)
}

export const GradientPicker = ({
  label,
  value,
  onChange,
  description,
  presetName
}: GradientPickerProps) => {
  // Validação: garantir que value existe e tem estrutura mínima
  if (!value || !value.type || !value.colors || value.colors.length === 0) {
    console.error('GradientPicker: value inválido recebido', value);
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
        <p className="text-sm text-red-600">
          ⚠️ Erro: Configuração de gradiente inválida. Por favor, recarregue a página.
        </p>
      </div>
    );
  }

  const updateColor = (index: number, color: string) => {
    const newColors = [...value.colors];
    newColors[index] = color;
    onChange({ ...value, colors: newColors });
  };

  const updateAngle = (angle: number) => {
    onChange({ ...value, angle });
  };

  const updateDirection = (direction: string) => {
    onChange({ ...value, direction });
  };

  // Gerar CSS do gradiente para preview
  const getGradientCSS = (): string => {
    if (value.type === 'linear') {
      const angleOrDirection = value.direction || `${value.angle || 90}deg`;
      return `linear-gradient(${angleOrDirection}, ${value.colors.join(', ')})`;
    } else {
      return `radial-gradient(circle, ${value.colors.join(', ')})`;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-moria-orange" />
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {presetName && (
          <Badge variant="outline" className="text-xs">
            {presetName}
          </Badge>
        )}
      </div>

      <Card className="p-4 space-y-4">
        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs">Preview</Label>
          <div
            className="h-20 rounded-lg border-2 border-gray-200"
            style={{ background: getGradientCSS() }}
          />
          <p className="text-xs text-muted-foreground font-mono break-all">
            {getGradientCSS()}
          </p>
        </div>

        {/* Color Pickers */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Cores do Gradiente</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {value.colors.map((color, index) => (
              <div key={index} className="space-y-2">
                <Label className="text-xs">Cor {index + 1}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    className="h-10 w-16 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    placeholder="#000000"
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Angle/Direction */}
        {value.type === 'linear' && (
          <div className="space-y-2">
            {value.direction ? (
              <>
                <Label className="text-xs">Direção</Label>
                <select
                  value={value.direction}
                  onChange={(e) => updateDirection(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="to-r">Para Direita (to-r)</option>
                  <option value="to-l">Para Esquerda (to-l)</option>
                  <option value="to-t">Para Cima (to-t)</option>
                  <option value="to-b">Para Baixo (to-b)</option>
                  <option value="to-br">Diagonal ↘ (to-br)</option>
                  <option value="to-bl">Diagonal ↙ (to-bl)</option>
                  <option value="to-tr">Diagonal ↗ (to-tr)</option>
                  <option value="to-tl">Diagonal ↖ (to-tl)</option>
                </select>
              </>
            ) : (
              <>
                <Label className="text-xs">Ângulo: {value.angle}°</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={value.angle || 90}
                    onChange={(e) => updateAngle(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="360"
                    value={value.angle || 90}
                    onChange={(e) => updateAngle(parseInt(e.target.value))}
                    className="w-20 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

// Presets de gradientes da identidade M2
export const MORIA_GRADIENT_PRESETS = {
  goldMetallic: {
    type: 'linear' as const,
    angle: 45,
    colors: ['#ffd700', '#ffed4e', '#fbbf24']
  },
  orangeToGold: {
    type: 'linear' as const,
    angle: 90,
    colors: ['#c62828', '#ffa600']
  },
  darkHero: {
    type: 'linear' as const,
    direction: 'to-br',
    colors: ['#171b22', '#374151']
  },
  darkToGray: {
    type: 'linear' as const,
    direction: 'to-br',
    colors: ['#171b22', '#374151']
  },
  darkElegant: {
    type: 'linear' as const,
    direction: 'to-br',
    colors: ['#0f172a', '#1e293b', '#334155']
  },
  orangeOverlay: {
    type: 'linear' as const,
    direction: 'to-r',
    colors: ['rgba(198, 40, 40, 0.12)', 'transparent']
  }
} as const;
