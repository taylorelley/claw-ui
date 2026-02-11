import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, StopCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ComposeBarProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  suggestedActions?: string[];
  onSuggestedAction?: (action: string) => void;
}

export function ComposeBar({ onSend, onStop, disabled, isStreaming, suggestedActions = [], onSuggestedAction }: ComposeBarProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-surface-0 p-3">
      {suggestedActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5 animate-fade-in">
          {suggestedActions.map(action => (
            <button
              key={action}
              onClick={() => onSuggestedAction?.(action)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-2 text-foreground-secondary hover:bg-accent/10 hover:text-accent border border-border hover:border-accent/30 transition-all duration-150"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-all duration-150 shrink-0 mb-0.5"
          title="Attach file"
        >
          <Paperclip size={16} />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={1}
            disabled={disabled}
            className={cn(
              'w-full resize-none rounded-xl px-4 py-2.5 text-sm',
              'bg-surface-1 border border-border text-foreground',
              'placeholder:text-foreground-muted',
              'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50',
              'transition-all duration-150',
              'scrollbar-thin',
              disabled && 'opacity-50',
            )}
          />
        </div>

        {isStreaming ? (
          <button
            onClick={onStop}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-error text-white hover:bg-red-700 transition-all duration-150 shrink-0 mb-0.5 active:scale-95"
            title="Stop"
          >
            <StopCircle size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 mb-0.5 active:scale-95',
              text.trim()
                ? 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-soft'
                : 'bg-surface-2 text-foreground-muted cursor-not-allowed',
            )}
            title="Send"
          >
            <Send size={16} />
          </button>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-center">
        <span className="text-2xs text-foreground-muted">
          Enter to send, Shift+Enter for new line
        </span>
      </div>
    </div>
  );
}
