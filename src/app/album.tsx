import React, { useCallback, useState } from 'react';
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
import { formatLogTime } from '@/lib/serverState';

const COLUMNS = 3;
const GAP = 4;

/** Every meal photo the user has attached, as a grid; tap one to see it large with its note. */
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

  const size = (width - 32 - GAP * (COLUMNS - 1)) / COLUMNS;

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
        data={photos}
        keyExtractor={(p) => p.id}
        numColumns={COLUMNS}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: GAP }}
        ListHeaderComponent={
          error ? (
            <Text style={styles.notice}>사진을 불러오지 못했어요. 다시 열어 주세요.</Text>
          ) : photos.length > 0 ? (
            <Text style={styles.count}>사진 {photos.length}장</Text>
          ) : null
        }
        ListEmptyComponent={
          error ? null : (
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={40} color="#9FD8C5" />
              <Text style={styles.emptyText}>
                아직 사진이 없어요.{'\n'}식사를 기록할 때 📷 버튼으로 남겨 보세요!
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setOpen(item)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${formatLogTime(new Date(item.createdAt))} 식사 사진`}>
            <Image source={{ uri: item.url }} style={{ width: size, height: size, borderRadius: 10 }} contentFit="cover" />
          </Pressable>
        )}
      />

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(null)} accessibilityLabel="닫기">
          {open && (
            <View style={styles.viewer}>
              <Image source={{ uri: open.url }} style={styles.large} contentFit="cover" />
              <Text style={styles.time}>{formatLogTime(new Date(open.createdAt))}</Text>
              <Text style={styles.note}>{open.content}</Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDF5F5',
  },
  grid: {
    padding: 16,
    gap: GAP,
  },
  count: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 8,
  },
  notice: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '700',
    marginBottom: 8,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  viewer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    gap: 8,
  },
  large: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
  },
  time: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  note: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
});
