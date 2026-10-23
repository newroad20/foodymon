import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useFoodyMon } from '@/context/FoodyMonContext';
import { levelsData, costumesData, mindEmotions, petStateArt } from '@/constants/foodymonData';
import type { PetReaction } from '@/context/FoodyMonContext';
import { growthProgress } from '@/lib/growth';

interface PetAvatarProps {
  onTap?: () => void;
}

export function PetAvatar({ onTap }: PetAvatarProps) {
  const { state, currentDialogue, triggerPetInteraction, petReaction } = useFoodyMon();
  // Check-in reactions: lying down to sleep, eating the meal, showing the feeling.
  const tilt = useRef(new Animated.Value(0)).current; // degrees
  const sink = useRef(new Animated.Value(0)).current; // px down
  const chew = useRef(new Animated.Value(1)).current; // vertical squash
  const night = useRef(new Animated.Value(0)).current; // dark overlay opacity
  const food = useRef(new Animated.Value(0)).current; // 0 = held out, 1 = eaten
  const [reaction, setReaction] = useState<PetReaction | null>(null);
  // Which eating face shows: 0 mouth open, 1 chewing, 2 happy swallow.
  const [eatFrame, setEatFrame] = useState(0);

  useEffect(() => {
    if (!petReaction) return;
    setReaction(petReaction);
    const t = (v: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(v, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: false });
    const settle = Animated.parallel([t(tilt, 0, 500), t(sink, 0, 500), t(chew, 1, 300), t(night, 0, 600)]);
    let anim: Animated.CompositeAnimation;

    if (petReaction.kind === 'sleep') {
      anim = Animated.sequence([
        Animated.parallel([t(tilt, -14, 700), t(sink, 10, 700), t(night, 0.35, 700)]),
        Animated.loop(Animated.sequence([t(chew, 0.97, 900), t(chew, 1, 900)]), { iterations: 2 }),
        settle,
      ]);
    } else if (petReaction.kind === 'eat') {
      food.setValue(0);
      setEatFrame(0);
      const chomp = Animated.sequence([t(chew, 0.88, 120), t(chew, 1.05, 120)]);
      anim = Animated.sequence([
        Animated.delay(300),
        t(food, 1, 900),
        Animated.loop(chomp, { iterations: 4 }),
        Animated.delay(800),
        settle,
      ]);
    } else {
      const e = petReaction.emotion;
      const jump = Animated.sequence([t(sink, -18, 180), t(sink, 0, 220)]);
      const motion =
        e === 'very_good' || e === 'good'
          ? Animated.sequence([jump, jump, Animated.delay(1600)])
          : e === 'okay'
            ? Animated.loop(Animated.sequence([t(tilt, 6, 400), t(tilt, -6, 400)]), { iterations: 3 })
            : e === 'tired' || e === 'very_hard'
              ? Animated.sequence([Animated.parallel([t(sink, 10, 900), t(chew, 0.94, 900)]), Animated.delay(1800)])
              : e === 'unsure'
                ? Animated.sequence([t(tilt, 12, 400), Animated.delay(1800)])
                : Animated.sequence([t(sink, 6, 300), t(sink, 0, 300), Animated.delay(1600)]);
      anim = Animated.sequence([motion, settle]);
    }
    // Eating faces: open while the food flies in (1.2s), chew open/closed 4 times, then a happy gulp.
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (petReaction.kind === 'eat') {
      const at = (ms: number, frame: number) => timers.push(setTimeout(() => setEatFrame(frame), ms));
      for (let i = 0; i < 8; i++) at(1200 + i * 120, i % 2 === 0 ? 1 : 0);
      at(1200 + 8 * 120, 2);
    }
    anim.start(({ finished }) => finished && setReaction(null));
    return () => {
      anim.stop();
      timers.forEach(clearTimeout);
    };
  }, [petReaction, tilt, sink, chew, night, food]);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const particleScale = useRef(new Animated.Value(0)).current;
  const [particleEmoji, setParticleEmoji] = React.useState('💖');
  const [showParticle, setShowParticle] = React.useState(false);

  // Floating ambient animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const handlePress = () => {
    triggerPetInteraction();
    const emojis = ['💖', '✨', '🎶', '⭐', '🥰', '🎈'];
    setParticleEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
    setShowParticle(true);

    // Bounce
    bounceAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: -16,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]).start();

    // Particle
    particleScale.setValue(0);
    Animated.sequence([
      Animated.timing(particleScale, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(particleScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowParticle(false);
    });

    onTap?.();
  };

  const progress = growthProgress(state.level, state.growthTotal);

  const currentLevelInfo =
    levelsData.find((l) => l.level === state.level) || levelsData[2];
  // Art for the current reaction when the team adds it; otherwise the stage image.
  const art = petStateArt[state.level];
  const reactionArt =
    reaction?.kind === 'sleep'
      ? art?.sleep
      : reaction?.kind === 'eat'
        ? art?.eat?.[eatFrame]
        : reaction?.kind === 'mood'
          ? art?.mood?.[reaction.emotion]
          : undefined;
  const moodEmoji =
    reaction?.kind === 'mood' && !reactionArt ? (reaction.emotion === 'very_hard' ? '💧' : mindEmotions.find((m) => m.id === reaction.emotion)?.emoji) : null;

  const equippedCostumeItem = costumesData.find(
    (c) => c.id === state.equippedCostume
  );

  return (
    <View style={styles.container}>
      {/* Speech Dialogue Bubble */}
      <View style={styles.speechBubble}>
        <Text style={styles.dialogueText}>{currentDialogue}</Text>
        <View style={styles.speechArrow} />
      </View>

      {/* Interactive Pet Image */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.petTouchable}>
        <Animated.View
          style={[
            styles.petWrapper,
            {
              transform: [
                { translateY: Animated.add(floatAnim, bounceAnim) },
              ],
            },
          ]}>
          {/* Equipped Costume Icon on top of pet */}
          {equippedCostumeItem && (
            <View style={styles.costumeContainer}>
              <Text style={styles.costumeEmoji}>
                {equippedCostumeItem.icon}
              </Text>
            </View>
          )}

          {/* Floating Tap Reaction Particle */}
          {showParticle && (
            <Animated.View
              style={[
                styles.particle,
                {
                  transform: [
                    { scale: particleScale },
                    { translateY: -30 },
                  ],
                },
              ]}>
              <Text style={styles.particleEmoji}>{particleEmoji}</Text>
            </Animated.View>
          )}

          <Animated.View
            style={{
              transform: [
                { translateY: sink },
                { rotate: tilt.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) },
                { scaleY: chew },
              ],
            }}>
            <Image source={reactionArt ?? currentLevelInfo.image} style={styles.petImage} resizeMode="contain" />
          </Animated.View>

          {/* Night falls over FoodyMon while it sleeps */}
          <Animated.View pointerEvents="none" style={[styles.night, { opacity: night }]} />
          {reaction?.kind === 'sleep' && <Text style={styles.zzz}>💤</Text>}

          {/* The meal flies in and gets eaten */}
          {reaction?.kind === 'eat' && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.food,
                {
                  opacity: food.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
                  transform: [
                    { translateX: food.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
                    { translateY: food.interpolate({ inputRange: [0, 1], outputRange: [-90, 30] }) },
                    { scale: food.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
                  ],
                },
              ]}>
              {reaction.photoUri ? (
                <Image source={{ uri: reaction.photoUri }} style={styles.foodPhoto} />
              ) : (
                <Text style={styles.foodEmoji}>{reaction.emoji}</Text>
              )}
            </Animated.View>
          )}
          {reaction?.kind === 'eat' && <Text style={styles.yum}>냠냠</Text>}

          {/* The feeling FoodyMon shares with the user */}
          {moodEmoji && <Text style={styles.moodEmoji}>{moodEmoji}</Text>}
        </Animated.View>

        {/* Soft Shadow */}
        <View style={styles.shadow} />
      </TouchableOpacity>

      {/* Growth card: cumulative points toward the next stage (재형 피드백) */}
      <View
        style={styles.scoreContainer}
        accessibilityLabel={
          progress.next === null
            ? `최고 단계, 누적 ${state.growthTotal}점`
            : `다음 성장까지 ${progress.remaining}점, 누적 ${state.growthTotal}점 중 ${progress.next}점`
        }>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>
            {progress.next === null ? '최고 단계에 도착했어요!' : `다음 성장까지 ${progress.remaining}점`}
          </Text>
          <Text style={styles.scoreValue}>
            {progress.next === null ? `${state.growthTotal}점` : `${state.growthTotal} / ${progress.next}점`}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
        </View>
        <Text style={styles.scoreMeta}>
          오늘 +{state.todayPoints.total}점 · 수면 {state.records.sleep ? 1 : 0} · 식사{' '}
          {state.records.meals.length} · 마음 {state.records.minds.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  speechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
    maxWidth: '85%',
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  dialogueText: {
    fontSize: 14,
    color: '#2D3748',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '700',
  },
  speechArrow: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    transform: [{ rotate: '45deg' }],
  },
  petTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  petImage: {
    width: 220,
    height: 220,
  },
  night: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#1E1B4B',
  },
  zzz: {
    position: 'absolute',
    top: 10,
    right: 18,
    fontSize: 34,
  },
  food: {
    position: 'absolute',
    top: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodPhoto: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  foodEmoji: {
    fontSize: 56,
  },
  yum: {
    position: 'absolute',
    bottom: 30,
    right: 10,
    fontSize: 16,
    color: '#17765D',
    fontWeight: '900',
  },
  moodEmoji: {
    position: 'absolute',
    top: 4,
    left: 14,
    fontSize: 38,
  },
  costumeContainer: {
    position: 'absolute',
    top: 5,
    zIndex: 10,
  },
  costumeEmoji: {
    fontSize: 42,
    fontWeight: '600',
  },
  particle: {
    position: 'absolute',
    top: -10,
    right: 20,
    zIndex: 20,
  },
  particleEmoji: {
    fontSize: 36,
    fontWeight: '600',
  },
  shadow: {
    width: 120,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderRadius: 60,
    marginTop: -8,
  },
  scoreContainer: {
    width: '80%',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '700',
  },
  scoreValue: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#EDF2F7',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1B7F66',
    borderRadius: 5,
  },
  scoreMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
});
