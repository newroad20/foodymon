import React, { useRef, useEffect } from 'react';
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
import { levelsData, costumesData } from '@/constants/foodymonData';

interface PetAvatarProps {
  onTap?: () => void;
}

export function PetAvatar({ onTap }: PetAvatarProps) {
  const { state, currentDialogue, triggerPetInteraction } = useFoodyMon();
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

  const currentLevelInfo =
    levelsData.find((l) => l.level === state.level) || levelsData[2];

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

          <Image
            source={currentLevelInfo.image}
            style={styles.petImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Soft Shadow */}
        <View style={styles.shadow} />
      </TouchableOpacity>

      {/* Daily Score Progress Bar */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>오늘의 건강 지수</Text>
          <Text style={styles.scoreValue}>{state.currentDailyScore}점</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${state.currentDailyScore}%` },
            ]}
          />
        </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  dialogueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    lineHeight: 20,
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
  costumeContainer: {
    position: 'absolute',
    top: 5,
    zIndex: 10,
  },
  costumeEmoji: {
    fontSize: 42,
  },
  particle: {
    position: 'absolute',
    top: -10,
    right: 20,
    zIndex: 20,
  },
  particleEmoji: {
    fontSize: 36,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5568',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#EDF2F7',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#48BB78',
    borderRadius: 5,
  },
});
