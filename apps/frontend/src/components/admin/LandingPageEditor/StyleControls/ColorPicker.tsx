/**
 * ColorPicker - Seletor de cores com preview
 * Adaptado do Ferraco para Moria (paleta laranja/dourado)
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  description?: string;
}

// Presets Moria: Laranja, dourado, preto
const MORIA_PRESETS = [
  '#ff6b35', // moria-orange
  '#000000', // moria-black
  '#ffffff', // white
  '#f59e0b', // gold/amber
  '#d97706', // gold darker
  '#fbbf24', // gold lighter
  '#292524', // stone-800
  '#57534e', // stone-600
  '#78716c', // stone-500
  '#a8a29e', // stone-400
  '#e7e5e4', // stone-200
  '#f5f5f4', // stone-100
];

export const ColorPicker = ({
  label,
  value,
  onChange,
  presets = MORIA_PRESETS,
  description,
}: ColorPickerProps) => {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2 overflow-x-hidden">
      <Label htmlFor={label}>{label}</Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      <div className="flex gap-2 w-full overflow-x-hidden">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-12 h-10 p-1 rounded-md border-2 shrink-0"
              style={{ backgroundColor: localValue }}
            >
              <span className="sr-only">Escolher cor</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 max-w-[calc(100vw-2rem)]">
            <div className="space-y-4">
              <div>
                <Label>Cor Personalizada</Label>
                <Input
                  type="color"
                  value={localValue}
                  onChange={(e) => handleChange(e.target.value)}
                  className="h-10 w-full"
                />
              </div>

              <div>
                <Label>Código HEX</Label>
                <Input
                  type="text"
                  value={localValue}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="#000000"
                  className="font-mono"
                />
              </div>

              {presets.length > 0 && (
                <div>
                  <Label>Cores Moria</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                    {presets.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleChange(preset)}
                        className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: preset,
                          borderColor: preset === localValue ? '#ff6b35' : 'transparent',
                        }}
                        title={preset}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Input
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono min-w-0 w-0"
        />
      </div>
    </div>
  );
};
