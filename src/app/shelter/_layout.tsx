import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { color } from '@/constants/theme';

/** 마음 쉼터: a modal with its own stack. The menu closes it; activities go back to the menu. */
export default function ShelterLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.bg },
        headerShadowVisible: false,
        headerBackTitle: '쉼터',
        headerTintColor: color.accent,
        headerTitleStyle: { color: color.ink },
        contentStyle: { backgroundColor: color.bg },
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: '마음 쉼터',
          headerRight: () => (
            // The menu is the first screen here, so back leaves the modal.
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="닫기">
              <Ionicons name="close" size={24} color={color.muted} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="nibble" options={{ title: '냠냠' }} />
      <Stack.Screen name="surf" options={{ title: '15분 파도타기' }} />
      <Stack.Screen name="weather" options={{ title: '한 줄 마음 날씨' }} />
    </Stack>
  );
}
