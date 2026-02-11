import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useApp } from '../../context/AppContext';

export function AppShell() {
  const { state, updatePreferences } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(state.preferences.sidebarCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    updatePreferences({ sidebarCollapsed: next });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface-0">
      <TopBar onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
      <div className="flex-1 flex overflow-hidden">
        {!isMobile && (
          <Sidebar
            collapsed={sidebarCollapsed}
            width={state.preferences.sidebarWidth}
          />
        )}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {isMobile && !sidebarCollapsed && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={toggleSidebar}
          />
          <div className="fixed top-14 left-0 bottom-0 z-50 animate-slide-in-left">
            <Sidebar collapsed={false} width={280} />
          </div>
        </>
      )}
    </div>
  );
}
