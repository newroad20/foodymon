import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EFFECTIVE_DATE, OPERATOR, privacySections } from '@/constants/privacyPolicy';

/** 개인정보 처리방침. Opens without logging in (foodymon.expo.app/privacy) for the stores. */
export default function PrivacyScreen() {
  return <PrivacyPolicy onClose={router.canGoBack() ? () => router.back() : undefined} />;
}

/** The policy text; sign-up shows it in a modal so going back never leaves the form. */
export function PrivacyPolicy({ onClose }: { onClose?: () => void }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {onClose && (
          <TouchableOpacity onPress={onClose} accessibilityRole="button">
            <Text style={styles.back}>← 돌아가기</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>푸디몬 개인정보 처리방침</Text>
        <Text style={styles.meta}>
          운영자 {OPERATOR} · 시행일 {EFFECTIVE_DATE}
        </Text>
        {privacySections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.heading}>{s.title}</Text>
            {s.body.map((line) => (
              <Text key={line} style={styles.body}>
                {line}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F8F4',
  },
  content: {
    padding: 20,
    gap: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    fontSize: 14,
    color: '#17765D',
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    color: '#1E293B',
    fontWeight: '900',
  },
  meta: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  section: {
    gap: 6,
  },
  heading: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
  },
  body: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 21,
  },
});
