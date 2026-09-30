import { cn } from "@/lib/utils";

type PanelBrandProps = {
  eyebrow: string;
  title: string;
  compact?: boolean;
  className?: string;
};

export function PanelBrand({ eyebrow, title, compact = false, className }: PanelBrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="panel-brand-mark" aria-hidden="true">M2</div>
      {!compact ? (
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
          <p className="truncate text-base font-bold leading-tight text-white">{title}</p>
        </div>
      ) : null}
    </div>
  );
}
