import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGetItem, safeSetItem } from '../lib/storage';

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let reverbBuffer: AudioBuffer | null = null;

const getNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  if (!noiseBuffer) {
    const bufferSize = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
};

const getReverbBuffer = (ctx: AudioContext, decay = 1.5): AudioBuffer => {
  if (!reverbBuffer) {
    const length = ctx.sampleRate * decay;
    reverbBuffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = reverbBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
  }
  return reverbBuffer;
};

const createReverb = (ctx: AudioContext): ConvolverNode => {
  const convolver = ctx.createConvolver();
  convolver.buffer = getReverbBuffer(ctx);
  return convolver;
};

const createCompressor = (ctx: AudioContext): DynamicsCompressorNode => {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-24, ctx.currentTime);
  comp.knee.setValueAtTime(30, ctx.currentTime);
  comp.ratio.setValueAtTime(4, ctx.currentTime);
  comp.attack.setValueAtTime(0.003, ctx.currentTime);
  comp.release.setValueAtTime(0.15, ctx.currentTime);
  return comp;
};

export type SoundEffect = 'click' | 'select' | 'move' | 'attack' | 'damage' | 'deploy' | 'win' | 'lose' | 'heal' | 'ability' | 'critical' | 'error' | 'destroy' | 'shield' | 'debuff' | 'turnChange' | 'explosion' | 'miss';
export type MusicTrack = 'menu' | 'battle' | 'none';

let musicNodes: { oscs: OscillatorNode[]; gains: GainNode[]; sources: AudioBufferSourceNode[]; master: GainNode | null; interval: ReturnType<typeof setInterval> | null } = {
  oscs: [], gains: [], sources: [], master: null, interval: null
};

const pruneMusicNodes = () => {
  const MAX_NODES = 30;
  if (musicNodes.oscs.length > MAX_NODES) {
    const old = musicNodes.oscs.splice(0, musicNodes.oscs.length - MAX_NODES);
    old.forEach(o => { try { o.disconnect(); } catch (_) {} });
  }
  if (musicNodes.gains.length > MAX_NODES) {
    const old = musicNodes.gains.splice(0, musicNodes.gains.length - MAX_NODES);
    old.forEach(g => { try { g.disconnect(); } catch (_) {} });
  }
  if (musicNodes.sources.length > MAX_NODES) {
    const old = musicNodes.sources.splice(0, musicNodes.sources.length - MAX_NODES);
    old.forEach(s => { try { s.disconnect(); } catch (_) {} });
  }
};

interface AudioContextType {
  soundEnabled: boolean;
  musicEnabled: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  playSound: (effect: SoundEffect) => void;
  startMusic: (track: MusicTrack) => void;
  stopMusic: () => void;
}

const defaultContextValue: AudioContextType = {
  soundEnabled: false,
  musicEnabled: false,
  toggleSound: () => {},
  toggleMusic: () => {},
  playSound: () => {},
  startMusic: () => {},
  stopMusic: () => {},
};

const SoundContext = createContext<AudioContextType>(defaultContextValue);

export const useAudio = () => useContext(SoundContext);

const stopMusicNodes = () => {
  musicNodes.oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch (_) {} });
  musicNodes.sources.forEach(s => { try { s.stop(); s.disconnect(); } catch (_) {} });
  musicNodes.gains.forEach(g => { try { g.disconnect(); } catch (_) {} });
  if (musicNodes.master) { try { musicNodes.master.disconnect(); } catch (_) {} }
  if (musicNodes.interval) clearInterval(musicNodes.interval);
  musicNodes = { oscs: [], gains: [], sources: [], master: null, interval: null };
};

const playMenuMusic = (ctx: AudioContext) => {
  stopMusicNodes();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.06, ctx.currentTime);
  master.connect(ctx.destination);
  musicNodes.master = master;

  const chords = [
    [130.81, 164.81, 196.00],
    [110.00, 138.59, 164.81],
    [116.54, 146.83, 174.61],
    [123.47, 155.56, 196.00],
  ];

  let chordIdx = 0;
  const playChord = () => {
    pruneMusicNodes();
    const now = ctx.currentTime;
    chords[chordIdx % chords.length].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.8);
      gain.gain.linearRampToValueAtTime(0, now + 3.8);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 4);
      musicNodes.oscs.push(osc);
      musicNodes.gains.push(gain);
    });

    const pad = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad.type = 'sine';
    pad.frequency.setValueAtTime(chords[chordIdx % chords.length][0] * 0.5, ctx.currentTime);
    padGain.gain.setValueAtTime(0, ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1);
    padGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.8);
    pad.connect(padGain);
    padGain.connect(master);
    pad.start(ctx.currentTime);
    pad.stop(ctx.currentTime + 4);
    musicNodes.oscs.push(pad);
    musicNodes.gains.push(padGain);

    chordIdx++;
  };

  playChord();
  musicNodes.interval = setInterval(playChord, 4000);
};

