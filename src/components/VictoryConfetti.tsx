import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, ShieldCheck, Cpu, Terminal, Zap, Sparkles } from 'lucide-react';

interface Particle {
  id: number;
  shape: 'circle' | 'square' | 'triangle' | 'cross' | 'binary0' | 'binary1';
  color: string;
  size: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rotateStart: number;
  rotateEnd: number;
  scaleStart: number;
  scaleEnd: number;
  delay: number;
  duration: number;
}

export const VictoryConfetti: React.FC = () => {
  const [showBlast, setShowBlast] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Auto-dismiss the heavy splash screen overlay after 3.2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDismissed(true);
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  // Set up 120 unique celebration particles generated on mount
  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    const colors = [
      '#fbbf24', // Amber/Gold
      '#38bdf8', // Sky/Cyan
      '#34d399', // Emerald/Green
      '#22d3ee', // Cyan/Teal
      '#c084fc', // Fuchsia/Purple
      '#f472b6', // Pink
    ];
    const shapes: Particle['shape'][] = ['circle', 'square', 'triangle', 'cross', 'binary0', 'binary1'];

    // Screen dimensions approximations for responsive burst spread
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const maxDistanceX = isMobile ? 180 : 380;
    const maxDistanceY = isMobile ? 350 : 550;

    for (let i = 0; i < 110; i++) {
      // Half burst from center left, half from center right
      const side = i % 2 === 0 ? -1 : 1;
      const angle = (Math.random() * 80 + 10) * (Math.PI / 180); // 10 to 90 degrees outward projection
      
      const velocity = Math.random() * 1.5 + 0.8;
      const endX = side * (Math.cos(angle) * maxDistanceX * velocity);
      // Fall downward significantly
      const endY = (Math.sin(angle) * maxDistanceY * velocity) + (Math.random() * 200 + 100);

      arr.push({
        id: i,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + (shapes[Math.floor(Math.random() * shapes.length)].startsWith('binary') ? 8 : 4),
        startX: side * (Math.random() * 30 + 10), // slight offset from center divider
        startY: Math.random() * 40 - 20,
        endX,
        endY,
        rotateStart: Math.random() * 360,
        rotateEnd: Math.random() * 720 + 360 * (Math.random() > 0.5 ? 1 : -1),
        scaleStart: Math.random() * 0.4 + 0.6,
        scaleEnd: Math.random() * 0.4 + 0.2,
        delay: Math.random() * 0.4,
        duration: Math.random() * 1.8 + 2.2, // duration of the particles flight/fall
      });
    }
    return arr;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[75] overflow-hidden select-none">
      
      {/* 1. INITIAL CELEBRATION SPLASH BANNER */}
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -40, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-[#070905]/75 backdrop-blur-sm z-[80] pointer-events-auto cursor-pointer"
            onClick={() => setIsDismissed(true)}
            title="Click to skip animation"
          >
            {/* Pulsing Cyber Rings */}
            <div className="absolute flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.3, 1.8], opacity: [0, 0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="w-80 h-80 rounded-full border border-sky-505/30 absolute"
              />
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.1, 1.5], opacity: [0, 0.6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
                className="w-64 h-64 rounded-full border border-amber-500/25 absolute"
              />
            </div>

            {/* Glowing Victory Frame */}
            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              className="relative bg-[#0d1109]/95 border-2 border-amber-500/40 p-8 rounded-xl shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col items-center max-w-lg mx-4 text-center border-t-amber-400 border-b-sky-400"
            >
              {/* Corner Sci-Fi Bracket Overlays */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-sky-400" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-sky-400" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400" />

              {/* Award Icon Burst */}
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-full text-amber-400 relative mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                <Award className="w-10 h-10 animate-pulse" />
                <motion.div 
                  className="absolute -inset-1 rounded-full border border-sky-400 opacity-60"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              </motion.div>

              <span className="text-[10px] font-mono tracking-[0.4em] text-sky-400 font-extrabold uppercase mb-2 flex items-center gap-1.5 justify-center">
                <ShieldCheck className="w-3.5 h-3.5" /> GRID CONTROL SECURED
              </span>

              <h1 className="text-4xl font-black tracking-[0.25em] text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.55)] uppercase font-sans">
                VICTORY
              </h1>

              <div className="h-0.5 w-4/5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent my-3.5" />

              <p className="text-xs text-zinc-300 font-mono tracking-wide max-w-sm">
                Hostility signals neutralized. Area tactical sector has synced to command terminal. All deployed agents awarded operational points.
              </p>

              {/* Quick Skip Prompt */}
              <span className="text-[8.5px] font-mono text-zinc-500 uppercase mt-5 tracking-widest animate-pulse">
                [ Click anywhere to bypass ]
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BURST PARTICLES (CONFETTI ENVELOPE) */}
      <div className="absolute top-[35%] left-[50%] flex justify-center items-center w-1 h-1">
        {particles.map((p) => {
          return (
            <motion.div
              key={p.id}
              initial={{ 
                x: p.startX, 
                y: p.startY, 
                rotate: p.rotateStart, 
                scale: p.scaleStart, 
                opacity: 1 
              }}
              animate={{ 
                x: p.endX, 
                y: p.endY, 
                rotate: p.rotateEnd, 
                scale: p.scaleEnd, 
                opacity: [1, 1, 0.9, 0.6, 0] 
              }}
              transition={{ 
                duration: p.duration, 
                delay: p.delay, 
                ease: [0.1, 0.8, 0.25, 1] // snappy initial ejection, gradual terminal fall
              }}
              className="absolute pointer-events-none origin-center"
              style={{ color: p.color }}
            >
              {p.shape === 'circle' && (
                <div 
                  className="rounded-full blur-[0.3px]" 
                  style={{ 
                    width: p.size, 
                    height: p.size, 
                    backgroundColor: p.color,
                    boxShadow: `0 0 6px ${p.color}` 
                  }} 
                />
              )}
              {p.shape === 'square' && (
                <div 
                  style={{ 
                    width: p.size, 
                    height: p.size, 
                    backgroundColor: p.color,
                    boxShadow: `0 0 5px ${p.color}` 
                  }} 
                />
              )}
              {p.shape === 'triangle' && (
                <div 
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: `${p.size / 2}px solid transparent`,
                    borderRight: `${p.size / 2}px solid transparent`,
                    borderBottom: `${p.size}px solid ${p.color}`,
                    filter: `drop-shadow(0 0 2px ${p.color})`
                  }}
                />
              )}
              {p.shape === 'cross' && (
                <div className="font-mono font-black select-none text-[10px]" style={{ fontSize: p.size, color: p.color }}>
                  +
                </div>
              )}
              {p.shape === 'binary0' && (
                <div className="font-mono font-black select-none opacity-80" style={{ fontSize: p.size, color: p.color }}>
                  0
                </div>
              )}
              {p.shape === 'binary1' && (
                <div className="font-mono font-black select-none opacity-80" style={{ fontSize: p.size, color: p.color }}>
                  1
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* 3. SUBTLE AMBIENT RAIN OF GOLDEN CHIPS IN THE BACKGROUND */}
      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none overflow-hidden opacity-40">
        {[...Array(25)].map((_, idx) => {
          const delay = idx * 0.35 + 1.5;
          const duration = Math.random() * 4 + 6;
          const left = Math.random() * 100;
          return (
            <motion.div
              key={`ambient-${idx}`}
              initial={{ y: -50, x: `${left}%`, opacity: 0, rotate: 0 }}
              animate={{ 
                y: '105vh', 
                opacity: [0, 0.8, 0.8, 0],
                rotate: [0, Math.random() * 360 + 120]
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'linear'
              }}
              className="absolute font-mono text-[9px] text-[#fbbf24] select-none"
              style={{
                left: `${left}%`,
                color: idx % 3 === 0 ? '#fbbf24' : idx % 3 === 1 ? '#38bdf8' : '#34d399',
              }}
            >
              {idx % 5 === 0 ? '♦' : idx % 5 === 1 ? '✦' : idx % 5 === 2 ? '0' : idx % 5 === 3 ? '1' : '•'}
            </motion.div>
          );
        })}
      </div>

    </div>
  );
};
