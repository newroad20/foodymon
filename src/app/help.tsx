import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useParentalGate } from '@/context/ParentalGateContext';

// Official Korean help lines (feedback 2026-10-21). Free, 24h unless noted.
const LINES = [
  { number: '119', name: '응급 상황', desc: '쓰러졌거나, 계속 토하거나, 몸이 많이 아플 때', urgent: true },
  { number: '109', name: '자살예방 상담전화', desc: '죽고 싶다는 생각이 들 때, 24시간' },
  { number: '1577-0199', name: '정신건강 위기상담', desc: '마음이 너무 힘들어 혼자 견디기 어려울 때, 24시간' },
  { number: '1388', name: '청소년상담', desc: '청소년 고민 상담 (먹는 것, 몸, 친구, 가족 무엇이든), 24시간' },
];

const call = (number: string) =>
  Linking.openURL(`tel:${number.replace(/-/g, '')}`).catch(() =>
    Alert.alert('전화를 걸 수 없어요', `${number}로 직접 전화해 주세요.`)
  );

/** Where to get help: official hotlines, telling a trusted adult, or carrying on. */
export default function HelpScreen() {
  const guard = useParentalGate();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        도움을 청하는 건 용기 있는 일이야. 지금 마음에 맞는 걸 골라 줘.
      </Text>

      {LINES.map((l) => (
        <TouchableOpacity
          key={l.number}
          style={[styles.card, l.urgent && styles.cardUrgent]}
          activeOpacity={0.8}
          onPress={() => guard(() => call(l.number), '전화 걸기')}
          accessibilityRole="button"
          accessibilityLabel={`${l.name} ${l.number}에 전화하기`}>
          <View style={styles.cardText}>
            <Text style={styles.name}>{l.name}</Text>
            <Text style={styles.desc}>{l.desc}</Text>
          </View>
          <View style={[styles.callBtn, l.urgent && styles.callBtnUrgent]}>
            <Ionicons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.callText}>{l.number}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.card}>
        <View style={styles.cardText}>
          <Text style={styles.name}>믿을 수 있는 어른에게 알리기</Text>
          <Text style={styles.desc}>
            부모님, 선생님, 보건 선생님, 상담 선생님처럼 편한 어른에게 "요즘 먹는 게 힘들어"처럼
            한 문장만 말해도 충분해.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>괜찮아, 기록 계속하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  lead: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  cardUrgent: {
    borderColor: '#FCA5A5',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
  },
  desc: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    lineHeight: 19,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B7F66',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  callBtnUrgent: {
    backgroundColor: '#DC2626',
  },
  callText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  backText: {
    fontSize: 15,
    color: '#17765D',
    fontWeight: '800',
  },
});
