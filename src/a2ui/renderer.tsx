import type { ReactNode } from 'react';
import type { A2UIComponentDef, A2UISurfaceState, A2UIAction, A2UIRendererProps } from './types';
import { TextComponent } from './components/TextComponent';
import { ButtonComponent } from './components/ButtonComponent';
import { CardComponent } from './components/CardComponent';
import { RowComponent, ColumnComponent, ListComponent, DividerComponent } from './components/LayoutComponents';
import { TextFieldComponent, CheckBoxComponent, ChoicePickerComponent, SliderComponent, DateTimeInputComponent } from './components/InputComponents';
import { ImageComponent, IconComponent, VideoComponent, AudioPlayerComponent } from './components/MediaComponents';
import { TabsComponent, ModalComponent } from './components/NavigationComponents';
import { cn } from '../lib/cn';

const COMPONENT_MAP: Record<string, React.ComponentType<{
  def: A2UIComponentDef;
  surface: A2UISurfaceState;
  onAction?: (action: A2UIAction) => void;
  onDataChange?: (path: string, value: unknown) => void;
}>> = {
  Text: TextComponent,
  Button: ButtonComponent,
  Card: CardComponent,
  Row: RowComponent,
  Column: ColumnComponent,
  List: ListComponent,
  Divider: DividerComponent,
  TextField: TextFieldComponent,
  CheckBox: CheckBoxComponent,
  ChoicePicker: ChoicePickerComponent,
  Slider: SliderComponent,
  DateTimeInput: DateTimeInputComponent,
  Image: ImageComponent,
  Icon: IconComponent,
  Video: VideoComponent,
  AudioPlayer: AudioPlayerComponent,
  Tabs: TabsComponent,
  Modal: ModalComponent,
};

export function renderComponentById(
  id: string,
  surface: A2UISurfaceState,
  onAction?: (action: A2UIAction) => void,
  onDataChange?: (path: string, value: unknown) => void,
): ReactNode {
  const def = surface.components.get(id);
  if (!def) return null;

  const Component = COMPONENT_MAP[def.component];
  if (!Component) {
    return (
      <div key={id} className="text-xs text-foreground-muted bg-surface-2 px-2 py-1 rounded">
        Unknown: {def.component}
      </div>
    );
  }

  return <Component key={id} def={def} surface={surface} onAction={onAction} onDataChange={onDataChange} />;
}

export function renderChildren(
  def: A2UIComponentDef,
  surface: A2UISurfaceState,
  onAction?: (action: A2UIAction) => void,
  onDataChange?: (path: string, value: unknown) => void,
): ReactNode[] {
  if (!def.children) return [];
  return def.children.map(childId => renderComponentById(childId, surface, onAction, onDataChange));
}

export function A2UIRenderer({ surface, onAction, onDataChange, className }: A2UIRendererProps) {
  const root = surface.components.get('root');
  if (!root) {
    const allComponents = Array.from(surface.components.values());
    if (allComponents.length === 0) return null;
    return (
      <div className={cn('flex flex-col gap-2 animate-fade-in', className)}>
        {allComponents.map(comp => renderComponentById(comp.id, surface, onAction, onDataChange))}
      </div>
    );
  }

  return (
    <div className={cn('animate-fade-in', className)}>
      {renderComponentById('root', surface, onAction, onDataChange)}
    </div>
  );
}
