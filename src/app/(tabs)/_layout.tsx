import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';

const tabIcon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
  };

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#A8A29E',
        tabBarStyle: { backgroundColor: '#FFFBF5', borderTopColor: '#F5E6D3' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('🏠') }} />
      <Tabs.Screen name="mypage" options={{ title: '마이', tabBarIcon: tabIcon('👤') }} />
    </Tabs>
  );
}
