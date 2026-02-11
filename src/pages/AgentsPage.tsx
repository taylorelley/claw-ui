import { useState, useRef, useEffect } from 'react';
import { Server, Plus, Trash2, Check, X, RefreshCw, Star, StarOff, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import type { AgentConnection } from '../lib/types';
import { cn } from '../lib/cn';

export function AgentsPage() {
  const { state, dispatch } = useApp();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', gateway_url: 'ws://127.0.0.1:18789', auth_token: '' });
  const [testing, setTesting] = useState<string | null>(null);
  const testWsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      testWsRef.current?.close();
      testWsRef.current = null;
    };
  }, []);

  const handleAdd = async () => {
    if (!form.gateway_url.trim()) return;
    const isFirst = state.connections.length === 0;
    const { data, error } = await supabase
      .from('agent_connections')
      .insert({
        name: form.name || 'OpenClaw Gateway',
        gateway_url: form.gateway_url,
        auth_token: form.auth_token || null,
        is_default: isFirst,
        status: 'disconnected',
      })
      .select()
      .single();

    if (!error && data) {
      dispatch({ type: 'ADD_CONNECTION', payload: data as AgentConnection });
      setForm({ name: '', gateway_url: 'ws://127.0.0.1:18789', auth_token: '' });
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('agent_connections').delete().eq('id', id);
    dispatch({ type: 'REMOVE_CONNECTION', payload: id });
  };

  const handleSetDefault = async (id: string) => {
    const [clearRes, setRes] = await Promise.all([
      supabase.from('agent_connections').update({ is_default: false }).neq('id', id),
      supabase.from('agent_connections').update({ is_default: true }).eq('id', id),
    ]);
    if (clearRes.error || setRes.error) {
      console.error('Failed to set default connection:', clearRes.error || setRes.error);
      const { data } = await supabase.from('agent_connections').select('*').order('created_at', { ascending: true });
      if (data) dispatch({ type: 'SET_CONNECTIONS', payload: data as AgentConnection[] });
      return;
    }
    dispatch({
      type: 'SET_CONNECTIONS',
      payload: state.connections.map(c => ({ ...c, is_default: c.id === id })),
    });
  };

  const handleTestConnection = async (conn: AgentConnection) => {
    setTesting(conn.id);
    dispatch({ type: 'UPDATE_CONNECTION', payload: { id: conn.id, changes: { status: 'connecting' } } });

    try {
      const ws = new WebSocket(conn.gateway_url);
      testWsRef.current = ws;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          ws.close();
          reject(new Error('Timeout'));
        }, 5000);
        ws.onopen = () => { clearTimeout(timer); resolve(); ws.close(); };
        ws.onerror = () => { clearTimeout(timer); ws.close(); reject(new Error('Connection failed')); };
      });
      testWsRef.current = null;
      dispatch({ type: 'UPDATE_CONNECTION', payload: { id: conn.id, changes: { status: 'connected' } } });
      await supabase.from('agent_connections').update({ status: 'connected', updated_at: new Date().toISOString() }).eq('id', conn.id);
    } catch {
      testWsRef.current = null;
      dispatch({ type: 'UPDATE_CONNECTION', payload: { id: conn.id, changes: { status: 'error' } } });
      await supabase.from('agent_connections').update({ status: 'error', updated_at: new Date().toISOString() }).eq('id', conn.id);
    }
    setTesting(null);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Agent Connections</h1>
            <p className="text-sm text-foreground-muted mt-0.5">Manage your OpenClaw gateway endpoints</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover text-sm font-medium shadow-soft transition-all duration-150 active:scale-[0.98]"
          >
            <Plus size={15} />
            Add Gateway
          </button>
        </div>

        {adding && (
          <div className="mb-6 p-5 rounded-xl bg-surface-1 border border-border shadow-soft animate-slide-up">
            <h3 className="text-sm font-semibold text-foreground mb-4">New Gateway Connection</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="My OpenClaw Gateway"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-surface-0 border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1">WebSocket URL</label>
                <input
                  value={form.gateway_url}
                  onChange={e => setForm(p => ({ ...p, gateway_url: e.target.value }))}
                  placeholder="ws://127.0.0.1:18789"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-surface-0 border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1">Auth Token (optional)</label>
                <input
                  type="password"
                  value={form.auth_token}
                  onChange={e => setForm(p => ({ ...p, auth_token: e.target.value }))}
                  placeholder="Bearer token..."
                  className="w-full px-3 py-2 rounded-lg text-sm bg-surface-0 border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover text-sm font-medium transition-all">
                <Check size={14} /> Save
              </button>
              <button onClick={() => setAdding(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-2 text-foreground-secondary hover:bg-surface-3 text-sm transition-all">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {state.connections.map(conn => (
            <div
              key={conn.id}
              className="p-4 rounded-xl bg-surface-1 border border-border hover:shadow-soft transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  conn.status === 'connected' ? 'bg-success-muted' : 'bg-surface-2',
                )}>
                  {conn.status === 'connected' ? (
                    <Wifi size={16} className="text-success" />
                  ) : (
                    <WifiOff size={16} className="text-foreground-muted" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{conn.name || 'Unnamed Gateway'}</span>
                    {conn.is_default && (
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">Default</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-foreground-muted mt-0.5 truncate">{conn.gateway_url}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      conn.status === 'connected' ? 'bg-success' :
                      conn.status === 'connecting' ? 'bg-warning animate-pulse' :
                      conn.status === 'error' ? 'bg-error' : 'bg-foreground-muted',
                    )} />
                    <span className="text-2xs text-foreground-muted capitalize">{conn.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTestConnection(conn)}
                    disabled={testing === conn.id}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                      testing === conn.id ? 'text-warning animate-spin' : 'text-foreground-muted hover:text-foreground hover:bg-surface-2',
                    )}
                    title="Test connection"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    onClick={() => handleSetDefault(conn.id)}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                      conn.is_default ? 'text-accent' : 'text-foreground-muted hover:text-accent hover:bg-surface-2',
                    )}
                    title={conn.is_default ? 'Default gateway' : 'Set as default'}
                  >
                    {conn.is_default ? <Star size={14} /> : <StarOff size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(conn.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-error hover:bg-error-muted transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {state.connections.length === 0 && !adding && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
                <Server size={24} className="text-foreground-muted" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">No gateways configured</h3>
              <p className="text-sm text-foreground-muted mb-5 max-w-sm mx-auto">
                Add an OpenClaw gateway endpoint to start interacting with AI agents.
              </p>
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover text-sm font-medium shadow-soft transition-all"
              >
                <Plus size={15} />
                Add Your First Gateway
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
