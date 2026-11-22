import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { petImage } from '@/constants/foodymonData';
import { MIND_WEATHER, pickReply } from '@/lib/mindWeather';

interface ShelterModalProps {
  visible: boolean;
  onClose: () => void;
}

/** 마음 쉼터: when a food urge comes, name the feeling and get one warm line back. Nothing is saved. */
export function ShelterModal({ visible, onClose }: ShelterModalProps) {
  const { state } = useFoodyMon();
  const [reply, setReply] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setReply(null);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>마음 쉼터</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="닫기">
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              onClose();
              router.push('/help');
            }}
            accessibilityRole="link">
            <Text style={styles.helpLink}>마음이 많이 힘들다면 → 도움 받기</Text>
          </TouchableOpacity>

          {reply === null ? (
            <View>
              <Text style={styles.question}>지금 배가 고픈 걸까, 마음이 지친 걸까?</Text>
              <View style={styles.grid}>
                {MIND_WEATHER.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.chip}
                    onPress={() => setReply(pickReply(m.id))}
                    accessibilityRole="button"
                    accessibilityLabel={m.label}>
                    <Ionicons name={m.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color="#1B7F66" />
                    <Text style={styles.chipText}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.bubble} accessibilityLiveRegion="polite">
                <Text style={styles.bubbleText}>{reply}</Text>
              </View>
              <Image
                source={petImage(state.level, state.equippedCostume)}
                style={styles.pet}
                contentFit="contain"
                accessibilityLabel="푸디몬"
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>고마워, 푸디몬</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setReply(null)}>
                <Text style={styles.backText}>← 다른 마음 고르기</Text>
              </TouchableOpacity>
            </View>
          )}
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
    padding: 10,
  },
  helpLink: {
    fontSize: 13,
    color: '#17765D',
    fontWeight: '800',
    marginBottom: 14,
  },
  question: {
    fontSize: 17,
    color: '#1E293B',
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  // One neutral colour for every feeling: no answer looks better than another.
  chip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F2F8F4',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#D5E8DE',
  },
  chipText: {
    flexShrink: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '800',
  },
  bubble: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F2F8F4',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#D5E8DE',
  },
  bubbleText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  pet: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginTop: 8,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#1B7F66',
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#125A48',
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
});
