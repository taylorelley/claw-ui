import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { AppPreferences, Session, AgentConnection, Shortcut } from '../lib/types';
import { DEFAULT_PREFERENCES } from '../lib/types';
import { supabase } from '../lib/supabase';

interface AppState {
  preferences: AppPreferences;
  sessions: Session[];
  activeSessionId: string | null;
  connections: AgentConnection[];
  shortcuts: Shortcut[];
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

  const updatePreferences = useCallback(async (prefs: Partial<AppPreferences>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: prefs });
    const merged = { ...state.preferences, ...prefs };
    await supabase.from('user_preferences').upsert(
      { preference_key: 'app_preferences', preference_value: merged, updated_at: new Date().toISOString() },
      { onConflict: 'preference_key' }
    );
  }, [state.preferences]);

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
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [state.preferences.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch, updatePreferences }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
