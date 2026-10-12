import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { ShareCard } from '@/components/foodymon/ShareCard';
import { hasLoggedToday } from '@/lib/dayRollover';

export default function ShareScreen() {
  const { state } = useFoodyMon();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('공유할 수 없어요', '이 기기에서는 공유 기능을 사용할 수 없어요.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: '내 푸디몬 자랑하기',
      });
    } catch (e) {
      console.error('Failed to share card:', e);
      Alert.alert('공유하지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        {hasLoggedToday(state)
          ? '오늘의 푸디몬을 친구들에게 자랑해 보세요!'
          : '아직 오늘 기록이 없어요. 체크인하고 자랑하면 더 멋져요!'}
      </Text>

      <ShareCard ref={cardRef} state={state} />

      <TouchableOpacity
        style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
        activeOpacity={0.85}
        disabled={sharing}
        onPress={handleShare}>
        {sharing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.shareText}>📤 이미지로 공유하기</Text>}
      </TouchableOpacity>
      <Text style={styles.hint}>카카오톡 · 인스타그램 · 사진 앱 저장 등 원하는 곳을 고를 수 있어요.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
  },
  content: {
    alignItems: 'center',
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  lead: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    fontWeight: '600',
  },
  shareBtn: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1B7F66',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#125A48',
  },
  shareBtnDisabled: {
    opacity: 0.6,
  },
  shareText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
  },
});
