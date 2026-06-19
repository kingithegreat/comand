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

export type SoundEffect = 'click' | 'select' | 'move' | 'attack' | 'damage' | 'deploy' | 'win' | 'lose' | 'heal' | 'ability' | 'critical' | 'error' | 'destroy';
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
  master.gain.setValueAtTime(0.05, ctx.currentTime);
  master.connect(ctx.destination);
  musicNodes.master = master;

  const bassNotes = [55, 58.27, 51.91, 49];
  let beatIdx = 0;

  const playBeat = () => {
    pruneMusicNodes();
    const now = ctx.currentTime;
    const bassFreq = bassNotes[Math.floor(beatIdx / 4) % bassNotes.length];

    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(90, now);
    kick.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    kickGain.gain.setValueAtTime(0.5, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    kick.connect(kickGain);
    kickGain.connect(master);
    kick.start(now);
    kick.stop(now + 0.2);
    musicNodes.oscs.push(kick);
    musicNodes.gains.push(kickGain);

    if (beatIdx % 2 === 1) {
      const hihat = ctx.createBufferSource();
      hihat.buffer = getNoiseBuffer(ctx);
      const hihatHp = ctx.createBiquadFilter();
      hihatHp.type = 'highpass';
      hihatHp.frequency.setValueAtTime(8000, now);
      const hihatGain = ctx.createGain();
      hihatGain.gain.setValueAtTime(0.08, now);
      hihatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      hihat.connect(hihatHp);
      hihatHp.connect(hihatGain);
      hihatGain.connect(master);
      hihat.start(now);
      hihat.stop(now + 0.05);
      musicNodes.sources.push(hihat);
      musicNodes.gains.push(hihatGain);
    }

    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(bassFreq, now);
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(200, now);
    bassGain.gain.setValueAtTime(0.25, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    bass.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(master);
    bass.start(now);
    bass.stop(now + 0.4);
    musicNodes.oscs.push(bass);
    musicNodes.gains.push(bassGain);

    if (beatIdx % 8 === 0) {
      const melodyNotes = [220, 261.63, 293.66, 246.94, 220, 196, 174.61, 196];
      const note = melodyNotes[Math.floor(beatIdx / 8) % melodyNotes.length];
      const mel = ctx.createOscillator();
      const melGain = ctx.createGain();
      mel.type = 'triangle';
      mel.frequency.setValueAtTime(note, now);
      mel.frequency.linearRampToValueAtTime(note * 1.01, now + 1.5);
      melGain.gain.setValueAtTime(0, now);
      melGain.gain.linearRampToValueAtTime(0.15, now + 0.2);
      melGain.gain.linearRampToValueAtTime(0, now + 1.8);
      mel.connect(melGain);
      melGain.connect(master);
      mel.start(now);
      mel.stop(now + 2);
      musicNodes.oscs.push(mel);
      musicNodes.gains.push(melGain);
    }

    beatIdx++;
  };

  playBeat();
  musicNodes.interval = setInterval(playBeat, 500);
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
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const gain2 = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(150, now + 0.12);
        gain2.gain.setValueAtTime(0.15, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.25);
        break;
      }

      case 'destroy': {
        const noise = ctx.createBufferSource();
        noise.buffer = getNoiseBuffer(ctx);
        const noiseGain = ctx.createGain();
        const noiseBand = ctx.createBiquadFilter();
        noiseBand.type = 'bandpass';
        noiseBand.frequency.setValueAtTime(800, now);
        noiseBand.Q.setValueAtTime(0.5, now);
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        noise.connect(noiseBand);
        noiseBand.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.3);

        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(120, now);
        thud.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        thudGain.gain.setValueAtTime(0.25, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        thud.connect(thudGain);
        thudGain.connect(ctx.destination);
        thud.start(now);
        thud.stop(now + 0.2);
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
