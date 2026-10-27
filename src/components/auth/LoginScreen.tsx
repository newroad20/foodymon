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
import Ionicons from '@expo/vector-icons/Ionicons';
import { WorldBackdrop } from '@/components/foodymon/WorldBackdrop';

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
      <WorldBackdrop />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>오늘도 같이 자라요</Text>
            </View>
            <View style={styles.petStage}>
              <View style={styles.petGlow} />
              <Text style={styles.stageSparkle}>✦</Text>
              <Image
                source={require('@/assets/images/level3.png')}
                style={styles.petImage}
                resizeMode="contain"
              />
              <View style={styles.groundShadow} />
            </View>
            <Text style={styles.appTitle}>푸디몬</Text>
            <Text style={styles.appSubtitle}>나의 하루를 나누면, 우리 사이도 자라나요</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>다시 만나서 반가워요</Text>
            <Text style={styles.cardTitle}>푸디몬이 기다리고 있어요</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={19} color="#5E806F" />
              <TextInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor="#9AA8A1"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={19} color="#5E806F" />
              <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor="#9AA8A1"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.primaryBtnContent}>
                <Text style={styles.primaryBtnText}>내 푸디몬 만나러 가기</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
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
    backgroundColor: '#F2FAF6',
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
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#D8EDE4',
    marginBottom: 6,
  },
  heroBadgeText: {
    color: '#477361',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  petStage: {
    width: 190,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  petGlow: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#D9F2E7',
    borderWidth: 1,
    borderColor: '#C7E9DC',
  },
  stageSparkle: {
    position: 'absolute',
    right: 12,
    top: 20,
    color: '#E7AD4B',
    fontSize: 18,
    zIndex: 2,
  },
  groundShadow: {
    position: 'absolute',
    bottom: 5,
    width: 86,
    height: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(51, 92, 73, 0.13)',
  },
  petImage: {
    width: 165,
    height: 165,
    zIndex: 1,
  },
  appTitle: {
    fontSize: 35,
    color: '#176C57',
    marginTop: 2,
    letterSpacing: -1.2,
    fontWeight: '900',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#61756B',
    marginTop: 5,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#DCEBE4',
    shadowColor: '#426454',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
  cardEyebrow: {
    color: '#6C877A',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    color: '#263A31',
    marginBottom: 18,
    textAlign: 'center',
    fontWeight: '900',
  },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: '#D9E7E0',
    borderRadius: 17,
    paddingHorizontal: 15,
    marginBottom: 11,
    backgroundColor: '#F8FCFA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#243B31',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#207C63',
    padding: 16,
    borderRadius: 17,
    alignItems: 'center',
    marginTop: 5,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDE9E3',
  },
  dividerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 6,
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
