import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { toDateKey } from '@/lib/dayRollover';
import { clearSmallGoal, fetchSmallGoal, saveSmallGoal, type GoalKind, type SmallGoalInfo } from '@/lib/gameApi';

const shift = (hhmm: string, delta: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m + delta) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** Title and the 완료 / 일부 / 시도 conditions for a goal, worded from yesterday's records. */
function describe(kind: GoalKind, size: number, info: SmallGoalInfo) {
  const y = info.yesterday;
  if (kind === 'more_meal') {
    return {
      title: '식사 기회 한 번 더',
      rules: [`완료 20점 · 먹은 칸 ${y.eaten + size}개 이상`, `일부 10점 · ${Math.max(y.eaten, 1)}개 (어제만큼)`, '시도 5점 · 식사 기록 1개'],
      note: `어제는 ${y.eaten}칸 먹었어. 간식도 한 칸이야.`,
    };
  }
  if (kind === 'earlier_bed') {
    return {
      title: `${size}분 일찍 잠들기`,
      rules: y.bed_time
        ? [`완료 20점 · ${shift(y.bed_time, -size)} 전에 잠들기`, `일부 10점 · ${shift(y.bed_time, -Math.ceil(size / 2))} 전에`, '시도 5점 · 수면 기록하기']
        : ['어제 수면 기록이 없어서 오늘은 기록만 해도 시도 5점'],
      note: y.bed_time ? `어제는 ${y.bed_time}에 잠들었어.` : '',
    };
  }
  return {
    title: '감정의 이유 적기',
    rules: ['완료 20점 · 마음 기록에 상황과 이야기 둘 다', '일부 10점 · 상황이나 이야기 하나', '시도 5점 · 감정만 기록'],
    note: '왜 그런 마음이 들었는지 한 줄이면 충분해.',
  };
}

const OPTIONS: GoalKind[] = ['more_meal', 'earlier_bed', 'mind_reason'];

/** Today's small goal (재형 피드백): observe first, then one goal a day to start, change or put on hold. */
export function GoalCard() {
  const { userId, state, refreshGrowth } = useFoodyMon();
  const [info, setInfo] = useState<SmallGoalInfo | null>(null);
  const [open, setOpen] = useState(false);
  const todayKey = toDateKey(new Date());

  const load = useCallback(() => {
    fetchSmallGoal(todayKey)
      .then(setInfo)
      .catch((e) => console.error('Failed to load small goal:', e));
  }, [todayKey]);

  // Points come from today's records on the server, so reload after every check-in.
  useEffect(load, [load, state.todayPoints]);

  if (!info) return null;

  const update = async (change: () => Promise<void>) => {
    try {
      await change();
      await refreshGrowth();
    } catch (e) {
      console.error('Failed to update small goal:', e);
    }
    load();
  };
  const start = (kind: GoalKind, size = kind === 'earlier_bed' ? 15 : 1) =>
    update(() => saveSmallGoal(userId, todayKey, { kind, size, held: false }));

  const goal = info.goal;
  const active = goal && !goal.held ? describe(goal.kind, goal.size, info) : null;
  const headline = info.observing
    ? `${info.day}일차 · 관찰하는 날`
    : active
      ? active.title
      : goal?.held
        ? '오늘은 목표를 쉬어 가요'
        : '오늘의 작은 목표를 골라 볼까?';

  return (
    <>
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => setOpen(true)}>
        <View style={styles.cardLeft}>
          <Ionicons name="flag" size={16} color="#1B7F66" />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {headline}
          </Text>
        </View>
        <Text style={styles.cardMeta}>+{info.points}점</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>작은 목표 · {info.day}일차</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn} accessibilityLabel="닫기">
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {info.observing ? (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>오늘은 나를 관찰하는 날</Text>
                <Text style={styles.rule}>수면 · 식사 · 마음 중 2가지 이상 기록하면 20점, 1가지면 10점</Text>
                <Text style={styles.note}>내일부터 오늘 기록을 보고 작은 목표를 하나 제안할게.</Text>
              </View>
            ) : active && goal ? (
              <>
                <View style={styles.box}>
                  <Text style={styles.boxTitle}>{active.title}</Text>
                  {active.rules.map((r) => (
                    <Text key={r} style={styles.rule}>
                      • {r}
                    </Text>
                  ))}
                  {active.note ? <Text style={styles.note}>{active.note}</Text> : null}
                  <Text style={styles.now}>지금 +{info.points}점</Text>
                </View>
                {goal.kind === 'earlier_bed' && (
                  <View style={styles.row}>
                    {[15, 30].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.chip, goal.size === m && styles.chipActive]}
                        onPress={() => start('earlier_bed', m)}>
                        <Text style={[styles.chipText, goal.size === m && styles.chipTextActive]}>{m}분</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.row}>
                  <TouchableOpacity style={styles.secondary} onPress={() => update(() => clearSmallGoal(userId, todayKey))}>
                    <Text style={styles.secondaryText}>다른 목표로 바꾸기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondary}
                    onPress={() => update(() => saveSmallGoal(userId, todayKey, { ...goal, held: true }))}>
                    <Text style={styles.secondaryText}>오늘은 보류</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : goal?.held ? (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>쉬어 가는 것도 괜찮아</Text>
                <Text style={styles.rule}>기록만 해도 관찰 점수(최대 20점)가 쌓여요.</Text>
                <TouchableOpacity style={styles.primary} onPress={() => start(goal.kind, goal.size)}>
                  <Text style={styles.primaryText}>다시 시작하기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.subtitle}>어제 기록을 보고 골라 봤어. 마음에 드는 걸로 시작해도 돼.</Text>
                {OPTIONS.map((kind) => {
                  const d = describe(kind, kind === 'earlier_bed' ? 15 : 1, info);
                  return (
                    <TouchableOpacity key={kind} style={styles.option} onPress={() => start(kind)}>
                      <View style={styles.optionText}>
                        <Text style={styles.boxTitle}>
                          {d.title}
                          {kind === info.suggestion ? '  ' : ''}
                          {kind === info.suggestion && <Text style={styles.badge}> 추천 </Text>}
                        </Text>
                        <Text style={styles.rule}>{d.rules[0]}</Text>
                      </View>
                      <Text style={styles.startText}>시작</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.secondary}
                  onPress={() => update(() => saveSmallGoal(userId, todayKey, { kind: info.suggestion, size: 1, held: true }))}>
                  <Text style={styles.secondaryText}>오늘은 보류</Text>
                </TouchableOpacity>
              </>
            )}
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
    gap: 8,
    marginHorizontal: 14,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#D8E8E0',
    shadowColor: '#476657',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 14,
    color: '#30463B',
    fontWeight: '900',
  },
  cardMeta: {
    fontSize: 13,
    color: '#17765D',
    fontWeight: '800',
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
    color: '#2D3748',
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#A0AEC0',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    fontWeight: '600',
  },
  box: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#E3F6EF',
  },
  boxTitle: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '900',
  },
  rule: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    lineHeight: 19,
  },
  note: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  now: {
    marginTop: 4,
    fontSize: 14,
    color: '#17765D',
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  chipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#17765D',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  badge: {
    fontSize: 11,
    color: '#FFFFFF',
    backgroundColor: '#1B7F66',
    fontWeight: '900',
  },
  startText: {
    fontSize: 14,
    color: '#17765D',
    fontWeight: '900',
  },
  secondary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  secondaryText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '800',
  },
  primary: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1B7F66',
  },
  primaryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
