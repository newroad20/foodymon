import React, { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { petImage } from '@/constants/foodymonData';
import { color, font, radius } from '@/constants/theme';
import { NIBBLE_BITES, NIBBLE_FOODS } from '@/lib/shelter';
import { successFeel, tapFeel } from '@/lib/haptics';
import { shelterStyles, useCloseShelter } from '@/components/foodymon/shelterUi';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** 마음 쉼터 A 냠냠: imagine a food and give FoodyMon one slow bite at a time. Nothing is saved. */
export default function ShelterNibble() {
  const { state } = useFoodyMon();
  const close = useCloseShelter();
  const reduceMotion = useReducedMotion();
  const [food, setFood] = useState<(typeof NIBBLE_FOODS)[number] | null>(null);
  const [bites, setBites] = useState(0);
  const done = bites >= NIBBLE_BITES;

  // A slow chew: squash down, then settle back (~600ms). Reduce Motion: a soft fade instead.
  const squash = useSharedValue(0);
  const fade = useSharedValue(1);
  const chewStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [
      { translateY: squash.get() * 8 },
      { scaleX: 1 + squash.get() * 0.06 },
      { scaleY: 1 - squash.get() * 0.1 },
    ],
  }));

  const bite = () => {
    const next = bites + 1;
    setBites(next);
    if (next >= NIBBLE_BITES) successFeel();
    else tapFeel();
    if (reduceMotion) {
      fade.set(withSequence(withTiming(0.6, { duration: 200 }), withTiming(1, { duration: 400 })));
    } else {
      squash.set(
        withSequence(withSpring(1, { duration: 250, dampingRatio: 1 }), withSpring(0, { duration: 350, dampingRatio: 0.8 })),
      );
    }
  };

  if (!food) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={shelterStyles.screen}>
        <Text style={shelterStyles.question}>어떤 음식을 떠올려 볼까?</Text>
        <View style={styles.grid}>
          {NIBBLE_FOODS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={styles.chip}
              onPress={() => {
                setFood(f);
                setBites(0);
              }}
              accessibilityRole="button"
              accessibilityLabel={f.label}>
              <Ionicons name={f.icon as IconName} size={22} color={color.accent} />
              <Text style={styles.chipText}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={shelterStyles.screen}>
      <View style={shelterStyles.bubble} accessibilityLiveRegion="polite">
        <Text style={shelterStyles.bubbleText}>
          {done ? '천천히 맛봤더니 마음이 조금 느긋해졌어.' : '푸디몬에게 한 입씩 줘 볼까?'}
        </Text>
      </View>
      <View style={styles.foodTag}>
        <Ionicons name={food.icon as IconName} size={20} color={color.accent} />
        <Text style={styles.foodTagText}>{food.label}</Text>
      </View>
      <Animated.View style={chewStyle}>
        <Image
          source={petImage(state.level, state.equippedCostume)}
          style={shelterStyles.pet}
          contentFit="contain"
          accessibilityLabel="푸디몬"
        />
      </Animated.View>
      <Text style={styles.counter} accessibilityLabel={`${NIBBLE_BITES}입 중 ${bites}입`}>
        {bites} / {NIBBLE_BITES}
      </Text>
      {done ? (
        <>
          <TouchableOpacity style={shelterStyles.primaryBtn} onPress={close}>
            <Text style={shelterStyles.primaryBtnText}>고마워, 푸디몬</Text>
          </TouchableOpacity>
          <TouchableOpacity style={shelterStyles.backBtn} onPress={() => router.back()}>
            <Text style={shelterStyles.backText}>다른 쉼터 둘러보기</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={[shelterStyles.primaryBtn, styles.biteBtn]} onPress={bite} accessibilityRole="button">
          <Text style={shelterStyles.primaryBtnText}>한 입 주기</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  chip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: color.lineSoft,
  },
  chipText: {
    flexShrink: 1,
    fontSize: font.subhead,
    color: color.inkSoft,
    fontWeight: '800',
  },
  foodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: color.accentTint,
  },
  foodTagText: {
    fontSize: font.subhead,
    color: color.accent,
    fontWeight: '800',
  },
  counter: {
    alignSelf: 'center',
    fontSize: font.title3,
    color: color.ink,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  biteBtn: {
    paddingVertical: 22,
  },
});
