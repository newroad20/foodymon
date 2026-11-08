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
import { WorldBackdrop } from '@/components/foodymon/WorldBackdrop';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

const PLACEHOLDER_COLOR = '#9CA3AF';

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
      <WorldBackdrop mood="sunset" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>새로운 만남이 시작돼요</Text>
            </View>
            <View style={styles.eggStage}>
              <View style={styles.eggGlow} />
              <HatchEgg taps={0} hatched={false} />
            </View>
            <Text style={styles.appTitle}>나만의 푸디몬 만나기</Text>
            <Text style={styles.appSubtitle}>작은 알이 당신의 하루를 기다리고 있어요</Text>
          </View>

          <View style={styles.card}>
          <Text style={styles.cardEyebrow}>입양 준비</Text>
          <Text style={styles.cardTitle}>먼저 계정을 만들어 주세요</Text>

          <View style={styles.labelRow}>
            <Ionicons name="mail-outline" size={15} color="#5E806F" />
            <Text style={styles.label}>이메일</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="예: example@email.com"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.labelRow}>
            <Ionicons name="lock-closed-outline" size={15} color="#5E806F" />
            <Text style={styles.label}>비밀번호</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="예: 6자 이상 입력"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.labelRow}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#5E806F" />
            <Text style={styles.label}>비밀번호 확인</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="예: 비밀번호 다시 입력"
            placeholderTextColor={PLACEHOLDER_COLOR}
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
              <View style={styles.primaryBtnContent}>
                <Text style={styles.primaryBtnText}>입양 이야기 시작하기</Text>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </View>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Consent({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
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
    backgroundColor: '#FFF7F1',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  heroBadge: {
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#F0DED1',
  },
  heroBadgeText: {
    color: '#806854',
    fontSize: 12,
    fontWeight: '800',
  },
  eggStage: {
    height: 166,
    width: 190,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eggGlow: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: '#FDE6D7',
    borderWidth: 1,
    borderColor: '#F6D6C3',
  },
  appTitle: {
    fontSize: 27,
    color: '#176C57',
    marginTop: 2,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#6F756F',
    marginTop: 5,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E9E3DC',
    shadowColor: '#705A48',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.11,
    shadowRadius: 22,
    elevation: 6,
  },
  cardEyebrow: {
    fontSize: 12,
    color: '#7E897F',
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    color: '#263A31',
    marginBottom: 18,
    textAlign: 'center',
    fontWeight: '900',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: '#52685D',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#DDE7E1',
    borderRadius: 17,
    padding: 14,
    fontSize: 15,
    color: '#243B31',
    marginBottom: 14,
    backgroundColor: '#F8FCFA',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#207C63',
    padding: 16,
    borderRadius: 17,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#145743',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
