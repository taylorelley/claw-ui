import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Plus, Search, Wifi, WifiOff, Trash2, AlertCircle,
  Activity, Calendar, CheckCircle2, X
} from 'lucide-react';
import {
  listAgentTokens,
  revokeAgentToken,
  getAgentStatus,
  AgentToken
} from '../services/agentTokenService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';
import { cn } from '../lib/cn';

interface AgentWithStatus extends AgentToken {
  status: 'online' | 'offline';
  connectionHistory?: ConnectionEvent[];
}

interface ConnectionEvent {
  timestamp: string;
  type: 'connected' | 'disconnected';
}

export function AgentDashboardPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<AgentWithStatus | null>(null);
  const [showBulkRevokeConfirm, setShowBulkRevokeConfirm] = useState(false);
  const agentsRef = useRef<AgentWithStatus[]>(agents);

  const loadAgents = useCallback(async () => {
    setLoading(true);

    try {
      const tokens = await listAgentTokens();

      // Load status for each token
      const agentsWithStatus = await Promise.all(
        tokens.map(async (token) => {
          const status = await getAgentStatus(token.id);
          return {
            ...token,
            status,
            connectionHistory: generateMockHistory(), // TODO: Implement real history
          };
        })
      );

      agentsRef.current = agentsWithStatus;
      setAgents(agentsWithStatus);
    } catch {
      showError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const updateAgentStatuses = useCallback(async () => {
    const currentAgents = agentsRef.current;
    if (currentAgents.length === 0) return;

    try {
      const updatedAgents = await Promise.all(
        currentAgents.map(async (agent) => {
          const status = await getAgentStatus(agent.id);
          return { ...agent, status };
        })
      );

      agentsRef.current = updatedAgents;
      setAgents(updatedAgents);
    } catch {
      // Status update failed silently; will retry on next interval
    }
  }, []);

  useEffect(() => {
    loadAgents();

    // Poll for status updates every 10 seconds
    const interval = setInterval(() => {
      updateAgentStatuses();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadAgents, updateAgentStatuses]);

  const handleRevoke = async (id: string) => {
    try {
      await revokeAgentToken(id);
      success('Agent revoked successfully');
      await loadAgents();
      setSelectedAgent(null);
    } catch {
      showError('Failed to revoke agent');
    }
  };

  const handleBulkRevoke = async () => {
    try {
      await Promise.all(
        Array.from(selectedAgents).map(id => revokeAgentToken(id))
      );
      success(`Revoked ${selectedAgents.size} agent(s)`);
      setSelectedAgents(new Set());
      setShowBulkRevokeConfirm(false);
      await loadAgents();
    } catch {
      showError('Failed to revoke agents');
    }
  };

  const handleTestConnection = async (agent: AgentWithStatus) => {
    try {
      const status = await getAgentStatus(agent.id);
      if (status === 'online') {
        success(`${agent.name} is online and responding`);
      } else {
        showError(`${agent.name} is offline`);
      }
    } catch {
      showError('Connection test failed');
    }
  };

  const toggleAgentSelection = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = agents.filter(a => a.status === 'online').length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner text="Loading agents..." />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={Bot}
          title="No agents configured"
          description="Set up your first OpenClaw agent to get started"
          action={{
            label: 'Add Your First Agent',
            onClick: () => navigate('/setup'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">Agent Management</h1>
          </div>
          <p className="text-foreground-muted">
            Manage your connected OpenClaw agents • {onlineCount} of {agents.length} online
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-surface-1 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <button
            onClick={() => navigate('/setup')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover font-medium transition-all"
          >
            <Plus size={16} />
            Add Agent
          </button>

          {selectedAgents.size > 0 && !showBulkRevokeConfirm && (
            <button
              onClick={() => setShowBulkRevokeConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-error text-white hover:bg-error/90 font-medium transition-all"
            >
              <Trash2 size={16} />
              Revoke {selectedAgents.size}
            </button>
          )}

          {showBulkRevokeConfirm && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkRevoke}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-error text-white hover:bg-error/90 font-medium transition-all"
              >
                Confirm Revoke {selectedAgents.size}
              </button>
              <button
                onClick={() => setShowBulkRevokeConfirm(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              selected={selectedAgents.has(agent.id)}
              onToggleSelect={() => toggleAgentSelection(agent.id)}
              onViewDetails={() => setSelectedAgent(agent)}
              onTest={() => handleTestConnection(agent)}
            />
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12 text-foreground-muted">
            No agents match your search
          </div>
        )}
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <AgentDetailsModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onRevoke={() => handleRevoke(selectedAgent.id)}
        />
      )}
    </div>
  );
}

function AgentCard({ agent, selected, onToggleSelect, onViewDetails, onTest }: {
  agent: AgentWithStatus;
  selected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  onTest: () => void;
}) {
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
    <div className={cn(
      'p-4 rounded-xl border transition-all',
      selected ? 'border-accent bg-accent/5' : 'border-border bg-surface-1 hover:border-accent/30'
    )}>
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 w-4 h-4 rounded border-border accent-accent"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {agent.status === 'online' ? (
              <Wifi size={14} className="text-success shrink-0" />
            ) : (
              <WifiOff size={14} className="text-foreground-muted shrink-0" />
            )}
            <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full shrink-0',
              agent.status === 'online'
                ? 'bg-success/10 text-success'
                : 'bg-foreground-muted/10 text-foreground-muted'
            )}>
              {agent.status}
            </span>
          </div>

          <div className="space-y-1 text-xs text-foreground-muted">
            <div className="flex items-center gap-1.5">
              <Activity size={12} />
              <span>Last used {formatDate(agent.last_used_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} />
              <span>Created {formatDate(agent.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onTest}
          className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground transition-colors"
        >
          Test Connection
        </button>
        <button
          onClick={onViewDetails}
          className="flex-1 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-sm font-medium text-accent transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

function AgentDetailsModal({ agent, onClose, onRevoke }: {
  agent: AgentWithStatus;
  onClose: () => void;
  onRevoke: () => void;
}) {
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatFullDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 outline-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-0 rounded-2xl border border-border max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">{agent.name}</h2>
            <div className="flex items-center gap-2">
              {agent.status === 'online' ? (
                <CheckCircle2 size={14} className="text-success" />
              ) : (
                <AlertCircle size={14} className="text-foreground-muted" />
              )}
              <span className="text-sm text-foreground-muted capitalize">{agent.status}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <X size={20} className="text-foreground-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {/* Info Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Agent Information</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Agent ID" value={agent.id} mono />
              <InfoRow label="Created" value={formatFullDate(agent.created_at)} />
              <InfoRow label="Last Used" value={formatFullDate(agent.last_used_at)} />
            </div>
          </div>

          {/* Connection History */}
          {agent.connectionHistory && agent.connectionHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Connection History (Last 5 Events)
              </h3>
              <div className="space-y-2">
                {agent.connectionHistory.slice(0, 5).map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-1 border border-border"
                  >
                    {event.type === 'connected' ? (
                      <Wifi size={14} className="text-success shrink-0" />
                    ) : (
                      <WifiOff size={14} className="text-error shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm text-foreground capitalize">{event.type}</div>
                      <div className="text-xs text-foreground-muted">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          {!showRevokeConfirm ? (
            <button
              onClick={() => setShowRevokeConfirm(true)}
              className="w-full px-4 py-2.5 rounded-lg bg-error/10 hover:bg-error/20 text-error font-medium transition-colors"
            >
              Revoke Agent
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-error/10 border border-error/20">
                <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />
                <p className="text-sm text-error">
                  This will permanently disconnect this agent. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onRevoke}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-error hover:bg-error/90 text-white font-medium transition-colors"
                >
                  Confirm Revoke
                </button>
                <button
                  onClick={() => setShowRevokeConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-border">
      <span className="text-foreground-muted">{label}</span>
      <span className={cn('text-foreground', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

// TODO: Replace with real connection history from backend
function generateMockHistory(): ConnectionEvent[] {
  const events: ConnectionEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < 5; i++) {
    events.push({
      timestamp: new Date(now - i * 3600000).toISOString(),
      type: i % 2 === 0 ? 'connected' : 'disconnected',
    });
  }

  return events;
}
