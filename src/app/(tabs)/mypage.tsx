import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { HintInput } from '@/components/HintInput';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { useAuth } from '@/context/AuthContext';
import { useMusic } from '@/context/MusicContext';
import { parseBirthYear } from '@/lib/age';
import {
  disableReminders,
  enableReminders,
  remindersEnabled,
  remindersSupported,
} from '@/lib/reminders';
import { levelsData, mealTargetOptions, sleepTargetOptions } from '@/constants/foodymonData';

export default function MyPageScreen() {
  const { state, updateSettings } = useFoodyMon();
  const { user, signOut, deleteAccount } = useAuth();
  const { musicOn, setMusicOn } = useMusic();
  const [remindersOn, setRemindersOn] = useState(false);

  useEffect(() => {
    remindersEnabled().then(setRemindersOn).catch(() => {});
  }, []);

  const toggleReminders = async (on: boolean) => {
    setRemindersOn(on);
    try {
      if (!on) return await disableReminders();
      if (await enableReminders()) return;
      setRemindersOn(false);
      Alert.alert('알림이 꺼져 있어요', '휴대폰 설정 → 푸디몬(또는 Expo Go) → 알림을 허용해 주세요.');
    } catch {
      setRemindersOn(!on);
    }
  };

  const [nickname, setNickname] = useState(state.masterName);
  const [birthText, setBirthText] = useState(state.birthYear ? String(state.birthYear) : '');
  const [targetSleep, setTargetSleep] = useState(state.targetSleep);
  const [targetMeals, setTargetMeals] = useState(state.targetMeals);
  const [saving, setSaving] = useState(false);

  // Follow the saved values when they change elsewhere (e.g. after a server sync).
  useEffect(() => {
    setNickname(state.masterName);
    setBirthText(state.birthYear ? String(state.birthYear) : '');
    setTargetSleep(state.targetSleep);
    setTargetMeals(state.targetMeals);
  }, [state.masterName, state.birthYear, state.targetSleep, state.targetMeals]);

  const levelInfo = levelsData.find((l) => l.level === state.level) ?? levelsData[2];
  const trimmedName = nickname.trim();
  const dirty =
    trimmedName !== state.masterName ||
    birthText !== (state.birthYear ? String(state.birthYear) : '') ||
    targetSleep !== state.targetSleep ||
    targetMeals !== state.targetMeals;

  const handleSave = async () => {
    if (!trimmedName) {
      Alert.alert('이름을 입력해 주세요', '푸디몬이 마스터를 부를 이름이 필요해요!');
      return;
    }
    const birthYear = birthText.trim() ? parseBirthYear(birthText) : null;
    if (birthText.trim() && birthYear === null) {
      Alert.alert('태어난 연도를 확인해 주세요', '네 자리 연도로 적어 주세요. (예: 2012)');
      return;
    }
    setSaving(true);
    const ok = await updateSettings({
      nickname: trimmedName,
      birthYear,
      targetSleep,
      targetMeals,
    });
    setSaving(false);
    Alert.alert(
      ok ? '저장했어요' : '저장하지 못했어요',
      ok
        ? '저장했어요.'
        : '네트워크를 확인하고 다시 시도해 주세요.'
    );
  };

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요? 기록은 계정에 안전하게 저장되어 있어요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴하면 푸디몬, 모든 기록, 젤리와 아이템이 영구히 지워지고 되돌릴 수 없어요. 정말 탈퇴할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error && error !== 'canceled') Alert.alert('탈퇴하지 못했어요', '네트워크를 확인하고 다시 시도해 주세요.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
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
            <Stat label="연속 기록" value={`${state.streak}일`} />
            <Stat label="젤리" value={`${state.currency}`} />
            <Stat label="방패" value={`${state.shields}`} />
            <Stat label="누적 성장점" value={`${state.growthTotal}점`} />
          </View>
        </View>

        {/* Goals */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>내 정보 · 요즘 내 생활</Text>

          <Text style={styles.label}>이름</Text>
          <HintInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="푸디몬이 부를 이름"
            placeholderTextColor="#94A3B8"
            maxLength={12}
            returnKeyType="done"
          />

          <Text style={styles.label}>태어난 연도</Text>
          <HintInput
            style={styles.input}
            value={birthText}
            onChangeText={setBirthText}
            placeholder="예: 2012 (나이에 맞는 잠 시간 안내용)"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={4}
          />

          <Text style={styles.label}>요즘 수면 시간</Text>
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

          <Text style={styles.label}>요즘 하루 끼니</Text>
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

        {/* Collection */}
        <TouchableOpacity
          style={[styles.card, styles.linkCard]}
          activeOpacity={0.8}
          onPress={() => router.push('/collection')}>
          <Ionicons name="library" size={26} color="#1B7F66" />
          <View style={styles.linkText}>
            <Text style={styles.sectionTitleInline}>컬렉션 도감</Text>
            <Text style={styles.linkSub}>진화 도감 · 의상/소품 · 배지와 방패</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Help */}
        <TouchableOpacity
          style={[styles.card, styles.linkCard]}
          activeOpacity={0.8}
          onPress={() => router.push('/help')}>
          <Ionicons name="help-buoy" size={26} color="#1B7F66" />
          <View style={styles.linkText}>
            <Text style={styles.sectionTitleInline}>도움 받기</Text>
            <Text style={styles.linkSub}>힘들 때 연락할 수 있는 곳</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Meal photo album */}
        <TouchableOpacity
          style={[styles.card, styles.linkCard]}
          activeOpacity={0.8}
          onPress={() => router.push('/album')}>
          <Ionicons name="images" size={26} color="#1B7F66" />
          <View style={styles.linkText}>
            <Text style={styles.sectionTitleInline}>식사 앨범</Text>
            <Text style={styles.linkSub}>사진으로 남긴 식사를 모아 봐요</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Sound */}
        <View style={[styles.card, styles.linkCard]}>
          <Ionicons name={musicOn ? 'musical-notes' : 'volume-mute'} size={26} color="#1B7F66" />
          <View style={styles.linkText}>
            <Text style={styles.sectionTitleInline}>배경음악</Text>
            <Text style={styles.linkSub}>숲의 노래를 켜고 꺼요</Text>
          </View>
          <Switch
            value={musicOn}
            onValueChange={setMusicOn}
            trackColor={{ true: '#1B7F66' }}
            accessibilityLabel="배경음악"
          />
        </View>

        {remindersSupported && (
          <View style={[styles.card, styles.linkCard]}>
            <Ionicons
              name={remindersOn ? 'notifications' : 'notifications-off'}
              size={26}
              color="#1B7F66"
            />
            <View style={styles.linkText}>
              <Text style={styles.sectionTitleInline}>알림</Text>
              <Text style={styles.linkSub}>아침 9시 · 저녁 8시에 푸디몬이 질문을 건네요</Text>
            </View>
            <Switch
              value={remindersOn}
              onValueChange={toggleReminders}
              trackColor={{ true: '#1B7F66' }}
              accessibilityLabel="알림"
            />
          </View>
        )}

        <TouchableOpacity onPress={() => router.push('/privacy')} accessibilityRole="link">
          <Text style={styles.policyLink}>개인정보 처리방침</Text>
        </TouchableOpacity>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>계정</Text>
          <TouchableOpacity style={styles.rowBtn} activeOpacity={0.7} onPress={handleSignOut}>
            <Text style={styles.signOutText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowBtn} activeOpacity={0.7} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>회원 탈퇴</Text>
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
    backgroundColor: '#F2F8F4',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 22,
    color: '#1E293B',
    marginTop: 4,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
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
    color: '#1E293B',
    fontWeight: '900',
  },
  email: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  levelBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E3F6EF',
    color: '#17765D',
    fontSize: 12,
    fontWeight: '800',
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
    color: '#334155',
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 12,
    fontWeight: '900',
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '800',
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
    fontWeight: '600',
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
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#17765D',
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: '#1B7F66',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#125A48',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  sectionTitleInline: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
  },
  linkSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  rowBtn: {
    paddingVertical: 12,
  },
  policyLink: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  deleteText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  signOutText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '800',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
});
