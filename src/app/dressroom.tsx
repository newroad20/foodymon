import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { backgroundsData, costumesData, levelsData } from '@/constants/foodymonData';

type Category = 'costume' | 'background';
type Item = { id: string; icon: string; name: string; price: number };

/** D1 dressroom, Roblox avatar-editor style: big live preview on top, item grid below, try on before buying. */
export default function DressroomScreen() {
  const { state, buyItem, toggleCostume, toggleBackground } = useFoodyMon();
  const [category, setCategory] = useState<Category>('costume');
  // An unowned item being tried on; shown in the preview until bought or dismissed.
  const [trying, setTrying] = useState<{ type: Category; item: Item } | null>(null);
  const [buying, setBuying] = useState(false);

  const levelInfo = levelsData.find((l) => l.level === state.level) ?? levelsData[2];
  const items: Item[] = category === 'costume' ? costumesData : backgroundsData;
  const owned = category === 'costume' ? state.ownedCostumes : state.ownedBackgrounds;

  const costumeId = trying?.type === 'costume' ? trying.item.id : state.equippedCostume;
  const costume = costumesData.find((c) => c.id === costumeId);
  const roomIds =
    trying?.type === 'background' ? [...state.equippedBackgrounds, trying.item.id] : state.equippedBackgrounds;
  const roomItems = backgroundsData.filter((b) => roomIds.includes(b.id));

  const canAfford = !trying || state.currency >= trying.item.price;

  const isEquipped = (id: string) =>
    category === 'costume' ? state.equippedCostume === id : state.equippedBackgrounds.includes(id);

  const handlePress = (item: Item) => {
    if (owned.includes(item.id)) {
      setTrying(null);
      if (category === 'costume') toggleCostume(item.id);
      else toggleBackground(item.id);
    } else {
      setTrying(trying?.item.id === item.id ? null : { type: category, item });
    }
  };

  const handleBuy = async () => {
    if (!trying) return;
    setBuying(true);
    const res = await buyItem(trying.type, trying.item.id);
    setBuying(false);
    if (!res.success) {
      Alert.alert('구매하지 못했어요', res.message);
      return;
    }
    // Put on what was just bought, the way it was being tried.
    if (trying.type === 'costume') {
      if (state.equippedCostume !== trying.item.id) toggleCostume(trying.item.id);
    } else if (!state.equippedBackgrounds.includes(trying.item.id)) {
      toggleBackground(trying.item.id);
    }
    setTrying(null);
  };

  return (
    <View style={styles.container}>
      {/* Live preview */}
      <View style={styles.stage}>
        <View style={styles.jelly}>
          <Ionicons name="water" size={14} color="#1B7F66" />
          <Text style={styles.jellyText}>{state.currency}</Text>
        </View>
        {roomItems.length > 0 && <Text style={styles.room}>{roomItems.map((b) => b.emoji).join('  ')}</Text>}
        {costume && <Text style={styles.costume}>{costume.icon}</Text>}
        <Image source={levelInfo.image} style={styles.pet} contentFit="contain" />
        {trying && <Text style={styles.tryingTag}>미리보기: {trying.item.name}</Text>}
      </View>

      {/* Categories */}
      <View style={styles.tabs}>
        {(
          [
            { id: 'costume', label: '의상', icon: 'shirt' },
            { id: 'background', label: '마이룸', icon: 'home' },
          ] as const
        ).map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tab, category === t.id && styles.tabActive]}
            onPress={() => {
              setCategory(t.id);
              setTrying(null);
            }}>
            <Ionicons name={t.icon} size={16} color={category === t.id ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabText, category === t.id && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Item grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {items.map((item) => {
          const has = owned.includes(item.id);
          const on = has && isEquipped(item.id);
          const tried = trying?.item.id === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.tile, on && styles.tileOn, tried && styles.tileTrying]}
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${on ? '착용 중' : has ? '보유' : `젤리 ${item.price}개`}`}>
              {on && (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
              <Text style={[styles.tileIcon, !has && !tried && styles.locked]}>{item.icon}</Text>
              <Text style={styles.tileName} numberOfLines={1}>
                {item.name}
              </Text>
              {has ? (
                <Text style={styles.tileMeta}>{on ? '착용 중' : '보유'}</Text>
              ) : (
                <View style={styles.price}>
                  <Ionicons name="water" size={11} color="#1B7F66" />
                  <Text style={styles.priceText}>{item.price}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Buy bar while trying something on */}
      {trying && (
        <View style={styles.buyBar}>
          <Pressable style={styles.cancelBtn} onPress={() => setTrying(null)}>
            <Text style={styles.cancelText}>벗기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.buyBtn, pressed && styles.buyBtnPressed, !canAfford && styles.buyBtnOff]}
            disabled={buying || !canAfford}
            onPress={handleBuy}>
            {buying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buyText}>
                {canAfford ? `젤리 ${trying.item.price}개로 사고 입기` : `젤리가 ${trying.item.price - state.currency}개 부족해요`}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5F5',
  },
  stage: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderColor: '#E5E5E5',
  },
  jelly: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  jellyText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
  },
  room: {
    position: 'absolute',
    bottom: 14,
    fontSize: 26,
  },
  costume: {
    fontSize: 44,
    marginBottom: -20,
    zIndex: 1,
  },
  pet: {
    width: 200,
    height: 200,
  },
  tryingTag: {
    position: 'absolute',
    top: 14,
    left: 16,
    fontSize: 12,
    fontWeight: '800',
    color: '#17765D',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  tabActive: {
    backgroundColor: '#1B7F66',
    borderColor: '#125A48',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
    paddingBottom: 120,
  },
  tile: {
    width: '31%',
    flexGrow: 1,
    maxWidth: '32%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  tileOn: {
    borderColor: '#1B7F66',
    backgroundColor: '#E3F6EF',
  },
  tileTrying: {
    borderColor: '#1CB0F6',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B7F66',
  },
  tileIcon: {
    fontSize: 34,
  },
  locked: {
    opacity: 0.45,
  },
  tileName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  tileMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#17765D',
  },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#334155',
  },
  buyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderColor: '#E5E5E5',
  },
  cancelBtn: {
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
  },
  buyBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1B7F66',
    borderBottomWidth: 4,
    borderBottomColor: '#125A48',
  },
  buyBtnPressed: {
    borderBottomWidth: 1,
    marginTop: 3,
  },
  buyBtnOff: {
    opacity: 0.45,
  },
  buyText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
