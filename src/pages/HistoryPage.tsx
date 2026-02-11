import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Message } from '../lib/types';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/cn';

interface HistoryEntry {
  session_id: string;
  session_title: string;
  message_count: number;
  last_message: string;
  last_active: string;
}

export function HistoryPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    const historyEntries: HistoryEntry[] = [];

    for (const session of state.sessions) {
      const { data, count } = await supabase
        .from('messages')
        .select('content', { count: 'exact' })
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1);

      historyEntries.push({
        session_id: session.id,
        session_title: session.title,
        message_count: count || 0,
        last_message: data?.[0]?.content?.slice(0, 100) || '',
        last_active: session.last_active_at,
      });
    }

    setEntries(historyEntries);
    setLoading(false);
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    setSearchResults((data || []) as Message[]);
  }

  const groupedByDate = entries.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
    const date = new Date(entry.last_active).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-foreground mb-1">History</h1>
        <p className="text-sm text-foreground-muted mb-6">Search and browse past conversations.</p>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-surface-1 border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>

        {searchQuery && searchResults.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">Search Results</h2>
            {searchResults.map(msg => (
              <button
                key={msg.id}
                onClick={() => navigate(`/chat/${msg.session_id}`)}
                className="w-full text-left p-3 rounded-xl bg-surface-1 border border-border hover:border-accent/30 hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-2xs px-1.5 py-0.5 rounded font-medium',
                    msg.role === 'user' ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-foreground-muted',
                  )}>
                    {msg.role}
                  </span>
                  <span className="text-2xs text-foreground-muted">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground-secondary line-clamp-2">{msg.content}</p>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={28} className="text-foreground-muted mx-auto mb-3" />
            <p className="text-sm text-foreground-muted">No conversation history yet.</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={12} className="text-foreground-muted" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">{date}</h2>
              </div>
              <div className="space-y-2">
                {items.map(entry => (
                  <button
                    key={entry.session_id}
                    onClick={() => navigate(`/chat/${entry.session_id}`)}
                    className="group w-full flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-border hover:border-accent/30 hover:shadow-soft transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                      <MessageSquare size={14} className="text-foreground-muted group-hover:text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{entry.session_title}</div>
                      {entry.last_message && (
                        <p className="text-xs text-foreground-muted truncate mt-0.5">{entry.last_message}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xs text-foreground-muted">{entry.message_count} msgs</span>
                    </div>
                    <ArrowRight size={14} className="text-foreground-muted group-hover:text-accent shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
