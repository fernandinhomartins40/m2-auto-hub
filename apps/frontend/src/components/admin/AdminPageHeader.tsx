import type { ComponentType, ReactNode } from "react";

type AdminPageHeaderProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  /** Nivel do titulo. Default `h1`: e o cabecalho da rota. */
  as?: "h1" | "h2" | "h3";
};

export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  actions,
  badge,
  className = "",
  as: Heading = "h1",
}: AdminPageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${className}`.trim()}>
      <div className="min-w-0">
        {badge ? <div className="mb-2">{badge}</div> : null}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-moria-orange/10 text-moria-orange ring-1 ring-moria-orange/15">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {/* h1 da rota: no desktop o painel nao tinha nenhum (A-06). Como
                e um cabecalho por rota, `as` so e usado quando uma subview
                precisa rebaixa-lo para nao duplicar o h1 da pagina. */}
            <Heading className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{title}</Heading>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
          </div>
        </div>
      </div>

      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap lg:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
