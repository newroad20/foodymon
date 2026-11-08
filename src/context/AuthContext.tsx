import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { disableReminders } from '@/lib/reminders';
import { deleteAllMealPhotos } from '@/lib/gameApi';
import { EFFECTIVE_DATE } from '@/constants/privacyPolicy';
import { describeAuthLinkError, parseAuthLink } from '@/lib/authLink';

// Where the sign-up confirmation email sends the user back: this app's root
// (foodymon:// in builds, exp://<dev server>/--/ in Expo Go). It must be listed
// under Supabase → Authentication → URL Configuration → Redirect URLs.
const emailRedirectTo = Linking.createURL('/');

/** Signs in with the tokens from an email link that opened the app; reports password-reset links. */
async function handleAuthLink(url: string | null, onRecovery: () => void) {
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
    else if (result.recovery) onRecovery();
  }
}

export type SocialProvider = 'kakao' | 'google' | 'apple';

// Proof of the two required consents (sign-up screen, or the consent screen after a social login).
const consentData = () => ({
  consent_privacy_at: new Date().toISOString(),
  consent_sensitive_at: new Date().toISOString(),
  privacy_version: EFFECTIVE_DATE,
});

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** needsConfirmation: false when Supabase signed the user in right away (email confirmation off). */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Kakao/Google open the provider's page; Apple uses the native sheet on iOS. */
  signInWithProvider: (provider: SocialProvider) => Promise<{ error: string | null }>;
  /** Saves the two required consents for accounts made through a social login. */
  recordConsent: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** True after a password-reset link signed the user in; the app asks for a new password. */
  recovering: boolean;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  /** Permanently deletes the account and all its records, then signs out. */
  deleteAccount: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // On the web supabase-js reads the reset link itself and reports it this way.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Confirmation links can open the app cold or while it is running.
    const onRecovery = () => setRecovering(true);
    Linking.getInitialURL().then((url) => handleAuthLink(url, onRecovery));
    const linkSub = Linking.addEventListener('url', ({ url }) => handleAuthLink(url, onRecovery));

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
      options: {
        emailRedirectTo,
        data: consentData(),
      },
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

  const signInWithProvider = async (provider: SocialProvider) => {
    try {
      if (provider === 'apple' && Platform.OS === 'ios') {
        const cred = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!cred.identityToken) return { error: 'Apple did not return a token' };
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
        return { error: error?.message ?? null };
      }
      // The web follows the redirect itself; apps open a browser sheet and read the tokens it returns.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: emailRedirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
      });
      if (error) return { error: error.message };
      if (Platform.OS !== 'web') {
        const res = await WebBrowser.openAuthSessionAsync(data.url, emailRedirectTo);
        if (res.type === 'success') await handleAuthLink(res.url, () => {});
      }
      return { error: null };
    } catch (e: any) {
      // Closing the Apple sheet is not an error.
      if (e?.code === 'ERR_REQUEST_CANCELED') return { error: null };
      return { error: e instanceof Error ? e.message : 'sign-in failed' };
    }
  };

  const recordConsent = async () => {
    const { error } = await supabase.auth.updateUser({ data: consentData() });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirectTo });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecovering(false);
    return { error: error?.message ?? null };
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
    <AuthContext.Provider value={{
        session,
        user,
        loading,
        recovering,
        signUp,
        signIn,
        signInWithProvider,
        recordConsent,
        signOut,
        requestPasswordReset,
        updatePassword,
        deleteAccount,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
