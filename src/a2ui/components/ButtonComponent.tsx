import type { A2UIComponentProps } from '../types';
import { cn } from '../../lib/cn';

export function ButtonComponent({ def, onAction }: A2UIComponentProps) {
  const variant = def.variant || 'primary';

  const variants: Record<string, string> = {
    primary: 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-soft',
    secondary: 'bg-surface-2 text-foreground hover:bg-surface-3 border border-border',
    ghost: 'text-foreground-secondary hover:text-foreground hover:bg-surface-2',
    danger: 'bg-error text-white hover:bg-red-700',
    outline: 'border border-accent text-accent hover:bg-accent-muted',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
        'text-sm font-medium transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-1',
        'active:scale-[0.97]',
        def.disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        variants[variant] || variants.primary,
      )}
      disabled={def.disabled}
      onClick={() => def.action && onAction?.(def.action)}
    >
      {def.label || def.text || 'Button'}
    </button>
  );
}
