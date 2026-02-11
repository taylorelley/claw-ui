import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import type { Message, Session } from '../lib/types';

export function useSession() {
  const { state, dispatch } = useApp();

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
    dispatch({ type: 'SET_LOADING_MESSAGES', payload: true });
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    dispatch({ type: 'SET_MESSAGES', payload: (data || []) as Message[] });
    dispatch({ type: 'SET_LOADING_MESSAGES', payload: false });
  }, [dispatch]);

  const addMessage = useCallback(async (sessionId: string, role: 'user' | 'agent', content: string, a2uiPayload?: unknown) => {
    const tempId = crypto.randomUUID();
    const msg: Message = {
      id: tempId,
      session_id: sessionId,
      role,
      content,
      a2ui_payload: (a2uiPayload as Message['a2ui_payload']) || null,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: msg });

    const { data } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        a2ui_payload: msg.a2ui_payload,
        created_at: msg.created_at,
      })
      .select()
      .single();

    if (data) {
      dispatch({ type: 'REPLACE_MESSAGE', payload: { tempId, message: data as Message } });
    }

    const now = new Date().toISOString();
    await supabase.from('sessions').update({ last_active_at: now }).eq('id', sessionId);
    dispatch({ type: 'UPDATE_SESSION', payload: { id: sessionId, changes: { last_active_at: now } } });

    return data as Message | null;
  }, [dispatch]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    await supabase.from('sessions').update({ title }).eq('id', sessionId);
    dispatch({ type: 'UPDATE_SESSION', payload: { id: sessionId, changes: { title } } });
  }, [dispatch]);

  const deleteSession = useCallback(async (sessionId: string) => {
    await supabase.from('sessions').delete().eq('id', sessionId);
    dispatch({ type: 'REMOVE_SESSION', payload: sessionId });
  }, [dispatch]);

  const togglePin = useCallback(async (sessionId: string) => {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return;
    const pinned = !session.is_pinned;
    await supabase.from('sessions').update({ is_pinned: pinned }).eq('id', sessionId);
    dispatch({ type: 'UPDATE_SESSION', payload: { id: sessionId, changes: { is_pinned: pinned } } });
  }, [dispatch, state.sessions]);

  const appendToLastAgentMessage = useCallback((content: string) => {
    dispatch({ type: 'APPEND_TO_LAST_AGENT', payload: content });
  }, [dispatch]);

  const updateLastAgentA2UI = useCallback((payload: Message['a2ui_payload']) => {
    dispatch({ type: 'UPDATE_LAST_AGENT_A2UI', payload });
  }, [dispatch]);

  return {
    messages: state.messages,
    loadingMessages: state.loadingMessages,
    createSession,
    loadMessages,
    addMessage,
    updateSessionTitle,
    deleteSession,
    togglePin,
    appendToLastAgentMessage,
    updateLastAgentA2UI,
  };
}
