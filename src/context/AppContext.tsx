import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { AppPreferences, Session, AgentConnection, Shortcut, Message } from '../lib/types';
import { DEFAULT_PREFERENCES } from '../lib/types';
import { supabase } from '../lib/supabase';

interface AppState {
  preferences: AppPreferences;
  sessions: Session[];
  activeSessionId: string | null;
  connections: AgentConnection[];
  shortcuts: Shortcut[];
  messages: Message[];
  loadingMessages: boolean;
  initialized: boolean;
}

type Action =
  | { type: 'SET_PREFERENCES'; payload: Partial<AppPreferences> }
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'ADD_SESSION'; payload: Session }
  | { type: 'UPDATE_SESSION'; payload: { id: string; changes: Partial<Session> } }
  | { type: 'REMOVE_SESSION'; payload: string }
  | { type: 'SET_ACTIVE_SESSION'; payload: string | null }
  | { type: 'SET_CONNECTIONS'; payload: AgentConnection[] }
  | { type: 'ADD_CONNECTION'; payload: AgentConnection }
  | { type: 'UPDATE_CONNECTION'; payload: { id: string; changes: Partial<AgentConnection> } }
  | { type: 'REMOVE_CONNECTION'; payload: string }
  | { type: 'SET_SHORTCUTS'; payload: Shortcut[] }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'REPLACE_MESSAGE'; payload: { tempId: string; message: Message } }
  | { type: 'APPEND_TO_LAST_AGENT'; payload: string; sessionId: string }
  | { type: 'REMOVE_MESSAGE'; payload: string }
  | { type: 'UPDATE_LAST_AGENT_A2UI'; payload: Message['a2ui_payload'] }
  | { type: 'SET_LOADING_MESSAGES'; payload: boolean }
  | { type: 'SET_INITIALIZED' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PREFERENCES':
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'ADD_SESSION':
      return { ...state, sessions: [action.payload, ...state.sessions] };
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.payload.id ? { ...s, ...action.payload.changes } : s
        ),
      };
    case 'REMOVE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(s => s.id !== action.payload),
        activeSessionId: state.activeSessionId === action.payload ? null : state.activeSessionId,
      };
    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSessionId: action.payload };
    case 'SET_CONNECTIONS':
      return { ...state, connections: action.payload };
    case 'ADD_CONNECTION':
      return { ...state, connections: [...state.connections, action.payload] };
    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connections: state.connections.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.changes } : c
        ),
      };
    case 'REMOVE_CONNECTION':
      return { ...state, connections: state.connections.filter(c => c.id !== action.payload) };
    case 'SET_SHORTCUTS':
      return { ...state, shortcuts: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'REPLACE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.tempId ? action.payload.message : m
        ),
      };
    case 'APPEND_TO_LAST_AGENT': {
      const msgs = state.messages;
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'agent') {
        return { ...state, messages: [...msgs.slice(0, -1), { ...last, content: last.content + action.payload }] };
      }
      return {
        ...state,
        messages: [...msgs, {
          id: crypto.randomUUID(), session_id: action.sessionId, role: 'agent',
          content: action.payload, a2ui_payload: null, metadata: {},
          created_at: new Date().toISOString(),
        }],
      };
    }
    case 'REMOVE_MESSAGE':
      return { ...state, messages: state.messages.filter(m => m.id !== action.payload) };
    case 'UPDATE_LAST_AGENT_A2UI': {
      const msgs = state.messages;
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'agent') {
        return { ...state, messages: [...msgs.slice(0, -1), { ...last, a2ui_payload: action.payload }] };
      }
      return state;
    }
    case 'SET_LOADING_MESSAGES':
      return { ...state, loadingMessages: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, initialized: true };
    default:
      return state;
  }
}

const initialState: AppState = {
  preferences: DEFAULT_PREFERENCES,
  sessions: [],
  activeSessionId: null,
  connections: [],
  shortcuts: [],
  messages: [],
  loadingMessages: false,
  initialized: false,
};

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  updatePreferences: (prefs: Partial<AppPreferences>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const prefsRef = useRef(state.preferences);
  useEffect(() => { prefsRef.current = state.preferences; }, [state.preferences]);

  const updatePreferences = useCallback(async (prefs: Partial<AppPreferences>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: prefs });
    const merged = { ...prefsRef.current, ...prefs };
    await supabase.from('user_preferences').upsert(
      { preference_key: 'app_preferences', preference_value: merged, updated_at: new Date().toISOString() },
      { onConflict: 'preference_key' }
    );
  }, []);

  useEffect(() => {
    async function init() {
      const [prefsRes, sessionsRes, connectionsRes, shortcutsRes] = await Promise.all([
        supabase.from('user_preferences').select('*').eq('preference_key', 'app_preferences').maybeSingle(),
        supabase.from('sessions').select('*').order('last_active_at', { ascending: false }),
        supabase.from('agent_connections').select('*').order('created_at', { ascending: true }),
        supabase.from('shortcuts').select('*').order('display_order', { ascending: true }),
      ]);

      if (prefsRes.data?.preference_value) {
        dispatch({ type: 'SET_PREFERENCES', payload: prefsRes.data.preference_value as Partial<AppPreferences> });
      }
      if (sessionsRes.data) dispatch({ type: 'SET_SESSIONS', payload: sessionsRes.data });
      if (connectionsRes.data) dispatch({ type: 'SET_CONNECTIONS', payload: connectionsRes.data as AgentConnection[] });
      if (shortcutsRes.data) dispatch({ type: 'SET_SHORTCUTS', payload: shortcutsRes.data as Shortcut[] });
      dispatch({ type: 'SET_INITIALIZED' });
    }
    init();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (state.preferences.theme === 'dark') {
      root.classList.add('dark');
    } else if (state.preferences.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.toggle('dark', mq.matches);
      const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [state.preferences.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch, updatePreferences }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
