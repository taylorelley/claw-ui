import { Moon, Sun, Monitor, Maximize, Minimize, Sparkles, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_PREFERENCES } from '../lib/types';
import type { ThemeMode, LayoutDensity } from '../lib/types';
import { cn } from '../lib/cn';

export function SettingsPage() {
  const { state, updatePreferences } = useApp();
  const prefs = state.preferences;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'auto', label: 'System', icon: <Monitor size={16} /> },
  ];

  const densityOptions: { value: LayoutDensity; label: string; icon: React.ReactNode }[] = [
    { value: 'comfortable', label: 'Comfortable', icon: <Maximize size={16} /> },
    { value: 'compact', label: 'Compact', icon: <Minimize size={16} /> },
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-foreground-muted mb-8">Customize your interface preferences.</p>

        <div className="space-y-8">
          <SettingsSection title="Appearance" description="Control how the interface looks">
            <SettingsRow label="Theme">
              <div className="flex gap-2">
                {themeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updatePreferences({ theme: opt.value })}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                      prefs.theme === opt.value
                        ? 'bg-accent text-accent-foreground shadow-soft'
                        : 'bg-surface-2 text-foreground-secondary hover:bg-surface-3',
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label="Layout Density">
              <div className="flex gap-2">
                {densityOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updatePreferences({ density: opt.value })}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                      prefs.density === opt.value
                        ? 'bg-accent text-accent-foreground shadow-soft'
                        : 'bg-surface-2 text-foreground-secondary hover:bg-surface-3',
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label="Sidebar Width">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={220}
                  max={400}
                  value={prefs.sidebarWidth}
                  onChange={e => updatePreferences({ sidebarWidth: Number(e.target.value) })}
                  className="flex-1 accent-accent h-1.5 rounded-full appearance-none bg-surface-3 cursor-pointer"
                />
                <span className="text-xs font-mono text-foreground-muted w-10 text-right">{prefs.sidebarWidth}px</span>
              </div>
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Adaptive Features" description="Control how the interface learns from your usage">
            <SettingsRow label="Adaptive UI">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => updatePreferences({ adaptiveEnabled: !prefs.adaptiveEnabled })}
                  className={cn(
                    'w-10 h-6 rounded-full transition-all duration-200 relative cursor-pointer',
                    prefs.adaptiveEnabled ? 'bg-accent' : 'bg-surface-3',
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-all duration-200',
                    prefs.adaptiveEnabled ? 'left-[18px]' : 'left-0.5',
                  )} />
                </div>
                <div>
                  <div className="text-sm text-foreground">{prefs.adaptiveEnabled ? 'Enabled' : 'Disabled'}</div>
                  <div className="text-xs text-foreground-muted">
                    {prefs.adaptiveEnabled
                      ? 'Interface adapts based on your usage patterns'
                      : 'Interface uses fixed layout'
                    }
                  </div>
                </div>
              </label>
            </SettingsRow>

            {prefs.adaptiveEnabled && (
              <SettingsRow label="Sidebar Section Order">
                <div className="flex flex-wrap gap-2">
                  {prefs.sidebarSections.map((section, i) => (
                    <div
                      key={section}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 text-xs text-foreground-secondary"
                    >
                      <Sparkles size={10} className="text-accent" />
                      <span className="capitalize">{section}</span>
                      <span className="text-2xs text-foreground-muted">#{i + 1}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-foreground-muted mt-1.5">
                  Sections automatically reorder based on how often you use them.
                </p>
              </SettingsRow>
            )}
          </SettingsSection>

          <SettingsSection title="Reset" description="Restore default settings">
            <button
              onClick={() => updatePreferences(DEFAULT_PREFERENCES)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 text-foreground-secondary hover:bg-surface-3 text-sm transition-all"
            >
              <RotateCcw size={14} />
              Reset All Preferences
            </button>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-0.5">{title}</h2>
      <p className="text-xs text-foreground-muted mb-4">{description}</p>
      <div className="space-y-4 pl-0">{children}</div>
    </div>
  );
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl bg-surface-1 border border-border">
      <label className="text-xs font-medium text-foreground-muted block mb-2.5">{label}</label>
      {children}
    </div>
  );
}
