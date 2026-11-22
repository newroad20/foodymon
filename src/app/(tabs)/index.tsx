import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { RoomBackground } from '@/components/foodymon/RoomBackground';
import { TopStatsHeader } from '@/components/foodymon/TopStatsHeader';
import { PetAvatar } from '@/components/foodymon/PetAvatar';
import { ActionDock } from '@/components/foodymon/ActionDock';
import { MealModal } from '@/components/foodymon/MealModal';
import { SleepModal } from '@/components/foodymon/SleepModal';
import { EmotionModal } from '@/components/foodymon/EmotionModal';
import { ShelterModal } from '@/components/foodymon/ShelterModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CategoryHistoryModal } from '@/components/foodymon/CategoryHistoryModal';
import { OnboardingModal } from '@/components/foodymon/OnboardingModal';
import { BackfillModal } from '@/components/foodymon/BackfillModal';
import { GoalCard } from '@/components/foodymon/GoalCard';
import { DailyDiaryModal } from '@/components/foodymon/DailyDiaryModal';
import { JourneyComplete } from '@/components/foodymon/JourneyComplete';
import { JOURNEY_DAYS, journeyDay } from '@/lib/journey';
import { track } from '@/lib/analytics';
import { BACKFILL_COST } from '@/constants/foodymonData';
import { RolloverResult, toDateKey } from '@/lib/dayRollover';

function describeRollover(r: RolloverResult): { title: string; message: string } {
  const lines: string[] = [];
  if (r.rewardedJelly > 0) lines.push(`어제 나눠 준 기록 덕분에 이슬 +${r.rewardedJelly}개가 맺혔어요!`);
  if (r.milestoneBonus > 0) lines.push(`연속 기록 기념 보너스 +${r.milestoneBonus}개도 함께 담았어요!`);
  if (r.shieldEarned) lines.push('7일 연속 보상으로 스트릭 방패 1개를 추가 획득했어요!');
  if (r.shieldsUsed > 0) lines.push(`방패 ${r.shieldsUsed}개가 쉬어 간 날을 지켜 줬어요. 연속 기록이 그대로예요!`);
  if (r.streakReset) lines.push('쉬어 간 날이 있었네. 괜찮아, 오늘 다시 같이 시작하자');

  const title = r.rewardedJelly > 0 && !r.streakReset ? '새로운 하루 시작!' : '새로운 하루';
  return { title, message: lines.join('\n') || '오늘도 건강한 하루 보내자!' };
}


