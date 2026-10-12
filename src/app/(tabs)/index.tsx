import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { useAuth } from '@/context/AuthContext';
import { RoomBackground } from '@/components/foodymon/RoomBackground';
import { TopStatsHeader } from '@/components/foodymon/TopStatsHeader';
import { PetAvatar } from '@/components/foodymon/PetAvatar';
import { ActionDock } from '@/components/foodymon/ActionDock';
import { MealModal } from '@/components/foodymon/MealModal';
import { SleepModal } from '@/components/foodymon/SleepModal';
import { EmotionModal } from '@/components/foodymon/EmotionModal';
import { BagShopModal } from '@/components/foodymon/BagShopModal';
import { HistoryModal } from '@/components/foodymon/HistoryModal';
import { OnboardingModal } from '@/components/foodymon/OnboardingModal';
import { BackfillModal } from '@/components/foodymon/BackfillModal';
import { QuestCard } from '@/components/foodymon/QuestCard';
import { BACKFILL_COST } from '@/constants/foodymonData';
import { RolloverResult } from '@/lib/dayRollover';

function describeRollover(r: RolloverResult): { title: string; message: string } {
  const lines: string[] = [];
  if (r.rewardedJelly > 0) lines.push(`어제 체크인 보상으로 젤리 ✨ +${r.rewardedJelly}개를 받았어요!`);
  if (r.shieldEarned) lines.push('🛡️ 7일 연속 보상으로 스트릭 방패 1개를 추가 획득했어요!');
  if (r.missedDays > 0) lines.push(`기록하지 못한 날이 ${r.missedDays}일 있었어요.`);
  if (r.shieldsUsed > 0) lines.push(`🛡️ 스트릭 방패 ${r.shieldsUsed}개가 사용되었어요.`);
  if (r.streakReset) lines.push('연속 기록이 초기화되었어요. 오늘부터 다시 힘내봐요! 😢');
  else if (r.rewardedJelly === 0 && r.shieldsUsed > 0) lines.push('방패 덕분에 연속 기록이 유지되었어요!');

  const title = r.rewardedJelly > 0 && !r.streakReset ? '새로운 하루 시작! 🌅' : '새로운 하루 🌅';
  return { title, message: lines.join('\n') || '오늘도 건강한 하루 보내자!' };
}


export default function FoodyMonHomeScreen() {
  const { state, loading, syncError, retrySync, advanceToNextDay, pendingRollover, dismissRollover } =
    useFoodyMon();

  // Tell the user what happened when the day changed (streak, jelly, shields).
  useEffect(() => {
    if (!pendingRollover) return;
    const { title, message } = describeRollover(pendingRollover);
    Alert.alert(title, message, [{ text: '확인', onPress: dismissRollover }], {
      onDismiss: dismissRollover,
    });
  }, [pendingRollover, dismissRollover]);

  // Modals state
  const [showMealModal, setShowMealModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showEmotionModal, setShowEmotionModal] = useState(false);
  const [showBagModal, setShowBagModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBackfillModal, setShowBackfillModal] = useState(false);
  // "나중에" hides the offer until the app restarts.
  const [backfillDismissed, setBackfillDismissed] = useState<string | null>(null);
  const backfillOffer = state.backfill && backfillDismissed !== state.backfill.date ? state.backfill : null;

  const handleNextDaySimulation = () => {
    Alert.alert(
      '다음 날 시뮬레이션',
      '하루가 지나간 것으로 시뮬레이션하여 스트릭 갱신 및 보상을 확인하시겠습니까?\n(이 기기에서만 적용되고 서버에는 저장되지 않아요)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: () => {
            const res = advanceToNextDay();
            if (res.rewardedJelly > 0) {
              let bonusMsg = `출석 보상으로 젤리 ✨ +${res.rewardedJelly}개를 받았습니다!`;
              if (res.shieldEarned) {
                bonusMsg += '\n🛡️ 7일 연속 보상으로 스트릭 방패 1개를 추가 획득했습니다!';
              }
              Alert.alert('새로운 하루 시작! 🌅', bonusMsg);
            } else if (res.shieldUsed) {
              Alert.alert(
                '방패 사용! 🛡️',
                '어제 기록이 없었지만, 스트릭 방패가 사용되어 연속 기록이 유지되었습니다!'
              );
            } else {
              Alert.alert(
                '새로운 하루 😢',
                '어제 기록이 없어 연속 기록이 초기화되었습니다. 오늘부터 다시 힘내봐요!'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Cozy My Room Background */}
      <RoomBackground />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {syncError && (
          <TouchableOpacity style={styles.syncBanner} activeOpacity={0.8} onPress={retrySync}>
            <Text style={styles.syncBannerText}>☁️ 서버와 동기화하지 못했어요. 눌러서 다시 시도</Text>
          </TouchableOpacity>
        )}

        {/* Top Badges & History */}
        <TopStatsHeader onOpenHistory={() => setShowHistoryModal(true)} />
        {state.onboarded && <QuestCard />}

        {/* S25: offer to fill in a missed yesterday */}
        {backfillOffer && (
          <View style={styles.backfillCard}>
            <Text style={styles.backfillText}>어제 기록을 완료하지 못했어요. 지금 복구할까요?</Text>
            <View style={styles.backfillActions}>
              <TouchableOpacity
                style={styles.backfillLater}
                onPress={() => setBackfillDismissed(backfillOffer.date)}>
                <Text style={styles.backfillLaterText}>나중에</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backfillGo} onPress={() => setShowBackfillModal(true)}>
                <Text style={styles.backfillGoText}>복구하기 ✨{BACKFILL_COST}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Center Room & Interactive Pet Avatar */}
        <View style={styles.petSection}>
          <PetAvatar />
        </View>

        {/* Bottom Action Dock */}
        <ActionDock
          onOpenMeal={() => setShowMealModal(true)}
          onOpenSleep={() => setShowSleepModal(true)}
          onOpenEmotion={() => setShowEmotionModal(true)}
          onOpenBag={() => setShowBagModal(true)}
          onNextDay={handleNextDaySimulation}
        />
      </SafeAreaView>

      {/* Feature Modals */}
      <MealModal
        visible={showMealModal}
        onClose={() => setShowMealModal(false)}
      />
      <SleepModal
        visible={showSleepModal}
        onClose={() => setShowSleepModal(false)}
      />
      <EmotionModal
        visible={showEmotionModal}
        onClose={() => setShowEmotionModal(false)}
      />
      <BagShopModal
        visible={showBagModal}
        onClose={() => setShowBagModal(false)}
      />
      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
      <BackfillModal visible={showBackfillModal} onClose={() => setShowBackfillModal(false)} />

      {/* Onboarding Prologue Modal (Shown on first launch) */}
      <OnboardingModal visible={!loading && !syncError && !state.onboarded} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  syncBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  syncBannerText: {
    color: '#991B1B',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  backfillCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    borderColor: '#B5E6D4',
    gap: 10,
  },
  backfillText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '800',
  },
  backfillActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backfillLater: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  backfillLaterText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
  },
  backfillGo: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1B7F66',
    borderBottomWidth: 4,
    borderBottomColor: '#125A48',
  },
  backfillGoText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  petSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
