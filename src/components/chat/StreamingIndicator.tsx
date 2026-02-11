import { Bot } from 'lucide-react';

export function StreamingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-surface-2">
        <Bot size={14} className="text-foreground-muted" />
      </div>
      <div className="bg-surface-1 border border-border rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-foreground-muted animate-pulse-subtle" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-foreground-muted animate-pulse-subtle" style={{ animationDelay: '300ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-foreground-muted animate-pulse-subtle" style={{ animationDelay: '600ms' }} />
        </div>
      </div>
    </div>
  );
}
