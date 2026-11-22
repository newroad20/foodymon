import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFoodyMon } from '@/context/FoodyMonContext';

// Fixed star spots (fractions of the screen) so the sky looks the same every night.
const STARS = [
  [0.12, 0.08], [0.3, 0.16], [0.55, 0.06], [0.78, 0.13], [0.9, 0.3],
  [0.08, 0.36], [0.22, 0.55], [0.86, 0.52], [0.64, 0.7], [0.15, 0.8], [0.45, 0.88], [0.92, 0.82],
];
const HOLD_MS = 3600;

/** After a sleep check-in the whole home screen falls asleep: it darkens, stars twinkle, a moon rises. */
export function NightOverlay() {
  const { petReaction } = useFoodyMon();
  const dark = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0.4)).current;
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (petReaction?.kind !== 'sleep') return;
    setOn(true);
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    blink.start();
    const anim = Animated.sequence([
      Animated.timing(dark, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(dark, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      blink.stop();
      if (finished) setOn(false);
    });
    return () => {
      anim.stop();
      blink.stop();
    };
  }, [petReaction, dark, twinkle]);

  if (!on) return null;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.sky, { opacity: dark }]}>
      <Ionicons name="moon" size={54} color="#FFE9A8" style={styles.moon} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: twinkle }]}>
        {STARS.map(([x, y], i) => (
          <View
            key={i}
            style={[styles.star, { left: `${x * 100}%`, top: `${y * 100}%`, transform: [{ scale: i % 3 === 0 ? 1.6 : 1 }] }]}
          />
        ))}
      </Animated.View>
      <Text style={styles.caption}>쿨쿨… 숲에 밤이 왔어요</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sky: {
    backgroundColor: 'rgba(22, 24, 64, 0.62)',
    zIndex: 50,
  },
  moon: {
    position: 'absolute',
    top: '9%',
    right: '10%',
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF7C2',
  },
  caption: {
    position: 'absolute',
    bottom: '22%',
    alignSelf: 'center',
    color: '#E0E7FF',
    fontSize: 15,
    fontWeight: '800',
  },
});
