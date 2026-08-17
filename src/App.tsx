import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { handleGoogleRedirect } from './lib/googleAuth';
import { useChatUI, applyThemeClass } from './store/chatStore';
import ProtectedRoute from './components/ProtectedRoute';
import { MandalaScreen } from './components/MandalaSpinner';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import LandingVaani from './pages/LandingVaani';

handleGoogleRedirect();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 8_000, retry: 1, refetchOnWindowFocus: false },
  },
});
// debug probe for cache inspection (harmless read-only handle)
if (typeof window !== 'undefined') (window as unknown as { __qc: unknown }).__qc = queryClient;

function ThemeBootstrap() {
  const dark = useChatUI((s) => s.dark);
  useEffect(() => { applyThemeClass(dark); }, [dark]);
  return null;
}

/** '/' shows the landing to wanderers, walks members straight into the ashram. */
function LandingGate() {
  const { user, loading } = useAuth();
  if (loading) return <MandalaScreen label="Calling you by name…" />;
  if (user) return <Navigate to="/app" replace />;
  return <LandingVaani />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeBootstrap />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingGate />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
