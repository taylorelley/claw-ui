export interface A2UIComponentDef {
  id: string;
  component: string;
  children?: string[];
  text?: string;
  markdown?: boolean;
  src?: string;
  alt?: string;
  icon?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  dataPath?: string;
  action?: A2UIAction;
  variant?: string;
  disabled?: boolean;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  title?: string;
  tabs?: Array<{ id: string; label: string; children: string[] }>;
  gap?: number;
  align?: string;
  justify?: string;
  wrap?: boolean;
  elevation?: number;
  visible?: boolean;
  style?: Record<string, string>;
}

export interface A2UIAction {
  event?: { name: string; context?: Record<string, unknown> };
  functionCall?: { call: string; args?: Record<string, unknown> };
}

export interface A2UISurfaceState {
  surfaceId: string;
  catalogId?: string;
  components: Map<string, A2UIComponentDef>;
  dataModel: Record<string, unknown>;
  theme?: Record<string, unknown>;
}

export interface A2UIRendererProps {
  surface: A2UISurfaceState;
  onAction?: (action: A2UIAction) => void;
  onDataChange?: (path: string, value: unknown) => void;
  className?: string;
}

export interface A2UIComponentProps {
  def: A2UIComponentDef;
  surface: A2UISurfaceState;
  onAction?: (action: A2UIAction) => void;
  onDataChange?: (path: string, value: unknown) => void;
}
