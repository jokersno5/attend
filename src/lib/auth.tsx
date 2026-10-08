import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from './supabase';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('[Auth] getSession error:', error.message);
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] onAuthStateChange:', event, newSession ? 'has session' : 'no session');
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error('[Auth] Profile fetch error:', error.message, 'code:', error.code);
        } else {
          console.log('[Auth] Profile loaded:', data ? 'found' : 'not found');
          if (data) {
            setProfile(data);
          } else {
            // Profile might not exist yet if the trigger hasn't completed.
            // Retry once after a short delay.
            setTimeout(async () => {
              if (cancelled) return;
              const retry = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              if (!cancelled) {
                if (retry.error) {
                  console.error('[Auth] Profile retry error:', retry.error.message);
                } else if (retry.data) {
                  console.log('[Auth] Profile loaded on retry');
                  setProfile(retry.data);
                } else {
                  console.warn('[Auth] Profile not found after retry — trigger may have failed');
                }
                setLoading(false);
              }
            }, 1000);
            return;
          }
        }
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] signIn attempt:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] signIn error:', error.message, 'status:', error.status);
      return { error: error.message };
    }
    console.log('[Auth] signIn success:', data.user?.id);
    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    console.log('[Auth] signUp attempt:', email, 'name:', name);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      console.error('[Auth] signUp error:', error.message, 'status:', error.status);
      return { error: error.message };
    }
    if (!data.user) {
      console.error('[Auth] signUp: no user returned');
      return { error: 'アカウントの作成に失敗しました' };
    }

    console.log('[Auth] signUp success, user id:', data.user.id, 'session:', data.session ? 'auto-logged in' : 'no auto session');

    // If email confirmation is disabled in Supabase, signUp returns a session automatically.
    // If email confirmation is enabled, there will be no session — we attempt auto-login.
    if (!data.session) {
      console.log('[Auth] No session after signUp — attempting auto sign-in');
      const signInResult = await supabase.auth.signInWithPassword({ email, password });
      if (signInResult.error) {
        console.error('[Auth] Auto sign-in after signUp failed:', signInResult.error.message);
        // Return a helpful message — account was created but login needs to be done manually
        return {
          error: 'アカウントは作成されましたが、自動ログインに失敗しました。ログイン画面からログインしてください。',
        };
      }
      console.log('[Auth] Auto sign-in after signUp succeeded');
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    const storageKey = 'baseball-team-auth';
    localStorage.removeItem(storageKey);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') && key.includes('auth-token')) {
        localStorage.removeItem(key);
      }
    });
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
