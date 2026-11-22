import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { HintInput } from '@/components/HintInput';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth, type SocialProvider } from '@/context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { WorldBackdrop } from '@/components/foodymon/WorldBackdrop';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

export function LoginScreen({ onSwitchToRegister }: LoginScreenProps) {
  const { signIn, signInWithProvider, requestPasswordReset } = useAuth();
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

  const handleSocial = async (provider: SocialProvider) => {
    setLoading(true);
    const { error } = await signInWithProvider(provider);
    setLoading(false);
    if (error) Alert.alert('로그인 실패', '잠시 후 다시 시도해 주세요.');
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
              <Ionicons name="mail-outline" size={19} color="#64748B" />
              <HintInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={19} color="#64748B" />
              <HintInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor="#64748B"
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
            <Text style={styles.dividerText}>간편 로그인</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialList}>
            <TouchableOpacity
              style={[styles.socialBtn, styles.kakaoBtn]}
              onPress={() => handleSocial('kakao')}
              disabled={loading}
              accessibilityRole="button">
              <Ionicons name="chatbubble" size={18} color="#191919" />
              <Text style={styles.kakaoText}>카카오 로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialBtn, styles.googleBtn]}
              onPress={() => handleSocial('google')}
              disabled={loading}
              accessibilityRole="button">
              <Ionicons name="logo-google" size={18} color="#1F1F1F" />
              <Text style={styles.googleText}>Google로 계속하기</Text>
            </TouchableOpacity>
            {/* Apple's own button, as App Review expects; iOS only. */}
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.appleBtn}
                onPress={() => handleSocial('apple')}
              />
            )}
          </View>

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
    borderCurve: 'continuous',
    backgroundColor: '#E3F6EF',
    color: '#1B7F66',
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
    backgroundColor: '#F2F8F4',
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
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#B5E6D4',
    marginBottom: 6,
  },
  heroBadgeText: {
    color: '#64748B',
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
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#E3F6EF',
    borderWidth: 1,
    borderColor: '#B5E6D4',
  },
  groundShadow: {
    position: 'absolute',
    bottom: 5,
    width: 86,
    height: 12,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(51, 92, 73, 0.13)',
  },
  petImage: {
    width: 165,
    height: 165,
    zIndex: 1,
  },
  appTitle: {
    fontSize: 34,
    color: '#1B7F66',
    marginTop: 2,
    letterSpacing: -1.2,
    fontWeight: '900',
  },
  appSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 5,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 28,
    borderCurve: 'continuous',
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#426454',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
  cardEyebrow: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    color: '#1E293B',
    marginBottom: 18,
    textAlign: 'center',
    fontWeight: '900',
  },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 15,
    marginBottom: 11,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#1B7F66',
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    marginTop: 5,
    borderBottomWidth: 4,
    borderBottomColor: '#125A48',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
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
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  socialList: {
    gap: 10,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  kakaoBtn: {
    backgroundColor: '#FEE500',
  },
  kakaoText: {
    color: '#191919',
    fontSize: 15,
    fontWeight: '800',
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  googleText: {
    color: '#1F1F1F',
    fontSize: 15,
    fontWeight: '800',
  },
  appleBtn: {
    height: 48,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  linkText: {
    color: '#1B7F66',
    fontWeight: '800',
  },
});
