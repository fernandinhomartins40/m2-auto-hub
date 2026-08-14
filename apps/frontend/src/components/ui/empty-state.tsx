import type { ComponentType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Ícone do lucide-react que representa o que está faltando. */
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** Botão de ação — normalmente "Cadastrar o primeiro…". */
  action?: ReactNode;
  className?: string;
}

/**
 * Estado vazio padronizado.
 *
 * Havia 42 arquivos com sua própria versão disto, cada uma com ícone, tamanho
 * e espaçamento ligeiramente diferentes. Além da manutenção, a inconsistência
 * aparecia para o usuário ao navegar entre telas.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-10 text-center', className)}>
      {Icon && <Icon className="mb-3 h-12 w-12 text-muted-foreground/40" />}
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
