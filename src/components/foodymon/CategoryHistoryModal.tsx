import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { mealPhotoUrls } from '@/lib/gameApi';
import {
  filterHistory,
  groupHistoryByDate,
  historyCounts,
  type HistoryCategory,
} from '@/lib/history';
import type { LogItem } from '@/types/foodymon';

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORIES: { id: HistoryCategory; label: string; icon: IconName }[] = [
  { id: 'all', label: '전체', icon: 'layers-outline' },
  { id: 'meal', label: '식사', icon: 'restaurant-outline' },
  { id: 'sleep', label: '수면', icon: 'moon-outline' },
  { id: 'emotion', label: '마음', icon: 'heart-outline' },
];

const META: Record<LogItem['type'], { bg: string; text: string; label: string; icon: IconName }> = {
  meal: { bg: '#E3F6EF', text: '#1B7F66', label: '식사', icon: 'restaurant' },
  skip: { bg: '#F1F5F9', text: '#64748B', label: '못 먹음', icon: 'remove-circle-outline' },
  sleep: { bg: '#ECE9FF', text: '#7566C9', label: '수면', icon: 'moon' },
  emotion: { bg: '#E3F1FB', text: '#286FA3', label: '마음', icon: 'heart' },
};

const EMPTY_COPY: Record<HistoryCategory, string> = {
  all: '아직 기록이 없어요. 오늘의 이야기를 푸디몬에게 들려주세요.',
  meal: '아직 식사 기록이 없어요. 먹은 것과 그때의 느낌을 남겨보세요.',
  sleep: '아직 수면 기록이 없어요. 오늘 잠든 시간부터 알려주세요.',
  emotion: '아직 마음 기록이 없어요. 지금의 기분을 한 번 나눠볼까요?',
};

export function CategoryHistoryModal({ visible, onClose }: HistoryModalProps) {
  const { state } = useFoodyMon();
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<HistoryCategory>('all');

  useEffect(() => {
    if (!visible) return;
    setCategory('all');
    const paths = state.logs.flatMap((log) => (log.photoPath ? [log.photoPath] : []));
    mealPhotoUrls(paths).then(setPhotoUrls).catch(() => {});
  }, [visible, state.logs]);

  const counts = useMemo(() => historyCounts(state.logs), [state.logs]);
  const groups = useMemo(
    () => groupHistoryByDate(filterHistory(state.logs, category)),
    [state.logs, category]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>MY STORY</Text>
              <Text style={styles.title}>푸디몬 기록 숲</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="기록장 닫기">
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="book" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>{counts.all}개의 하루 조각</Text>
              <Text style={styles.summaryText}>식사, 잠, 마음이 모여 우리 이야기가 돼요.</Text>
            </View>
          </View>

          <View style={styles.tabs}>
            {CATEGORIES.map((item) => {
              const active = category === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setCategory(item.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}>
                  <Ionicons name={item.icon} size={16} color={active ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
                  <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                    <Text style={[styles.countText, active && styles.countTextActive]}>{counts[item.id]}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}>
            {groups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="leaf-outline" size={30} color="#1B7F66" />
                </View>
                <Text style={styles.emptyTitle}>
                  {CATEGORIES.find((item) => item.id === category)?.label} 기록이 비어 있어요
                </Text>
                <Text style={styles.emptyText}>{EMPTY_COPY[category]}</Text>
              </View>
            ) : (
              groups.map((group) => (
                <View key={group.date} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayDot} />
                    <Text style={styles.dayLabel}>{group.date}</Text>
                    <View style={styles.dayLine} />
                    <Text style={styles.dayCount}>{group.logs.length}개</Text>
                  </View>
                  {group.logs.map((log) => {
                    const meta = META[log.type];
                    const timeOnly = log.time.replace(/^\d{2}월 \d{2}일\s*/, '');
                    return (
                      <View key={log.id} style={styles.logCard}>
                        <View style={[styles.logIcon, { backgroundColor: meta.bg }]}>
                          <Ionicons name={meta.icon} size={19} color={meta.text} />
                        </View>
                        <View style={styles.logBody}>
                          <View style={styles.logHeader}>
                            <View style={[styles.tag, { backgroundColor: meta.bg }]}>
                              <Text style={[styles.tagText, { color: meta.text }]}>{meta.label}</Text>
                            </View>
                            <Text style={styles.logTime}>{timeOnly}</Text>
                          </View>
                          <Text style={styles.logContent}>{log.content}</Text>
                          {log.photoPath && photoUrls[log.photoPath] ? (
                            <Image
                              source={{ uri: photoUrls[log.photoPath] }}
                              style={styles.logPhoto}
                              contentFit="cover"
                              accessibilityLabel="식사 사진"
                            />
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 42, 34, 0.48)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '92%',
    minHeight: '68%',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  eyebrow: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    color: '#1E293B',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#E3F6EF',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#1B7F66',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: '#1B7F66',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  summaryText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    height: 39,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#1B7F66',
    borderColor: '#1B7F66',
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  dayGroup: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 3,
  },
  dayDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#1B7F66',
    marginRight: 7,
  },
  dayLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 9,
  },
  dayCount: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 12,
    marginBottom: 9,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E2E8F0',
  },
  logIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logBody: {
    flex: 1,
    minWidth: 0,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '900',
  },
  logTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  logContent: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 19,
    fontWeight: '700',
  },
  logPhoto: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 16,
    borderCurve: 'continuous',
    marginTop: 10,
  },
  emptyContainer: {
    paddingHorizontal: 28,
    paddingVertical: 52,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#E3F6EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  emptyTitle: {
    fontSize: 17,
    color: '#334155',
    fontWeight: '900',
    marginBottom: 7,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '600',
  },
});
