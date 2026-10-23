import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PrivacyPolicy } from '@/app/privacy';
import { HatchEgg } from '@/components/foodymon/HatchEgg';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeSensitive, setAgreeSensitive] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreePrivacy || !agreeSensitive) {
      Alert.alert('동의가 필요해요', '필수 항목 두 가지에 동의해야 가입할 수 있어요.');
      return;
    }

    setLoading(true);
    const { error, needsConfirmation } = await signUp(email.trim(), password);
    setLoading(false);

    if (error) {
      if (error.includes('already registered')) {
        Alert.alert('이미 가입된 이메일이에요', '로그인 화면에서 이 이메일로 로그인해 주세요.');
      } else {
        Alert.alert('가입 실패', error);
      }
    } else if (needsConfirmation) {
      Alert.alert(
        '🎉 가입 완료!',
        `환영합니다!\n이 폰에서 인증 메일의 링크를 누르면 앱이 열리면서 바로 로그인돼요.\n(받은 편지함 또는 스팸함을 확인하세요)`,
        [{ text: '확인', onPress: onSwitchToLogin }]
      );
    }
    // Otherwise the user is already signed in and the app moves on to onboarding.
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        {/* Mascot */}
        <View style={styles.heroSection}>
          {/* The pet hatches from this egg at the end of onboarding. */}
          <HatchEgg taps={0} hatched={false} />
          <Text style={styles.appTitle}>푸디몬 입양하기</Text>
          <Text style={styles.appSubtitle}>함께 건강한 일상을 만들어봐요 🌱</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>회원가입</Text>

          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="6자 이상"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>비밀번호 확인</Text>
          <TextInput
            style={styles.input}
            placeholder="비밀번호 다시 입력"
            placeholderTextColor="#94A3B8"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
          />

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
            <Text style={styles.policyLink}>개인정보 처리방침 전문 보기 →</Text>
          </TouchableOpacity>
          <Text style={styles.policyNote}>만 14세 미만은 보호자의 동의가 필요해요.</Text>
          <Modal visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)}>
            <PrivacyPolicy onClose={() => setShowPolicy(false)} />
          </Modal>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>푸디몬 입양하기 🥰</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onSwitchToLogin}>
            <Text style={styles.secondaryBtnText}>
              이미 계정이 있으신가요? <Text style={styles.linkText}>로그인</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Consent({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <TouchableOpacity
      style={styles.consent}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? '#1B7F66' : '#94A3B8'} />
      <Text style={styles.consentText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  consent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  policyLink: {
    fontSize: 13,
    color: '#17765D',
    fontWeight: '800',
    paddingVertical: 6,
  },
  policyNote: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appTitle: {
    fontSize: 26,
    color: '#1B7F66',
    marginTop: 8,
    fontWeight: '900',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  cardTitle: {
    fontSize: 22,
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '900',
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 14,
    backgroundColor: '#F8FAFC',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#1B7F66',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  linkText: {
    color: '#1B7F66',
    fontWeight: '800',
  },
});
