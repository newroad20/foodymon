import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

export function LoginScreen({ onSwitchToRegister }: LoginScreenProps) {
  const { signIn, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Shown on the screen itself: browser pop-ups can be blocked (e.g. in-app browsers).
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('로그인 실패', '이메일 또는 비밀번호를 확인해 주세요.');
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      setForgotMsg('위 이메일 칸에 가입한 이메일을 먼저 적고 다시 눌러 주세요.');
      return;
    }
    setForgotMsg('메일을 보내는 중이에요…');
    const { error } = await requestPasswordReset(email.trim());
    setForgotMsg(
      error
        ? '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.'
        : `${email.trim()}로 비밀번호를 다시 정하는 링크를 보냈어요. 이 기기에서 메일의 링크를 눌러 주세요. (스팸함도 확인해 주세요)`
    );
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
          <Image
            source={require('@/assets/images/level3.png')}
            style={styles.petImage}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>푸디몬</Text>
          <Text style={styles.appSubtitle}>당신의 일상과 함께 자라나는 펫 🌱</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>로그인</Text>

          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>로그인</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgot} accessibilityRole="button">
            <Text style={styles.forgot}>비밀번호를 잊었어요</Text>
          </TouchableOpacity>
          {forgotMsg && (
            <Text style={styles.forgotMsg} accessibilityLiveRegion="polite">
              {forgotMsg}
            </Text>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onSwitchToRegister}>
            <Text style={styles.secondaryBtnText}>
              아직 계정이 없으신가요? <Text style={styles.linkText}>회원가입</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  forgotMsg: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#E3F6EF',
    color: '#17765D',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  forgot: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 12,
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
    marginBottom: 32,
  },
  petImage: {
    width: 150,
    height: 150,
  },
  appTitle: {
    fontSize: 36,
    color: '#1B7F66',
    marginTop: 8,
    letterSpacing: -1,
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
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#1B7F66',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
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
