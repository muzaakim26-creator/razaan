import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { AppConfigStatus, UserProfile } from '../types';
import { apiFetch, fetchConfigStatus, getSupabaseClient } from '../lib/supabase';

interface AuthContextValue {
  configStatus: AppConfigStatus | null;
  supabase: SupabaseClient | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshConfigStatus: () => Promise<AppConfigStatus>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [configStatus, setConfigStatus] = useState<AppConfigStatus | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfileForSession = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.access_token) {
      setProfile(null);
      return;
    }
    try {
      const data = await apiFetch<{ profile: UserProfile }>(
        '/api/auth/me',
        activeSession.access_token
      );
      setProfile(data.profile);
      setAuthError(null);
    } catch (err) {
      setProfile(null);
      setAuthError(err instanceof Error ? err.message : 'Gagal memuat profil pengguna.');
    }
  }, []);

  const refreshConfigStatus = useCallback(async () => {
    const status = await fetchConfigStatus();
    setConfigStatus(status);
    if (status.configured && status.supabaseUrl && status.supabaseAnonKey) {
      const client = getSupabaseClient(status.supabaseUrl, status.supabaseAnonKey);
      setSupabase(client);
      return status;
    }
    setSupabase(null);
    return status;
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function init() {
      try {
        const status = await fetchConfigStatus();
        if (!mounted) return;
        setConfigStatus(status);

        if (!status.configured || !status.supabaseUrl || !status.supabaseAnonKey) {
          setLoading(false);
          return;
        }

        const client = getSupabaseClient(status.supabaseUrl, status.supabaseAnonKey);
        setSupabase(client);

        const {
          data: { session: initialSession },
        } = await client.auth.getSession();

        if (!mounted) return;
        setSession(initialSession);
        if (initialSession) {
          await loadProfileForSession(initialSession);
        }

        const { data: listener } = client.auth.onAuthStateChange(
          async (_event, nextSession) => {
            if (!mounted) return;
            setSession(nextSession);
            if (nextSession) {
              await loadProfileForSession(nextSession);
            } else {
              setProfile(null);
            }
          }
        );

        unsubscribe = () => listener.subscription.unsubscribe();
      } catch (err) {
        if (mounted) {
          setAuthError(
            err instanceof Error ? err.message : 'Gagal menginisialisasi autentikasi.'
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [loadProfileForSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        throw new Error('Koneksi Supabase belum tersedia.');
      }
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.session) {
        throw new Error(error?.message || 'Email atau kata sandi salah.');
      }
      setSession(data.session);
      await loadProfileForSession(data.session);
    },
    [supabase, loadProfileForSession]
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
    setAuthError(null);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    await loadProfileForSession(session);
  }, [session, loadProfileForSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configStatus,
      supabase,
      session,
      profile,
      loading,
      authError,
      signIn,
      signOut,
      refreshProfile,
      refreshConfigStatus,
    }),
    [
      configStatus,
      supabase,
      session,
      profile,
      loading,
      authError,
      signIn,
      signOut,
      refreshProfile,
      refreshConfigStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
