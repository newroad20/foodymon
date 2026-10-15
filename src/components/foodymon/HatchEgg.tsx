import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { successFeel } from '@/lib/haptics';

export const HATCH_TAPS = 3;

interface HatchEggProps {
  /** Taps so far; each one adds a crack. */
  taps: number;
  hatched: boolean;
  onTap?: () => void;
}

// Crack segments revealed one tap at a time (x, y, rotation).
const CRACKS = [
  [
    { left: 30, top: 70, rotate: '35deg' },
    { left: 46, top: 72, rotate: '-35deg' },
  ],
  [
    { left: 62, top: 70, rotate: '35deg' },
    { left: 78, top: 72, rotate: '-35deg' },
  ],
  [
    { left: 14, top: 72, rotate: '-35deg' },
    { left: 94, top: 70, rotate: '35deg' },
  ],
];

/** The egg FoodyMon talks from during onboarding; it cracks with each tap and hatches into the pet. */
export function HatchEgg({ taps, hatched, onTap }: HatchEggProps) {
  const wobble = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  // A slow idle sway so the egg feels alive.
  useEffect(() => {
    if (hatched) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, {
          toValue: 0.3,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: -0.3,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hatched, wobble]);

  useEffect(() => {
    if (!hatched) return;
    successFeel();
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
  }, [hatched, pop]);

  const handlePress = () => {
    Animated.sequence(
      [1, -1, 0.6, -0.6, 0].map((toValue) =>
        Animated.timing(wobble, { toValue, duration: 70, useNativeDriver: true })
      )
    ).start();
    onTap?.();
  };

  if (hatched) {
    return (
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Image
          source={require('@/assets/images/level3.png')}
          style={styles.pet}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }

  const rotate = wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] });

  return (
    <Pressable onPress={handlePress} disabled={!onTap} accessibilityLabel="푸디몬 알">
      <Animated.View style={[styles.egg, { transform: [{ rotate }] }]}>
        <View style={[styles.spot, { left: 26, top: 30, width: 22, height: 22 }]} />
        <View style={[styles.spot, { left: 70, top: 46, width: 30, height: 30 }]} />
        <View style={[styles.spot, { left: 40, top: 104, width: 18, height: 18 }]} />
        <View style={[styles.spot, { left: 84, top: 112, width: 14, height: 14 }]} />
        {CRACKS.slice(0, taps)
          .flat()
          .map((c, i) => (
            <View
              key={i}
              style={[
                styles.crack,
                { left: c.left, top: c.top, transform: [{ rotate: c.rotate }] },
              ]}
            />
          ))}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  egg: {
    width: 130,
    height: 165,
    borderRadius: 65,
    borderTopLeftRadius: 65,
    borderTopRightRadius: 65,
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: '#D7EDE6',
    overflow: 'hidden',
    marginVertical: 8,
  },
  spot: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#BFE6D9',
  },
  crack: {
    position: 'absolute',
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#5B6B66',
  },
  pet: {
    width: 180,
    height: 180,
  },
});