const playBattleMusic = (ctx: AudioContext) => {
  stopMusicNodes();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.07, ctx.currentTime);
  const comp = createCompressor(ctx);
  master.connect(comp);
  comp.connect(ctx.destination);
  musicNodes.master = master;

  const marchBass = [55, 55, 58.27, 51.91, 49, 49, 55, 51.91];
  const droneChords = [
    [82.41, 110, 146.83],
    [87.31, 116.54, 155.56],
    [77.78, 103.83, 138.59],
    [73.42, 98, 130.81],
  ];
  const brassNotes = [220, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94,
                      220, 196, 174.61, 196, 220, 261.63, 246.94, 220];
  let beatIdx = 0;

  const playBeat = () => {
    pruneMusicNodes();
    const now = ctx.currentTime;
    const beatInBar = beatIdx % 8;

    // War drum kick — heavy on beats 0 and 4 (march rhythm)
    if (beatInBar === 0 || beatInBar === 4) {
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(100, now);
      kick.frequency.exponentialRampToValueAtTime(25, now + 0.25);
      kickGain.gain.setValueAtTime(0.7, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      kick.connect(kickGain);
      kickGain.connect(master);
      kick.start(now);
      kick.stop(now + 0.35);
      musicNodes.oscs.push(kick);
      musicNodes.gains.push(kickGain);
    }

    // Snare-like hit on beats 2 and 6
    if (beatInBar === 2 || beatInBar === 6) {
      const snare = ctx.createBufferSource();
      snare.buffer = getNoiseBuffer(ctx);
      const snareFilter = ctx.createBiquadFilter();
      snareFilter.type = 'bandpass';
      snareFilter.frequency.setValueAtTime(3000, now);
      snareFilter.Q.setValueAtTime(1.5, now);
      const snareGain = ctx.createGain();
      snareGain.gain.setValueAtTime(0.18, now);
      snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      snare.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(master);
      snare.start(now);
      snare.stop(now + 0.12);
      musicNodes.sources.push(snare);
      musicNodes.gains.push(snareGain);
    }

    // Double-time toms on odd beats for urgency
    if (beatInBar % 2 === 1) {
      const tom = ctx.createOscillator();
      const tomGain = ctx.createGain();
      tom.type = 'sine';
      tom.frequency.setValueAtTime(beatInBar === 1 ? 150 : beatInBar === 3 ? 130 : beatInBar === 5 ? 170 : 120, now);
      tom.frequency.exponentialRampToValueAtTime(60, now + 0.15);
      tomGain.gain.setValueAtTime(0.25, now);
      tomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      tom.connect(tomGain);
      tomGain.connect(master);
      tom.start(now);
      tom.stop(now + 0.18);
      musicNodes.oscs.push(tom);
      musicNodes.gains.push(tomGain);
    }

    // Deep bass drone — changes every 8 beats
    const bassFreq = marchBass[beatInBar];
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    const bassFilter = ctx.createBiquadFilter();
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(bassFreq, now);
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(180, now);
    bassGain.gain.setValueAtTime(0.3, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    bass.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(master);
    bass.start(now);
    bass.stop(now + 0.45);
    musicNodes.oscs.push(bass);
    musicNodes.gains.push(bassGain);

    // Tension string pad — sustains over 4 bars, changes chord
    if (beatIdx % 16 === 0) {
      const chord = droneChords[Math.floor(beatIdx / 16) % droneChords.length];
      chord.forEach(freq => {
        const pad = ctx.createOscillator();
        const padGain = ctx.createGain();
        pad.type = 'sawtooth';
        pad.frequency.setValueAtTime(freq, now);
        pad.frequency.linearRampToValueAtTime(freq * 1.005, now + 4);
        const padFilter = ctx.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(400, now);
        padFilter.frequency.linearRampToValueAtTime(600, now + 3);
        padFilter.frequency.linearRampToValueAtTime(300, now + 7);
        padGain.gain.setValueAtTime(0, now);
        padGain.gain.linearRampToValueAtTime(0.12, now + 1.5);
        padGain.gain.linearRampToValueAtTime(0.08, now + 5);
        padGain.gain.linearRampToValueAtTime(0, now + 7.8);
        pad.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(master);
        pad.start(now);
        pad.stop(now + 8);
        musicNodes.oscs.push(pad);
        musicNodes.gains.push(padGain);
      });
    }

    // Brass-like melody — plays every 4 beats
    if (beatIdx % 4 === 0) {
      const note = brassNotes[Math.floor(beatIdx / 4) % brassNotes.length];
      const brass = ctx.createOscillator();
      const brassGain = ctx.createGain();
      const brassFilter = ctx.createBiquadFilter();
      brass.type = 'square';
      brass.frequency.setValueAtTime(note, now);
      brassFilter.type = 'lowpass';
      brassFilter.frequency.setValueAtTime(800, now);
      brassFilter.frequency.linearRampToValueAtTime(500, now + 1.5);
      brassGain.gain.setValueAtTime(0, now);
      brassGain.gain.linearRampToValueAtTime(0.1, now + 0.08);
      brassGain.gain.linearRampToValueAtTime(0.07, now + 0.5);
      brassGain.gain.linearRampToValueAtTime(0, now + 1.8);
      brass.connect(brassFilter);
      brassFilter.connect(brassGain);
      brassGain.connect(master);
      brass.start(now);
      brass.stop(now + 2);
      musicNodes.oscs.push(brass);
      musicNodes.gains.push(brassGain);
    }

    beatIdx++;
  };

  playBeat();
  musicNodes.interval = setInterval(playBeat, 375);
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = safeGetItem('soundEnabled');
    return saved === 'true';
  });
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    const saved = safeGetItem('musicEnabled');
    return saved === 'true';
  });
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>('none');

  useEffect(() => {
    safeSetItem('soundEnabled', soundEnabled.toString());
    if ((soundEnabled || musicEnabled) && !audioCtx) {
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        noiseBuffer = null;
        reverbBuffer = null;
      } catch (e) {
        console.warn('Web Audio API is not supported in this browser', e);
      }
    }
  }, [soundEnabled, musicEnabled]);

  useEffect(() => {
    safeSetItem('musicEnabled', musicEnabled.toString());
    if (!musicEnabled || !audioCtx) {
      stopMusicNodes();
      return;
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(console.warn);
    }
    if (currentTrack === 'menu') playMenuMusic(audioCtx);
    else if (currentTrack === 'battle') playBattleMusic(audioCtx);
    return () => { stopMusicNodes(); };
  }, [musicEnabled, currentTrack]);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (next && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(console.warn);
      }
      return next;
    });
  };

  const toggleMusic = () => {
    setMusicEnabled(prev => {
      const next = !prev;
      safeSetItem('musicEnabled', next.toString());
      if (next && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(console.warn);
      }
      return next;
    });
  };

  const startMusic = (track: MusicTrack) => {
    setCurrentTrack(track);
  };

  const stopMusic = () => {
    setCurrentTrack('none');
    stopMusicNodes();
  };

  const playSynthesizedSound = (effect: SoundEffect) => {
    if (!soundEnabled || !audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(console.warn);
    }

    const ctx = audioCtx;
    const now = ctx.currentTime;

    switch (effect) {
      case 'click': {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const gain2 = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.Q.setValueAtTime(2, now);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.03);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1800, now);
        gain2.gain.setValueAtTime(0.08, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
        osc2.start(now);
        osc2.stop(now + 0.03);
        break;
      }

      case 'select': {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const gain2 = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.06);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, now + 0.04);
        osc2.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
        osc2.start(now);
        osc2.stop(now + 0.12);
        break;
      }

      case 'move': {
        for (let i = 0; i < 4; i++) {
          const t = now + i * 0.1;
          try {
            const noise = ctx.createBufferSource();
            noise.buffer = getNoiseBuffer(ctx);
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.setValueAtTime(2000 + i * 200, t);
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.06, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            noise.connect(hp);
            hp.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            const thud = ctx.createOscillator();
            const thudGain = ctx.createGain();
            thud.type = 'sine';
            thud.frequency.setValueAtTime(80 - i * 5, t);
            thud.frequency.exponentialRampToValueAtTime(40, t + 0.06);
            thudGain.gain.setValueAtTime(0.14, t);
            thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

            thud.connect(thudGain);
            thudGain.connect(ctx.destination);

            const gear = ctx.createOscillator();
            const gearGain = ctx.createGain();
            gear.type = 'square';
            gear.frequency.setValueAtTime(3000 + Math.random() * 500, t);
            gearGain.gain.setValueAtTime(0.015, t);
            gearGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

            gear.connect(gearGain);
            gearGain.connect(ctx.destination);

            noise.start(t);
            noise.stop(t + 0.06);
            thud.start(t);
            thud.stop(t + 0.07);
            gear.start(t);
            gear.stop(t + 0.03);
          } catch (_) {}
        }
        break;
      }

      case 'deploy': {
        try {
          const beep1 = ctx.createOscillator();
          const beep1Gain = ctx.createGain();
          beep1.type = 'sine';
          beep1.frequency.setValueAtTime(1400, now);
          beep1Gain.gain.setValueAtTime(0.1, now);
          beep1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          beep1.connect(beep1Gain);
          beep1Gain.connect(ctx.destination);
          beep1.start(now);
          beep1.stop(now + 0.04);

          const beep2 = ctx.createOscillator();
          const beep2Gain = ctx.createGain();
          beep2.type = 'sine';
          beep2.frequency.setValueAtTime(1800, now + 0.05);
          beep2Gain.gain.setValueAtTime(0.08, now + 0.05);
          beep2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          beep2.connect(beep2Gain);
          beep2Gain.connect(ctx.destination);
          beep2.start(now + 0.05);
          beep2.stop(now + 0.09);

          const clamp = ctx.createBufferSource();
          clamp.buffer = getNoiseBuffer(ctx);
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(300, now + 0.08);
          bp.Q.setValueAtTime(2, now + 0.08);
          const clampGain = ctx.createGain();
          clampGain.gain.setValueAtTime(0.28, now + 0.08);
          clampGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          clamp.connect(bp);
          bp.connect(clampGain);
          clampGain.connect(ctx.destination);
          clamp.start(now + 0.08);
          clamp.stop(now + 0.25);

          const slam = ctx.createOscillator();
          const slamGain = ctx.createGain();
          slam.type = 'sawtooth';
          slam.frequency.setValueAtTime(100, now + 0.08);
          slam.frequency.exponentialRampToValueAtTime(25, now + 0.3);
          slamGain.gain.setValueAtTime(0.32, now + 0.08);
          slamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          slam.connect(slamGain);
          slamGain.connect(ctx.destination);
          slam.start(now + 0.08);
          slam.stop(now + 0.3);

          const hiss = ctx.createBufferSource();
          hiss.buffer = getNoiseBuffer(ctx);
          const hissHp = ctx.createBiquadFilter();
          hissHp.type = 'highpass';
          hissHp.frequency.setValueAtTime(4000, now + 0.1);
          const hissGain = ctx.createGain();
          hissGain.gain.setValueAtTime(0.04, now + 0.1);
          hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          hiss.connect(hissHp);
          hissHp.connect(hissGain);
          hissGain.connect(ctx.destination);
          hiss.start(now + 0.1);
          hiss.stop(now + 0.35);
        } catch (_) {}
        break;
      }

      case 'attack': {
        for (let i = 0; i < 3; i++) {
          const t = now + i * 0.1;
          try {
            const crack = ctx.createBufferSource();
            crack.buffer = getNoiseBuffer(ctx);
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(1200 - i * 100, t);
            bp.Q.setValueAtTime(4, t);
            const crackGain = ctx.createGain();
            crackGain.gain.setValueAtTime(0.4, t);
            crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
            crack.connect(bp);
            bp.connect(crackGain);
            crackGain.connect(ctx.destination);

            const bolt = ctx.createOscillator();
            const boltGain = ctx.createGain();
            bolt.type = 'sawtooth';
            bolt.frequency.setValueAtTime(250, t);
            bolt.frequency.exponentialRampToValueAtTime(50, t + 0.06);
            boltGain.gain.setValueAtTime(0.4, t);
            boltGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
            bolt.connect(boltGain);
            boltGain.connect(ctx.destination);

            const snap = ctx.createOscillator();
            const snapGain = ctx.createGain();
            snap.type = 'square';
            snap.frequency.setValueAtTime(3500, t);
            snap.frequency.exponentialRampToValueAtTime(1500, t + 0.02);
            snapGain.gain.setValueAtTime(0.08, t);
            snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
            snap.connect(snapGain);
            snapGain.connect(ctx.destination);

            crack.start(t);
            crack.stop(t + 0.07);
            bolt.start(t);
            bolt.stop(t + 0.06);
            snap.start(t);
            snap.stop(t + 0.03);
          } catch (_) {}
        }

        try {
          const tail = ctx.createBufferSource();
          tail.buffer = getNoiseBuffer(ctx);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(600, now + 0.25);
          lp.frequency.exponentialRampToValueAtTime(100, now + 0.5);
          const tailGain = ctx.createGain();
          tailGain.gain.setValueAtTime(0.06, now + 0.25);
          tailGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          tail.connect(lp);
          lp.connect(tailGain);
          tailGain.connect(ctx.destination);
          tail.start(now + 0.25);
          tail.stop(now + 0.5);
        } catch (_) {}
        break;
      }

      case 'damage': {
        try {
          const comp = createCompressor(ctx);
          comp.connect(ctx.destination);

          const blast = ctx.createBufferSource();
          blast.buffer = getNoiseBuffer(ctx);
          const blastLp = ctx.createBiquadFilter();
          blastLp.type = 'lowpass';
          blastLp.frequency.setValueAtTime(200, now);
          blastLp.Q.setValueAtTime(2, now);
          const blastGain = ctx.createGain();
          blastGain.gain.setValueAtTime(0.7, now);
          blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          blast.connect(blastLp);
          blastLp.connect(blastGain);
          blastGain.connect(comp);
          blast.start(now);
          blast.stop(now + 0.5);

          const sub = ctx.createOscillator();
          const subGain = ctx.createGain();
          sub.type = 'triangle';
          sub.frequency.setValueAtTime(120, now);
          sub.frequency.exponentialRampToValueAtTime(18, now + 0.5);
          subGain.gain.setValueAtTime(0.75, now);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          sub.connect(subGain);
          subGain.connect(comp);
          sub.start(now);
          sub.stop(now + 0.5);

          const crack = ctx.createOscillator();
          const crackGain = ctx.createGain();
          crack.type = 'sawtooth';
          crack.frequency.setValueAtTime(400, now);
          crack.frequency.exponentialRampToValueAtTime(80, now + 0.15);
          crackGain.gain.setValueAtTime(0.35, now);
          crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          crack.connect(crackGain);
          crackGain.connect(comp);
          crack.start(now);
          crack.stop(now + 0.15);

          const shrapnel = ctx.createBufferSource();
          shrapnel.buffer = getNoiseBuffer(ctx);
          const shrapHp = ctx.createBiquadFilter();
          shrapHp.type = 'highpass';
          shrapHp.frequency.setValueAtTime(3500, now);
          const shrapGain = ctx.createGain();
          shrapGain.gain.setValueAtTime(0.2, now);
          shrapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          shrapnel.connect(shrapHp);
          shrapHp.connect(shrapGain);
          shrapGain.connect(comp);
          shrapnel.start(now);
          shrapnel.stop(now + 0.25);

          const reverb = createReverb(ctx);
          const reverbGain = ctx.createGain();
          reverbGain.gain.setValueAtTime(0.15, now);
          const reverbSrc = ctx.createBufferSource();
          reverbSrc.buffer = getNoiseBuffer(ctx);
          const reverbBp = ctx.createBiquadFilter();
          reverbBp.type = 'bandpass';
          reverbBp.frequency.setValueAtTime(400, now);
          reverbSrc.connect(reverbBp);
          reverbBp.connect(reverb);
          reverb.connect(reverbGain);
          reverbGain.connect(ctx.destination);
          reverbSrc.start(now);
          reverbSrc.stop(now + 0.15);
        } catch (_) {}
        break;
      }

      case 'critical': {
        try {
          const comp = createCompressor(ctx);
          comp.connect(ctx.destination);

          const impact = ctx.createBufferSource();
          impact.buffer = getNoiseBuffer(ctx);
          const impactLp = ctx.createBiquadFilter();
          impactLp.type = 'lowpass';
          impactLp.frequency.setValueAtTime(250, now);
          const impactGain = ctx.createGain();
          impactGain.gain.setValueAtTime(0.85, now);
          impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          impact.connect(impactLp);
          impactLp.connect(impactGain);
          impactGain.connect(comp);
          impact.start(now);
          impact.stop(now + 0.6);

          const sub = ctx.createOscillator();
          const subGain = ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(140, now);
          sub.frequency.exponentialRampToValueAtTime(15, now + 0.6);
          subGain.gain.setValueAtTime(0.8, now);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          sub.connect(subGain);
          subGain.connect(comp);
          sub.start(now);
          sub.stop(now + 0.6);

          const ring = ctx.createOscillator();
          const ringGain = ctx.createGain();
          ring.type = 'sine';
          ring.frequency.setValueAtTime(2200, now + 0.05);
          ringGain.gain.setValueAtTime(0, now);
          ringGain.gain.linearRampToValueAtTime(0.12, now + 0.05);
          ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          ring.connect(ringGain);
          ringGain.connect(ctx.destination);
          ring.start(now);
          ring.stop(now + 0.8);

          const crunch = ctx.createOscillator();
          const crunchGain = ctx.createGain();
          crunch.type = 'sawtooth';
          crunch.frequency.setValueAtTime(500, now);
          crunch.frequency.exponentialRampToValueAtTime(60, now + 0.12);
          crunchGain.gain.setValueAtTime(0.5, now);
          crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          crunch.connect(crunchGain);
          crunchGain.connect(comp);
          crunch.start(now);
          crunch.stop(now + 0.12);
        } catch (_) {}
        break;
      }

      case 'heal': {
        try {
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, i) => {
            const t = now + i * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.2);
          });

          const shimmer = ctx.createBufferSource();
          shimmer.buffer = getNoiseBuffer(ctx);
          const shimmerBp = ctx.createBiquadFilter();
          shimmerBp.type = 'bandpass';
          shimmerBp.frequency.setValueAtTime(6000, now);
          shimmerBp.Q.setValueAtTime(8, now);
          const shimmerGain = ctx.createGain();
          shimmerGain.gain.setValueAtTime(0.03, now);
          shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          shimmer.connect(shimmerBp);
          shimmerBp.connect(shimmerGain);
          shimmerGain.connect(ctx.destination);
          shimmer.start(now);
          shimmer.stop(now + 0.4);

          const pad = ctx.createOscillator();
          const padGain = ctx.createGain();
          pad.type = 'triangle';
          pad.frequency.setValueAtTime(392, now);
          padGain.gain.setValueAtTime(0, now);
          padGain.gain.linearRampToValueAtTime(0.06, now + 0.1);
          padGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          pad.connect(padGain);
          padGain.connect(ctx.destination);
          pad.start(now);
          pad.stop(now + 0.5);
        } catch (_) {}
        break;
      }

      case 'ability': {
        try {
          const charge = ctx.createOscillator();
          const chargeGain = ctx.createGain();
          charge.type = 'sawtooth';
          charge.frequency.setValueAtTime(200, now);
          charge.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
          chargeGain.gain.setValueAtTime(0.15, now);
          chargeGain.gain.exponentialRampToValueAtTime(0.3, now + 0.18);
          chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          const chargeFilt = ctx.createBiquadFilter();
          chargeFilt.type = 'lowpass';
          chargeFilt.frequency.setValueAtTime(400, now);
          chargeFilt.frequency.exponentialRampToValueAtTime(3000, now + 0.2);

          charge.connect(chargeFilt);
          chargeFilt.connect(chargeGain);
          chargeGain.connect(ctx.destination);
          charge.start(now);
          charge.stop(now + 0.25);

          const release = ctx.createBufferSource();
          release.buffer = getNoiseBuffer(ctx);
          const relBp = ctx.createBiquadFilter();
          relBp.type = 'bandpass';
          relBp.frequency.setValueAtTime(2000, now + 0.18);
          relBp.Q.setValueAtTime(3, now + 0.18);
          const relGain = ctx.createGain();
          relGain.gain.setValueAtTime(0.25, now + 0.18);
          relGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          release.connect(relBp);
          relBp.connect(relGain);
          relGain.connect(ctx.destination);
          release.start(now + 0.18);
          release.stop(now + 0.4);

          const tone = ctx.createOscillator();
          const toneGain = ctx.createGain();
          tone.type = 'sine';
          tone.frequency.setValueAtTime(880, now + 0.2);
          tone.frequency.exponentialRampToValueAtTime(1320, now + 0.35);
          toneGain.gain.setValueAtTime(0.12, now + 0.2);
          toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          tone.connect(toneGain);
          toneGain.connect(ctx.destination);
          tone.start(now + 0.2);
          tone.stop(now + 0.4);
        } catch (_) {}
        break;
      }

      case 'win': {
        try {
          const notes = [196.00, 246.94, 293.66, 392.00, 493.88, 587.33, 783.99];
          const reverb = createReverb(ctx);
          const reverbGain = ctx.createGain();
          reverbGain.gain.setValueAtTime(0.12, now);
          reverb.connect(reverbGain);
          reverbGain.connect(ctx.destination);

          notes.forEach((freq, i) => {
            const t = now + i * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.linearRampToValueAtTime(freq + 3, t + 0.3);

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(1200, t);
            bp.Q.setValueAtTime(1.5, t);

            gain.gain.setValueAtTime(0.22, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

            osc.connect(bp);
            bp.connect(gain);
            gain.connect(ctx.destination);
            gain.connect(reverb);

            osc.start(t);
            osc.stop(t + 0.3);

            const harm = ctx.createOscillator();
            const harmGain = ctx.createGain();
            harm.type = 'sine';
            harm.frequency.setValueAtTime(freq * 2, t);
            harmGain.gain.setValueAtTime(0.06, t);
            harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            harm.connect(harmGain);
            harmGain.connect(ctx.destination);
            harm.start(t);
            harm.stop(t + 0.2);
          });

          const fanfare = ctx.createBufferSource();
          fanfare.buffer = getNoiseBuffer(ctx);
          const fanBp = ctx.createBiquadFilter();
          fanBp.type = 'bandpass';
          fanBp.frequency.setValueAtTime(4000, now + 0.4);
          fanBp.Q.setValueAtTime(5, now + 0.4);
          const fanGain = ctx.createGain();
          fanGain.gain.setValueAtTime(0.03, now + 0.4);
          fanGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          fanfare.connect(fanBp);
          fanBp.connect(fanGain);
          fanGain.connect(ctx.destination);
          fanfare.start(now + 0.4);
          fanfare.stop(now + 0.8);
        } catch (_) {}
        break;
      }

      case 'lose': {
        try {
          const siren = ctx.createOscillator();
          const sirenGain = ctx.createGain();
          siren.type = 'sawtooth';
          siren.frequency.setValueAtTime(350, now);
          siren.frequency.linearRampToValueAtTime(70, now + 0.8);
          sirenGain.gain.setValueAtTime(0.3, now);
          sirenGain.gain.linearRampToValueAtTime(0.001, now + 0.8);

          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(700, now);
          lp.frequency.linearRampToValueAtTime(150, now + 0.8);

          siren.connect(lp);
          lp.connect(sirenGain);
          sirenGain.connect(ctx.destination);
          siren.start(now);
          siren.stop(now + 0.8);

          const rumble = ctx.createOscillator();
          const rumbleGain = ctx.createGain();
          rumble.type = 'triangle';
          rumble.frequency.setValueAtTime(55, now);
          rumble.frequency.linearRampToValueAtTime(30, now + 0.8);
          rumbleGain.gain.setValueAtTime(0.2, now);
          rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
          rumble.connect(rumbleGain);
          rumbleGain.connect(ctx.destination);
          rumble.start(now);
          rumble.stop(now + 0.8);

          const static_ = ctx.createBufferSource();
          static_.buffer = getNoiseBuffer(ctx);
          const staticLp = ctx.createBiquadFilter();
          staticLp.type = 'lowpass';
          staticLp.frequency.setValueAtTime(400, now + 0.4);
          staticLp.frequency.linearRampToValueAtTime(100, now + 0.9);
          const staticGain = ctx.createGain();
          staticGain.gain.setValueAtTime(0, now);
          staticGain.gain.linearRampToValueAtTime(0.08, now + 0.4);
          staticGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
          static_.connect(staticLp);
          staticLp.connect(staticGain);
          staticGain.connect(ctx.destination);
          static_.start(now);
          static_.stop(now + 0.9);
        } catch (_) {}
        break;
      }

      case 'error': {
        try {
          // Harsh buzzer: two dissonant tones with distortion-like grit
          const buzz1 = ctx.createOscillator();
          const buzz1Gain = ctx.createGain();
          buzz1.type = 'sawtooth';
          buzz1.frequency.setValueAtTime(180, now);
          buzz1.frequency.linearRampToValueAtTime(120, now + 0.15);
          buzz1Gain.gain.setValueAtTime(0.3, now);
          buzz1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          const buzz1Filter = ctx.createBiquadFilter();
          buzz1Filter.type = 'lowpass';
          buzz1Filter.frequency.setValueAtTime(600, now);
          buzz1.connect(buzz1Filter);
          buzz1Filter.connect(buzz1Gain);
          buzz1Gain.connect(ctx.destination);
          buzz1.start(now);
          buzz1.stop(now + 0.18);

          // Second harsh tone slightly higher for dissonance
          const buzz2 = ctx.createOscillator();
          const buzz2Gain = ctx.createGain();
          buzz2.type = 'square';
          buzz2.frequency.setValueAtTime(210, now);
          buzz2.frequency.linearRampToValueAtTime(140, now + 0.15);
          buzz2Gain.gain.setValueAtTime(0.25, now);
          buzz2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          buzz2.connect(buzz2Gain);
          buzz2Gain.connect(ctx.destination);
          buzz2.start(now);
          buzz2.stop(now + 0.18);

          // Second beat of the buzzer (double-buzz pattern)
          const buzz3 = ctx.createOscillator();
          const buzz3Gain = ctx.createGain();
          buzz3.type = 'sawtooth';
          buzz3.frequency.setValueAtTime(150, now + 0.22);
          buzz3.frequency.linearRampToValueAtTime(90, now + 0.45);
          buzz3Gain.gain.setValueAtTime(0.35, now + 0.22);
          buzz3Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          const buzz3Filter = ctx.createBiquadFilter();
          buzz3Filter.type = 'lowpass';
          buzz3Filter.frequency.setValueAtTime(500, now + 0.22);
          buzz3.connect(buzz3Filter);
          buzz3Filter.connect(buzz3Gain);
          buzz3Gain.connect(ctx.destination);
          buzz3.start(now + 0.22);
          buzz3.stop(now + 0.5);

          const buzz4 = ctx.createOscillator();
          const buzz4Gain = ctx.createGain();
          buzz4.type = 'square';
          buzz4.frequency.setValueAtTime(175, now + 0.22);
          buzz4.frequency.linearRampToValueAtTime(100, now + 0.45);
          buzz4Gain.gain.setValueAtTime(0.3, now + 0.22);
          buzz4Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          buzz4.connect(buzz4Gain);
          buzz4Gain.connect(ctx.destination);
          buzz4.start(now + 0.22);
          buzz4.stop(now + 0.5);

          // Noise burst for texture
          const errNoise = ctx.createBufferSource();
          errNoise.buffer = getNoiseBuffer(ctx);
          const errNoiseBp = ctx.createBiquadFilter();
          errNoiseBp.type = 'bandpass';
          errNoiseBp.frequency.setValueAtTime(400, now);
          errNoiseBp.Q.setValueAtTime(2, now);
          const errNoiseGain = ctx.createGain();
          errNoiseGain.gain.setValueAtTime(0.12, now);
          errNoiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          errNoise.connect(errNoiseBp);
          errNoiseBp.connect(errNoiseGain);
          errNoiseGain.connect(ctx.destination);
          errNoise.start(now);
          errNoise.stop(now + 0.15);
        } catch (_) {}
        break;
      }

      case 'destroy': {
        try {
          const comp = createCompressor(ctx);
          comp.connect(ctx.destination);

          // Heavy initial blast - loud noise burst
          const blast = ctx.createBufferSource();
          blast.buffer = getNoiseBuffer(ctx);
          const blastLp = ctx.createBiquadFilter();
          blastLp.type = 'lowpass';
          blastLp.frequency.setValueAtTime(1200, now);
          blastLp.frequency.exponentialRampToValueAtTime(150, now + 0.4);
          blastLp.Q.setValueAtTime(1.5, now);
          const blastGain = ctx.createGain();
          blastGain.gain.setValueAtTime(0.7, now);
          blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          blast.connect(blastLp);
          blastLp.connect(blastGain);
          blastGain.connect(comp);
          blast.start(now);
          blast.stop(now + 0.5);

          // Deep sub-bass boom that drops in pitch
          const boom = ctx.createOscillator();
          const boomGain = ctx.createGain();
          boom.type = 'sine';
          boom.frequency.setValueAtTime(150, now);
          boom.frequency.exponentialRampToValueAtTime(20, now + 0.5);
          boomGain.gain.setValueAtTime(0.8, now);
          boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          boom.connect(boomGain);
          boomGain.connect(comp);
          boom.start(now);
          boom.stop(now + 0.6);

          // Cracking/shattering mid layer
          const crack = ctx.createOscillator();
          const crackGain = ctx.createGain();
          crack.type = 'sawtooth';
          crack.frequency.setValueAtTime(600, now);
          crack.frequency.exponentialRampToValueAtTime(80, now + 0.12);
          crackGain.gain.setValueAtTime(0.45, now);
          crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          crack.connect(crackGain);
          crackGain.connect(comp);
          crack.start(now);
          crack.stop(now + 0.15);

          // High-frequency shrapnel/debris
          const shrap = ctx.createBufferSource();
          shrap.buffer = getNoiseBuffer(ctx);
          const shrapHp = ctx.createBiquadFilter();
          shrapHp.type = 'highpass';
          shrapHp.frequency.setValueAtTime(3000, now + 0.03);
          const shrapGain = ctx.createGain();
          shrapGain.gain.setValueAtTime(0.25, now + 0.03);
          shrapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          shrap.connect(shrapHp);
          shrapHp.connect(shrapGain);
          shrapGain.connect(comp);
          shrap.start(now + 0.03);
          shrap.stop(now + 0.35);

          // Metallic ring from destruction
          const ring = ctx.createOscillator();
          const ringGain = ctx.createGain();
          ring.type = 'sine';
          ring.frequency.setValueAtTime(1800, now + 0.02);
          ring.frequency.exponentialRampToValueAtTime(900, now + 0.4);
          ringGain.gain.setValueAtTime(0.1, now + 0.02);
          ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          ring.connect(ringGain);
          ringGain.connect(ctx.destination);
          ring.start(now + 0.02);
          ring.stop(now + 0.5);

          // Reverb tail for spaciousness
          const reverb = createReverb(ctx);
          const reverbGain = ctx.createGain();
          reverbGain.gain.setValueAtTime(0.12, now);
          const revSrc = ctx.createBufferSource();
          revSrc.buffer = getNoiseBuffer(ctx);
          const revBp = ctx.createBiquadFilter();
          revBp.type = 'bandpass';
          revBp.frequency.setValueAtTime(500, now);
          revSrc.connect(revBp);
          revBp.connect(reverb);
          reverb.connect(reverbGain);
          reverbGain.connect(ctx.destination);
          revSrc.start(now);
          revSrc.stop(now + 0.15);
        } catch (_) {}
        break;
      }

      case 'shield': {
        try {
          // Ascending sparkle/chime - four rising bell-like tones
          const shieldNotes = [880, 1174.66, 1396.91, 1760];
          shieldNotes.forEach((freq, i) => {
            const t = now + i * 0.07;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);

            // Harmonic overtone for shimmer
            const harm = ctx.createOscillator();
            const harmGain = ctx.createGain();
            harm.type = 'sine';
            harm.frequency.setValueAtTime(freq * 2.5, t);
            harmGain.gain.setValueAtTime(0, t);
            harmGain.gain.linearRampToValueAtTime(0.05, t + 0.02);
            harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            harm.connect(harmGain);
            harmGain.connect(ctx.destination);
            harm.start(t);
            harm.stop(t + 0.15);
          });

          // Crystalline noise shimmer
          const shimmer = ctx.createBufferSource();
          shimmer.buffer = getNoiseBuffer(ctx);
          const shimBp = ctx.createBiquadFilter();
          shimBp.type = 'bandpass';
          shimBp.frequency.setValueAtTime(8000, now);
          shimBp.Q.setValueAtTime(10, now);
          const shimGain = ctx.createGain();
          shimGain.gain.setValueAtTime(0.04, now);
          shimGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          shimmer.connect(shimBp);
          shimBp.connect(shimGain);
          shimGain.connect(ctx.destination);
          shimmer.start(now);
          shimmer.stop(now + 0.5);

          // Warm pad underneath for body
          const pad = ctx.createOscillator();
          const padGain = ctx.createGain();
          pad.type = 'triangle';
          pad.frequency.setValueAtTime(440, now);
          pad.frequency.linearRampToValueAtTime(880, now + 0.3);
          padGain.gain.setValueAtTime(0, now);
          padGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
          padGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          pad.connect(padGain);
          padGain.connect(ctx.destination);
          pad.start(now);
          pad.stop(now + 0.45);
        } catch (_) {}
        break;
      }

      case 'debuff': {
        try {
          // Descending ominous tone - three falling dissonant notes
          const debuffNotes = [440, 330, 220];
          debuffNotes.forEach((freq, i) => {
            const t = now + i * 0.12;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.15);
            const filt = ctx.createBiquadFilter();
            filt.type = 'lowpass';
            filt.frequency.setValueAtTime(800, t);
            filt.frequency.exponentialRampToValueAtTime(200, t + 0.15);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            osc.connect(filt);
            filt.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.18);
          });

          // Low rumbling undertone for dread
          const drone = ctx.createOscillator();
          const droneGain = ctx.createGain();
          drone.type = 'sine';
          drone.frequency.setValueAtTime(80, now);
          drone.frequency.linearRampToValueAtTime(50, now + 0.5);
          droneGain.gain.setValueAtTime(0.2, now);
          droneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          drone.connect(droneGain);
          droneGain.connect(ctx.destination);
          drone.start(now);
          drone.stop(now + 0.55);

          // Dissonant minor second for unease
          const dissonance = ctx.createOscillator();
          const dissGain = ctx.createGain();
          dissonance.type = 'square';
          dissonance.frequency.setValueAtTime(233, now);
          dissonance.frequency.linearRampToValueAtTime(116, now + 0.4);
          const dissFilt = ctx.createBiquadFilter();
          dissFilt.type = 'lowpass';
          dissFilt.frequency.setValueAtTime(500, now);
          dissGain.gain.setValueAtTime(0.08, now);
          dissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          dissonance.connect(dissFilt);
          dissFilt.connect(dissGain);
          dissGain.connect(ctx.destination);
          dissonance.start(now);
          dissonance.stop(now + 0.45);
        } catch (_) {}
        break;
      }

      case 'turnChange': {
        try {
          // Quick military snare roll (rapid noise bursts)
          for (let i = 0; i < 6; i++) {
            const t = now + i * 0.04;
            const hit = ctx.createBufferSource();
            hit.buffer = getNoiseBuffer(ctx);
            const hitBp = ctx.createBiquadFilter();
            hitBp.type = 'bandpass';
            hitBp.frequency.setValueAtTime(3500, t);
            hitBp.Q.setValueAtTime(2, t);
            const hitGain = ctx.createGain();
            hitGain.gain.setValueAtTime(0.15 + i * 0.03, t);
            hitGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            hit.connect(hitBp);
            hitBp.connect(hitGain);
            hitGain.connect(ctx.destination);
            hit.start(t);
            hit.stop(t + 0.04);
          }

          // Accented final hit (louder snare)
          const accent = ctx.createBufferSource();
          accent.buffer = getNoiseBuffer(ctx);
          const accentBp = ctx.createBiquadFilter();
          accentBp.type = 'bandpass';
          accentBp.frequency.setValueAtTime(3000, now + 0.28);
          accentBp.Q.setValueAtTime(1.5, now + 0.28);
          const accentGain = ctx.createGain();
          accentGain.gain.setValueAtTime(0.35, now + 0.28);
          accentGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          accent.connect(accentBp);
          accentBp.connect(accentGain);
          accentGain.connect(ctx.destination);
          accent.start(now + 0.28);
          accent.stop(now + 0.4);

          // Brief brass-like alert tone at the end
          const alert = ctx.createOscillator();
          const alertGain = ctx.createGain();
          alert.type = 'square';
          alert.frequency.setValueAtTime(523.25, now + 0.3);
          const alertFilt = ctx.createBiquadFilter();
          alertFilt.type = 'lowpass';
          alertFilt.frequency.setValueAtTime(1000, now + 0.3);
          alertFilt.frequency.exponentialRampToValueAtTime(400, now + 0.55);
          alertGain.gain.setValueAtTime(0, now + 0.3);
          alertGain.gain.linearRampToValueAtTime(0.15, now + 0.33);
          alertGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          alert.connect(alertFilt);
          alertFilt.connect(alertGain);
          alertGain.connect(ctx.destination);
          alert.start(now + 0.3);
          alert.stop(now + 0.55);

          // Kick drum under the accent
          const kick = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(120, now + 0.28);
          kick.frequency.exponentialRampToValueAtTime(40, now + 0.4);
          kickGain.gain.setValueAtTime(0.3, now + 0.28);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
          kick.connect(kickGain);
          kickGain.connect(ctx.destination);
          kick.start(now + 0.28);
          kick.stop(now + 0.42);
        } catch (_) {}
        break;
      }

      case 'explosion': {
        try {
          const comp = createCompressor(ctx);
          comp.connect(ctx.destination);

          // Massive initial noise blast
          const blast = ctx.createBufferSource();
          blast.buffer = getNoiseBuffer(ctx);
          const blastLp = ctx.createBiquadFilter();
          blastLp.type = 'lowpass';
          blastLp.frequency.setValueAtTime(2000, now);
          blastLp.frequency.exponentialRampToValueAtTime(80, now + 0.6);
          blastLp.Q.setValueAtTime(1, now);
          const blastGain = ctx.createGain();
          blastGain.gain.setValueAtTime(0.8, now);
          blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
          blast.connect(blastLp);
          blastLp.connect(blastGain);
          blastGain.connect(comp);
          blast.start(now);
          blast.stop(now + 0.7);

          // Very deep sub-bass rumble
          const sub = ctx.createOscillator();
          const subGain = ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(60, now);
          sub.frequency.exponentialRampToValueAtTime(15, now + 0.8);
          subGain.gain.setValueAtTime(0.85, now);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
          sub.connect(subGain);
          subGain.connect(comp);
          sub.start(now);
          sub.stop(now + 0.9);

          // Secondary sub harmonic for chest-thumping feel
          const sub2 = ctx.createOscillator();
          const sub2Gain = ctx.createGain();
          sub2.type = 'triangle';
          sub2.frequency.setValueAtTime(40, now);
          sub2.frequency.exponentialRampToValueAtTime(12, now + 0.7);
          sub2Gain.gain.setValueAtTime(0.6, now);
          sub2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          sub2.connect(sub2Gain);
          sub2Gain.connect(comp);
          sub2.start(now);
          sub2.stop(now + 0.8);

          // Mid-range crackle
          const midCrack = ctx.createOscillator();
          const midCrackGain = ctx.createGain();
          midCrack.type = 'sawtooth';
          midCrack.frequency.setValueAtTime(800, now);
          midCrack.frequency.exponentialRampToValueAtTime(50, now + 0.15);
          midCrackGain.gain.setValueAtTime(0.4, now);
          midCrackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          midCrack.connect(midCrackGain);
          midCrackGain.connect(comp);
          midCrack.start(now);
          midCrack.stop(now + 0.18);

          // High debris scatter
          const debris = ctx.createBufferSource();
          debris.buffer = getNoiseBuffer(ctx);
          const debrisHp = ctx.createBiquadFilter();
          debrisHp.type = 'highpass';
          debrisHp.frequency.setValueAtTime(4000, now + 0.05);
          const debrisGain = ctx.createGain();
          debrisGain.gain.setValueAtTime(0.2, now + 0.05);
          debrisGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          debris.connect(debrisHp);
          debrisHp.connect(debrisGain);
          debrisGain.connect(comp);
          debris.start(now + 0.05);
          debris.stop(now + 0.4);

          // Reverb tail for the boom
          const reverb = createReverb(ctx);
          const reverbGain = ctx.createGain();
          reverbGain.gain.setValueAtTime(0.18, now);
          const revSrc = ctx.createBufferSource();
          revSrc.buffer = getNoiseBuffer(ctx);
          const revLp = ctx.createBiquadFilter();
          revLp.type = 'lowpass';
          revLp.frequency.setValueAtTime(600, now);
          revSrc.connect(revLp);
          revLp.connect(reverb);
          reverb.connect(reverbGain);
          reverbGain.connect(ctx.destination);
          revSrc.start(now);
          revSrc.stop(now + 0.2);
        } catch (_) {}
        break;
      }

      case 'miss': {
        try {
          // Quick whoosh - filtered noise sweep
          const whoosh = ctx.createBufferSource();
          whoosh.buffer = getNoiseBuffer(ctx);
          const whooshBp = ctx.createBiquadFilter();
          whooshBp.type = 'bandpass';
          whooshBp.frequency.setValueAtTime(800, now);
          whooshBp.frequency.exponentialRampToValueAtTime(4000, now + 0.08);
          whooshBp.frequency.exponentialRampToValueAtTime(600, now + 0.2);
          whooshBp.Q.setValueAtTime(3, now);
          const whooshGain = ctx.createGain();
          whooshGain.gain.setValueAtTime(0.2, now);
          whooshGain.gain.linearRampToValueAtTime(0.25, now + 0.06);
          whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          whoosh.connect(whooshBp);
          whooshBp.connect(whooshGain);
          whooshGain.connect(ctx.destination);
          whoosh.start(now);
          whoosh.stop(now + 0.22);

          // Thin high-pitched whiff for the air displacement
          const whiff = ctx.createOscillator();
          const whiffGain = ctx.createGain();
          whiff.type = 'sine';
          whiff.frequency.setValueAtTime(2000, now);
          whiff.frequency.exponentialRampToValueAtTime(800, now + 0.15);
          whiffGain.gain.setValueAtTime(0.06, now);
          whiffGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          whiff.connect(whiffGain);
          whiffGain.connect(ctx.destination);
          whiff.start(now);
          whiff.stop(now + 0.15);

          // Subtle low thump for near-miss impact
          const thump = ctx.createOscillator();
          const thumpGain = ctx.createGain();
          thump.type = 'sine';
          thump.frequency.setValueAtTime(100, now + 0.12);
          thump.frequency.exponentialRampToValueAtTime(50, now + 0.22);
          thumpGain.gain.setValueAtTime(0.08, now + 0.12);
          thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          thump.connect(thumpGain);
          thumpGain.connect(ctx.destination);
          thump.start(now + 0.12);
          thump.stop(now + 0.25);
        } catch (_) {}
        break;
      }
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
    <SoundContext.Provider value={{ soundEnabled, musicEnabled, toggleSound, toggleMusic, playSound, startMusic, stopMusic }}>
      {children}
    </SoundContext.Provider>
  );
};
