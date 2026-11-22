import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useKeepAwake } from 'expo-keep-awake';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { petImage } from '@/constants/foodymonData';
import { color, font, radius } from '@/constants/theme';
import { mmss, surfState } from '@/lib/shelter';
import { successFeel, tapFeel } from '@/lib/haptics';
import { shelterStyles, useCloseShelter } from '@/components/foodymon/shelterUi';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const CIRCLE = 200;

// Mounted only while surfing, so the screen may sleep again once the wave has passed.
function KeepAwake() {
  useKeepAwake();
  return null;
}

/** 마음 쉼터 B 15분 파도타기: stay with the urge until it passes, breathing 4s in / 6s out. Nothing is saved. */
export default function ShelterSurf() {
  const { state } = useFoodyMon();
  const close = useCloseShelter();
  const reduceMotion = useReducedMotion();
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const [stoppedEarly, setStoppedEarly] = useState(false);
  const surf = surfState(startedAt, now);
  const over = stoppedEarly || surf.phase === 'done';

  // The interval only asks for a re-render; time itself comes from timestamps (survives backgrounding).
  useEffect(() => {
    if (over) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [over]);

  useEffect(() => {
    if (surf.phase === 'done' && !stoppedEarly) successFeel();
  }, [surf.phase, stoppedEarly]);

  // Breathing circle grows on 'in' (4s) and shrinks on 'out' (6s). Reduce Motion: it brightens and dims instead.
  const breath = useSharedValue(0);
  useEffect(() => {
    if (over) return;
    breath.set(withTiming(surf.breath === 'in' ? 1 : 0, { duration: surf.breath === 'in' ? 4000 : 6000, easing: EASE_OUT }));
  }, [surf.breath, over, breath]);
  const circleStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 0.35 + breath.get() * 0.65 }
      : { transform: [{ scale: 0.6 + breath.get() * 0.4 }] },
  );

  const hop = useSharedValue(0);
  const hopStyle = useAnimatedStyle(() =>
    reduceMotion ? { opacity: 1 - hop.get() * 0.4 } : { transform: [{ translateY: -hop.get() * 14 }] },
  );
  const pet = () => {
    tapFeel();
    hop.set(withSequence(withSpring(1, { duration: 200, dampingRatio: 1 }), withSpring(0, { duration: 400, dampingRatio: 0.8 })));
  };

  const petImg = (
    <TouchableOpacity onPress={pet} accessibilityRole="button" accessibilityLabel="푸디몬 쓰다듬기" activeOpacity={1}>
      <Animated.View style={hopStyle}>
        <Image
          source={petImage(state.level, state.equippedCostume)}
          style={styles.pet}
          contentFit="contain"
        />
      </Animated.View>
    </TouchableOpacity>
  );

  if (over) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={shelterStyles.screen}>
        <View style={shelterStyles.bubble} accessibilityLiveRegion="polite">
          <Text style={shelterStyles.bubbleText}>
            {stoppedEarly
              ? '여기까지 같이 있어 준 것만으로 충분해. 파도가 또 오면 언제든 불러 줘.'
              : '파도가 지나갔어. 끝까지 같이 있어 줘서 고마워.'}
          </Text>
        </View>
        {petImg}
        <TouchableOpacity style={shelterStyles.primaryBtn} onPress={close}>
          <Text style={shelterStyles.primaryBtnText}>고마워, 푸디몬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={shelterStyles.backBtn} onPress={() => router.back()}>
          <Text style={shelterStyles.backText}>다른 쉼터 둘러보기</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={shelterStyles.screen}>
      <KeepAwake />
      <Text style={shelterStyles.question}>마음의 파도는 올라왔다가 꼭 내려가. 푸디몬이랑 같이 숨 쉬어 보자.</Text>
      <Text style={styles.time} accessibilityLabel={`남은 시간 ${mmss(surf.remainingMs)}`}>
        {mmss(surf.remainingMs)}
      </Text>
      <View style={styles.circleBox}>
        <Animated.View style={[styles.circle, circleStyle]} />
        <Text style={styles.breathText} accessibilityLiveRegion="polite">
          {surf.breath === 'in' ? '들이쉬고…' : '내쉬고…'}
        </Text>
      </View>
      {petImg}
      <TouchableOpacity style={shelterStyles.backBtn} onPress={() => setStoppedEarly(true)} accessibilityRole="button">
        <Text style={shelterStyles.backText}>여기까지 할래</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  time: {
    alignSelf: 'center',
    fontSize: font.large,
    color: color.ink,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  circleBox: {
    width: CIRCLE,
    height: CIRCLE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: radius.full,
    backgroundColor: color.accentTint,
    borderWidth: 2,
    borderColor: color.accentTintEdge,
  },
  breathText: {
    fontSize: font.body,
    color: color.accent,
    fontWeight: '900',
  },
  pet: {
    width: 120,
    height: 120,
    alignSelf: 'center',
  },
});
