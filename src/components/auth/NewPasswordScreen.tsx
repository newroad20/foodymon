import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { HintInput } from '@/components/HintInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

/** Shown after a password-reset link signed the user in. */
export function NewPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 해요.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('알림', '두 비밀번호가 같지 않아요.');
      return;
    }
    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);
    Alert.alert(
      '새 비밀번호',
      error ? '바꾸지 못했어요. 링크를 다시 받아 시도해 주세요.' : '비밀번호를 바꿨어요. 다시 만나서 반가워!'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>새 비밀번호 정하기</Text>
        <HintInput
          style={styles.input}
          placeholder="새 비밀번호 (6자 이상)"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <HintInput
          style={styles.input}
          placeholder="새 비밀번호 다시 입력"
          placeholderTextColor="#94A3B8"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />
        <TouchableOpacity style={[styles.btn, saving && styles.btnOff]} disabled={saving} onPress={save}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>바꾸기</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FDF5F5',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    fontWeight: '600',
  },
  btn: {
    backgroundColor: '#1B7F66',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnOff: {
    opacity: 0.5,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
