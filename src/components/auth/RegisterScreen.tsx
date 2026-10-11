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

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const { signUp } = useAuth();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해 주세요.');
      return;
    }
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

    setLoading(true);
    const { error, needsConfirmation } = await signUp(email.trim(), password, nickname.trim());
    setLoading(false);

    if (error) {
      if (error.includes('already registered')) {
        Alert.alert('가입 실패', '이미 사용 중인 이메일입니다.');
      } else {
        Alert.alert('가입 실패', error);
      }
    } else if (needsConfirmation) {
      Alert.alert(
        '🎉 가입 완료!',
        `${nickname} 마스터, 환영합니다!\n이 폰에서 인증 메일의 링크를 누르면 앱이 열리면서 바로 로그인돼요.\n(받은 편지함 또는 스팸함을 확인하세요)`,
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
          <Image
            source={require('@/assets/images/level1.png')}
            style={styles.petImage}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>푸디몬 입양하기</Text>
          <Text style={styles.appSubtitle}>함께 건강한 일상을 만들어봐요 🌱</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>회원가입</Text>

          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={styles.input}
            placeholder="마스터 닉네임 (예: 새길)"
            placeholderTextColor="#94A3B8"
            value={nickname}
            onChangeText={setNickname}
            maxLength={12}
          />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
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
  petImage: {
    width: 130,
    height: 130,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#3B82F6',
    marginTop: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
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
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
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
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    color: '#64748B',
  },
  linkText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
});
