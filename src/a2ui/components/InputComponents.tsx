import { useState } from 'react';
import type { A2UIComponentProps } from '../types';
import { resolveDataPath } from '../dataBinding';
import { cn } from '../../lib/cn';

export function TextFieldComponent({ def, surface, onDataChange }: A2UIComponentProps) {
  const boundValue = def.dataPath ? resolveDataPath(surface.dataModel, def.dataPath) : undefined;
  const [localValue, setLocalValue] = useState(String(boundValue ?? def.value ?? ''));

  const handleChange = (val: string) => {
    setLocalValue(val);
    if (def.dataPath) onDataChange?.(def.dataPath, val);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {def.label && (
        <label className="text-xs font-medium text-foreground-muted">{def.label}</label>
      )}
      <input
        type="text"
        value={localValue}
        placeholder={def.placeholder}
        disabled={def.disabled}
        onChange={e => handleChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm',
          'bg-surface-0 border border-border text-foreground',
          'placeholder:text-foreground-muted',
          'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
          'transition-all duration-150',
          def.disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
    </div>
  );
}

export function CheckBoxComponent({ def, surface, onDataChange, onAction }: A2UIComponentProps) {
  const boundValue = def.dataPath ? resolveDataPath(surface.dataModel, def.dataPath) : undefined;
  const [checked, setChecked] = useState(Boolean(boundValue ?? false));

  const handleChange = () => {
    const newVal = !checked;
    setChecked(newVal);
    if (def.dataPath) onDataChange?.(def.dataPath, newVal);
    if (def.action) onAction?.(def.action);
  };

  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        className={cn(
          'w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all duration-150',
          checked
            ? 'bg-accent border-accent'
            : 'border-border group-hover:border-foreground-muted',
        )}
        onClick={handleChange}
      >
        {checked && (
          <svg className="w-3 h-3 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {def.label && <span className="text-sm text-foreground-secondary">{def.label}</span>}
    </label>
  );
}

export function ChoicePickerComponent({ def, surface, onDataChange, onAction }: A2UIComponentProps) {
  const boundValue = def.dataPath ? resolveDataPath(surface.dataModel, def.dataPath) : undefined;
  const [selected, setSelected] = useState(String(boundValue ?? def.value ?? ''));
  const options = def.options || [];

  const handleSelect = (val: string) => {
    setSelected(val);
    if (def.dataPath) onDataChange?.(def.dataPath, val);
    if (def.action) onAction?.(def.action);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {def.label && <label className="text-xs font-medium text-foreground-muted">{def.label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
              selected === opt.value
                ? 'bg-accent text-accent-foreground shadow-soft'
                : 'bg-surface-2 text-foreground-secondary hover:bg-surface-3',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SliderComponent({ def, surface, onDataChange }: A2UIComponentProps) {
  const boundValue = def.dataPath ? resolveDataPath(surface.dataModel, def.dataPath) : undefined;
  const [value, setValue] = useState(Number(boundValue ?? def.value ?? def.min ?? 0));

  const handleChange = (val: number) => {
    setValue(val);
    if (def.dataPath) onDataChange?.(def.dataPath, val);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {def.label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground-muted">{def.label}</label>
          <span className="text-xs font-mono text-foreground-muted">{value}</span>
        </div>
      )}
      <input
        type="range"
        min={def.min ?? 0}
        max={def.max ?? 100}
        step={def.step ?? 1}
        value={value}
        onChange={e => handleChange(Number(e.target.value))}
        className="w-full accent-accent h-1.5 rounded-full appearance-none bg-surface-3 cursor-pointer"
      />
    </div>
  );
}

export function DateTimeInputComponent({ def, surface, onDataChange }: A2UIComponentProps) {
  const boundValue = def.dataPath ? resolveDataPath(surface.dataModel, def.dataPath) : undefined;
  const [value, setValue] = useState(String(boundValue ?? def.value ?? ''));

  const handleChange = (val: string) => {
    setValue(val);
    if (def.dataPath) onDataChange?.(def.dataPath, val);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {def.label && <label className="text-xs font-medium text-foreground-muted">{def.label}</label>}
      <input
        type="datetime-local"
        value={value}
        onChange={e => handleChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm',
          'bg-surface-0 border border-border text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
          'transition-all duration-150',
        )}
      />
    </div>
  );
}
