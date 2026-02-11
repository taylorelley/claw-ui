import type { A2UIComponentProps } from '../types';
import { resolveDataPath, interpolateString } from '../dataBinding';
import { cn } from '../../lib/cn';

export function TextComponent({ def, surface }: A2UIComponentProps) {
  let text = def.text || '';
  if (def.dataPath) {
    const val = resolveDataPath(surface.dataModel, def.dataPath);
    if (val !== undefined) text = String(val);
  }
  text = interpolateString(text, surface.dataModel);

  if (def.markdown) {
    return (
      <div
        className={cn(
          'prose prose-sm max-w-none',
          'prose-headings:text-foreground prose-p:text-foreground-secondary',
          'prose-code:bg-surface-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
          'prose-pre:bg-surface-2 prose-pre:rounded-lg',
          'prose-a:text-accent prose-a:no-underline hover:prose-a:underline',
        )}
        dangerouslySetInnerHTML={{ __html: simpleMarkdown(text) }}
      />
    );
  }

  const variant = def.variant || 'body';
  const variantClasses: Record<string, string> = {
    h1: 'text-2xl font-bold text-foreground leading-tight',
    h2: 'text-xl font-semibold text-foreground leading-tight',
    h3: 'text-lg font-semibold text-foreground leading-snug',
    h4: 'text-base font-medium text-foreground',
    body: 'text-sm text-foreground-secondary leading-relaxed',
    caption: 'text-xs text-foreground-muted',
    label: 'text-xs font-medium uppercase tracking-wider text-foreground-muted',
    code: 'text-sm font-mono bg-surface-2 px-2 py-1 rounded text-foreground',
  };

  return (
    <span className={cn(variantClasses[variant] || variantClasses.body)}>
      {text}
    </span>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}
