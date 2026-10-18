import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { mealPhotoUrls } from '@/lib/gameApi';

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HistoryModal({ visible, onClose }: HistoryModalProps) {
  const { state } = useFoodyMon();
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Meal photos are private; fetch short-lived links when the diary opens.
  useEffect(() => {
    if (!visible) return;
    const paths = state.logs.flatMap((l) => (l.photoPath ? [l.photoPath] : []));
    mealPhotoUrls(paths).then(setPhotoUrls).catch(() => {});
  }, [visible, state.logs]);

  const getTagColor = (type: string) => {
    switch (type) {
      case 'meal':
        return { bg: '#E3F6EF', text: '#17765D', label: '식사' };
      case 'sleep':
        return { bg: '#EDE9FE', text: '#6D28D9', label: '수면' };
      case 'emotion':
        return { bg: '#FCE7F3', text: '#BE185D', label: '감정' };
      case 'skip':
        return { bg: '#F1F5F9', text: '#475569', label: '못 먹음' };
      default:
        return { bg: '#E2E8F0', text: '#475569', label: '기록' };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>나의 기록장 📖</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            푸디몬과 함께 건강한 루틴을 쌓아온 소중한 기록들이에요.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {state.logs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  아직 기록이 없어요. 아래 식사, 수면, 감정 버튼으로 일상을 기록해 보세요!
                </Text>
              </View>
            ) : (
              state.logs.map((log) => {
                const tag = getTagColor(log.type);
                return (
                  <View key={log.id} style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <View style={[styles.tag, { backgroundColor: tag.bg }]}>
                        <Text style={[styles.tagText, { color: tag.text }]}>
                          {tag.label}
                        </Text>
                      </View>
                      <Text style={styles.logTime}>{log.time}</Text>
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
                );
              })
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    color: '#2D3748',
    fontWeight: '900',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#A0AEC0',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    fontWeight: '600',
  },
  scroll: {
    marginBottom: 10,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
  logCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  logTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  logContent: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    fontWeight: '700',
  },
  logPhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    marginTop: 10,
  },
});
