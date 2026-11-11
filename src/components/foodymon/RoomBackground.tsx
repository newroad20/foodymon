import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { backgroundsData } from '@/constants/foodymonData';

export function RoomBackground() {
  const { state } = useFoodyMon();
  // Wall decor sits below the header and goal card, which start under the notch.
  const top = useSafeAreaInsets().top;
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  const isSunset = hour >= 17 && hour < 20;

  // Determine window sky style
  let skyColor = '#81D4FA'; // Day
  let sunOrMoon = '☀️';
  if (isSunset) {
    skyColor = '#FFB74D'; // Sunset
    sunOrMoon = '🌅';
  } else if (isNight) {
    skyColor = '#1A237E'; // Night
    sunOrMoon = '🌙';
  }

  // Older saves may hold several; the last one equipped wins.
  const lastId = state.equippedBackgrounds[state.equippedBackgrounds.length - 1];
  const roomArt = backgroundsData.find((b) => b.id === lastId)?.image;
  if (roomArt) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={roomArt} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="bottom" />
      </View>
    );
  }

  const hasCarpet = state.equippedBackgrounds.includes('carpet');
  const hasBookshelf = state.equippedBackgrounds.includes('bookshelf');
  const hasPlant = state.equippedBackgrounds.includes('plant');
  const hasPlushie = state.equippedBackgrounds.includes('plushie');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.wall, isNight && styles.wallNight, isSunset && styles.wallSunset]}>
        <View style={[styles.wallGlow, isNight && styles.wallGlowNight]} />
        <Text style={[styles.mote, styles.moteOne]}>✦</Text>
        <Text style={[styles.mote, styles.moteTwo]}>✦</Text>

        <View style={[styles.windowFrame, { top: top + 140 }]}>
          <View style={[styles.windowGlass, { backgroundColor: skyColor }]}>
            <Text style={styles.sunMoon}>{sunOrMoon}</Text>
            {!isNight && <View style={styles.cloudOne} />}
            {!isNight && <View style={styles.cloudTwo} />}
            <View style={styles.hillFar} />
            <View style={styles.hillNear} />
            <View style={styles.windowDividerH} />
            <View style={styles.windowDividerV} />
          </View>
        </View>

        <View style={[styles.wallFrame, { top: top + 150 }]}>
          <Text style={styles.wallFrameLeaf}>☘</Text>
        </View>
        <View style={[styles.tinyShelf, { top: top + 238 }]}>
          <View style={styles.shelfBookA} />
          <View style={styles.shelfBookB} />
          <View style={styles.shelfVase} />
        </View>

        {/* Equipped Bookshelf (Left Wall) */}
        {hasBookshelf && (
          <View style={styles.bookshelfContainer}>
            <Text style={styles.bookshelfEmoji}>📚</Text>
          </View>
        )}
      </View>

      <View style={styles.floor}>
        <View style={styles.floorBorder} />
        <View style={[styles.floorPlank, { top: '28%' }]} />
        <View style={[styles.floorPlank, { top: '58%' }]} />
        <View style={[styles.floorPlank, { top: '84%' }]} />

        {/* Equipped Carpet */}
        {hasCarpet && (
          <View style={styles.carpetContainer}>
            <View style={styles.carpetOval}>
              <Text style={styles.carpetPattern}>🧶 포근한 카펫</Text>
            </View>
          </View>
        )}

        {/* Equipped Plant */}
        {hasPlant && (
          <View style={styles.plantContainer}>
            <Text style={styles.decorEmoji}>🪴</Text>
          </View>
        )}

        {/* Equipped Plushie */}
        {hasPlushie && (
          <View style={styles.plushieContainer}>
            <Text style={styles.decorEmoji}>🧸</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wall: {
    flex: 7,
    backgroundColor: '#EFF8F2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wallNight: {
    backgroundColor: '#E9EDF7',
  },
  wallSunset: {
    backgroundColor: '#FFF2E7',
  },
  wallGlow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255,255,255,0.58)',
    bottom: -190,
    alignSelf: 'center',
  },
  wallGlowNight: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  mote: {
    position: 'absolute',
    color: '#E2B45A',
    opacity: 0.45,
  },
  moteOne: {
    top: 118,
    left: 42,
    fontSize: 13,
  },
  moteTwo: {
    top: 205,
    right: 130,
    fontSize: 9,
  },
  windowFrame: {
    position: 'absolute',
    right: 24,
    width: 100,
    height: 126,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 6,
    borderColor: '#E8DDD1',
    backgroundColor: '#F8F2EB',
    overflow: 'hidden',
    shadowColor: '#6A5947',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  windowGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sunMoon: {
    fontSize: 20,
    position: 'absolute',
    top: 10,
    right: 10,
    fontWeight: '600',
  },
  cloudOne: {
    position: 'absolute',
    left: 7,
    top: 45,
    width: 36,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  cloudTwo: {
    position: 'absolute',
    right: 10,
    top: 68,
    width: 28,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.52)',
  },
  hillFar: {
    position: 'absolute',
    width: 100,
    height: 42,
    borderRadius: 50,
    backgroundColor: 'rgba(119, 178, 145, 0.7)',
    bottom: -18,
    left: -28,
  },
  hillNear: {
    position: 'absolute',
    width: 115,
    height: 48,
    borderRadius: 58,
    backgroundColor: 'rgba(72, 139, 107, 0.72)',
    bottom: -26,
    right: -45,
  },
  windowDividerH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  windowDividerV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  wallFrame: {
    position: 'absolute',
    left: 32,
    width: 62,
    height: 72,
    borderRadius: 18,
    borderWidth: 5,
    borderColor: '#E7D7C5',
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-2deg' }],
  },
  wallFrameLeaf: {
    color: '#78AD8F',
    fontSize: 29,
  },
  tinyShelf: {
    position: 'absolute',
    left: 25,
    width: 82,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CDAF91',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 10,
    gap: 3,
  },
  shelfBookA: {
    width: 8,
    height: 25,
    borderRadius: 3,
    backgroundColor: '#ECA78E',
  },
  shelfBookB: {
    width: 9,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#7FB5A0',
  },
  shelfVase: {
    width: 18,
    height: 18,
    marginLeft: 14,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#E8C77E',
  },
  bookshelfContainer: {
    position: 'absolute',
    left: 20,
    top: 120,
  },
  bookshelfEmoji: {
    fontSize: 38,
    fontWeight: '600',
  },
  floor: {
    flex: 3,
    backgroundColor: '#E9DDCE',
    position: 'relative',
  },
  floorBorder: {
    height: 8,
    backgroundColor: '#D8C6B3',
    borderTopWidth: 1,
    borderTopColor: '#CBB7A2',
  },
  floorPlank: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(142, 113, 86, 0.13)',
  },
  carpetContainer: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    width: 260,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carpetOval: {
    width: 240,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE0B2',
    borderWidth: 2,
    borderColor: '#FFCC80',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carpetPattern: {
    fontSize: 11,
    color: '#D84315',
    fontWeight: '700',
  },
  plantContainer: {
    position: 'absolute',
    left: 25,
    bottom: 120,
  },
  plushieContainer: {
    position: 'absolute',
    right: 30,
    bottom: 120,
  },
  decorEmoji: {
    fontSize: 34,
    fontWeight: '600',
  },
});
