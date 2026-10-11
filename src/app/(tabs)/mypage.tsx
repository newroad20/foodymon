import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { useAuth } from '@/context/AuthContext';
import { levelsData, mealTargetOptions, sleepTargetOptions } from '@/constants/foodymonData';

export default function MyPageScreen() {
  const { state, updateSettings } = useFoodyMon();
  const { user, signOut } = useAuth();

  const [nickname, setNickname] = useState(state.masterName);
  const [targetSleep, setTargetSleep] = useState(state.targetSleep);
  const [targetMeals, setTargetMeals] = useState(state.targetMeals);
  const [saving, setSaving] = useState(false);

  // Follow the saved values when they change elsewhere (e.g. after a server sync).
  useEffect(() => {
    setNickname(state.masterName);
    setTargetSleep(state.targetSleep);
    setTargetMeals(state.targetMeals);
  }, [state.masterName, state.targetSleep, state.targetMeals]);

  const levelInfo = levelsData.find((l) => l.level === state.level) ?? levelsData[2];
  const trimmedName = nickname.trim();
  const dirty =
    trimmedName !== state.masterName ||
    targetSleep !== state.targetSleep ||
    targetMeals !== state.targetMeals;

  const handleSave = async () => {
    if (!trimmedName) {
      Alert.alert('이름을 입력해 주세요', '푸디몬이 마스터를 부를 이름이 필요해요!');
      return;
    }
    setSaving(true);
    const ok = await updateSettings({ nickname: trimmedName, targetSleep, targetMeals });
    setSaving(false);
    Alert.alert(
      ok ? '저장했어요 ✨' : '저장하지 못했어요',
      ok ? '새 목표로 오늘의 건강 지수를 다시 계산했어요.' : '네트워크를 확인하고 다시 시도해 주세요.'
    );
  };

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요? 기록은 계정에 안전하게 저장되어 있어요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>마이페이지</Text>

        {/* Profile */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Image source={levelInfo.image} style={styles.avatar} contentFit="contain" />
            <View style={styles.profileText}>
              <Text style={styles.name}>{state.masterName || '마스터'} 마스터</Text>
              {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
              <Text style={styles.levelBadge}>
                Lv.{levelInfo.level} {levelInfo.name}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat label="연속 기록" value={`🔥 ${state.streak}일`} />
            <Stat label="젤리" value={`✨ ${state.currency}`} />
            <Stat label="방패" value={`🛡️ ${state.shields}`} />
            <Stat label="오늘 지수" value={`${state.currentDailyScore}점`} />
          </View>
        </View>

        {/* Goals */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>내 정보 · 라이프스타일 목표</Text>

          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="푸디몬이 부를 이름"
            maxLength={12}
            returnKeyType="done"
          />

          <Text style={styles.label}>목표 수면 시간</Text>
          <View style={styles.chipRow}>
            {sleepTargetOptions.map((hrs) => (
              <Chip
                key={hrs}
                label={`${hrs}시간`}
                active={targetSleep === hrs}
                onPress={() => setTargetSleep(hrs)}
              />
            ))}
          </View>

          <Text style={styles.label}>하루 목표 끼니</Text>
          <View style={styles.chipRow}>
            {mealTargetOptions.map((m) => (
              <Chip
                key={m}
                label={`${m}끼`}
                active={targetMeals === m}
                onPress={() => setTargetMeals(m)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!dirty || saving) && styles.primaryBtnDisabled]}
            activeOpacity={0.8}
            disabled={!dirty || saving}
            onPress={handleSave}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>저장하기</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>계정</Text>
          <TouchableOpacity style={styles.rowBtn} activeOpacity={0.7} onPress={handleSignOut}>
            <Text style={styles.signOutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>푸디몬 v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      activeOpacity={0.8}
      onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 84,
    height: 84,
  },
  profileText: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  email: {
    fontSize: 13,
    color: '#94A3B8',
  },
  levelBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#EA580C',
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: '#F97316',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  rowBtn: {
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
  },
});
