import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; to?: any; params?: any; onClick?: () => void; icon?: LucideIcon };
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action, children }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div className="luxury-card grid place-items-center rounded-2xl px-6 py-14 text-center">
      {Icon ? <Icon className="mb-3 size-10 text-primary" aria-hidden="true" /> : null}
      <h3 className="font-display text-xl">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        action.to ? (
          <Link
            to={action.to}
            params={action.params}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {ActionIcon ? <ActionIcon className="size-4" /> : null} {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {ActionIcon ? <ActionIcon className="size-4" /> : null} {action.label}
          </button>
        )
      ) : null}
      {children}
    </div>
  );
}
