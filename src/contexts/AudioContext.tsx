import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGetItem, safeSetItem } from '../lib/storage';

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

const getNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  if (!noiseBuffer) {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
};

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
    const saved = safeGetItem('soundEnabled');
    return saved === 'true';
  });

  useEffect(() => {
    safeSetItem('soundEnabled', soundEnabled.toString());
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
        // Tactical boots marching scramble sound using High-pass filtered noise footsteps!
        for (let i = 0; i < 3; i++) {
          const stepTime = now + (i * 0.12);
          try {
            // White noise source
            const noise = audioCtx.createBufferSource();
            noise.buffer = getNoiseBuffer(audioCtx);

            // High pass filter for clean gravelly shoe grit crunch
            const crunchFilter = audioCtx.createBiquadFilter();
            crunchFilter.type = 'highpass';
            crunchFilter.frequency.setValueAtTime(1800, stepTime);

            const crunchGain = audioCtx.createGain();
            crunchGain.gain.setValueAtTime(0.08, stepTime);
            crunchGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.08);

            noise.connect(crunchFilter);
            crunchFilter.connect(crunchGain);
            crunchGain.connect(audioCtx.destination);

            // Soft low thud to represent weight of armor plate
            const footThud = audioCtx.createOscillator();
            const thudGain = audioCtx.createGain();
            footThud.type = 'sine';
            footThud.frequency.setValueAtTime(75, stepTime);
            thudGain.gain.setValueAtTime(0.12, stepTime);
            thudGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.08);

            footThud.connect(thudGain);
            thudGain.connect(audioCtx.destination);

            noise.start(stepTime);
            noise.stop(stepTime + 0.08);
            footThud.start(stepTime);
            footThud.stop(stepTime + 0.08);
          } catch (_) {}
        }
        break;
      case 'deploy':
        // Modern tactical deploy: short comms radio squelch followed by deep pneumatic magnetic lock clamps!
        try {
          // Walkie-Talkie beep
          const beep = audioCtx.createOscillator();
          const beepGain = audioCtx.createGain();
          beep.type = 'sine';
          beep.frequency.setValueAtTime(1200, now);
          beepGain.gain.setValueAtTime(0.08, now);
          beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          beep.connect(beepGain);
          beepGain.connect(audioCtx.destination);
          beep.start(now);
          beep.stop(now + 0.04);

          // Hydraulic clasp impact noise
          const clampNoise = audioCtx.createBufferSource();
          clampNoise.buffer = getNoiseBuffer(audioCtx);
          const filter = audioCtx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(250, now + 0.02);
          const clampGain = audioCtx.createGain();
          clampGain.gain.setValueAtTime(0.24, now + 0.02);
          clampGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          
          clampNoise.connect(filter);
          filter.connect(clampGain);
          clampGain.connect(audioCtx.destination);
          clampNoise.start(now + 0.02);
          clampNoise.stop(now + 0.22);

          // Deep steel frame echo thud
          const anvil = audioCtx.createOscillator();
          const anvilGain = audioCtx.createGain();
          anvil.type = 'sawtooth';
          anvil.frequency.setValueAtTime(90, now + 0.02);
          anvil.frequency.linearRampToValueAtTime(30, now + 0.22);
          anvilGain.gain.setValueAtTime(0.28, now + 0.02);
          anvilGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          anvil.connect(anvilGain);
          anvilGain.connect(audioCtx.destination);
          anvil.start(now + 0.02);
          anvil.stop(now + 0.22);
        } catch (_) {}
        break;
      case 'attack':
        // Real militaristic automatic sniper/rifle burst with physical air cracks! No spacey synth laser pitches.
        for (let i = 0; i < 3; i++) {
          const burstTime = now + (i * 0.11);
          try {
            // Gunshot air crack (filtered white noise burst)
            const rifleSpark = audioCtx.createBufferSource();
            rifleSpark.buffer = getNoiseBuffer(audioCtx);
            const highFilter = audioCtx.createBiquadFilter();
            highFilter.type = 'bandpass';
            highFilter.frequency.setValueAtTime(1000 - (i * 50), burstTime); // physical chamber echo
            highFilter.Q.setValueAtTime(3.5, burstTime);
            
            const gunGain = audioCtx.createGain();
            gunGain.gain.setValueAtTime(0.38, burstTime);
            gunGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.09);

            rifleSpark.connect(highFilter);
            highFilter.connect(gunGain);
            gunGain.connect(audioCtx.destination);

            // Solid mechanical hammer bolt (Heavy sawtooth thud decaying instantly)
            const hammer = audioCtx.createOscillator();
            const hammerGain = audioCtx.createGain();
            hammer.type = 'sawtooth';
            hammer.frequency.setValueAtTime(220, burstTime);
            hammer.frequency.linearRampToValueAtTime(60, burstTime + 0.08);
            hammerGain.gain.setValueAtTime(0.45, burstTime);
            hammerGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.08);

            hammer.connect(hammerGain);
            hammerGain.connect(audioCtx.destination);

            rifleSpark.start(burstTime);
            rifleSpark.stop(burstTime + 0.09);
            hammer.start(burstTime);
            hammer.stop(burstTime + 0.09);
          } catch (_) {}
        }
        break;
      case 'damage':
        // Cinema-grade artillery explosion! Combines massive bass thud, shockwave, and shrapnel sizzles.
        try {
          // 1. Shockwave blast (Lowpass white noise rumble)
          const blastRumble = audioCtx.createBufferSource();
          blastRumble.buffer = getNoiseBuffer(audioCtx);
          const lowFilter = audioCtx.createBiquadFilter();
          lowFilter.type = 'lowpass';
          lowFilter.frequency.setValueAtTime(180, now);
          lowFilter.Q.setValueAtTime(1.5, now);
          
          const blastGain = audioCtx.createGain();
          blastGain.gain.setValueAtTime(0.65, now);
          blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

          blastRumble.connect(lowFilter);
          lowFilter.connect(blastGain);
          blastGain.connect(audioCtx.destination);
          blastRumble.start(now);
          blastRumble.stop(now + 0.48);

          // 2. Concrete rupture (Sub bass dropping core)
          const shockwave = audioCtx.createOscillator();
          const shockGain = audioCtx.createGain();
          shockwave.type = 'triangle';
          shockwave.frequency.setValueAtTime(110, now);
          shockwave.frequency.exponentialRampToValueAtTime(20, now + 0.45);
          
          shockGain.gain.setValueAtTime(0.72, now);
          shockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          shockwave.connect(shockGain);
          shockGain.connect(audioCtx.destination);
          shockwave.start(now);
          shockwave.stop(now + 0.45);

          // 3. Shrapnel sizzle / armor metal fragmentation (highpass sparkling noise)
          const fragmentation = audioCtx.createBufferSource();
          fragmentation.buffer = getNoiseBuffer(audioCtx);
          const highFilter = audioCtx.createBiquadFilter();
          highFilter.type = 'highpass';
          highFilter.frequency.setValueAtTime(3200, now);
          
          const fragGain = audioCtx.createGain();
          fragGain.gain.setValueAtTime(0.22, now);
          fragGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          fragmentation.connect(highFilter);
          highFilter.connect(fragGain);
          fragGain.connect(audioCtx.destination);
          fragmentation.start(now);
          fragmentation.stop(now + 0.22);
        } catch (_) {}
        break;
      case 'win':
        // Operatic combat success alert: solid military brass fanfare with a celebratory snare/laser sweep roll
        try {
          const notes = [196.00, 246.94, 293.66, 392.00, 493.88, 587.33]; // G3, B3, D4, G4, B4, D5 (Major Arpeggio)
          notes.forEach((freq, idx) => {
            const noteTime = now + (idx * 0.09);
            const oscIntel = audioCtx!.createOscillator();
            const gainIntel = audioCtx!.createGain();
            
            oscIntel.type = 'sawtooth'; // brass-like timbre
            oscIntel.frequency.setValueAtTime(freq, noteTime);
            
            // Subtle vibrato
            oscIntel.frequency.linearRampToValueAtTime(freq + 3, noteTime + 0.25);
            
            gainIntel.gain.setValueAtTime(0.24, noteTime);
            gainIntel.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);
            
            // Add bandpass filter to sound more like a high-tech tactical comms announcement
            const filterNode = audioCtx!.createBiquadFilter();
            filterNode.type = 'bandpass';
            filterNode.frequency.setValueAtTime(1200, noteTime);
            
            oscIntel.connect(filterNode);
            filterNode.connect(gainIntel);
            gainIntel.connect(audioCtx!.destination);
            
            oscIntel.start(noteTime);
            oscIntel.stop(noteTime + 0.28);
          });
        } catch (_) {}
        break;
      case 'lose':
        // Descending warning alarm representing defeat / database containment rupture
        try {
          const warningOsc = audioCtx.createOscillator();
          const warningGain = audioCtx.createGain();
          
          warningOsc.type = 'sawtooth';
          warningOsc.frequency.setValueAtTime(320, now);
          warningOsc.frequency.linearRampToValueAtTime(80, now + 0.7);
          
          // Heavy modulation sweep representing falling sirens
          warningGain.gain.setValueAtTime(0.35, now);
          warningGain.gain.linearRampToValueAtTime(0.001, now + 0.7);
          
          const lpfSiren = audioCtx.createBiquadFilter();
          lpfSiren.type = 'lowpass';
          lpfSiren.frequency.setValueAtTime(600, now);
          lpfSiren.frequency.linearRampToValueAtTime(200, now + 0.7);
          
          warningOsc.connect(lpfSiren);
          lpfSiren.connect(warningGain);
          warningGain.connect(audioCtx.destination);
          
          warningOsc.start(now);
          warningOsc.stop(now + 0.7);
        } catch (_) {}
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
