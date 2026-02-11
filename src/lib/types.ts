export interface AgentConnection {
  id: string;
  name: string;
  gateway_url: string;
  auth_token: string | null;
  is_default: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  agent_connection_id: string | null;
  title: string;
  is_pinned: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  last_active_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'agent';
  content: string;
  a2ui_payload: A2UISurface | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InteractionEvent {
  id?: string;
  session_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at?: string;
}

export interface UserPreference {
  id?: string;
  preference_key: string;
  preference_value: Record<string, unknown>;
  updated_at?: string;
}

export interface Shortcut {
  id: string;
  label: string;
  command_template: string;
  icon_name: string | null;
  usage_count: number;
  display_order: number;
  is_system: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface A2UIComponent {
  id: string;
  component: string;
  [key: string]: unknown;
}

export interface A2UISurface {
  surfaceId: string;
  components: A2UIComponent[];
  dataModel: Record<string, unknown>;
  theme?: Record<string, unknown>;
}

export interface A2UIMessage {
  type: 'createSurface' | 'updateComponents' | 'updateDataModel' | 'deleteSurface';
  surfaceId: string;
  payload: unknown;
}

export interface GatewayMessage {
  id?: string;
  method?: string;
  result?: unknown;
  error?: { code: number; message: string };
  params?: unknown;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
export type LayoutDensity = 'comfortable' | 'compact';

export interface AppPreferences {
  theme: ThemeMode;
  density: LayoutDensity;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  detailPanelWidth: number;
  adaptiveEnabled: boolean;
  sidebarSections: string[];
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'dark',
  density: 'comfortable',
  sidebarCollapsed: false,
  sidebarWidth: 280,
  detailPanelWidth: 360,
  adaptiveEnabled: true,
  sidebarSections: ['sessions', 'shortcuts', 'agents'],
};
