import { useState } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { AgentToken } from '../../services/agentTokenService';

interface AgentCardProps {
  token: AgentToken;
  status: 'online' | 'offline';
  onRevoke: (id: string) => Promise<void>;
}

export function AgentCard({ token, status, onRevoke }: AgentCardProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await onRevoke(token.id);
    } catch (error) {
      console.error('Failed to revoke token:', error);
    } finally {
      setIsRevoking(false);
      setShowConfirm(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4 rounded-lg bg-surface-1 border border-border hover:border-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-foreground/30'}`} />
            <h3 className="font-medium text-foreground">{token.name}</h3>
          </div>
          
          <p className="text-sm text-foreground/60">
            Last connected: {formatDate(token.last_used_at)}
          </p>
          
          <p className="text-xs text-foreground/40 mt-1">
            Created {formatDate(token.created_at)}
          </p>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={isRevoking}
          className="p-2 rounded-lg text-error hover:bg-error/10 transition-colors disabled:opacity-50"
          title="Revoke token"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {showConfirm && (
        <div className="mt-4 p-3 rounded-lg bg-error/10 border border-error/20">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">
              Are you sure? This will disconnect your agent immediately.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRevoke}
              disabled={isRevoking}
              className="flex-1 px-3 py-1.5 rounded-lg bg-error text-white text-sm font-medium hover:bg-error/90 disabled:opacity-50"
            >
              {isRevoking ? 'Revoking...' : 'Revoke'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isRevoking}
              className="flex-1 px-3 py-1.5 rounded-lg bg-surface-2 text-foreground text-sm font-medium hover:bg-surface-2/80 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
