import { StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
import { color, font, radius } from '@/constants/theme';

/** Closes the whole 마음 쉼터 modal from any screen inside it. */
export function useCloseShelter() {
  const navigation = useNavigation();
  return () => navigation.getParent()?.goBack();
}

// Shared by the 마음 쉼터 screens (src/app/shelter/*).
export const shelterStyles = StyleSheet.create({
  screen: {
    padding: 24,
    gap: 16,
  },
  question: {
    fontSize: font.body,
    color: color.ink,
    fontWeight: '900',
    lineHeight: 24,
  },
  bubble: {
    padding: 16,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: color.lineSoft,
  },
  bubbleText: {
    fontSize: font.body,
    color: color.ink,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  pet: {
    width: 160,
    height: 160,
    alignSelf: 'center',
  },
  primaryBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderBottomWidth: 4,
    borderBottomColor: color.accentEdge,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: color.surface,
    fontSize: font.body,
    fontWeight: '900',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    fontSize: font.subhead,
    color: color.muted,
    fontWeight: '700',
  },
});
