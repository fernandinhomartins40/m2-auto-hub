/**
 * GradientColorPicker - Seletor de gradiente com múltiplas cores
 * Permite criar gradientes personalizados mantendo a identidade visual
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

interface GradientStop {
  color: string;
  position: number; // 0-100
}

interface GradientColorPickerProps {
  label: string;
  value: string; // CSS gradient string
  onChange: (gradient: string) => void;
  description?: string;
  presets?: { name: string; value: string }[];
}

// Presets de gradientes Moria
const MORIA_GRADIENT_PRESETS = [
  {
    name: 'Dourado Premium',
    value: 'linear-gradient(135deg, #ffd900 0%, #ffa600 50%, #ab8617 100%)',
  },
  {
    name: 'Laranja Moria',
    value: 'linear-gradient(135deg, #ff6933 0%, #ff571a 100%)',
  },
  {
    name: 'Marquee (Laranja → Dourado)',
    value: 'linear-gradient(90deg, #ff6933 0%, #ffa600 100%)',
  },
];

export const GradientColorPicker = ({
  label,
  value,
  onChange,
  description,
  presets = MORIA_GRADIENT_PRESETS,
}: GradientColorPickerProps) => {
  // Parse gradient string to extract colors
  const parseGradient = (gradientStr: string): GradientStop[] => {
    // Se for uma cor sólida, converte para gradiente de 1 cor
    if (!gradientStr.includes('gradient')) {
      return [{ color: gradientStr, position: 0 }];
    }

    const matches = gradientStr.matchAll(/(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\([^)]+\)|hsl\([^)]+\))\s*(\d+)?%?/g);
    const stops: GradientStop[] = [];

    for (const match of matches) {
      stops.push({
        color: match[1],
        position: match[2] ? parseInt(match[2]) : 0,
      });
    }

    return stops.length > 0 ? stops : [{ color: '#ff6933', position: 0 }];
  };

  const [stops, setStops] = useState<GradientStop[]>(parseGradient(value));
  const [angle, setAngle] = useState(135); // Ângulo padrão

  // Gera CSS gradient a partir dos stops
  const generateGradient = (gradientStops: GradientStop[], gradientAngle: number = angle) => {
    if (gradientStops.length === 0) return '#ff6933';
    if (gradientStops.length === 1) return gradientStops[0].color;

    const stopsStr = gradientStops
      .sort((a, b) => a.position - b.position)
      .map(stop => `${stop.color} ${stop.position}%`)
      .join(', ');

    return `linear-gradient(${gradientAngle}deg, ${stopsStr})`;
  };

  // Atualiza gradiente quando stops mudam
  const updateGradient = (newStops: GradientStop[], newAngle?: number) => {
    setStops(newStops);
    const gradient = generateGradient(newStops, newAngle ?? angle);
    onChange(gradient);
  };

  const addStop = () => {
    const newStops = [...stops, { color: '#ffa600', position: 50 }];
    updateGradient(newStops);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 1) return; // Manter pelo menos 1 cor
    const newStops = stops.filter((_, i) => i !== index);
    updateGradient(newStops);
  };

  const updateStop = (index: number, updates: Partial<GradientStop>) => {
    const newStops = stops.map((stop, i) =>
      i === index ? { ...stop, ...updates } : stop
    );
    updateGradient(newStops);
  };

  const applyPreset = (presetValue: string) => {
    const newStops = parseGradient(presetValue);
    setStops(newStops);
    onChange(presetValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>

      {/* Preview do Gradiente */}
      <Card className="p-4">
        <div
          className="w-full h-20 rounded-lg border-2 border-gray-300"
          style={{ background: generateGradient(stops, angle) }}
        />
      </Card>

      {/* Presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Gradientes da Identidade Visual</Label>
          <div className="grid grid-cols-1 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.value)}
                className="flex items-center gap-3 p-2 rounded-lg border hover:border-moria-orange transition-colors text-left"
              >
                <div
                  className="w-12 h-12 rounded border shrink-0"
                  style={{ background: preset.value }}
                />
                <span className="text-sm font-medium">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor de Cores do Gradiente */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Cores do Gradiente ({stops.length})</Label>
          <Button
            onClick={addStop}
            size="sm"
            variant="outline"
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Cor
          </Button>
        </div>

        {stops.map((stop, index) => (
          <div key={index} className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cor {index + 1}</span>
              {stops.length > 1 && (
                <Button
                  onClick={() => removeStop(index)}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            <ColorPicker
              label={`Cor ${index + 1}`}
              value={stop.color}
              onChange={(color) => updateStop(index, { color })}
            />

            <div className="space-y-2">
              <Label className="text-xs">Posição: {stop.position}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={stop.position}
                onChange={(e) => updateStop(index, { position: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        ))}
      </Card>

      {/* Ângulo do Gradiente */}
      <Card className="p-4 space-y-2">
        <Label className="text-sm">Ângulo: {angle}°</Label>
        <input
          type="range"
          min="0"
          max="360"
          value={angle}
          onChange={(e) => {
            const newAngle = parseInt(e.target.value);
            setAngle(newAngle);
            updateGradient(stops, newAngle);
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0° (→)</span>
          <span>90° (↑)</span>
          <span>180° (←)</span>
          <span>270° (↓)</span>
        </div>
      </Card>
    </div>
  );
};
