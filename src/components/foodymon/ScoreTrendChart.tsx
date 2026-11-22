import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { TrendPoint } from '@/lib/trend';

// Single series: one validated hue (contrast >= 3:1 on white); text stays in ink tokens.
const BAR_COLOR = '#1B7F66';
const MISSING_COLOR = '#E2E8F0';
const GRID_COLOR = '#F1F5F9';
const INK_PRIMARY = '#1E293B';
const INK_MUTED = '#64748B';

const PLOT_HEIGHT = 140;
const MAX_BAR_WIDTH = 24;
const BAR_GAP = 2;
const MISSING_STUB = 4;
const Y_TICKS = [100, 50, 0];

const shortDate = (key: string) => {
  const [, m, d] = key.split('-').map(Number);
  return `${m}/${d}`;
};

interface Props {
  points: TrendPoint[];
  /** Opens the diary for a recorded day (재형 피드백: 그래프에서 날짜 누르기). */
  onOpenDay?: (date: string) => void;
}

/** Column chart of the daily health index (0–100), one column per day. Tap a column for its value. */
export function ScoreTrendChart({ points, onOpenDay }: Props) {
  const [plotWidth, setPlotWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setPlotWidth(e.nativeEvent.layout.width);

  const slot = points.length > 0 ? plotWidth / points.length : 0;
  const barWidth = Math.max(2, Math.min(MAX_BAR_WIDTH, slot - BAR_GAP));

  // Label sparingly: today and the best day only; the tooltip carries the rest.
  let bestIndex = -1;
  points.forEach((p, i) => {
    if (p.score !== null && (bestIndex < 0 || p.score > (points[bestIndex].score ?? -1))) bestIndex = i;
  });
  const labelled = new Set([points.length - 1, bestIndex]);

  // Show a few evenly spaced date labels so they never collide.
  const labelEvery = Math.ceil(points.length / 7);

  const active = selected !== null ? points[selected] : null;

  return (
    <View>
      <View style={styles.tooltipRow}>
        {active ? (
          <View style={styles.tooltipLine}>
            <Text style={styles.tooltip}>
              {shortDate(active.date)}
              {active.isToday ? ' (오늘)' : ''} ·{' '}
              {active.score === null ? '기록 없음' : `${active.score}점`}
            </Text>
            {onOpenDay && active.score !== null && (
              <Pressable onPress={() => onOpenDay(active.date)} accessibilityRole="link" hitSlop={8}>
                <Text style={styles.openDay}>그날 기록 보기 →</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Text style={styles.tooltipHint}>막대를 눌러 날짜별 기록을 확인해요</Text>
        )}
      </View>

      <View style={styles.chartRow}>
        <View style={styles.yAxis}>
          {Y_TICKS.map((t) => (
            <Text key={t} style={styles.axisText}>
              {t}
            </Text>
          ))}
        </View>

        <View style={styles.plot} onLayout={onLayout}>
          {Y_TICKS.map((t) => (
            <View key={t} style={[styles.gridLine, { bottom: (t / 100) * PLOT_HEIGHT }]} />
          ))}

          {plotWidth > 0 &&
            points.map((p, i) => {
              const h = p.score === null ? MISSING_STUB : Math.max(MISSING_STUB, (p.score / 100) * PLOT_HEIGHT);
              const isSelected = selected === i;
              return (
                <Pressable
                  key={p.date}
                  onPress={() => setSelected(isSelected ? null : i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${shortDate(p.date)} ${p.score === null ? '기록 없음' : `${p.score}점`}`}
                  style={[styles.slot, { left: i * slot, width: slot }]}>
                  {p.score !== null && labelled.has(i) && (
                    <Text style={[styles.valueLabel, { bottom: h + 4 }]}>{p.score}</Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        width: barWidth,
                        height: h,
                        backgroundColor: p.score === null ? MISSING_COLOR : BAR_COLOR,
                        opacity: selected === null || isSelected ? 1 : 0.45,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
        </View>
      </View>

      <View style={styles.xAxis}>
        {plotWidth > 0 &&
          points.map((p, i) =>
            (points.length - 1 - i) % labelEvery === 0 ? (
              <Text
                key={p.date}
                style={[styles.axisText, styles.xLabel, { left: i * slot + slot / 2 - X_LABEL_WIDTH / 2 }]}
                numberOfLines={1}>
                {p.isToday ? '오늘' : shortDate(p.date)}
              </Text>
            ) : null
          )}
      </View>
    </View>
  );
}

const Y_AXIS_WIDTH = 28;
const X_LABEL_WIDTH = 40;

const styles = StyleSheet.create({
  tooltipLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openDay: {
    fontSize: 13,
    color: '#1B7F66',
    fontWeight: '900',
  },
  tooltipRow: {
    height: 22,
    justifyContent: 'center',
    marginBottom: 8,
  },
  tooltip: {
    fontSize: 13,
    color: INK_PRIMARY,
    fontWeight: '800',
  },
  tooltipHint: {
    fontSize: 12,
    color: INK_MUTED,
    fontWeight: '600',
  },
  chartRow: {
    flexDirection: 'row',
    height: PLOT_HEIGHT + 16,
    paddingTop: 16,
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
    marginTop: -6,
    marginBottom: -6,
  },
  plot: {
    flex: 1,
    height: PLOT_HEIGHT,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GRID_COLOR,
  },
  slot: {
    position: 'absolute',
    bottom: 0,
    top: -16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderCurve: 'continuous',
  },
  valueLabel: {
    position: 'absolute',
    fontSize: 12,
    color: INK_PRIMARY,
    fontWeight: '800',
  },
  axisText: {
    fontSize: 12,
    color: INK_MUTED,
    fontWeight: '600',
  },
  xAxis: {
    height: 14,
    marginLeft: Y_AXIS_WIDTH,
    marginTop: 6,
  },
  xLabel: {
    position: 'absolute',
    width: X_LABEL_WIDTH,
    textAlign: 'center',
  },
});
