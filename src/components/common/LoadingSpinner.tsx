import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 size={sizes[size]} className="animate-spin text-accent" />
      {text && <p className="text-sm text-foreground-muted">{text}</p>}
    </div>
  );
}
