import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, PanelLeftClose, PanelLeftOpen, Zap, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/cn';

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function TopBar({ onToggleSidebar, sidebarCollapsed }: TopBarProps) {
  const { state, updatePreferences } = useApp();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const isDark = state.preferences.theme === 'dark';

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const defaultConnection = state.connections.find(c => c.is_default) || state.connections[0];
  const connectedCount = state.connections.filter(c => c.status === 'connected').length;

  return (
    <header className="h-14 border-b border-border glass-heavy flex items-center px-4 gap-3 z-30 relative">
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-all duration-150"
      >
        {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      <div className="flex items-center gap-2 mr-auto">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <Zap size={14} className="text-accent" />
          </div>
          <span className="text-sm font-semibold text-foreground hidden sm:block">A2UI Agent</span>
        </div>
        {defaultConnection && (
          <div className="flex items-center gap-1.5 ml-3 px-2 py-1 rounded-md bg-surface-2">
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              defaultConnection.status === 'connected' ? 'bg-success' : 'bg-foreground-muted',
            )} />
            <span className="text-2xs text-foreground-muted">{defaultConnection.name || 'Gateway'}</span>
          </div>
        )}
        {connectedCount > 0 && (
          <span className="text-2xs text-foreground-muted">{connectedCount} connected</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
            'text-foreground-muted hover:text-foreground hover:bg-surface-2',
            'border border-transparent hover:border-border',
          )}
        >
          <Search size={14} />
          <span className="hidden sm:block text-xs">Search</span>
          <kbd className="hidden sm:block text-2xs px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono">
            {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+K
          </kbd>
        </button>

        <button
          onClick={() => updatePreferences({ theme: isDark ? 'light' : 'dark' })}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-all duration-150"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-all duration-150"
        >
          <Settings size={16} />
        </button>
      </div>

      {searchOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <div className="fixed inset-0" onClick={() => setSearchOpen(false)} />
          <div className="relative mx-auto max-w-lg px-4">
            <div className="bg-surface-1 border border-border rounded-xl shadow-overlay p-2 animate-slide-up">
              <div className="flex items-center gap-2 px-3">
                <Search size={16} className="text-foreground-muted shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search sessions, messages..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground-muted py-2"
                />
                <kbd className="text-2xs px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono text-foreground-muted">
                  Esc
                </kbd>
              </div>
              {searchQuery && (
                <div className="border-t border-border mt-1 pt-2 px-2 pb-1">
                  <p className="text-xs text-foreground-muted px-2 py-3">
                    Type to search across sessions and messages...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
