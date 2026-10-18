import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FoodyMonProvider } from '@/context/FoodyMonContext';
import { MusicProvider } from '@/context/MusicContext';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { RegisterScreen } from '@/components/auth/RegisterScreen';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { session, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B7F66" />
      </View>
    );
  }

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF5F5',
  },
});
