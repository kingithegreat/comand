import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, AlertTriangle, Radio } from 'lucide-react';

export const DefeatAnimation: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsDismissed(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[75] overflow-hidden select-none">
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-[80] pointer-events-auto cursor-pointer"
            onClick={() => setIsDismissed(true)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.1, 1], opacity: [0, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-96 h-96 rounded-full border border-red-500/20 absolute"
            />

            <motion.div
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 18, stiffness: 80 }}
              className="relative bg-[#0a0505]/95 border-2 border-red-500/40 p-8 rounded-xl shadow-[0_0_60px_rgba(239,68,68,0.2)] flex flex-col items-center max-w-lg mx-4 text-center"
            >
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-red-500/60" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-red-500/60" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-red-900/60" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-red-900/60" />

              <motion.div
                initial={{ rotate: 0, scale: 0 }}
                animate={{ rotate: [0, -10, 10, 0], scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.3 }}
                className="bg-red-500/10 border border-red-500/30 p-4 rounded-full text-red-400 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              >
                <Skull className="w-10 h-10" />
              </motion.div>

              <span className="text-[10px] font-mono tracking-[0.4em] text-red-400/70 font-extrabold uppercase mb-2 flex items-center gap-1.5 justify-center">
                <AlertTriangle className="w-3.5 h-3.5" /> GRID CONTROL LOST
              </span>

              <motion.h1
                initial={{ letterSpacing: '0.5em', opacity: 0 }}
                animate={{ letterSpacing: '0.25em', opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-4xl font-black text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.55)] uppercase font-sans"
              >
                DEFEAT
              </motion.h1>

              <div className="h-0.5 w-4/5 bg-gradient-to-r from-transparent via-red-500/40 to-transparent my-3.5" />

              <p className="text-xs text-zinc-400 font-mono tracking-wide max-w-sm">
                All deployed assets neutralized. Tactical advantage conceded to hostile forces. Regroup and reassess strategy.
              </p>

              <div className="flex items-center gap-1.5 mt-4 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                <Radio className="w-3 h-3 animate-pulse" /> Signal Lost
              </div>

              <span className="text-[8.5px] font-mono text-zinc-500 uppercase mt-3 tracking-widest animate-pulse">
                [ Click anywhere to continue ]
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none overflow-hidden opacity-30">
        {[...Array(20)].map((_, idx) => {
          const left = Math.random() * 100;
          const duration = Math.random() * 3 + 4;
          return (
            <motion.div
              key={`debris-${idx}`}
              initial={{ y: -20, x: `${left}%`, opacity: 0, rotate: 0 }}
              animate={{
                y: '105vh',
                opacity: [0, 0.6, 0.4, 0],
                rotate: [0, Math.random() * 180]
              }}
              transition={{
                duration,
                delay: idx * 0.25 + 1,
                repeat: Infinity,
                ease: 'linear'
              }}
              className="absolute font-mono text-[8px] select-none"
              style={{ left: `${left}%`, color: idx % 2 === 0 ? '#ef4444' : '#71717a' }}
            >
              {idx % 4 === 0 ? '×' : idx % 4 === 1 ? '▪' : idx % 4 === 2 ? '/' : '\\'}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
