import React from 'react';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { color, font, radius } from '@/constants/theme';
import { shelterStyles } from '@/components/foodymon/shelterUi';

const ACTIVITIES: { href: Href; icon: React.ComponentProps<typeof Ionicons>['name']; title: string; desc: string }[] = [
  { href: '/shelter/nibble', icon: 'restaurant', title: '냠냠', desc: '좋아하는 음식을 푸디몬과 한 입씩 천천히 상상해 봐' },
  { href: '/shelter/surf', icon: 'water', title: '15분 파도타기', desc: '마음의 파도가 지나갈 때까지 같이 숨 쉬어 보자' },
  { href: '/shelter/weather', icon: 'partly-sunny', title: '한 줄 마음 날씨', desc: '지금 마음을 고르면 푸디몬이 한마디 건네줘' },
];

/** 마음 쉼터 menu: when a food urge comes, pick one way to sit with it. Nothing is saved. */
export default function ShelterMenu() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={shelterStyles.screen}>
      <TouchableOpacity onPress={() => router.push('/help')} accessibilityRole="link">
        <Text style={styles.helpLink}>마음이 많이 힘들다면 → 도움 받기</Text>
      </TouchableOpacity>
      <Text style={shelterStyles.question}>푸디몬이랑 뭐 하면서 쉬어 볼까?</Text>
      {ACTIVITIES.map((a) => (
        <TouchableOpacity
          key={a.title}
          style={styles.card}
          onPress={() => router.push(a.href)}
          accessibilityRole="button"
          accessibilityLabel={`${a.title}, ${a.desc}`}>
          <View style={styles.iconWrap}>
            <Ionicons name={a.icon} size={26} color={color.accent} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.cardDesc}>{a.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={color.muted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  helpLink: {
    fontSize: font.footnote,
    color: color.accent,
    fontWeight: '800',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: color.lineSoft,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: color.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: font.body,
    color: color.ink,
    fontWeight: '900',
  },
  cardDesc: {
    fontSize: font.footnote,
    color: color.inkMuted,
    fontWeight: '700',
    lineHeight: 18,
  },
});
