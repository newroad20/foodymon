import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { PrivacyPolicy } from '@/app/privacy';
import { Consent } from './RegisterScreen';

/** The two required consents for accounts that skipped the sign-up screen (social login). */
export function ConsentScreen() {
  const { recordConsent, signOut } = useAuth();
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeSensitive, setAgreeSensitive] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [saving, setSaving] = useState(false);
  const ready = agreePrivacy && agreeSensitive;

  const agree = async () => {
    setSaving(true);
    const { error } = await recordConsent();
    setSaving(false);
    if (error) Alert.alert('저장하지 못했어요', '네트워크를 확인하고 다시 시도해 주세요.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>시작하기 전에</Text>
        <Text style={styles.body}>푸디몬을 쓰려면 아래 두 가지에 동의가 필요해요.</Text>
        <Consent
          checked={agreePrivacy}
          onToggle={() => setAgreePrivacy(!agreePrivacy)}
          label="[필수] 개인정보 수집·이용 동의"
        />
        <Consent
          checked={agreeSensitive}
          onToggle={() => setAgreeSensitive(!agreeSensitive)}
          label="[필수] 수면·식사·마음 기록(건강 관련 민감정보) 처리 동의"
        />
        <TouchableOpacity onPress={() => setShowPolicy(true)} accessibilityRole="link">
          <Text style={styles.link}>개인정보 처리방침 전문 보기 →</Text>
        </TouchableOpacity>
        <Text style={styles.note}>만 14세 미만은 보호자의 동의가 필요해요.</Text>
        <TouchableOpacity
          style={[styles.primary, (!ready || saving) && styles.off]}
          onPress={agree}
          disabled={!ready || saving}
          accessibilityRole="button">
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>동의하고 시작하기</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={signOut} accessibilityRole="button">
          <Text style={styles.secondaryText}>동의하지 않고 나가기</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)}>
        <PrivacyPolicy onClose={() => setShowPolicy(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F2F8F4',
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  title: {
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '900',
  },
  body: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '700',
    marginBottom: 6,
  },
  link: {
    marginTop: 6,
    fontSize: 13,
    color: '#1B7F66',
    fontWeight: '800',
  },
  note: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  primary: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#1B7F66',
    alignItems: 'center',
  },
  off: {
    opacity: 0.5,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  secondary: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
});
