import { useState } from 'react';
import type { A2UIComponentProps, A2UIComponentDef, A2UISurfaceState, A2UIAction } from '../types';
import { cn } from '../../lib/cn';
import { renderComponentById } from '../renderer';

export function TabsComponent({ def, surface, onAction, onDataChange }: A2UIComponentProps) {
  const tabs = def.tabs || [];
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  const activeChildren = tabs.find(t => t.id === activeTab)?.children || [];

  return (
    <div className="flex flex-col gap-0">
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all duration-150 relative',
              activeTab === tab.id
                ? 'text-accent'
                : 'text-foreground-muted hover:text-foreground-secondary',
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        ))}
      </div>
      <div className="pt-3 flex flex-col gap-2">
        {activeChildren.map(childId => renderComponentById(childId, surface, onAction, onDataChange))}
      </div>
    </div>
  );
}

export function ModalComponent({ def, surface, onAction, onDataChange }: A2UIComponentProps) {
  const [open, setOpen] = useState(def.visible !== false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-surface-1 rounded-2xl shadow-overlay p-6 max-w-lg w-full mx-4 animate-slide-up">
        {def.title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">{def.title}</h3>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              x
            </button>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {renderChildDefs(def, surface, onAction, onDataChange)}
        </div>
      </div>
    </div>
  );
}

function renderChildDefs(
  def: A2UIComponentDef,
  surface: A2UISurfaceState,
  onAction?: (action: A2UIAction) => void,
  onDataChange?: (path: string, value: unknown) => void,
) {
  return (def.children || []).map(childId => renderComponentById(childId, surface, onAction, onDataChange));
}