export default function FoodyMonHomeScreen() {
  const { state, loading, syncError, retrySync, advanceToNextDay, pendingRollover, dismissRollover } =
    useFoodyMon();
  const day = state.journeyStart ? journeyDay(state.journeyStart, toDateKey(new Date())) : null;
  const journeyOver = day !== null && day > JOURNEY_DAYS;

  // Tell the user what happened when the day changed (streak, jelly, shields).
  useEffect(() => {
    if (!pendingRollover) return;
    // Streak news means nothing while the journey is finished.
    if (journeyOver) return dismissRollover();
    const { title, message } = describeRollover(pendingRollover);
    Alert.alert(title, message, [{ text: '확인', onPress: dismissRollover }], {
      onDismiss: dismissRollover,
    });
  }, [pendingRollover, dismissRollover, journeyOver]);

  // Modals state
  const [showMealModal, setShowMealModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showEmotionModal, setShowEmotionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBackfillModal, setShowBackfillModal] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [showShelterModal, setShowShelterModal] = useState(false);
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
              let bonusMsg = `출석 보상으로 젤리 +${res.rewardedJelly}개를 받았습니다!`;
              if (res.shieldEarned) {
                bonusMsg += '\n7일 연속 보상으로 스트릭 방패 1개를 추가 획득했습니다!';
              }
              Alert.alert('새로운 하루 시작!', bonusMsg);
            } else if (res.shieldUsed) {
              Alert.alert(
                '방패 사용!',
                '어제 기록이 없었지만, 스트릭 방패가 사용되어 연속 기록이 유지되었습니다!'
              );
            } else {
              Alert.alert(
                '새로운 하루',
                '어제는 쉬어 갔구나. 괜찮아, 오늘 다시 같이 시작하자!'
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
            <Text style={styles.syncBannerText}><Ionicons name="cloud-offline" size={14} color="#991B1B" /> 서버와 동기화하지 못했어요. 눌러서 다시 시도</Text>
          </TouchableOpacity>
        )}

        {/* Top Badges & History */}
        <TopStatsHeader onOpenHistory={() => setShowHistoryModal(true)} />
        {day !== null && !journeyOver && (
          <TouchableOpacity onPress={() => router.push('/journey')} accessibilityRole="link" accessibilityHint="100일 여정 지도를 열어요">
            <Text style={styles.dayPill}>{JOURNEY_DAYS}일 중 {day}일차 ›</Text>
          </TouchableOpacity>
        )}
        {state.onboarded && !journeyOver && <GoalCard />}

        {/* S25: offer to fill in a missed yesterday */}
        {backfillOffer && !journeyOver && (
          <View style={styles.backfillCard}>
            <Text style={styles.backfillText}>어제 기록을 완료하지 못했어요. 지금 복구할까요?</Text>
            <View style={styles.backfillActions}>
              <TouchableOpacity
                style={styles.backfillLater}
                onPress={() => setBackfillDismissed(backfillOffer.date)}>
                <Text style={styles.backfillLaterText}>나중에</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backfillGo} onPress={() => setShowBackfillModal(true)}>
                <Text style={styles.backfillGoText}>복구하기 <Ionicons name="water" size={13} color="#FFFFFF" /> {BACKFILL_COST}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Center Room & Interactive Pet Avatar */}
        <ScrollView
          style={styles.petScroll}
          contentContainerStyle={styles.petSection}
          showsVerticalScrollIndicator={false}>
          <PetAvatar
            onOpenChat={journeyOver ? undefined : () => setShowDiaryModal(true)}
            interactionLabel="오늘의 일기 쓰기"
          />
          {!journeyOver && (
            <TouchableOpacity
              style={styles.shelterBtn}
              onPress={() => {
                track('sheet_open', 'shelter');
                setShowShelterModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="마음 쉼터, 푸디몬 부르기">
              <Ionicons name="leaf" size={22} color="#FFFFFF" />
              <View>
                <Text style={styles.shelterTitle}>마음 쉼터</Text>
                <Text style={styles.shelterSub}>푸디몬 부르기</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Bottom Action Dock */}
        {journeyOver ? (
          <JourneyComplete />
        ) : (
        <ActionDock
          onOpenMeal={() => {
            track('sheet_open', 'meal');
            setShowMealModal(true);
          }}
          onOpenSleep={() => {
            track('sheet_open', 'sleep');
            setShowSleepModal(true);
          }}
          onOpenEmotion={() => {
            track('sheet_open', 'mind');
            setShowEmotionModal(true);
          }}
          onOpenBag={() => router.push('/dressroom')}
          onNextDay={handleNextDaySimulation}
        />
        )}
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
      <CategoryHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
      <ShelterModal visible={showShelterModal} onClose={() => setShowShelterModal(false)} />
      <BackfillModal visible={showBackfillModal} onClose={() => setShowBackfillModal(false)} />
      {showDiaryModal && <DailyDiaryModal onClose={() => setShowDiaryModal(false)} />}

      {/* Onboarding Prologue Modal (Shown on first launch) */}
      <OnboardingModal visible={!loading && !syncError && !state.onboarded} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F8F4',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  dayPill: {
    alignSelf: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#17765D',
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
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
  petScroll: {
    flex: 1,
  },
  petSection: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  shelterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#1B7F66',
    borderWidth: 2,
    borderColor: '#125A48',
    borderBottomWidth: 4,
  },
  shelterTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  shelterSub: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
