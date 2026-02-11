import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import type { Message, Session } from '../lib/types';

export function useSession() {
  const { state, dispatch } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const createSession = useCallback(async (agentConnectionId?: string | null) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        agent_connection_id: agentConnectionId || null,
        title: 'New Session',
        last_active_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) return null;
    dispatch({ type: 'ADD_SESSION', payload: data });
    dispatch({ type: 'SET_ACTIVE_SESSION', payload: data.id });
    return data as Session;
  }, [dispatch]);

  const loadMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as Message[]);
    setLoadingMessages(false);
  }, []);

  const addMessage = useCallback(async (sessionId: string, role: 'user' | 'agent', content: string, a2uiPayload?: unknown) => {
    const msg: Partial<Message> = {
      session_id: sessionId,
      role,
      content,
      a2ui_payload: a2uiPayload as Message['a2ui_payload'] || null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, { id: crypto.randomUUID(), ...msg } as Message]);

    const { data } = await supabase.from('messages').insert(msg).select().single();

    if (data) {
      setMessages(prev => prev.map(m => (m.id === data.id ? data as Message : m)));
    }

    await supabase.from('sessions').update({ last_active_at: new Date().toISOString() }).eq('id', sessionId);
    dispatch({ type: 'UPDATE_SESSION', payload: { id: sessionId, changes: { last_active_at: new Date().toISOString() } } });

    return data as Message | null;
  }, [dispatch]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    await supabase.from('sessions').update({ title }).eq('id', sessionId);
    dispatch({ type: 'UPDATE_SESSION', payload: { id: sessionId, changes: { title } } });
  }, [dispatch]);

  const deleteSession = useCallback(async (sessionId: string) => {
    await supabase.from('sessions').delete().eq('id', sessionId);
    dispatch({ type: 'REMOVE_SESSION', payload: sessionId });
    if (state.activeSessionId === sessionId) {
      dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
    }
  }, [dispatch, state.activeSessionId]);

  const togglePin = useCallback(async (sessionId: string) => {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return;
    const pinned = !session.is_pinned;
    await supabase.from('sessions').update({ is_pinned: pinned }).eq('id', sessionId);
    dispatch({ type: 'UPDATE_SESSION', payload: { id: sessionId, changes: { is_pinned: pinned } } });
  }, [dispatch, state.sessions]);

  const appendToLastAgentMessage = useCallback((content: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'agent') {
        return [...prev.slice(0, -1), { ...last, content: last.content + content }];
      }
      return [...prev, { id: crypto.randomUUID(), session_id: '', role: 'agent', content, a2ui_payload: null, metadata: {}, created_at: new Date().toISOString() }];
    });
  }, []);

  const updateLastAgentA2UI = useCallback((payload: Message['a2ui_payload']) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'agent') {
        return [...prev.slice(0, -1), { ...last, a2ui_payload: payload }];
      }
      return prev;
    });
  }, []);

  return {
    messages,
    loadingMessages,
    createSession,
    loadMessages,
    addMessage,
    updateSessionTitle,
    deleteSession,
    togglePin,
    appendToLastAgentMessage,
    updateLastAgentA2UI,
    setMessages,
  };
}
