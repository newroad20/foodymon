import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';

export function RoomBackground() {
  const { state } = useFoodyMon();
  const hour = new Date().getHours();

  // Determine window sky style
  let skyColor = '#81D4FA'; // Day
  let sunOrMoon = '☀️';
  if (hour >= 17 && hour < 20) {
    skyColor = '#FFB74D'; // Sunset
    sunOrMoon = '🌅';
  } else if (hour >= 20 || hour < 6) {
    skyColor = '#1A237E'; // Night
    sunOrMoon = '🌙';
  }

  const hasCarpet = state.equippedBackgrounds.includes('carpet');
  const hasBookshelf = state.equippedBackgrounds.includes('bookshelf');
  const hasPlant = state.equippedBackgrounds.includes('plant');
  const hasPlushie = state.equippedBackgrounds.includes('plushie');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Wall (Top 70%) */}
      <View style={styles.wall}>
        {/* Cozy Window */}
        <View style={styles.windowFrame}>
          <View style={[styles.windowGlass, { backgroundColor: skyColor }]}>
            <Text style={styles.sunMoon}>{sunOrMoon}</Text>
            {/* Window divider cross */}
            <View style={styles.windowDividerH} />
            <View style={styles.windowDividerV} />
          </View>
        </View>

        {/* Equipped Bookshelf (Left Wall) */}
        {hasBookshelf && (
          <View style={styles.bookshelfContainer}>
            <Text style={styles.bookshelfEmoji}>📚</Text>
          </View>
        )}
      </View>

      {/* Floor (Bottom 30%) */}
      <View style={styles.floor}>
        {/* Floor Line */}
        <View style={styles.floorBorder} />

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
    backgroundColor: '#FDF5F5', // Soft creamy warm wall
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  windowFrame: {
    position: 'absolute',
    top: 250,
    right: 25,
    width: 80,
    height: 95,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#D7CCC8',
    backgroundColor: '#EFEBE9',
    overflow: 'hidden',
  },
  windowGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sunMoon: {
    fontSize: 22,
    position: 'absolute',
    top: 10,
    right: 10,
    fontWeight: '600',
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
    backgroundColor: '#EFEBE9', // Light cozy wood tone floor
    position: 'relative',
  },
  floorBorder: {
    height: 3,
    backgroundColor: '#D7CCC8',
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
