import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SetupWizardPage } from './pages/SetupWizardPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatView } from './components/chat/ChatView';
import { AgentsPage } from './pages/AgentsPage';
import { AgentDashboardPage } from './pages/AgentDashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected setup (outside AppShell for full-screen wizard) */}
            <Route
              path="/setup"
              element={
                <ProtectedRoute>
                  <SetupWizardPage />
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppProvider>
                    <AppShell />
                  </AppProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/chat/:sessionId" element={<ChatView />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/agent-management" element={<AgentDashboardPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
