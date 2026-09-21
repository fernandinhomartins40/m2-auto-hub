import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';

interface QuickContactCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  action: string;
  onClick: () => void;
}

export function QuickContactCard({ title, description, icon: Icon, color, action, onClick }: QuickContactCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className={`${color} p-3 rounded-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            {/* h2: os cards de contato sao secoes de primeiro nivel logo
                abaixo do h1 da rota; como h3 o salto era h1->h3 (A-11). */}
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button className="w-full" onClick={onClick}>
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}
