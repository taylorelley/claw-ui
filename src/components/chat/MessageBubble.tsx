import { Bot, User } from 'lucide-react';
import type { Message } from '../../lib/types';
import { A2UIRenderer } from '../../a2ui/renderer';
import { parseSurfaceFromPayload } from '../../a2ui/surfaceManager';
import { cn } from '../../lib/cn';

interface MessageBubbleProps {
  message: Message;
  onA2UIAction?: (action: { event?: { name: string; context?: Record<string, unknown> } }) => void;
}

export function MessageBubble({ message, onA2UIAction }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const surface = message.a2ui_payload ? parseSurfaceFromPayload(message.a2ui_payload) : null;

  return (
    <div className={cn('flex gap-3 animate-slide-up', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
        isUser ? 'bg-accent/10' : 'bg-surface-2',
      )}>
        {isUser ? (
          <User size={14} className="text-accent" />
        ) : (
          <Bot size={14} className="text-foreground-muted" />
        )}
      </div>

      <div className={cn('max-w-[75%] min-w-0', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-accent text-accent-foreground rounded-tr-md'
            : 'bg-surface-1 border border-border text-foreground-secondary rounded-tl-md',
        )}>
          {message.content && <MessageContent content={message.content} isUser={isUser} />}

          {surface && (
            <div className={cn('mt-3 p-3 rounded-xl', isUser ? 'bg-accent-hover/20' : 'bg-surface-2')}>
              <A2UIRenderer
                surface={surface}
                onAction={onA2UIAction}
              />
            </div>
          )}
        </div>

        <div className={cn(
          'mt-1 text-2xs text-foreground-muted px-1',
          isUser ? 'text-right' : 'text-left',
        )}>
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex}>{formatInlineText(content.slice(lastIndex, match.index))}</span>
      );
    }
    parts.push(
      <pre key={match.index} className={cn(
        'mt-2 mb-2 p-3 rounded-lg text-xs font-mono overflow-x-auto scrollbar-thin',
        isUser ? 'bg-accent-hover/30' : 'bg-surface-0 border border-border',
      )}>
        {match[1] && <div className="text-2xs text-foreground-muted mb-1 uppercase">{match[1]}</div>}
        <code>{match[2]}</code>
      </pre>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={lastIndex}>{formatInlineText(content.slice(lastIndex))}</span>);
  }

  return <>{parts.length > 0 ? parts : content}</>;
}

function formatInlineText(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ));
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
