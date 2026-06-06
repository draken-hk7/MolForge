import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { identify, track } from '../lib/telemetry';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const loadProfile = useCallback(async (nextSession) => {
    if (!nextSession?.access_token) {
      setProfile(null);
      return;
    }
    try {
      const { data } = await api.get('/api/auth/me');
      setProfile(data.profile || null);
      identify({ ...data, profile: data.profile });
    } catch {
      const { data } = await supabase.from('profiles').select('*').eq('id', nextSession.user.id).maybeSingle();
      const nextProfile = data || { tier: 'free', full_name: nextSession.user?.user_metadata?.full_name };
      setProfile(nextProfile);
      identify({ ...nextSession.user, profile: nextProfile });
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session).finally(() => setLoading(false));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase Auth is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthModalOpen(false);
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    if (!supabase) throw new Error('Supabase Auth is not configured.');
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw error;
    track('user_signed_up', { method: 'email' });
  }, []);

  const magicLink = useCallback(async (email) => {
    if (!supabase) throw new Error('Supabase Auth is not configured.');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) throw error;
  }, []);

  const oauth = useCallback(async (provider) => {
    if (!supabase) throw new Error('Supabase Auth is not configured.');
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      configured: supabaseConfigured,
      session,
      user: session?.user || null,
      profile,
      loading,
      authModalOpen,
      openAuth: () => setAuthModalOpen(true),
      closeAuth: () => setAuthModalOpen(false),
      signIn,
      signUp,
      magicLink,
      oauth,
      signOut,
      refreshProfile: () => loadProfile(session)
    }),
    [authModalOpen, loadProfile, loading, magicLink, oauth, profile, session, signIn, signOut, signUp]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
