import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-2 mb-4">
        <Icon size={28} className="text-foreground-muted" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-foreground-muted mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover text-sm font-medium shadow-soft transition-all duration-150 active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
