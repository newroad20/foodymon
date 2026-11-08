import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { fetchDailyRecords } from '@/lib/gameApi';
import { toDateKey } from '@/lib/dayRollover';
import { JOURNEY_DAYS, journeyCells, journeyDay, type JourneyCellState } from '@/lib/journey';
import { petImage } from '@/constants/foodymonData';

// Four zones of 25 days, like the worlds of a game map.
const ZONES = [
  { name: '새싹 숲', icon: 'leaf', tint: '#E3F6EF', road: '#BFE6D6', deco: '#58B894' },
  { name: '꽃 들판', icon: 'flower', tint: '#FCE7F3', road: '#F6C9DF', deco: '#E879A8' },
  { name: '별빛 호수', icon: 'water', tint: '#E0F0FF', road: '#BBDDF7', deco: '#5AA6E0' },
  { name: '구름 언덕', icon: 'cloud', tint: '#FFF6D6', road: '#F5E2A6', deco: '#E3B63B' },
] as const;
const ROW = 92; // vertical distance between stops
const SWAY = 0.32; // how far the trail swings left and right (share of the width)
const DECOS = ['leaf', 'flower', 'sparkles', 'star', 'heart'] as const;

/** The 100 days as a winding game trail: shared days, rest days, today and the road ahead. */
export default function JourneyScreen() {
  const { userId, state } = useFoodyMon();
  const [shared, setShared] = useState<Set<string>>(new Set());
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    fetchDailyRecords(userId)
      .then((rows) =>
        setShared(
          new Set(
            rows
              .filter((r) => r.meal_count > 0 || r.sleep_hours !== null || r.emotion !== null)
              .map((r) => r.log_date)
          )
        )
      )
      .catch((e) => console.error('Failed to load journey days:', e));
  }, [userId]);

  const today = toDateKey(new Date());
  const cells = useMemo(
    () => (state.journeyStart ? journeyCells(state.journeyStart, today, shared) : []),
    [state.journeyStart, today, shared]
  );
  const dayNo = state.journeyStart ? Math.min(journeyDay(state.journeyStart, today), JOURNEY_DAYS) : 1;

  const scrolled = useRef(false);
  // Bring today into view once the whole map is laid out (the header is about 110px tall).
  const scrollToToday = () => {
    if (scrolled.current || !width) return;
    scrolled.current = true;
    const todayY = zoneTop(dayNo) + ((dayNo - 1) % 25) * ROW + 70 + 110;
    scroll.current?.scrollTo({ y: Math.max(0, todayY - 300), animated: false });
  };

  if (!state.journeyStart) return null;
  const sharedCount = cells.filter((c) => c.state === 'shared').length;
  const pet = petImage(state.level, state.equippedCostume);
  const x = (day: number) => width / 2 + Math.sin(day * 0.75) * width * SWAY;
  const y = (day: number) => zoneTop(day) + ((day - 1) % 25) * ROW + 70;

  return (
    <ScrollView
      ref={scroll}
      style={styles.container}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onContentSizeChange={(_, h) => h > 1000 && scrollToToday()}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{JOURNEY_DAYS}일 중 {dayNo}일차</Text>
        <Text style={styles.headerText}>이야기를 들려준 날 {sharedCount}일 · 쉬어 간 날도 길의 일부예요</Text>
      </View>

      {width > 0 && (
        <View style={{ height: zoneTop(JOURNEY_DAYS + 1) }}>
          {ZONES.map((z, i) => (
            <View key={z.name} style={[styles.zone, { top: zoneTop(i * 25 + 1), backgroundColor: z.tint }]}>
              <View style={[styles.zoneBanner, { borderColor: z.deco }]}>
                <Ionicons name={z.icon} size={18} color={z.deco} />
                <Text style={styles.zoneTitle}>{i + 1}구역 · {z.name}</Text>
                <Text style={styles.zoneDays}>{i * 25 + 1}~{i * 25 + 25}일</Text>
              </View>
            </View>
          ))}

          {/* Trail segments between neighbouring stops */}
          {cells.slice(0, -1).map((c) => {
            const x1 = x(c.day), y1 = y(c.day), x2 = x(c.day + 1), y2 = y(c.day + 1);
            if ((c.day % 25) === 0) return null; // zones are joined by their banners
            const len = Math.hypot(x2 - x1, y2 - y1);
            const zone = ZONES[Math.floor((c.day - 1) / 25)];
            const walked = c.state !== 'ahead' && c.day + 1 <= dayNo;
            return (
              <View
                key={`seg${c.day}`}
                style={[
                  styles.segment,
                  {
                    width: len,
                    left: (x1 + x2) / 2 - len / 2,
                    top: (y1 + y2) / 2 - 5,
                    backgroundColor: walked ? zone.deco : zone.road,
                    transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
                  },
                ]}
              />
            );
          })}

          {/* Scenery on the side the trail is not */}
          {cells.filter((c) => c.day % 3 === 2).map((c) => {
            const zone = ZONES[Math.floor((c.day - 1) / 25)];
            const left = x(c.day) > width / 2 ? width * 0.12 : width * 0.82;
            return (
              <Ionicons
                key={`deco${c.day}`}
                name={DECOS[c.day % DECOS.length]}
                size={22}
                color={zone.deco}
                style={[styles.deco, { left, top: y(c.day) - 11 }]}
              />
            );
          })}

          {cells.map((c) => (
            <Stop key={c.day} day={c.day} state={c.state} cx={x(c.day)} cy={y(c.day)} pet={pet} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/** Top of the band that holds `day` (banners take 60px). */
function zoneTop(day: number) {
  const zone = Math.floor((day - 1) / 25);
  return zone * (25 * ROW + 60);
}

function Stop({ day, state, cx, cy, pet }: { day: number; state: JourneyCellState; cx: number; cy: number; pet: any }) {
  const chest = day % 25 === 0;
  const label = { shared: '들려준 날', rest: '쉬어 간 날', today: '오늘', ahead: '앞으로' }[state];
  if (state === 'today') {
    return (
      <View style={[styles.todayWrap, { left: cx - 44, top: cy - 103 }]} accessible accessibilityLabel={`${day}일차, 오늘`}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>오늘</Text>
        </View>
        <Image source={pet} style={styles.todayPet} contentFit="contain" />
        <View style={[styles.stop, styles.stopToday]}>
          <Text style={styles.stopTextLight}>{day}</Text>
        </View>
      </View>
    );
  }
  const size = chest ? 64 : 54;
  return (
    <View
      style={[
        styles.stop,
        { width: size, height: size, borderRadius: size / 2, left: cx - size / 2, top: cy - size / 2 },
        state === 'shared' && styles.stopShared,
        state === 'rest' && styles.stopRest,
        chest && styles.stopChest,
      ]}
      accessible
      accessibilityLabel={`${day}일차, ${label}${chest ? ', 보물 상자' : ''}`}>
      {chest ? (
        <Ionicons name="gift" size={28} color={state === 'ahead' ? '#C9A227' : '#FFFFFF'} />
      ) : state === 'shared' ? (
        <Ionicons name="checkmark" size={24} color="#FFFFFF" />
      ) : (
        <Text style={state === 'rest' ? styles.stopTextRest : styles.stopText}>{day}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
  },
  header: {
    margin: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    color: '#17765D',
    fontWeight: '900',
  },
  headerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  zone: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 25 * ROW + 60,
  },
  zoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderBottomWidth: 5,
  },
  zoneTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
  },
  zoneDays: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
  },
  segment: {
    position: 'absolute',
    height: 10,
    borderRadius: 5,
  },
  deco: {
    position: 'absolute',
    opacity: 0.55,
  },
  stop: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: '#D5DCE4',
  },
  stopShared: {
    backgroundColor: '#22A07D',
    borderColor: '#147A5E',
  },
  stopRest: {
    backgroundColor: '#EFE7DB',
    borderColor: '#D6C8B4',
  },
  stopChest: {
    backgroundColor: '#FFE38A',
    borderColor: '#D9A821',
  },
  stopToday: {
    position: 'relative',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F5B700',
    borderColor: '#C48F00',
  },
  stopText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '900',
  },
  stopTextRest: {
    fontSize: 16,
    color: '#A8957A',
    fontWeight: '900',
  },
  stopTextLight: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  todayWrap: {
    position: 'absolute',
    width: 88,
    alignItems: 'center',
    zIndex: 2,
  },
  bubble: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  todayPet: {
    width: 64,
    height: 64,
    marginBottom: -10,
    zIndex: 1,
  },
});
