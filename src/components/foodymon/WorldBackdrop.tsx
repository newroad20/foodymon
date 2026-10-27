import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WorldBackdropProps {
  mood?: 'mint' | 'sunset' | 'night';
}

const PALETTES = {
  mint: { base: '#F2FAF6', glow: '#DDF4E8', accent: '#FFE8C7', detail: '#BCE6D7' },
  sunset: { base: '#FFF7F1', glow: '#FFE3D3', accent: '#DDF1E8', detail: '#F7CCAF' },
  night: { base: '#EFF3FB', glow: '#DCE5F6', accent: '#E9DFF5', detail: '#C9D5ED' },
};

/** Shared illustrated atmosphere for auth and story screens. */
export function WorldBackdrop({ mood = 'mint' }: WorldBackdropProps) {
  const palette = PALETTES[mood];

  return (
    <View style={[styles.fill, { backgroundColor: palette.base }]} pointerEvents="none">
      <View style={[styles.orb, styles.orbTop, { backgroundColor: palette.glow }]} />
      <View style={[styles.orb, styles.orbRight, { backgroundColor: palette.accent }]} />
      <View style={[styles.orb, styles.orbBottom, { backgroundColor: palette.detail }]} />
      <Text style={[styles.sparkle, styles.sparkleOne]}>✦</Text>
      <Text style={[styles.sparkle, styles.sparkleTwo]}>✦</Text>
      <Text style={[styles.leaf, styles.leafLeft]}>❧</Text>
      <Text style={[styles.leaf, styles.leafRight]}>❧</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.78,
  },
  orbTop: {
    width: 300,
    height: 300,
    top: -130,
    left: -100,
  },
  orbRight: {
    width: 220,
    height: 220,
    top: 210,
    right: -130,
  },
  orbBottom: {
    width: 260,
    height: 260,
    bottom: -150,
    left: -80,
    opacity: 0.5,
  },
  sparkle: {
    position: 'absolute',
    color: '#E9B65E',
    opacity: 0.75,
  },
  sparkleOne: {
    top: 84,
    right: 38,
    fontSize: 18,
  },
  sparkleTwo: {
    top: 142,
    left: 30,
    fontSize: 12,
  },
  leaf: {
    position: 'absolute',
    color: '#70AD94',
    opacity: 0.42,
    fontSize: 42,
  },
  leafLeft: {
    left: 12,
    bottom: 90,
    transform: [{ rotate: '-28deg' }],
  },
  leafRight: {
    right: 4,
    top: 320,
    transform: [{ rotate: '145deg' }],
  },
});
