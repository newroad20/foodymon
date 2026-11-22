import React from 'react';
import { ColorValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon = (name: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? name : (`${name}-outline` as IconName)} size={26} color={color} />;
  };

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1B7F66',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#F8FAFC',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '800' },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="summary" options={{ title: '요약', tabBarIcon: tabIcon('bar-chart') }} />
      <Tabs.Screen name="mypage" options={{ title: '마이', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
