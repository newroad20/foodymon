import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { costumesData, backgroundsData } from '@/constants/foodymonData';

interface BagShopModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BagShopModal({ visible, onClose }: BagShopModalProps) {
  const { state, buyItem, toggleCostume, toggleBackground } = useFoodyMon();
  const [activeTab, setActiveTab] = useState<'bag' | 'shop'>('bag');

  const handleBuy = (type: 'costume' | 'background', id: string, name: string) => {
    const res = buyItem(type, id);
    if (res.success) {
      Alert.alert('구매 성공', res.message);
    } else {
      Alert.alert('구매 실패', res.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'bag' && styles.tabBtnActive]}
                onPress={() => setActiveTab('bag')}>
                <Text style={[styles.tabText, activeTab === 'bag' && styles.tabTextActive]}>
                  내 가방 🎒
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'shop' && styles.tabBtnActive]}
                onPress={() => setActiveTab('shop')}>
                <Text style={[styles.tabText, activeTab === 'shop' && styles.tabTextActive]}>
                  상점 🛒
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Jelly Balance Bar */}
          <View style={styles.jellyBanner}>
            <Text style={styles.jellyBannerText}>
              보유 젤리: <Text style={styles.jellyBold}>✨ {state.currency}개</Text>
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {activeTab === 'bag' ? (
              /* TAB 1: 내 가방 */
              <View style={styles.tabContent}>
                {/* Consumables */}
                <Text style={styles.sectionTitle}>소모품</Text>
                <View style={styles.itemRow}>
                  <Text style={styles.itemEmoji}>🛡️</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>스트릭 방패</Text>
                    <Text style={styles.itemDesc}>기록을 잊어도 연속 기록을 유지해 줘요</Text>
                  </View>
                  <Text style={styles.itemCount}>{state.shields}개 보유</Text>
                </View>

                {/* Owned Costumes */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  내 코스튬 (터치하여 착용/해제)
                </Text>
                {state.ownedCostumes.length === 0 ? (
                  <Text style={styles.emptyText}>
                    아직 보유한 코스튬이 없어요. 상점에서 귀여운 아이템을 입양해 보세요!
                  </Text>
                ) : (
                  <View style={styles.grid}>
                    {state.ownedCostumes.map((id) => {
                      const item = costumesData.find((c) => c.id === id);
                      if (!item) return null;
                      const isEquipped = state.equippedCostume === id;
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.gridCard, isEquipped && styles.gridCardEquipped]}
                          onPress={() => toggleCostume(id)}>
                          <Text style={styles.cardEmoji}>{item.icon}</Text>
                          <Text style={styles.cardName}>{item.name}</Text>
                          <Text style={[styles.statusTag, isEquipped && styles.statusTagActive]}>
                            {isEquipped ? '착용 중' : '착용하기'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Owned Backgrounds */}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  내 방 꾸미기 (터치하여 배치/해제)
                </Text>
                {state.ownedBackgrounds.length === 0 ? (
                  <Text style={styles.emptyText}>
                    아직 보유한 인테리어가 없어요. 상점에서 마이룸 소품을 구경해 보세요!
                  </Text>
                ) : (
                  <View style={styles.grid}>
                    {state.ownedBackgrounds.map((id) => {
                      const item = backgroundsData.find((b) => b.id === id);
                      if (!item) return null;
                      const isEquipped = state.equippedBackgrounds.includes(id);
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.gridCard, isEquipped && styles.gridCardEquipped]}
                          onPress={() => toggleBackground(id)}>
                          <Text style={styles.cardEmoji}>{item.emoji}</Text>
                          <Text style={styles.cardName}>{item.name}</Text>
                          <Text style={[styles.statusTag, isEquipped && styles.statusTagActive]}>
                            {isEquipped ? '배치 중' : '배치하기'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              /* TAB 2: 상점 */
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>코스튬 상점 👒</Text>
                <View style={styles.grid}>
                  {costumesData.map((item) => {
                    const isOwned = state.ownedCostumes.includes(item.id);
                    return (
                      <View key={item.id} style={styles.gridCard}>
                        <Text style={styles.cardEmoji}>{item.icon}</Text>
                        <Text style={styles.cardName}>{item.name}</Text>
                        <Text style={styles.priceText}>✨ {item.price}</Text>
                        {isOwned ? (
                          <View style={styles.ownedBtn}>
                            <Text style={styles.ownedBtnText}>보유 중</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.buyBtn}
                            onPress={() => handleBuy('costume', item.id, item.name)}>
                            <Text style={styles.buyBtnText}>구매</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                  마이룸 인테리어 상점 🏡
                </Text>
                <View style={styles.grid}>
                  {backgroundsData.map((item) => {
                    const isOwned = state.ownedBackgrounds.includes(item.id);
                    return (
                      <View key={item.id} style={styles.gridCard}>
                        <Text style={styles.cardEmoji}>{item.emoji}</Text>
                        <Text style={styles.cardName}>{item.name}</Text>
                        <Text style={styles.priceText}>✨ {item.price}</Text>
                        {isOwned ? (
                          <View style={styles.ownedBtn}>
                            <Text style={styles.ownedBtnText}>보유 중</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.buyBtn}
                            onPress={() => handleBuy('background', item.id, item.name)}>
                            <Text style={styles.buyBtnText}>구매</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
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
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 12,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#A0AEC0',
    fontWeight: '700',
  },
  jellyBanner: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  jellyBannerText: {
    fontSize: 14,
    color: '#92400E',
  },
  jellyBold: {
    fontWeight: '800',
  },
  scroll: {
    marginBottom: 10,
  },
  tabContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3B82F6',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  gridCardEquipped: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  cardEmoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
    marginBottom: 8,
  },
  statusTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusTagActive: {
    color: '#FFFFFF',
    backgroundColor: '#3B82F6',
  },
  buyBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  ownedBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ownedBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
});
