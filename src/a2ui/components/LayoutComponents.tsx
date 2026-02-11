import type { A2UIComponentProps } from '../types';
import { cn } from '../../lib/cn';
import { renderChildren } from '../renderer';

export function RowComponent({ def, surface, onAction, onDataChange }: A2UIComponentProps) {
  return (
    <div
      className={cn(
        'flex flex-row items-center',
        def.wrap && 'flex-wrap',
        def.align === 'start' && 'items-start',
        def.align === 'end' && 'items-end',
        def.align === 'stretch' && 'items-stretch',
        def.justify === 'center' && 'justify-center',
        def.justify === 'end' && 'justify-end',
        def.justify === 'between' && 'justify-between',
        def.justify === 'around' && 'justify-around',
      )}
      style={{ gap: `${def.gap ?? 8}px` }}
    >
      {renderChildren(def, surface, onAction, onDataChange)}
    </div>
  );
}

export function ColumnComponent({ def, surface, onAction, onDataChange }: A2UIComponentProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        def.align === 'center' && 'items-center',
        def.align === 'end' && 'items-end',
        def.align === 'stretch' && 'items-stretch',
        def.justify === 'center' && 'justify-center',
        def.justify === 'end' && 'justify-end',
        def.justify === 'between' && 'justify-between',
      )}
      style={{ gap: `${def.gap ?? 8}px` }}
    >
      {renderChildren(def, surface, onAction, onDataChange)}
    </div>
  );
}

export function ListComponent({ def, surface, onAction, onDataChange }: A2UIComponentProps) {
  return (
    <div className="flex flex-col overflow-y-auto max-h-80 scrollbar-thin" style={{ gap: `${def.gap ?? 4}px` }}>
      {renderChildren(def, surface, onAction, onDataChange)}
    </div>
  );
}

export function DividerComponent() {
  return <div className="h-px bg-border my-2" />;
}
