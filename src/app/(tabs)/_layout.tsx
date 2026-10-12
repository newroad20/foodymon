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
        tabBarInactiveTintColor: '#A8A29E',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E5E5E5', borderTopWidth: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="summary" options={{ title: '요약', tabBarIcon: tabIcon('bar-chart') }} />
      <Tabs.Screen name="mypage" options={{ title: '마이', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
