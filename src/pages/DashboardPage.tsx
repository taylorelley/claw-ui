import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Pin, Server, Zap, ArrowRight, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSession } from '../hooks/useSession';
import { useAdaptiveEngine } from '../hooks/useAdaptiveEngine';
import { cn } from '../lib/cn';

export function DashboardPage() {
  const { state } = useApp();
  const { createSession } = useSession();
  const { topCommands } = useAdaptiveEngine();
  const navigate = useNavigate();

  const pinnedSessions = state.sessions.filter(s => s.is_pinned);
  const recentSessions = state.sessions.filter(s => !s.is_pinned).slice(0, 6);
  const hasConnections = state.connections.length > 0;

  const handleNewSession = async () => {
    const defaultConn = state.connections.find(c => c.is_default) || state.connections[0];
    const session = await createSession(defaultConn?.id);
    if (session) navigate(`/chat/${session.id}`);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-foreground-muted">Continue a conversation or start something new.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          <button
            onClick={handleNewSession}
            className="group flex items-center gap-3 p-4 rounded-xl border border-dashed border-border hover:border-accent bg-surface-0 hover:bg-accent/5 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Plus size={18} className="text-accent" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">New Session</div>
              <div className="text-xs text-foreground-muted">Start a fresh conversation</div>
            </div>
          </button>

          {!hasConnections && (
            <button
              onClick={() => navigate('/agents')}
              className="group flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning-muted hover:bg-warning/10 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Server size={18} className="text-warning" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">Connect Agent</div>
                <div className="text-xs text-foreground-muted">Set up your gateway</div>
              </div>
            </button>
          )}

          {hasConnections && state.connections.slice(0, 2).map(conn => (
            <div key={conn.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface-1">
              <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
                <Server size={16} className="text-foreground-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{conn.name || 'Gateway'}</div>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    conn.status === 'connected' ? 'bg-success' : 'bg-foreground-muted',
                  )} />
                  <span className="text-xs text-foreground-muted capitalize">{conn.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pinnedSessions.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Pin size={14} className="text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Pinned</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pinnedSessions.map(session => (
                <SessionCard key={session.id} session={session} onClick={() => navigate(`/chat/${session.id}`)} />
              ))}
            </div>
          </section>
        )}

        {recentSessions.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-foreground-muted" />
              <h2 className="text-sm font-semibold text-foreground">Recent</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentSessions.map(session => (
                <SessionCard key={session.id} session={session} onClick={() => navigate(`/chat/${session.id}`)} />
              ))}
            </div>
          </section>
        )}

        {topCommands.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Frequently Used</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {topCommands.map(cmd => (
                <button
                  key={cmd.command}
                  onClick={() => handleNewSession()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-1 border border-border hover:border-accent/30 hover:bg-accent/5 transition-all duration-150"
                >
                  <Zap size={12} className="text-accent" />
                  <span className="text-xs text-foreground-secondary truncate max-w-[200px]">{cmd.command}</span>
                  <span className="text-2xs text-foreground-muted">{cmd.count}x</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {state.sessions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-surface-2 flex items-center justify-center mx-auto mb-5">
              <MessageSquare size={28} className="text-foreground-muted" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">No sessions yet</h3>
            <p className="text-sm text-foreground-muted mb-6 max-w-sm mx-auto">
              Create your first session to start interacting with your AI agent. The dashboard will adapt based on how you use it.
            </p>
            <button
              onClick={handleNewSession}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover text-sm font-medium shadow-soft transition-all duration-150 active:scale-[0.98]"
            >
              Start First Session
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onClick }: {
  session: { id: string; title: string; is_pinned: boolean; last_active_at: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-border hover:border-accent/30 hover:shadow-soft transition-all duration-200 text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
        <MessageSquare size={14} className="text-foreground-muted group-hover:text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{session.title}</div>
        <div className="text-2xs text-foreground-muted">{formatRelativeTime(session.last_active_at)}</div>
      </div>
      <ArrowRight size={14} className="text-foreground-muted group-hover:text-accent shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
    </button>
  );
}

function formatRelativeTime(iso: string): string {
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
}
