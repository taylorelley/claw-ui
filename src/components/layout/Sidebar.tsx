import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, Plus, Pin, LayoutDashboard, Server,
  Clock, ChevronDown, ChevronRight, Zap, Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSession } from '../../hooks/useSession';
import { cn } from '../../lib/cn';
import { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  width: number;
}

export function Sidebar({ collapsed, width }: SidebarProps) {
  const { state, dispatch } = useApp();
  const { createSession, deleteSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['sessions', 'shortcuts']));

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNewSession = async () => {
    const defaultConn = state.connections.find(c => c.is_default) || state.connections[0];
    const session = await createSession(defaultConn?.id);
    if (session) navigate(`/chat/${session.id}`);
  };

  const pinnedSessions = state.sessions.filter(s => s.is_pinned);
  const recentSessions = state.sessions.filter(s => !s.is_pinned).slice(0, 12);

  if (collapsed) {
    return (
      <aside className="w-14 border-r border-border glass-heavy flex flex-col items-center py-3 gap-1 shrink-0">
        <button
          onClick={() => navigate('/')}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150',
            location.pathname === '/' ? 'bg-accent/10 text-accent' : 'text-foreground-muted hover:text-foreground hover:bg-surface-2',
          )}
          title="Dashboard"
        >
          <LayoutDashboard size={18} />
        </button>

        <button
          onClick={handleNewSession}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-accent hover:bg-accent/10 transition-all duration-150"
          title="New Session"
        >
          <Plus size={18} />
        </button>

        <div className="w-6 h-px bg-border my-1" />

        {state.sessions.slice(0, 5).map(session => (
          <button
            key={session.id}
            onClick={() => {
              dispatch({ type: 'SET_ACTIVE_SESSION', payload: session.id });
              navigate(`/chat/${session.id}`);
            }}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative',
              state.activeSessionId === session.id
                ? 'bg-accent/10 text-accent'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-2',
            )}
            title={session.title}
          >
            <MessageSquare size={16} />
            {session.is_pinned && (
              <Pin size={8} className="absolute top-1 right-1 text-accent" />
            )}
          </button>
        ))}

        <div className="mt-auto flex flex-col gap-1">
          <button
            onClick={() => navigate('/agents')}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150',
              location.pathname === '/agents' ? 'bg-accent/10 text-accent' : 'text-foreground-muted hover:text-foreground hover:bg-surface-2',
            )}
            title="Agents"
          >
            <Server size={16} />
          </button>
          <button
            onClick={() => navigate('/history')}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150',
              location.pathname === '/history' ? 'bg-accent/10 text-accent' : 'text-foreground-muted hover:text-foreground hover:bg-surface-2',
            )}
            title="History"
          >
            <Clock size={16} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="border-r border-border glass-heavy flex flex-col shrink-0 overflow-hidden"
      style={{ width: `${width}px` }}
    >
      <div className="p-3 border-b border-border">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover transition-all duration-150 text-sm font-medium shadow-soft active:scale-[0.98]"
        >
          <Plus size={16} />
          New Session
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        <NavItem
          icon={<LayoutDashboard size={16} />}
          label="Dashboard"
          active={location.pathname === '/'}
          onClick={() => navigate('/')}
        />

        <SidebarSection
          id="sessions"
          label="Sessions"
          icon={<MessageSquare size={14} />}
          expanded={expandedSections.has('sessions')}
          onToggle={() => toggleSection('sessions')}
        >
          {pinnedSessions.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              active={state.activeSessionId === session.id}
              pinned
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_SESSION', payload: session.id });
                navigate(`/chat/${session.id}`);
              }}
              onDelete={() => deleteSession(session.id)}
            />
          ))}
          {recentSessions.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              active={state.activeSessionId === session.id}
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_SESSION', payload: session.id });
                navigate(`/chat/${session.id}`);
              }}
              onDelete={() => deleteSession(session.id)}
            />
          ))}
          {state.sessions.length === 0 && (
            <p className="text-xs text-foreground-muted px-3 py-2">No sessions yet</p>
          )}
        </SidebarSection>

        <SidebarSection
          id="shortcuts"
          label="Quick Actions"
          icon={<Zap size={14} />}
          expanded={expandedSections.has('shortcuts')}
          onToggle={() => toggleSection('shortcuts')}
        >
          {state.shortcuts.length === 0 ? (
            <p className="text-xs text-foreground-muted px-3 py-2">Actions appear as you use the app</p>
          ) : (
            state.shortcuts.slice(0, 6).map(shortcut => (
              <button
                key={shortcut.id}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-foreground-secondary hover:text-foreground hover:bg-surface-2 transition-all duration-150"
              >
                <Zap size={12} className="text-accent shrink-0" />
                <span className="truncate">{shortcut.label}</span>
                {shortcut.usage_count > 0 && (
                  <span className="ml-auto text-2xs text-foreground-muted">{shortcut.usage_count}</span>
                )}
              </button>
            ))
          )}
        </SidebarSection>
      </nav>

      <div className="border-t border-border p-2 space-y-1">
        <NavItem
          icon={<Server size={16} />}
          label="Agent Config"
          active={location.pathname === '/agents'}
          onClick={() => navigate('/agents')}
        />
        <NavItem
          icon={<Clock size={16} />}
          label="History"
          active={location.pathname === '/history'}
          onClick={() => navigate('/history')}
        />
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
        active
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-foreground-secondary hover:text-foreground hover:bg-surface-2',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SidebarSection({ id, label, icon, expanded, onToggle, children }: {
  id: string; label: string; icon: React.ReactNode; expanded: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider text-foreground-muted hover:text-foreground-secondary transition-colors"
        data-section={id}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {expanded && <div className="space-y-0.5 mt-0.5">{children}</div>}
    </div>
  );
}

function SessionItem({ session, active, pinned, onClick, onDelete }: {
  session: { id: string; title: string; last_active_at: string };
  active: boolean; pinned?: boolean; onClick: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-150',
        active
          ? 'bg-accent/10 text-accent'
          : 'text-foreground-secondary hover:text-foreground hover:bg-surface-2',
      )}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {pinned && <Pin size={10} className="text-accent shrink-0" />}
      <span className="truncate flex-1 text-xs">{session.title}</span>
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-foreground-muted hover:text-error hover:bg-error-muted transition-colors"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}
