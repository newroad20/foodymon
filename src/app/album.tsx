import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { fetchMealPhotos, MealPhoto } from '@/lib/gameApi';

const COLUMNS = 3;
const GAP = 8;

interface PhotoDay {
  date: string;
  title: string;
  photos: MealPhoto[];
}

const dateTitle = (key: string) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(
    new Date(`${key}T12:00:00`)
  );

function groupByDate(photos: MealPhoto[]): PhotoDay[] {
  const groups = new Map<string, MealPhoto[]>();
  for (const photo of photos) groups.set(photo.logDate, [...(groups.get(photo.logDate) ?? []), photo]);
  return [...groups].map(([date, items]) => ({ date, title: dateTitle(date), photos: items }));
}

/** Meal photos grouped by day and meal slot, so context is visible without opening each photo. */
export default function AlbumScreen() {
  const { userId } = useFoodyMon();
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<MealPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<MealPhoto | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      fetchMealPhotos(userId)
        .then((data) => {
          if (!active) return;
          setPhotos(data);
          setError(false);
        })
        .catch((e) => {
          console.error('Failed to load meal photos:', e);
          if (active) setError(true);
        })
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [userId])
  );

  const days = useMemo(() => groupByDate(photos), [photos]);
  const tileSize = (width - 32 - 28 - GAP * (COLUMNS - 1)) / COLUMNS;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1B7F66" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={days}
        keyExtractor={(day) => day.date}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          error ? (
            <Text style={styles.notice}>사진을 불러오지 못했어요. 다시 열어 주세요.</Text>
          ) : photos.length > 0 ? (
            <View style={styles.headerCard}>
              <Text style={styles.headerTitle}>식사 앨범</Text>
              <Text style={styles.count}>{days.length}일 · 사진 {photos.length}장</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          error ? null : (
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={40} color="#B5E6D4" />
              <Text style={styles.emptyText}>아직 사진이 없어요.{`\n`}식사를 기록할 때 사진 버튼으로 남겨 보세요!</Text>
            </View>
          )
        }
        renderItem={({ item: day }) => (
          <View style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Ionicons name="calendar-outline" size={17} color="#1B7F66" />
              <Text style={styles.dayTitle}>{day.title}</Text>
            </View>
            <View style={styles.photoRow}>
              {day.photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  style={{ width: tileSize }}
                  onPress={() => setOpen(photo)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`${day.title} ${photo.mealLabel} 식사 사진`}>
                  <Image source={{ uri: photo.url }} style={[styles.photo, { width: tileSize, height: tileSize }]} contentFit="cover" />
                  <Text style={styles.mealLabel} numberOfLines={1}>{photo.mealLabel}</Text>
                  <Text style={styles.mealCopy} numberOfLines={1}>{photo.content || '기록한 식사'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(null)} accessibilityLabel="닫기">
          {open && (
            <View style={styles.viewer}>
              <Image source={{ uri: open.url }} style={styles.large} contentFit="cover" />
              <Text style={styles.time}>{dateTitle(open.logDate)} · {open.mealLabel}</Text>
              <Text style={styles.note}>{open.content || '기록한 식사'}</Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F8F4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F8F4' },
  list: { padding: 16, gap: 12 },
  headerCard: { marginBottom: 4 },
  headerTitle: { fontSize: 20, color: '#1E293B', fontWeight: '900' },
  count: { fontSize: 13, color: '#64748B', fontWeight: '700', marginTop: 3 },
  notice: { fontSize: 13, color: '#B45309', fontWeight: '700', marginBottom: 8 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#64748B', fontWeight: '600', textAlign: 'center', lineHeight: 21 },
  dayCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderCurve: 'continuous', padding: 14, gap: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: '#E2E8F0', borderBottomColor: '#CBD5E1' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dayTitle: { fontSize: 17, color: '#1E293B', fontWeight: '900' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  photo: { borderRadius: 12, borderCurve: 'continuous', backgroundColor: '#F1F5F9' },
  mealLabel: { marginTop: 6, fontSize: 12, color: '#1B7F66', fontWeight: '900' },
  mealCopy: { marginTop: 1, fontSize: 12, color: '#64748B', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  viewer: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 20, borderCurve: 'continuous', padding: 12, gap: 8 },
  large: { width: '100%', aspectRatio: 1, borderRadius: 16, borderCurve: 'continuous' },
  time: { fontSize: 13, color: '#1B7F66', fontWeight: '900', paddingHorizontal: 4 },
  note: { fontSize: 15, color: '#1E293B', fontWeight: '600', paddingHorizontal: 4, paddingBottom: 4 },
});
