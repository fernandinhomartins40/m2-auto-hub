import type { ComponentType, ReactNode } from "react";

type PanelPageHeaderProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
};

/** Cabecalho de rota comum aos tres perfis de painel. */
export function PanelPageHeader({
  icon: Icon,
  title,
  description,
  actions,
  badge,
  className = "",
  as: Heading = "h1",
}: PanelPageHeaderProps) {
  return (
    <div className={`relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-lg sm:p-5 lg:flex-row lg:items-start lg:justify-between ${className}`.trim()}>
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
      <div className="min-w-0">
        {badge ? <div className="mb-2">{badge}</div> : null}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <Heading className="text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{title}</Heading>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
          </div>
        </div>
      </div>
      {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap lg:justify-end">{actions}</div> : null}
    </div>
  );
}
