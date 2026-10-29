import '@/lib/webAlert';
import React, { useEffect, useState } from 'react';
import { Slot, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FoodyMonProvider } from '@/context/FoodyMonContext';
import { MusicProvider } from '@/context/MusicContext';
import { NightOverlay } from '@/components/foodymon/NightOverlay';
import { ParentalGateProvider } from '@/context/ParentalGateContext';
import { setAnalyticsUser, track } from '@/lib/analytics';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { RegisterScreen } from '@/components/auth/RegisterScreen';
import { NewPasswordScreen } from '@/components/auth/NewPasswordScreen';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { session, loading, recovering } = useAuth();
  const pathname = usePathname();
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  // Usage log for the pilot: opens/closes and screen changes of a signed-in user.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    setAnalyticsUser(userId);
    if (!userId) return;
    track('app_open');
    const sub = AppState.addEventListener('change', (s) =>
      s === 'active' ? track('app_open') : s === 'background' && track('app_close')
    );
    return () => sub.remove();
  }, [userId]);
  useEffect(() => {
    if (userId) track('screen', pathname);
  }, [userId, pathname]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B7F66" />
      </View>
    );
  }

  // The privacy policy must open for everyone (store review, sign-up consent).
  if (pathname === '/privacy') return <Slot />;

  // A password-reset link signed the user in: ask for the new password first.
  if (session && recovering) return <NewPasswordScreen />;

  // Not logged in — show Login or Register screen
  if (!session) {
    if (showRegister) {
      return <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />;
  }

  // Logged in — show the main Foody-Mon app
  return (
    // key: start fresh when a different account logs in
    <FoodyMonProvider key={session.user.id} userId={session.user.id}>
      <MusicProvider>
        <ParentalGateProvider>
        {/* The night after a sleep check-in covers every screen, tab bar included. */}
        <View style={styles.fill}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="collection"
              options={{
                headerShown: true,
                title: '컬렉션 도감',
                headerBackTitle: '마이',
                headerStyle: { backgroundColor: '#FDF5F5' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="day/[date]"
              options={{
                headerShown: true,
                headerBackTitle: '요약',
                headerStyle: { backgroundColor: '#FDF5F5' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="help"
              options={{
                headerShown: true,
                title: '도움 받기',
                headerBackTitle: '뒤로',
                headerStyle: { backgroundColor: '#FDF5F5' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="album"
              options={{
                headerShown: true,
                title: '식사 앨범',
                headerBackTitle: '마이',
                headerStyle: { backgroundColor: '#FDF5F5' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="dressroom"
              options={{
                headerShown: true,
                title: '꾸미기',
                headerBackTitle: '홈',
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="share"
              options={{
                headerShown: true,
                title: '자랑하기',
                headerBackTitle: '요약',
                headerStyle: { backgroundColor: '#FDF5F5' },
                headerShadowVisible: false,
              }}
            />
          </Stack>
          <NightOverlay />
        </View>
        </ParentalGateProvider>
      </MusicProvider>
    </FoodyMonProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF5F5',
  },
});
