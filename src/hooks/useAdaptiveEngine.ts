import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import type { Shortcut } from '../lib/types';

interface CommandFrequency {
  command: string;
  count: number;
  lastUsed: string;
}

export function useAdaptiveEngine() {
  const { state, dispatch, updatePreferences } = useApp();
  const [topCommands, setTopCommands] = useState<CommandFrequency[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const batchRef = useRef<Array<{ event_type: string; event_data: Record<string, unknown>; session_id: string | null }>>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const flushEvents = useCallback(async () => {
    if (batchRef.current.length === 0) return;
    const batch = [...batchRef.current];
    batchRef.current = [];
    await supabase.from('interaction_events').insert(batch);
  }, []);

  const trackEvent = useCallback((eventType: string, eventData: Record<string, unknown> = {}, sessionId?: string | null) => {
    if (!state.preferences.adaptiveEnabled) return;
    batchRef.current.push({
      event_type: eventType,
      event_data: eventData,
      session_id: sessionId || null,
    });
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(flushEvents, 2000);
  }, [state.preferences.adaptiveEnabled, flushEvents]);

  const analyzeCommandFrequency = useCallback(async () => {
    if (document.hidden) return;

    const { data } = await supabase
      .from('interaction_events')
      .select('event_type, event_data, created_at')
      .eq('event_type', 'command_sent')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!data) return;

    const freq = new Map<string, { count: number; lastUsed: string }>();
    for (const event of data) {
      const cmd = (event.event_data as Record<string, string>).command || '';
      if (!cmd) continue;
      const existing = freq.get(cmd);
      if (existing) {
        existing.count++;
      } else {
        freq.set(cmd, { count: 1, lastUsed: event.created_at });
      }
    }

    const sorted = Array.from(freq.entries())
      .map(([command, { count, lastUsed }]) => ({ command, count, lastUsed }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    setTopCommands(sorted);
  }, []);

  const generateSuggestions = useCallback((lastMessages: string[]) => {
    const suggestions: string[] = [];
    const recentText = lastMessages.join(' ').toLowerCase();

    if (recentText.includes('data') || recentText.includes('query') || recentText.includes('results')) {
      suggestions.push('Visualize this data', 'Export to CSV');
    }
    if (recentText.includes('error') || recentText.includes('failed') || recentText.includes('bug')) {
      suggestions.push('Debug this issue', 'Show error details');
    }
    if (recentText.includes('code') || recentText.includes('function') || recentText.includes('implement')) {
      suggestions.push('Run this code', 'Explain the logic', 'Write tests');
    }
    if (recentText.includes('file') || recentText.includes('document') || recentText.includes('create')) {
      suggestions.push('Save to file', 'Open in editor');
    }
    if (suggestions.length === 0) {
      suggestions.push('Tell me more', 'Start a new task');
    }

    setSuggestedActions(suggestions.slice(0, 4));
  }, []);

  const promoteSidebarSection = useCallback((sectionId: string) => {
    if (!state.preferences.adaptiveEnabled) return;
    const sections = [...state.preferences.sidebarSections];
    const idx = sections.indexOf(sectionId);
    if (idx > 0) {
      sections.splice(idx, 1);
      sections.unshift(sectionId);
      updatePreferences({ sidebarSections: sections });
    }
  }, [state.preferences, updatePreferences]);

  const incrementShortcut = useCallback(async (shortcutId: string) => {
    const shortcut = state.shortcuts.find(s => s.id === shortcutId);
    if (!shortcut) return;
    const updated = {
      usage_count: shortcut.usage_count + 1,
      last_used_at: new Date().toISOString(),
    };
    await supabase.from('shortcuts').update(updated).eq('id', shortcutId);
    dispatch({
      type: 'SET_SHORTCUTS',
      payload: state.shortcuts
        .map(s => s.id === shortcutId ? { ...s, ...updated } : s)
        .sort((a, b) => b.usage_count - a.usage_count) as Shortcut[],
    });
  }, [state.shortcuts, dispatch]);

  useEffect(() => {
    const initialTimer = setTimeout(analyzeCommandFrequency, 0);
    const interval = setInterval(analyzeCommandFrequency, 60000);

    const handleVisibilityChange = () => {
      if (!document.hidden) analyzeCommandFrequency();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushEvents();
    };
  }, [analyzeCommandFrequency, flushEvents]);

  return {
    topCommands,
    suggestedActions,
    trackEvent,
    generateSuggestions,
    promoteSidebarSection,
    incrementShortcut,
  };
}
