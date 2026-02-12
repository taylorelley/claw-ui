import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Plus, MessageSquare, Bot, Settings, ArrowRight, Clock, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSession } from '../hooks/useSession';
import { listAgentTokens, getAgentStatus, AgentToken } from '../services/agentTokenService';
import { cn } from '../lib/cn';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function HomePage() {
  const { state } = useApp();
  const { createSession } = useSession();
  const navigate = useNavigate();
  
  const [agents, setAgents] = useState<AgentToken[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'online' | 'offline'>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const tokens = await listAgentTokens();
      setAgents(tokens);
      
      // Load statuses
      const statusPromises = tokens.map(async (token) => ({
        id: token.id,
        status: await getAgentStatus(token.id),
      }));
      
      const statusResults = await Promise.all(statusPromises);
      const statusMap = statusResults.reduce(
        (acc, { id, status }) => ({ ...acc, [id]: status }),
        {}
      );
      
      setAgentStatuses(statusMap);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    const defaultConn = state.connections.find(c => c.is_default) || state.connections[0];
    const session = await createSession(defaultConn?.id);
    if (session) navigate(`/chat/${session.id}`);
  };

  const recentSessions = state.sessions.slice(0, 5);
  const connectedAgents = agents.filter(a => agentStatuses[a.id] === 'online').length;
  const hasAgents = agents.length > 0;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  // New user experience - no agents yet
  if (!hasAgents) {
    return (
      <div className="h-full overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Welcome to Claw UI
            </h1>
            <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
              Get started by connecting your first OpenClaw agent
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="grid gap-6 mb-8">
              <FeatureCard
                icon={Bot}
                title="Connect Your Agent"
                description="Set up your first OpenClaw agent to start having conversations"
                action={{
                  label: 'Run Setup Wizard',
                  onClick: () => navigate('/setup'),
                }}
              />
              
              <FeatureCard
                icon={MessageSquare}
                title="Start Chatting"
                description="Have natural conversations with your AI assistant"
              />
              
              <FeatureCard
                icon={Settings}
                title="Customize Your Experience"
                description="Adjust themes, preferences, and interface settings"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Existing user dashboard
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-foreground-muted">
            Continue a conversation or start something new
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Connected Agents"
            value={connectedAgents}
            total={agents.length}
            icon={Bot}
            color="accent"
          />
          <StatCard
            label="Active Sessions"
            value={state.sessions.length}
            icon={MessageSquare}
            color="success"
          />
          <StatCard
            label="Recent Sessions"
            value={recentSessions.length}
            icon={Clock}
            color="warning"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickActionCard
              icon={Plus}
              title="New Chat"
              description="Start a fresh conversation"
              onClick={handleNewSession}
            />
            <QuickActionCard
              icon={Bot}
              title="Manage Agents"
              description="View and configure agents"
              onClick={() => navigate('/agent-management')}
            />
            <QuickActionCard
              icon={Settings}
              title="Settings"
              description="Customize your experience"
              onClick={() => navigate('/settings')}
            />
          </div>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Sessions</h2>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onClick={() => navigate(`/chat/${session.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Connected Agents */}
        {connectedAgents > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Active Agents</h2>
              <button
                onClick={() => navigate('/agent-management')}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Manage all →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents
                .filter(a => agentStatuses[a.id] === 'online')
                .slice(0, 4)
                .map(agent => (
                  <AgentStatusCard key={agent.id} agent={agent} />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, action }: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="p-6 rounded-xl border border-border bg-surface-1 hover:border-accent/30 transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Icon size={24} className="text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-foreground-muted mb-4">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover text-sm font-medium transition-all"
            >
              {action.label}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, total, icon: Icon, color }: {
  label: string;
  value: number;
  total?: number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-foreground-muted">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', `bg-${color}/10`)}>
          <Icon size={16} className={`text-${color}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">
        {value}{total !== undefined && <span className="text-lg text-foreground-muted">/{total}</span>}
      </div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, title, description, onClick }: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-surface-1 hover:border-accent/30 hover:bg-accent/5 transition-all text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
        <Icon size={18} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-foreground-muted truncate">{description}</div>
      </div>
      <ArrowRight size={14} className="text-foreground-muted group-hover:text-accent shrink-0" />
    </button>
  );
}

function SessionCard({ session, onClick }: {
  session: { id: string; title: string; last_active_at: string };
  onClick: () => void;
}) {
  const formatRelativeTime = (iso: string): string => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-1 hover:border-accent/30 hover:shadow-soft transition-all text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
        <MessageSquare size={14} className="text-foreground-muted group-hover:text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{session.title}</div>
        <div className="text-xs text-foreground-muted">{formatRelativeTime(session.last_active_at)}</div>
      </div>
      <ArrowRight size={14} className="text-foreground-muted group-hover:text-accent shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
    </button>
  );
}

function AgentStatusCard({ agent }: { agent: AgentToken }) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-3 rounded-xl border border-border bg-surface-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-success" />
        <h3 className="text-sm font-medium text-foreground truncate">{agent.name}</h3>
      </div>
      <p className="text-xs text-foreground-muted">
        Last seen {formatDate(agent.last_used_at)}
      </p>
    </div>
  );
}
