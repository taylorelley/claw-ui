import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Maximize, Minimize, Sparkles, RotateCcw, User, Mail, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PREFERENCES } from '../lib/types';
import type { ThemeMode, LayoutDensity } from '../lib/types';
import { cn } from '../lib/cn';
import { listAgentTokens, AgentToken } from '../services/agentTokenService';
import { useToast } from '../components/common/Toast';

export function SettingsPage() {
  const { state, updatePreferences } = useApp();
  const { user, signOut } = useAuth();
  const { success, error: showError } = useToast();
  const prefs = state.preferences;

  const [agents, setAgents] = useState<AgentToken[]>([]);
  const [defaultAgent, setDefaultAgent] = useState<string>('');
  const [notifications, setNotifications] = useState({
    agentStatus: true,
    newMessages: true,
    systemUpdates: false,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const tokens = await listAgentTokens();
      setAgents(tokens);
      if (tokens.length > 0 && !defaultAgent) {
        setDefaultAgent(tokens[0].id);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // TODO: Implement account deletion
      success('Account deletion requested');
      setTimeout(() => signOut(), 2000);
    } catch (err) {
      showError('Failed to delete account');
    }
  };

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
        <p className="text-sm text-foreground-muted mb-8">Customize your interface and account preferences.</p>

        <div className="space-y-8">
          {/* Account Information */}
          <SettingsSection 
            title="Account" 
            description="Your account information and details"
          >
            <div className="space-y-3">
              <InfoItem icon={User} label="User ID" value={user?.id || 'N/A'} />
              <InfoItem icon={Mail} label="Email" value={user?.email || 'N/A'} />
              <InfoItem 
                icon={Calendar} 
                label="Member Since" 
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} 
              />
            </div>
          </SettingsSection>

          {/* Appearance */}
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

          {/* Agent Preferences */}
          {agents.length > 0 && (
            <SettingsSection 
              title="Agent Preferences" 
              description="Configure default agent and behavior"
            >
              <SettingsRow label="Default Agent">
                <select
                  value={defaultAgent}
                  onChange={e => setDefaultAgent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface-1 text-foreground focus:outline-none focus:border-accent transition-colors"
                >
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-foreground-muted mt-1.5">
                  This agent will be used for new sessions by default
                </p>
              </SettingsRow>
            </SettingsSection>
          )}

          {/* Notifications */}
          <SettingsSection 
            title="Notifications" 
            description="Manage notification preferences"
          >
            <SettingsRow label="Agent Status Changes">
              <ToggleSwitch
                checked={notifications.agentStatus}
                onChange={() => setNotifications(prev => ({ ...prev, agentStatus: !prev.agentStatus }))}
                label={notifications.agentStatus ? 'Enabled' : 'Disabled'}
                description="Get notified when agents connect or disconnect"
              />
            </SettingsRow>

            <SettingsRow label="New Messages">
              <ToggleSwitch
                checked={notifications.newMessages}
                onChange={() => setNotifications(prev => ({ ...prev, newMessages: !prev.newMessages }))}
                label={notifications.newMessages ? 'Enabled' : 'Disabled'}
                description="Get notified of new messages in inactive sessions"
              />
            </SettingsRow>

            <SettingsRow label="System Updates">
              <ToggleSwitch
                checked={notifications.systemUpdates}
                onChange={() => setNotifications(prev => ({ ...prev, systemUpdates: !prev.systemUpdates }))}
                label={notifications.systemUpdates ? 'Enabled' : 'Disabled'}
                description="Receive notifications about system updates and maintenance"
              />
            </SettingsRow>
          </SettingsSection>

          {/* Adaptive Features */}
          <SettingsSection title="Adaptive Features" description="Control how the interface learns from your usage">
            <SettingsRow label="Adaptive UI">
              <ToggleSwitch
                checked={prefs.adaptiveEnabled}
                onChange={() => updatePreferences({ adaptiveEnabled: !prefs.adaptiveEnabled })}
                label={prefs.adaptiveEnabled ? 'Enabled' : 'Disabled'}
                description={
                  prefs.adaptiveEnabled
                    ? 'Interface adapts based on your usage patterns'
                    : 'Interface uses fixed layout'
                }
              />
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

          {/* Reset */}
          <SettingsSection title="Reset" description="Restore default settings">
            <button
              onClick={() => {
                updatePreferences(DEFAULT_PREFERENCES);
                success('Preferences reset to defaults');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 text-foreground-secondary hover:bg-surface-3 text-sm transition-all"
            >
              <RotateCcw size={14} />
              Reset All Preferences
            </button>
          </SettingsSection>

          {/* Danger Zone */}
          <SettingsSection 
            title="Danger Zone" 
            description="Irreversible actions"
          >
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-error/10 hover:bg-error/20 text-error text-sm font-medium transition-all"
              >
                <Trash2 size={14} />
                Delete Account
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-error/10 border border-error/20">
                  <AlertTriangle size={16} className="text-error shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-error font-medium mb-1">
                      Are you absolutely sure?
                    </p>
                    <p className="text-xs text-error/80">
                      This will permanently delete your account, all agents, and all sessions. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 px-4 py-2 rounded-lg bg-error hover:bg-error/90 text-white text-sm font-medium transition-colors"
                  >
                    Yes, Delete My Account
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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

function InfoItem({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-1 border border-border">
      <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-foreground-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground-muted">{label}</div>
        <div className="text-sm text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={onChange}
        className={cn(
          'w-10 h-6 rounded-full transition-all duration-200 relative cursor-pointer',
          checked ? 'bg-accent' : 'bg-surface-3',
        )}
      >
        <div className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-all duration-200',
          checked ? 'left-[18px]' : 'left-0.5',
        )} />
      </div>
      <div className="flex-1">
        <div className="text-sm text-foreground">{label}</div>
        <div className="text-xs text-foreground-muted">{description}</div>
      </div>
    </label>
  );
}
