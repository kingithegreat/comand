import React, { createContext, useContext, useState, useEffect } from 'react';

let audioCtx: AudioContext | null = null;

export type SoundEffect = 'click' | 'move' | 'attack' | 'damage' | 'deploy' | 'win' | 'lose';

interface AudioContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  playSound: (effect: SoundEffect) => void;
}

const defaultContextValue: AudioContextType = {
  soundEnabled: false,
  toggleSound: () => {},
  playSound: () => {},
};

const AudioContext = createContext<AudioContextType>(defaultContextValue);

export const useAudio = () => useContext(AudioContext);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('soundEnabled', soundEnabled.toString());
    if (soundEnabled && !audioCtx) {
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API is not supported in this browser', e);
      }
    }
  }, [soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (next && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(console.warn);
      }
      return next;
    });
  };

  const playSynthesizedSound = (effect: SoundEffect) => {
    if (!soundEnabled || !audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(console.warn);
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch (effect) {
      case 'click':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;
      case 'move':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.linearRampToValueAtTime(250, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
      case 'deploy':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
      case 'attack':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
      case 'damage':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(120, now);
        oscillator.frequency.linearRampToValueAtTime(50, now + 0.3);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;
      case 'win':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.setValueAtTime(554, now + 0.1);
        oscillator.frequency.setValueAtTime(659, now + 0.2);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
        break;
      case 'lose':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.linearRampToValueAtTime(150, now + 0.5);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;
    }
  };

  const playSound = (effect: SoundEffect) => {
    try {
      playSynthesizedSound(effect);
    } catch(e) {
      console.warn("Audio playback failed", e);
    }
  };

  return (
    <AudioContext.Provider value={{ soundEnabled, toggleSound, playSound }}>
      {children}
    </AudioContext.Provider>
  );
};
