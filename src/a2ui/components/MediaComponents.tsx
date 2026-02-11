import type { A2UIComponentProps } from '../types';
import { cn } from '../../lib/cn';

export function ImageComponent({ def }: A2UIComponentProps) {
  if (!def.src) return null;
  return (
    <img
      src={def.src}
      alt={def.alt || ''}
      className="rounded-lg max-w-full h-auto object-cover"
      loading="lazy"
    />
  );
}

export function IconComponent({ def }: A2UIComponentProps) {
  return (
    <span className={cn('inline-flex items-center justify-center text-foreground-secondary', def.style?.fontSize && `text-[${def.style.fontSize}]`)}>
      {def.icon || def.text || '?'}
    </span>
  );
}

export function VideoComponent({ def }: A2UIComponentProps) {
  if (!def.src) return null;
  return (
    <video
      src={def.src}
      controls
      className="rounded-lg max-w-full"
    />
  );
}

export function AudioPlayerComponent({ def }: A2UIComponentProps) {
  if (!def.src) return null;
  return (
    <div className="bg-surface-2 rounded-lg p-3">
      {def.label && <div className="text-xs font-medium text-foreground-muted mb-2">{def.label}</div>}
      <audio src={def.src} controls className="w-full h-8" />
    </div>
  );
}
