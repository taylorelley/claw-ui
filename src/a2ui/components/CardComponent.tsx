import type { A2UIComponentProps } from '../types';
import { cn } from '../../lib/cn';
import { renderChildren } from '../renderer';

export function CardComponent({ def, surface, onAction, onDataChange }: A2UIComponentProps) {
  const elevation = def.elevation ?? 1;
  const elevationClasses: Record<number, string> = {
    0: 'border border-border',
    1: 'border border-border shadow-soft',
    2: 'border border-border shadow-lifted',
    3: 'shadow-overlay',
  };

  return (
    <div
      className={cn(
        'rounded-xl bg-surface-1 p-4 transition-shadow duration-200',
        elevationClasses[elevation] || elevationClasses[1],
        def.action && 'cursor-pointer hover:shadow-lifted',
      )}
      onClick={() => def.action && onAction?.(def.action)}
    >
      {def.title && (
        <div className="text-sm font-semibold text-foreground mb-3">{def.title}</div>
      )}
      <div className="flex flex-col gap-2">
        {renderChildren(def, surface, onAction, onDataChange)}
      </div>
    </div>
  );
}
