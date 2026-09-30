import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PanelWorkspaceTab = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type PanelWorkspaceTabsProps = {
  label: string;
  tabs: readonly PanelWorkspaceTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
};

/** Subnavegacao contextual compartilhada entre os paineis. */
export function PanelWorkspaceTabs({
  label,
  tabs,
  activeTab,
  onTabChange,
  className,
}: PanelWorkspaceTabsProps) {
  return (
    <nav aria-label={label} className={cn("panel-workspace-tabs", className)}>
      <div className="flex min-w-max items-center gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              className={cn("panel-workspace-tab", isActive && "is-active")}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
