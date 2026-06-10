import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAudio } from '../contexts/AudioContext';
import { 
  Target, Shield, HelpCircle, ArrowRight, Play, CheckCircle2, RotateCcw, 
  MapPin, Plus, UserPlus, Zap, Crosshair, Heart, Hammer, Info, Award, ArrowLeft
} from 'lucide-react';
import { CLASSES } from '../data';
import { CharacterClass } from '../types';
import UnitHelmetAvatar from './UnitHelmetAvatar';

interface MockCell {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'crate';
}

import { safeGetItem, safeSetItem } from '../lib/storage';

const MODULE_CLASSES = ['Assault', 'Sniper', 'Medic', 'Technician'];

export default function TutorialMode({ onBack }: { onBack: () => void }) {
  const { playSound } = useAudio();
  const [step, setStep] = useState<'class_select' | 'movement' | 'ability' | 'smog_tutorial' | 'completed'>('class_select');
  const [selectedClassName, setSelectedClassName] = useState<string>('Assault');
  const [unitX, setUnitX] = useState<number>(1);
  const [unitY, setUnitY] = useState<number>(4);
  const [unitHP, setUnitHP] = useState<number>(100);
  const [ap, setAp] = useState<number>(2);
  const [log, setLog] = useState<string[]>([]);
  const [targetDummyHP, setTargetDummyHP] = useState<number>(80);
  const [injuredAllyHP, setInjuredAllyHP] = useState<number>(30);
  const [placedCrate, setPlacedCrate] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  // High production visual states
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [fireLine, setFireLine] = useState<{ fromX: number; fromY: number; toX: number; toY: number; color: string } | null>(null);
  const [activeDamageText, setActiveDamageText] = useState<{ x: number; y: number; text: string; color: string } | null>(null);

  const selectedClass = CLASSES.find(c => c.className === selectedClassName) || CLASSES[0];

  // Synthesized log helper
  const addLog = (msg: string) => {
    setLog(prev => [msg, ...prev.slice(0, 4)]);
  };

  // Reset grid state for a fresh tutorial run on selected class
  const initializeSimulation = (className: string) => {
    playSound('click');
    setSelectedClassName(className);
    setUnitX(1);
    setUnitY(4);
    setAp(2);
    setLog([`[SIMULATOR] Calibrating battle environment with ${className} archetype.`]);
    setTargetDummyHP(80);
    setInjuredAllyHP(30);
    setPlacedCrate(null);
    setStep('movement');
  };

  // Automatically advance to ability phase if AP runs out in movement step to prevent stale stuck states
  useEffect(() => {
    if (step === 'movement' && ap === 0) {
      const timer = setTimeout(() => {
        setStep('ability');
        setAp(1); // Ensure they always have 1 AP to perform their class ability
        playSound('click');
        addLog(`[UPLINK] Spent all Movement AP. Auto-routing to Action Phase...`);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [ap, step, playSound]);

  // Mock grid coordinates (6 columns x 6 rows)
  const cols = 6;
  const rows = 6;

  // Grid obstacles representation
  const getCellType = (x: number, y: number): 'floor' | 'wall' | 'crate' => {
    if (placedCrate && placedCrate.x === x && placedCrate.y === y) return 'crate';
    if (x === 2 && y === 2) return 'crate';
    if (x === 3 && y === 1) return 'wall';
    return 'floor';
  };

  // Movement reachability
  const isReachable = (x: number, y: number) => {
    if (step !== 'movement' || ap < 1) return false;
    // Standard distance within mobility limit (scaled to a micro 6x6 grid where normal mobility is 2-4 tiles)
    const dist = Math.abs(x - unitX) + Math.abs(y - unitY);
    // Let mobility scale down for 6x6: mobility / 2 rounded up, min 1, max 3
    const maxMove = Math.max(1, Math.min(3, Math.ceil(selectedClass.stats.mobility / 2)));
    if (dist > 0 && dist <= maxMove) {
      // Cannot move onto walls or standard obstacles
      const cellType = getCellType(x, y);
      if (cellType === 'floor') {
        // Also don't land on dummy coordinates
        if (selectedClassName !== 'Medic' && x === 4 && y === 1) return false;
        if (selectedClassName === 'Medic' && x === 2 && y === 4) return false;
        return true;
      }
    }
    return false;
  };

  // Handle cell click
  const handleCellClick = (x: number, y: number) => {
    if (step === 'movement') {
      if (isReachable(x, y)) {
        playSound('move');
        setUnitX(x);
        setUnitY(y);
        setAp(prev => prev - 1);
        addLog(`[MANEUVER] Moved to sector (${x}, ${y}) using 1 AP.`);
      }
    } else if (step === 'ability' && ap > 0) {
      const isTargetValid = checkAbilityTarget(x, y);
      if (isTargetValid) {
        executeAbilityAction(x, y);
      }
    }
  };

  // Check if cell is within current ability target bounds (relaxed to prevent lock-outs or stuck states in tutorial, with log feedback)
  const checkAbilityTarget = (x: number, y: number) => {
    if (step !== 'ability' || ap < 1) return false;
    const dist = Math.abs(x - unitX) + Math.abs(y - unitY);

    if (selectedClassName === 'Sniper') {
      return x === 4 && y === 1;
    } else if (selectedClassName === 'Assault') {
      // Allow target selection anywhere, later log if out of normal bounds
      return x === 4 && y === 1;
    } else if (selectedClassName === 'Medic') {
      // Allow healing anywhere, log later if out of normal bounds
      return x === 2 && y === 4;
    } else if (selectedClassName === 'Technician') {
      // Allow placing cover on any floor tile except current position
      const isSelf = unitX === x && unitY === y;
      return getCellType(x, y) === 'floor' && !isSelf;
    } else if (selectedClassName === 'Assassin') {
      return x === 4 && y === 1;
    }
    return false;
  };

  // Execute actual tactical action
  const executeAbilityAction = (x: number, y: number) => {
    playSound('attack');
    setAp(0);

    const dist = Math.abs(x - unitX) + Math.abs(y - unitY);

    if (selectedClassName === 'Sniper') {
      // Sniper lasers are electric cyan
      setFireLine({ fromX: unitX, fromY: unitY, toX: 4, toY: 1, color: '#06b6d4' });
      setActiveDamageText({ x: 4, y: 1, text: '-55 DMG CRITICAL!', color: '#ef4444' });
      setIsShaking(true);
      
      setTimeout(() => {
        setTargetDummyHP(0);
        playSound('damage');
      }, 250);

      addLog(`[CRITICAL] Fired Piercing Round on target dummy for 55 absolute damage!`);
    } else if (selectedClassName === 'Assault') {
      // Assault tracer lines are fiery orange
      setFireLine({ fromX: unitX, fromY: unitY, toX: 4, toY: 1, color: '#f97316' });
      setActiveDamageText({ x: 4, y: 1, text: '-25 DMG tactical flush!', color: '#f97316' });
      setIsShaking(true);

      setTimeout(() => {
        setTargetDummyHP(prev => Math.max(0, prev - 25));
        playSound('damage');
      }, 200);

      if (dist > 3) {
        addLog(`[RANGE BYPASS] Real Assault range < 3. Sim override fired at ${dist} tiles!`);
      } else {
        addLog(`[ENGAGE] Used Tactical Flush on target dummy. Damage: 25. AP drained.`);
      }
    } else if (selectedClassName === 'Medic') {
      // Medic nanites are neon system sky green/cyan
      setFireLine({ fromX: unitX, fromY: unitY, toX: 2, toY: 4, color: '#10b981' });
      setActiveDamageText({ x: 2, y: 4, text: '+55 HP REPAIRED!', color: '#38bdf8' });

      setTimeout(() => {
        setInjuredAllyHP(85);
        playSound('win');
      }, 200);

      if (dist > 2) {
        addLog(`[RANGE BYPASS] Real Medic range < 2. Sim override injected healing at ${dist} tiles!`);
      } else {
        addLog(`[SUPPORT] Injected Nanite healing. Allies repaired back to full 85 HP.`);
      }
    } else if (selectedClassName === 'Technician') {
      // Technician deploy construct waveforms
      setFireLine({ fromX: unitX, fromY: unitY, toX: x, toY: y, color: '#f59e0b' });
      setActiveDamageText({ x, y, text: 'DEPLOY COVER!', color: '#fbbf24' });
      playSound('deploy');

      setTimeout(() => {
        setPlacedCrate({ x, y });
        playSound('deploy');
      }, 200);

      if (dist > 1) {
        addLog(`[RANGE BYPASS] Real tech constructs adjacent. Sim coverage deployed at ${dist} tiles!`);
      } else {
        addLog(`[CONSTRUCT] Deployed localized cover shielding at sector (${x}, ${y}).`);
      }
    } else if (selectedClassName === 'Assassin') {
      setFireLine({ fromX: unitX, fromY: unitY, toX: x, toY: y, color: '#a855f7' });
      setActiveDamageText({ x: x, y: y, text: '-250 FATAL STRIKE!', color: '#a855f7' });
      setIsShaking(true);

      setTimeout(() => {
        setTargetDummyHP(0);
        playSound('damage');
      }, 200);

      if (dist > 1) {
        addLog(`[RANGE BYPASS] Real Assassin range <= 1. Sim override shadow stepped at ${dist} tiles!`);
      } else {
        addLog(`[ASSASSINATE] Executed ghost strike for 250 fatal damage.`);
      }
    }

    // Clear effects timers
    setTimeout(() => {
      setFireLine(null);
      setIsShaking(false);
    }, 550);

    setTimeout(() => {
      setActiveDamageText(null);
    }, 1200);

    setTimeout(() => {
      setStep('smog_tutorial');
      playSound('win');
    }, 1800);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-[#0c0e0a]/95 border border-zinc-800 border-opacity-50 rounded-xl shadow-2xl relative font-mono text-zinc-300 select-none text-left">
      {/* Scanlines visual helper */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,14,0)_97%,rgba(18,24,14,0.1)_97%)] bg-[length:100%_4px] pointer-events-none rounded-xl z-10" />

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 border-opacity-50 pb-4 mb-5 gap-3">
        <div>
          <span className="text-[10px] text-amber-500 font-bold tracking-widest uppercase flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400 animate-pulse" /> TACTICAL ACADEMY MODULE
          </span>
          <h2 className="text-xl font-black tracking-wider uppercase text-white flex items-center gap-2">
            Combat Simulator Frequency
          </h2>
        </div>
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 border border-zinc-800 border-opacity-50 hover:border-amber-400 text-xs text-[#8b9180] hover:text-[#fbbf24] transition-all cursor-pointer rounded flex items-center gap-1 active:scale-95 bg-zinc-900 bg-opacity-80"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to HQ
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: CLASS SELECTION */}
        {step === 'class_select' && (
          <motion.div
            key="class_select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-5"
          >
            <div className="bg-zinc-900 bg-opacity-80/50 border border-zinc-800 border-opacity-50/60 p-4 rounded-lg">
              <p className="text-xs uppercase leading-relaxed text-zinc-300">
                Welcome to the Tactical Command Academy, Commander. In this simulation, you will master basic movement, the action point system, and explore unique class specializations. Each team in physical operations is constructed from an array of 4 specialized operators.
              </p>
              <p className="text-[10px] text-[#fbbf24] font-bold uppercase tracking-wider mt-3">
                👉 Select one operator below to launch their interactive simulation sequence:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(() => {
                const unlocked = safeGetItem('assassinUnlocked') === 'true';
                return unlocked ? [...MODULE_CLASSES, 'Assassin'] : MODULE_CLASSES;
              })().map(clsName => {
                const specClass = CLASSES.find(c => c.className === clsName)!;
                return (
                  <div
                    key={clsName}
                    onClick={() => initializeSimulation(clsName)}
                    className="p-4 bg-zinc-900 bg-opacity-80 hover:bg-[#1f2618]/90 border border-zinc-800 border-opacity-50 hover:border-[#fbbf24]/60 rounded-xl cursor-pointer transition-all flex flex-col gap-3 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/5 to-transparent pointer-events-none group-hover:scale-125 transition-transform" />
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-zinc-800 border-opacity-50 rounded flex items-center justify-center bg-black/40">
                        <UnitHelmetAvatar classNameVal={clsName} className="w-7 h-7" />
                      </div>
                      <div className="leading-tight">
                        <h3 className="text-sm font-extrabold text-white uppercase group-hover:text-[#fbbf24] transition-colors">
                          {specClass.className}
                        </h3>
                        <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                          {specClass.archetype} Specialization
                        </span>
                      </div>
                    </div>

                    <p className="text-[9.5px] text-[#8b9180] leading-snug uppercase">
                      {specClass.description}
                    </p>

                    <div className="border-t border-zinc-800 border-opacity-50/50 pt-2 flex items-center justify-between text-[8px] font-bold uppercase text-[#fbbf24]/80">
                      <span>Abil: {specClass.ability?.name}</span>
                      <span className="flex items-center text-zinc-300">
                        Simulate Archetype <ArrowRight className="w-3 h-3 ml-1 text-amber-500 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border border-dashed border-zinc-800 border-opacity-50 p-3 rounded text-[10px] text-zinc-500 uppercase leading-relaxed">
              <span className="text-zinc-300 font-bold">Note on extra characters:</span> Inside the main databases, you'll encounter 6 additional elite custom operators: <span className="text-amber-500/80">Heavy Juggernauts</span>, fast Recon <span className="text-amber-500/80">Scouts</span>, Lane-blocking <span className="text-amber-500/80">Supports</span>, lethal close-breaching <span className="text-amber-500/80">Shotgunners</span>, splashing area <span className="text-amber-500/80">Demomen</span>, and high-temperature area-controlling <span className="text-amber-500/80">Flamethrowers</span>. Each brings radically modified ranges and action styles!
            </div>
          </motion.div>
        )}

        {/* STEP 2: MOVEMENT & AP PRACTICE OR STEP 3: ABILITY TRIAL */}
        {(step === 'movement' || step === 'ability') && (
          <motion.div
            key="sandbox_simulation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-5"
          >
            {/* Guide Instructions panel (Left side) */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="bg-zinc-900 bg-opacity-80 border border-zinc-800 border-opacity-50 p-4 rounded-xl flex flex-col gap-3 relative">
                <div className="absolute top-0 right-0 border-b border-l border-zinc-800 border-opacity-50 bg-black/40 px-2 py-0.5 text-[7px] text-zinc-500 font-bold rounded-bl uppercase">
                  ACTIVE PHASE
                </div>
                
                <h3 className="text-xs font-black text-[#fbbf24] uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 border-opacity-50/30 pb-2">
                  {step === 'movement' ? (
                    <>
                      <MapPin className="w-4 h-4 text-emerald-400 animate-pulse" />
                      01. Positional Navigation
                    </>
                  ) : (
                    <>
                      <Crosshair className="w-4 h-4 text-rose-500 animate-pulse" />
                      02. Action Calibrations
                    </>
                  )}
                </h3>

                <div className="text-[10px] text-[#8b9180] leading-relaxed uppercase space-y-2">
                  {step === 'movement' ? (
                    <>
                      <p>
                        Your active <span className="text-white font-bold">{selectedClassName}</span> starts at Coordinate <span className="text-[#fbbf24]">(1, 4)</span>.
                      </p>
                      <p>
                        Every squad operator gets exactly <span className="text-emerald-400 font-extrabold">2 Action Points (AP)</span> per cycle. Moving to an available coordinate consumes <span className="text-white font-bold">1 AP</span>.
                      </p>
                      <p className="text-[#fbbf24] font-bold">
                        👉 Click any highlighted GREEN cell on the tactical grid to advance.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Superb. You have <span className="text-emerald-400 font-bold">{ap} AP remaining</span> and have successfully moved on the grid.
                      </p>
                      {selectedClassName === 'Sniper' && (
                        <p>
                          Your Sniper can bypass short ranges using the sniper rifle, but has poor close armor. Click the PURPLE hostile dummy at <span className="text-purple-400">(4, 1)</span> to unleash <span className="text-white font-bold">Piercing Round</span>!
                        </p>
                      )}
                      {selectedClassName === 'Assault' && (
                        <p>
                          Your Assault can secure lanes. Click the PURPLE hostile dummy at <span className="text-purple-400">(4, 1)</span> to unleash <span className="text-white font-bold">Tactical Flush</span>! This will deplete 1 of their own action points in real matches.
                        </p>
                      )}
                      {selectedClassName === 'Medic' && (
                        <p>
                          Your Medic is supporting a friendly defender who is down to <span className="text-red-400">30/85 HP</span>. Range is crucial. Highlighted blue cells indicate your healing nanites' reach. Click the friendly target at <span className="text-sky-400">(2, 4)</span> to cast <span className="text-[#fbbf24] font-bold">First Aid Kit</span>!
                        </p>
                      )}
                      {selectedClassName === 'Technician' && (
                        <p>
                          Your Technicians shape terrain dynamically on flat tiles, constructing solid crates to block linear visibility. Click an adjacent highlighted blue coordinate to build a <span className="text-[#fbbf24] font-bold">Cargo Cover Box</span>.
                        </p>
                      )}
                      {selectedClassName === 'Assassin' && (
                        <p>
                          Your Assassin has extreme stealth capabilities! Once inside Smog, they are completely invisible. Click the PURPLE hostile dummy at <span className="text-purple-400">(4, 1)</span> to unleash the <span className="text-white font-bold">Shadow Strike</span>!
                        </p>
                      )}
                      <p className="text-amber-500 font-bold">
                        👉 Click the highlighted special blueprint cell to execute your ability.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Character Specs mini panel */}
              <div className="bg-zinc-900 bg-opacity-80/40 border border-zinc-800 border-opacity-50/70 p-3 rounded-lg flex gap-3 text-left">
                <div className="w-11 h-11 bg-black/55 border border-zinc-800 border-opacity-50 rounded shrink-0 flex items-center justify-center p-0.5">
                  <UnitHelmetAvatar classNameVal={selectedClassName} className="w-8 h-8" />
                </div>
                <div className="flex-1 font-mono text-[8.5px] uppercase">
                  <span className="font-extrabold text-white text-[10px] tracking-tight block leading-none">{selectedClass.className}</span>
                  <span className="text-[#fbbf24] font-bold tracking-widest text-[7px] block mt-0.5">{selectedClass.archetype} UNIT</span>
                  <div className="flex gap-2.5 text-[#8b9180] mt-1.5">
                    <span>HP Max: {selectedClass.stats.maxHP}</span>
                    <span>DMG: {selectedClass.stats.damage}</span>
                    <span>AP Remaining: <span className="text-emerald-400 font-black">{ap}/2</span></span>
                  </div>
                </div>
              </div>

              {/* Tactician Log Feed */}
              <div className="bg-black/85 border border-zinc-800 border-opacity-50 rounded-lg p-2.5 h-[100px] overflow-hidden flex flex-col gap-1 text-[8.5px] uppercase">
                <span className="text-[7.5px] text-[#2d3422] font-black tracking-widest block border-b border-zinc-800 border-opacity-50 pb-0.5">TELEMETRY UPLINKFEED</span>
                <div className="flex-1 overflow-y-auto space-y-1 text-zinc-500 font-mono">
                  {log.map((lg, i) => (
                    <div key={i} className={i === 0 ? "text-[#fbbf24]" : "text-zinc-500"}>
                      {lg}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions below guidance */}
              {step === 'movement' && (
                <button
                  onClick={() => {
                    setStep('ability');
                    setAp(1); // Set AP to exactly 1 so they can execute their ability
                    playSound('click');
                    addLog(`[UPLINK] Transitioning unit to active tactical phase.`);
                  }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded border border-amber-400 shadow cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5"
                >
                  {ap < 2 ? "Confirm Movement Phase" : "Skip Movement Phase"} <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>

            {/* Tactical Interactive Grid (Right side) */}
            <div className="md:col-span-7 flex flex-col items-center justify-center">
              <motion.div 
                animate={isShaking ? {
                  x: [0, -8, 8, -8, 8, -4, 4, -2, 2, 0],
                  y: [0, 5, -5, 3, -3, 2, -2, 0]
                } : {}}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="bg-black/60 border border-zinc-800 border-opacity-50 rounded-xl p-3.5 relative overflow-hidden shadow-xl w-full max-w-[380px]"
              >
                {/* Coordinates labeling helper */}
                <div className="grid grid-cols-6 gap-1 w-full text-center text-[7px] text-[#475231] font-mono font-black mb-1 select-none">
                  <span>COL 0</span>
                  <span>COL 1</span>
                  <span>COL 2</span>
                  <span>COL 3</span>
                  <span>COL 4</span>
                  <span>COL 5</span>
                </div>

                <div className="grid grid-cols-6 gap-1.5 w-full relative">
                  {/* Dynamic laser trace beam overlay */}
                  {fireLine && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
                      <defs>
                        <filter id="laser-glow">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <motion.line
                        x1={`${((fireLine.fromX + 0.5) / 6) * 100}%`}
                        y1={`${((fireLine.fromY + 0.5) / 6) * 100}%`}
                        x2={`${((fireLine.toX + 0.5) / 6) * 100}%`}
                        y2={`${((fireLine.toY + 0.5) / 6) * 100}%`}
                        stroke={fireLine.color}
                        strokeWidth="4"
                        filter="url(#laser-glow)"
                        initial={{ pathLength: 0, opacity: 1 }}
                        animate={{ pathLength: [0, 1, 1], opacity: [0.2, 1, 0] }}
                        transition={{ duration: 0.55, times: [0, 0.15, 1] }}
                        strokeLinecap="round"
                      />
                      <motion.line
                        x1={`${((fireLine.fromX + 0.5) / 6) * 100}%`}
                        y1={`${((fireLine.fromY + 0.5) / 6) * 100}%`}
                        x2={`${((fireLine.toX + 0.5) / 6) * 100}%`}
                        y2={`${((fireLine.toY + 0.5) / 6) * 100}%`}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 1] }}
                        transition={{ duration: 0.25 }}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}

                  {Array.from({ length: rows }).map((_, y) => {
                    return Array.from({ length: cols }).map((_, x) => {
                      const cellType = getCellType(x, y);
                      const isUnitCell = unitX === x && unitY === y;
                      const isTargetDummyCell = selectedClassName !== 'Medic' && x === 4 && y === 1;
                      const isInjuredAllyCell = selectedClassName === 'Medic' && x === 2 && y === 4;
                      const reachable = isReachable(x, y);
                      const isTargetable = checkAbilityTarget(x, y);

                      // Determine backgrounds based on state
                      let bgClass = "bg-[#11130e] border-[#202517]";
                      let borderClass = "border";

                      if (cellType === 'wall') {
                        bgClass = "bg-[#282d1c] border-[#414a30]";
                      } else if (cellType === 'crate') {
                        bgClass = "bg-[#332414] border-[#694b28]";
                      }

                      if (reachable) {
                        bgClass = "bg-emerald-950/40 border-emerald-500/70 hover:bg-emerald-900/60 transition-colors animate-pulse";
                      } else if (isTargetable) {
                        if (selectedClassName === 'Medic') {
                          bgClass = "bg-sky-950/40 border-sky-500/80 hover:bg-sky-900/60 cursor-pointer transition-colors animate-pulse";
                        } else if (selectedClassName === 'Technician') {
                          bgClass = "bg-amber-950/40 border-amber-500/80 hover:bg-amber-900/60 cursor-pointer transition-colors animate-pulse";
                        } else {
                          bgClass = "bg-rose-950/40 border-rose-500/80 hover:bg-rose-900/60 cursor-pointer transition-colors animate-pulse";
                        }
                      }

                      return (
                        <div
                          key={`${x}-${y}`}
                          onClick={() => handleCellClick(x, y)}
                          onMouseEnter={() => setHoveredCell({ x, y })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`pt-[100%] relative cursor-pointer rounded transition-all ${bgClass} ${borderClass}`}
                          title={`Sector ${x},${y}`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center p-0.5">
                            {/* NEW: Rising Floating Combat Indicator text popup */}
                            {activeDamageText && activeDamageText.x === x && activeDamageText.y === y && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: 15 }}
                                animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1.45, 1.45, 0.9], y: [-5, -30, -52, -65] }}
                                transition={{ duration: 1.2, times: [0, 0.12, 0.82, 1] }}
                                className="absolute pointer-events-none z-50 font-black tracking-widest text-[9.5px] whitespace-nowrap bg-black text-white px-2 py-1 rounded border border-current shadow-[0_0_15px_rgba(0,0,0,0.95)] uppercase select-none"
                                style={{ color: activeDamageText.color }}
                              >
                                {activeDamageText.text}
                              </motion.div>
                            )}

                            {/* Wall asset */}
                            {cellType === 'wall' && (
                              <svg className="w-5 h-5 text-[#5e6c46]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                                <line x1="15" y1="3" x2="15" y2="21" />
                                <line x1="3" y1="9" x2="21" y2="9" />
                                <line x1="3" y1="15" x2="21" y2="15" />
                              </svg>
                            )}

                            {/* Crate cover asset */}
                            {cellType === 'crate' && (
                              <svg className="w-5 h-5 text-amber-600 animate-fade-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <line x1="3" y1="3" x2="21" y2="21" />
                                <line x1="21" y1="3" x2="3" y2="21" />
                              </svg>
                            )}

                            {/* Active Operator */}
                            {isUnitCell && (
                              <div className="w-[85%] h-[85%] bg-emerald-500/25 border border-emerald-400 rounded flex items-center justify-center p-1 relative shadow-[0_0_8px_#10b981]">
                                <UnitHelmetAvatar classNameVal={selectedClassName} className="w-full h-full text-emerald-400" />
                                <div className="absolute -top-1 -right-1 bg-emerald-500 w-1.5 h-1.5 rounded-full animate-ping" />
                              </div>
                            )}

                            {/* Hostile target dummy */}
                            {isTargetDummyCell && (
                              <div className="w-[85%] h-[85%] bg-rose-500/20 border-2 border-rose-500 rounded flex flex-col items-center justify-center p-0.5 relative shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                                <Target className="w-5 h-5 text-rose-500 animate-pulse" />
                                <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden mt-0.5 p-[0.3px] border border-zinc-900 absolute -bottom-1">
                                  <div className="bg-purple-500 h-full animate-pulse" style={{ width: `${(targetDummyHP / 80) * 100}%` }} />
                                </div>
                              </div>
                            )}

                            {/* Allied friendly injured */}
                            {isInjuredAllyCell && (
                              <div className="w-[85%] h-[85%] bg-sky-500/10 border border-sky-400/80 rounded flex flex-col items-center justify-center p-0.5 relative">
                                <UnitHelmetAvatar classNameVal="Assault" className="w-[70%] h-[70%] text-sky-450" />
                                <Heart className="w-2.5 h-2.5 text-sky-400 absolute top-0.5 right-0.5 animate-pulse" />
                                <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden mt-0.5 p-[0.3px] border border-zinc-900 absolute -bottom-1">
                                  <div className={injuredAllyHP < 55 ? "bg-amber-500 h-full animate-pulse" : "bg-sky-400 h-full"} style={{ width: `${(injuredAllyHP / 85) * 100}%` }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Coordinates subtle feedback */}
                          <div className="absolute bottom-0.5 right-1 text-[5.5px] text-[#475231] font-bold tracking-tighter">
                            {x},{y}
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </motion.div>

              {/* Reset button inside grid loop */}
              <button
                onClick={() => initializeSimulation(selectedClassName)}
                className="mt-3.5 px-3 py-1 bg-zinc-900 bg-opacity-80 border border-zinc-800 border-opacity-50 hover:border-amber-400 text-[9px] uppercase font-bold text-[#8b9180] hover:text-[#fbbf24] transition-all rounded flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Re-initialize Sim
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3.5: SMOG AND DUOS TUTORIAL */}
        {step === 'smog_tutorial' && (
          <motion.div
            key="smog_tutorial"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6 text-left py-6 max-w-2xl mx-auto"
          >
            <div className="bg-zinc-900 bg-opacity-80 border border-zinc-800 border-opacity-50 p-5 rounded-xl">
               <h3 className="text-lg font-black text-[#fbbf24] uppercase tracking-widest border-b border-zinc-800 border-opacity-50 pb-2 mb-4 flex items-center gap-2">
                 <Shield className="w-5 h-5 text-amber-500" /> Advanced Command: Fog & Duos
               </h3>
               <div className="space-y-4 text-xs text-zinc-300 leading-relaxed uppercase">
                 <p>
                   Before claiming full command, be aware of two vital lobby settings you can configure:
                 </p>
                 <div className="bg-black/40 border border-zinc-800 border-opacity-50/60 p-3 rounded">
                    <h4 className="text-amber-500 font-bold mb-1 flex items-center gap-1.5">
                       <Zap className="w-3 h-3 text-amber-400" /> SMOG PROTOCOL (FOG OF WAR)
                    </h4>
                    <p className="text-zinc-400 text-[10px]">
                       When active, enemy combatants become entirely invisible on the tactical grid unless they are within the direct line of sight (visual range) of one of your friendly active operators. Assassins have extreme stealth properties inside Smog!
                    </p>
                 </div>
                 <div className="bg-black/40 border border-zinc-800 border-opacity-50/60 p-3 rounded">
                    <h4 className="text-sky-400 font-bold mb-1 flex items-center gap-1.5">
                       <UserPlus className="w-3 h-3 text-sky-400" /> SQUAD SIZES & DUOS
                    </h4>
                    <p className="text-zinc-400 text-[10px]">
                       The default loadout is 4-unit squadrons. However, you can configure tactical encounters to run from anywhere down to a 1 vs 1 duel, or 2 vs 2 Duos. Ensure your drafted roster composition matches the combat size constraints.
                    </p>
                 </div>
               </div>
               
               <button
                 onClick={() => {
                   setStep('completed');
                   safeSetItem('assassinUnlocked', 'true');
                   playSound('win');
                 }}
                 className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded border border-amber-400 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center gap-1.5"
               >
                 I Understand, Proceed to Uplink <ArrowRight className="w-4 h-4 ml-1" />
               </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: COMPLETED PAGE */}
        {step === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6 text-center py-6"
          >
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1 max-w-lg mx-auto">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">TACTICAL BLUEPRINT SECURED</span>
              <h2 className="text-xl font-black text-white uppercase font-mono tracking-widest">
                Archetype Sync Calibrated Successfully
              </h2>
              <p className="text-xs text-[#8b9180] leading-relaxed uppercase pt-2">
                You have successfully advanced your unit on the tactical grid framework and deployed the signature class feature of the <span className="text-[#fbbf24] font-black">{selectedClassName}</span>. You are fully capable of executing complex squad formations.
              </p>
            </div>

            <div className="border border-emerald-500/25 bg-zinc-900 bg-opacity-80 max-w-xl mx-auto p-4 rounded-xl text-left font-mono text-[9px] text-[#8b9180] leading-relaxed relative overflow-hidden">
              <div className="absolute -right-3 -bottom-3 text-emerald-500/5 rotate-12 pointer-events-none">
                <Award className="w-24 h-24" />
              </div>
              <h4 className="font-bold text-white uppercase text-[10px] tracking-wide mb-2 flex items-center gap-1.5 border-b border-zinc-800 border-opacity-50 pb-1.5">
                <Info className="w-4 h-4 text-emerald-400" /> WHAT ABOUT OTHER OPERATORS?
              </h4>
              <p className="mb-2">
                There are <span className="text-white font-extrabold">10 standard classes</span> defined inside the squad bios tab. In the online or local modes, each player recruits exactly 4 classes, establishing specialized roles:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li><span className="text-[#fbbf24] font-semibold">HEAVY JUGGERNAUT</span> can invoke shielding fields to repair self for 50 HP.</li>
                <li><span className="text-[#fbbf24] font-semibold">DEMOMAN EXPLOSIVES</span> fires rocket payloads damaging entire 3x3 grids.</li>
                <li><span className="text-[#fbbf24] font-semibold">ADRENALINE SCOUT</span> has 7 tiles mobility and can acquire bonus action points dynamically.</li>
                <li><span className="text-[#a855f7] font-semibold">GHOST ASSASSIN (UNLOCKED!)</span> You have earned access to the Assassin ghost operative. They possess extreme stealth inside Smog, and a 1-shot lethal melee strike.</li>
              </ul>
              <div className="text-[8px] text-[#fbbf24]/90 font-bold border-t border-zinc-800 border-opacity-50 mt-3 pt-2 uppercase">
                🚀 Feel free to select another class underneath to try their specific mechanical simulation! Repeating the tutorial explores each unit’s movement and targets.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto w-full pt-1">
              <button
                onClick={() => setStep('class_select')}
                className="py-3 bg-zinc-900 bg-opacity-80 border border-zinc-800 border-opacity-50 hover:border-[#fbbf24] text-zinc-300 hover:text-[#fbbf24] text-xs font-black uppercase rounded cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Simulate Another Operator
              </button>
              <button
                onClick={onBack}
                className="py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black uppercase tracking-wider rounded border border-amber-400 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center gap-1.5"
              >
                Assemble Squad & Deploy
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
