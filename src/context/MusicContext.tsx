import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useFoodyMon } from '@/context/FoodyMonContext';

// Prologue/tutorial plays the story theme; the forest (main app) plays the gentle loop.
const storyTrack = require('../../assets/audio/story.mp3');
const homeTrack = require('../../assets/audio/home.mp3');
const MUSIC_KEY = 'foodymon:music-on';
const VOLUME = 0.4;

interface MusicContextType {
  musicOn: boolean;
  setMusicOn: (on: boolean) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const { state, loading } = useFoodyMon();
  const [musicOn, setMusicOnState] = useState<boolean | null>(null); // null until the saved choice is read
  const player = useAudioPlayer(state.onboarded ? homeTrack : storyTrack);

  useEffect(() => {
    // Respect the silent switch, don't stop the user's own music, pause in the background.
    setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).catch(() => {});
    AsyncStorage.getItem(MUSIC_KEY)
      .then((v) => setMusicOnState(v !== 'off'))
      .catch(() => setMusicOnState(true));
  }, []);

  useEffect(() => {
    if (loading || musicOn === null) return;
    player.loop = true;
    player.volume = VOLUME;
    if (musicOn) player.play();
    else player.pause();
  }, [player, musicOn, loading, state.onboarded]);

  const setMusicOn = (on: boolean) => {
    setMusicOnState(on);
    AsyncStorage.setItem(MUSIC_KEY, on ? 'on' : 'off').catch(() => {});
  };

  return (
    <MusicContext.Provider value={{ musicOn: musicOn ?? true, setMusicOn }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
}
