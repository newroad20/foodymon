import React, { useState } from 'react';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { petImage } from '@/constants/foodymonData';
import { color, font, radius } from '@/constants/theme';
import { MIND_WEATHER, pickReply } from '@/lib/mindWeather';
import { shelterStyles, useCloseShelter } from '@/components/foodymon/shelterUi';

/** 마음 쉼터 C 한 줄 마음 날씨: name the feeling and get one warm line back. Nothing is saved. */
export default function ShelterWeather() {
  const { state } = useFoodyMon();
  const close = useCloseShelter();
  const [reply, setReply] = useState<string | null>(null);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={shelterStyles.screen}>
      {reply === null ? (
        <>
          <Text style={shelterStyles.question}>지금 배가 고픈 걸까, 마음이 지친 걸까?</Text>
          <View style={styles.grid}>
            {MIND_WEATHER.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.chip}
                onPress={() => setReply(pickReply(m.id))}
                accessibilityRole="button"
                accessibilityLabel={m.label}>
                <Ionicons name={m.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={color.accent} />
                <Text style={styles.chipText}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={shelterStyles.bubble} accessibilityLiveRegion="polite">
            <Text style={shelterStyles.bubbleText}>{reply}</Text>
          </View>
          <Image
            source={petImage(state.level, state.equippedCostume)}
            style={shelterStyles.pet}
            contentFit="contain"
            accessibilityLabel="푸디몬"
          />
          <TouchableOpacity style={shelterStyles.primaryBtn} onPress={close}>
            <Text style={shelterStyles.primaryBtnText}>고마워, 푸디몬</Text>
          </TouchableOpacity>
          <TouchableOpacity style={shelterStyles.backBtn} onPress={() => setReply(null)}>
            <Text style={shelterStyles.backText}>← 다른 마음 고르기</Text>
          </TouchableOpacity>
        </>
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
  // One neutral colour for every feeling: no answer looks better than another.
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
});
