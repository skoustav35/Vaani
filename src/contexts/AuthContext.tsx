import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import supabase from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  avatarUrl: string;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  displayName: '',
  avatarUrl: '',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const email = user?.email || '';
  const displayName = (user?.user_metadata?.full_name as string | undefined) || email.split('@')[0] || 'Seeker';
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (email ? `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(email)}` : '');

  return (
    <AuthContext.Provider value={{ user, session, loading, displayName, avatarUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
