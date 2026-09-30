import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PanelPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('panel-page mx-auto w-full max-w-[1600px] space-y-6', className)}>{children}</div>;
}

export function PanelPageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('panel-page-body space-y-6', className)}>{children}</div>;
}

export function PanelSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('panel-section min-w-0', className)}>{children}</section>;
}
