import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { toDateKey } from '@/lib/dayRollover';
import { DailyQuest, fetchDailyQuests } from '@/lib/gameApi';

// Duolingo-style chests: bronze / silver / gold by difficulty.
const CHEST = { 1: '🥉', 2: '🥈', 3: '🥇' } as const;

/** S70: today's three quests. A compact card on home that opens the full list. */
export function QuestCard() {
  const { state, claimQuest } = useFoodyMon();
  const [quests, setQuests] = useState<DailyQuest[] | null>(null);
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchDailyQuests(toDateKey(new Date()))
      .then(setQuests)
      .catch((e) => console.error('Failed to load quests:', e));
  }, []);

  // Progress comes from today's log on the server, so reload after every check-in or day change.
  useEffect(load, [load, state.today, state.lastActiveDate]);

  if (!quests || quests.length === 0) return null;

  const claimed = quests.filter((q) => q.claimed).length;
  const ready = quests.filter((q) => !q.claimed && q.progress >= q.target).length;

  const handleClaim = async (q: DailyQuest) => {
    setClaiming(q.id);
    const ok = await claimQuest(q.id);
    setClaiming(null);
    if (ok) {
      Alert.alert(`${CHEST[q.tier]} 보상 상자 열기!`, `젤리 ✨ +${q.reward}개를 받았어요.`);
      load();
    } else {
      Alert.alert('받지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        // Reload on open too: the check-in save may still have been in flight at the last reload.
        onPress={() => {
          load();
          setOpen(true);
        }}>
        <Text style={styles.cardTitle}>📜 오늘의 퀘스트</Text>
        <Text style={styles.cardMeta}>
          {ready > 0 ? `보상 ${ready}개 받기 ›` : `${claimed}/${quests.length} 완료 ›`}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>📜 오늘의 퀘스트</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>매일 자정에 새 퀘스트 3개가 열려요. 달성하면 보상 상자를 열 수 있어요!</Text>

            {quests.map((q) => {
              const done = q.progress >= q.target;
              const pct = Math.min(1, q.progress / q.target);
              return (
                <View key={q.id} style={styles.quest}>
                  <Text style={styles.chest}>{CHEST[q.tier]}</Text>
                  <View style={styles.questBody}>
                    <Text style={styles.questTitle}>{q.title}</Text>
                    <View
                      style={styles.track}
                      accessibilityRole="progressbar"
                      accessibilityValue={{ min: 0, max: q.target, now: q.progress }}>
                      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
                    </View>
                    <Text style={styles.questMeta}>
                      {q.progress}/{q.target} · 젤리 ✨{q.reward}
                    </Text>
                  </View>
                  {q.claimed ? (
                    <Text style={styles.claimed}>받음</Text>
                  ) : (
                    <TouchableOpacity
                      style={[styles.claimBtn, !done && styles.claimBtnOff]}
                      disabled={!done || claiming !== null}
                      onPress={() => handleClaim(q)}>
                      {claiming === q.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.claimText}>받기</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  cardMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#A0AEC0',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 19,
  },
  quest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
  },
  chest: {
    fontSize: 28,
  },
  questBody: {
    flex: 1,
    gap: 6,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FED7AA',
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  questMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  claimBtn: {
    minWidth: 52,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F97316',
  },
  claimBtnOff: {
    opacity: 0.35,
  },
  claimText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  claimed: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
});
