import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar,
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


export default function FoodyMonHomeScreen() {
  const { state, advanceToNextDay } = useFoodyMon();

  // Modals state
  const [showMealModal, setShowMealModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showEmotionModal, setShowEmotionModal] = useState(false);
  const [showBagModal, setShowBagModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleNextDaySimulation = () => {
    Alert.alert(
      '다음 날 시뮬레이션',
      '하루가 지나간 것으로 시뮬레이션하여 스트릭 갱신 및 보상을 확인하시겠습니까?',
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

      <SafeAreaView style={styles.safeArea}>
        {/* Top Badges & History */}
        <TopStatsHeader onOpenHistory={() => setShowHistoryModal(true)} />

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

      {/* Onboarding Prologue Modal (Shown on first launch) */}
      <OnboardingModal visible={!state.onboarded} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  petSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
