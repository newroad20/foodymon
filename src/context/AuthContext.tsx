import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { disableReminders } from '@/lib/reminders';
import { deleteAllMealPhotos } from '@/lib/gameApi';
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
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Permanently deletes the account and all its records, then signs out. */
  deleteAccount: () => Promise<{ error: string | null }>;
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

  const signUp = async (email: string, password: string) => {
    // The profile row is created by the on_auth_user_created trigger (supabase/schema.sql);
    // the nickname is asked in onboarding.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (error) return { error: error.message, needsConfirmation: false };
    // With email confirmation on, Supabase hides an existing email by answering with an empty user.
    if (data.user && data.user.identities?.length === 0) {
      return { error: 'User already registered', needsConfirmation: false };
    }
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

  const deleteAccount = async () => {
    const uid = session?.user.id;
    if (!uid) return { error: 'not signed in' };
    // Photos live in Storage, which the account delete doesn't cascade to; stop if they can't go.
    try {
      await deleteAllMealPhotos(uid);
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'photo delete failed' };
    }
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return { error: error.message };
    // Remove this account's cached game state and reminders from the device too.
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys.filter((k) => k.endsWith(uid)));
    } catch {}
    await disableReminders().catch(() => {});
    // The user no longer exists on the server, so only clear the local session.
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
