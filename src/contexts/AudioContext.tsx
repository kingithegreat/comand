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
        oscillator.frequency.setValueAtTime(450, now);
        oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.05);
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;
      case 'move':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(250, now);
        oscillator.frequency.linearRampToValueAtTime(320, now + 0.08);
        oscillator.frequency.linearRampToValueAtTime(180, now + 0.15);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
      case 'deploy':
        // Modernized digital synth deploy sound (dual frequency sweep block)
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(100, now);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.25);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.25);

        // Sub-oscillator for mechanical vibration
        try {
          const subOsc = audioCtx.createOscillator();
          const subGain = audioCtx.createGain();
          subOsc.type = 'sawtooth';
          subOsc.frequency.setValueAtTime(80, now);
          subOsc.frequency.linearRampToValueAtTime(40, now + 0.25);
          subGain.gain.setValueAtTime(0.25, now);
          subGain.gain.linearRampToValueAtTime(0.01, now + 0.25);
          subOsc.connect(subGain);
          subGain.connect(audioCtx.destination);
          subOsc.start(now);
          subOsc.stop(now + 0.25);
        } catch (_) {}
        break;
      case 'attack':
        // Quad-fire automatic burst sequence!
        for (let i = 0; i < 3; i++) {
          const burstTime = now + (i * 0.07);
          try {
            const burstOsc = audioCtx.createOscillator();
            const burstGain = audioCtx.createGain();
            burstOsc.type = 'sawtooth';
            burstOsc.frequency.setValueAtTime(900 - (i * 100), burstTime);
            burstOsc.frequency.linearRampToValueAtTime(150, burstTime + 0.06);
            burstGain.gain.setValueAtTime(0.35, burstTime);
            burstGain.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.06);
            burstOsc.connect(burstGain);
            burstGain.connect(audioCtx.destination);
            burstOsc.start(burstTime);
            burstOsc.stop(burstTime + 0.06);
          } catch (_) {}
        }
        break;
      case 'damage':
        // Heavy bass boom mixed with metallic shred
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(110, now);
        oscillator.frequency.linearRampToValueAtTime(30, now + 0.4);
        gainNode.gain.setValueAtTime(0.65, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);

        // High frequency fragmentation spike
        try {
          const sparkOsc = audioCtx.createOscillator();
          const sparkGain = audioCtx.createGain();
          sparkOsc.type = 'triangle';
          sparkOsc.frequency.setValueAtTime(1800, now);
          sparkOsc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
          sparkGain.gain.setValueAtTime(0.4, now);
          sparkGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          sparkOsc.connect(sparkGain);
          sparkGain.connect(audioCtx.destination);
          sparkOsc.start(now);
          sparkOsc.stop(now + 0.15);
        } catch (_) {}
        break;
      case 'win':
        // High-energy major pentatonic triumphant fanfare
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C, E, G, C(hi), E(hi)
        notes.forEach((freq, idx) => {
          const noteTime = now + (idx * 0.08);
          try {
            const fanfareOsc = audioCtx.createOscillator();
            const fanfareGain = audioCtx.createGain();
            fanfareOsc.type = 'sine';
            fanfareOsc.frequency.setValueAtTime(freq, noteTime);
            fanfareGain.gain.setValueAtTime(0.35, noteTime);
            fanfareGain.gain.linearRampToValueAtTime(0.01, noteTime + 0.25);
            fanfareOsc.connect(fanfareGain);
            fanfareGain.connect(audioCtx.destination);
            fanfareOsc.start(noteTime);
            fanfareOsc.stop(noteTime + 0.25);
          } catch (_) {}
        });
        break;
      case 'lose':
        // Melancholic, descending dramatic square alarm
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(350, now);
        oscillator.frequency.linearRampToValueAtTime(100, now + 0.6);
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.6);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
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
