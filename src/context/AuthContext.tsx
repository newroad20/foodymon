import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { describeAuthLinkError, parseAuthLink } from '@/lib/authLink';

// Where the sign-up confirmation email sends the user back: this app's root
// (foodymon:// in builds, exp://<dev server>/--/ in Expo Go). It must be listed
// under Supabase → Authentication → URL Configuration → Redirect URLs.
const emailRedirectTo = Linking.createURL('/');

/** Signs in with the tokens from a confirmation link that opened the app. */
async function handleAuthLink(url: string | null) {
  if (!url) return;
  const result = parseAuthLink(url);
  if (result.kind === 'error') {
    Alert.alert('이메일 인증', describeAuthLinkError(result.message));
  } else if (result.kind === 'session') {
    const { error } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });
    if (error) Alert.alert('이메일 인증', describeAuthLinkError(error.message));
  }
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** needsConfirmation: false when Supabase signed the user in right away (email confirmation off). */
  signUp: (
    email: string,
    password: string,
    nickname: string
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Confirmation links can open the app cold or while it is running.
    Linking.getInitialURL().then(handleAuthLink);
    const linkSub = Linking.addEventListener('url', ({ url }) => handleAuthLink(url));

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const signUp = async (email: string, password: string, nickname: string) => {
    // The profile row is created by the on_auth_user_created trigger (supabase/schema.sql).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
        emailRedirectTo,
      },
    });

    if (error) return { error: error.message, needsConfirmation: false };
    return { error: null, needsConfirmation: !data.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
