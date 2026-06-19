import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAudio } from '../contexts/AudioContext';
import {
  Target, Shield, HelpCircle, ArrowRight, Play, CheckCircle2, RotateCcw,
  MapPin, Plus, UserPlus, Zap, Crosshair, Heart, Hammer, Info, Award, ArrowLeft,
  MousePointer, Footprints, Swords, Move
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

type TutorialStep =
  | 'welcome'
  | 'basics_ap'
  | 'basics_movement'
  | 'basics_attack'
  | 'basics_cover'
  | 'class_select'
  | 'movement'
  | 'ability'
  | 'smog_tutorial'
  | 'completed';

const MODULE_CLASSES = ['Assault', 'Sniper', 'Medic', 'Technician'];

const STEP_TITLES: Record<string, string> = {
  welcome: 'Welcome',
  basics_ap: 'Action Points',
  basics_movement: 'Moving',
  basics_attack: 'Attacking',
  basics_cover: 'Cover & Walls',
  class_select: 'Pick a Class',
  movement: 'Try Moving',
  ability: 'Use Your Ability',
  smog_tutorial: 'Advanced Tips',
  completed: 'Done!',
};

export default function TutorialMode({ onBack }: { onBack: () => void }) {
  const { playSound } = useAudio();
  const [step, setStep] = useState<TutorialStep>('welcome');
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

  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [fireLine, setFireLine] = useState<{ fromX: number; fromY: number; toX: number; toY: number; color: string } | null>(null);
  const [activeDamageText, setActiveDamageText] = useState<{ x: number; y: number; text: string; color: string } | null>(null);

  const selectedClass = CLASSES.find(c => c.className === selectedClassName) || CLASSES[0];

  const addLog = (msg: string) => {
    setLog(prev => [msg, ...prev.slice(0, 4)]);
  };

  const initializeSimulation = (className: string) => {
    playSound('click');
    setSelectedClassName(className);
    setUnitX(1);
    setUnitY(4);
    setAp(2);
    setLog([`Ready! Move your ${className} by clicking a green tile.`]);
    setTargetDummyHP(80);
    setInjuredAllyHP(30);
    setPlacedCrate(null);
    setStep('movement');
  };

  useEffect(() => {
    if (step === 'movement' && ap === 0) {
      const timer = setTimeout(() => {
        setStep('ability');
        setAp(1);
        playSound('click');
        addLog(`No AP left for moving. Time to use your ability!`);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [ap, step, playSound]);

  const cols = 6;
  const rows = 6;

  const getCellType = (x: number, y: number): 'floor' | 'wall' | 'crate' => {
    if (placedCrate && placedCrate.x === x && placedCrate.y === y) return 'crate';
    if (x === 2 && y === 2) return 'crate';
    if (x === 3 && y === 1) return 'wall';
    return 'floor';
  };

  const isReachable = (x: number, y: number) => {
    if (step !== 'movement' || ap < 1) return false;
    const dist = Math.abs(x - unitX) + Math.abs(y - unitY);
    const maxMove = Math.max(1, Math.min(3, Math.ceil(selectedClass.stats.mobility / 2)));
    if (dist > 0 && dist <= maxMove) {
      const cellType = getCellType(x, y);
      if (cellType === 'floor') {
        if (selectedClassName !== 'Medic' && x === 4 && y === 1) return false;
        if (selectedClassName === 'Medic' && x === 2 && y === 4) return false;
        return true;
      }
    }
    return false;
  };

  const handleCellClick = (x: number, y: number) => {
    if (step === 'movement') {
      if (isReachable(x, y)) {
        playSound('move');
        setUnitX(x);
        setUnitY(y);
        setAp(prev => prev - 1);
        addLog(`Moved to (${x}, ${y}). Used 1 AP. ${ap - 1} AP left.`);
      }
    } else if (step === 'ability' && ap > 0) {
      const isTargetValid = checkAbilityTarget(x, y);
      if (isTargetValid) {
        executeAbilityAction(x, y);
      }
    }
  };

  const checkAbilityTarget = (x: number, y: number) => {
    if (step !== 'ability' || ap < 1) return false;
    if (selectedClassName === 'Sniper') return x === 4 && y === 1;
    if (selectedClassName === 'Assault') return x === 4 && y === 1;
    if (selectedClassName === 'Medic') return x === 2 && y === 4;
    if (selectedClassName === 'Technician') {
      const isSelf = unitX === x && unitY === y;
      return getCellType(x, y) === 'floor' && !isSelf;
    }
    if (selectedClassName === 'Assassin') return x === 4 && y === 1;
    return false;
  };

  const executeAbilityAction = (x: number, y: number) => {
    playSound('attack');
    setAp(0);
    const dist = Math.abs(x - unitX) + Math.abs(y - unitY);

    if (selectedClassName === 'Sniper') {
      setFireLine({ fromX: unitX, fromY: unitY, toX: 4, toY: 1, color: '#06b6d4' });
      setActiveDamageText({ x: 4, y: 1, text: '-45 DMG!', color: '#ef4444' });
      setIsShaking(true);
      setTimeout(() => { setTargetDummyHP(0); playSound('damage'); }, 250);
      addLog(`Sniper hit! 45 damage with Piercing Round!`);
    } else if (selectedClassName === 'Assault') {
      setFireLine({ fromX: unitX, fromY: unitY, toX: 4, toY: 1, color: '#f97316' });
      setActiveDamageText({ x: 4, y: 1, text: '-25 DMG!', color: '#f97316' });
      setIsShaking(true);
      setTimeout(() => { setTargetDummyHP(prev => Math.max(0, prev - 25)); playSound('damage'); }, 200);
      addLog(`Assault attack! 25 damage with Tactical Flush!`);
    } else if (selectedClassName === 'Medic') {
      setFireLine({ fromX: unitX, fromY: unitY, toX: 2, toY: 4, color: '#10b981' });
      setActiveDamageText({ x: 2, y: 4, text: '+55 HP!', color: '#38bdf8' });
      setTimeout(() => { setInjuredAllyHP(85); playSound('win'); }, 200);
      addLog(`Medic healed ally back to 85 HP!`);
    } else if (selectedClassName === 'Technician') {
      setFireLine({ fromX: unitX, fromY: unitY, toX: x, toY: y, color: '#f59e0b' });
      setActiveDamageText({ x, y, text: 'CRATE BUILT!', color: '#fbbf24' });
      playSound('deploy');
      setTimeout(() => { setPlacedCrate({ x, y }); playSound('deploy'); }, 200);
      addLog(`Technician built a crate for cover!`);
    } else if (selectedClassName === 'Assassin') {
      setFireLine({ fromX: unitX, fromY: unitY, toX: x, toY: y, color: '#a855f7' });
      setActiveDamageText({ x, y, text: '-250 FATAL!', color: '#a855f7' });
      setIsShaking(true);
      setTimeout(() => { setTargetDummyHP(0); playSound('damage'); }, 200);
      addLog(`Assassin eliminated the target! 250 fatal damage!`);
    }

    setTimeout(() => { setFireLine(null); setIsShaking(false); }, 550);
    setTimeout(() => { setActiveDamageText(null); }, 1200);
    setTimeout(() => { setStep('smog_tutorial'); playSound('win'); }, 1800);
  };

  const allSteps: TutorialStep[] = ['welcome', 'basics_ap', 'basics_movement', 'basics_attack', 'basics_cover', 'class_select'];
  const currentStepIndex = allSteps.indexOf(step);
  const isBasicsStep = currentStepIndex >= 0 && currentStepIndex <= 4;

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 bg-zinc-950/95 border border-zinc-800/50 rounded-2xl shadow-2xl relative font-mono text-zinc-300 select-none text-left">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4 mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-wide text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" /> How to Play
          </h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">Learn the basics step by step</p>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1.5 border border-zinc-700/50 hover:border-amber-400/50 text-xs text-zinc-400 hover:text-amber-400 transition-all cursor-pointer rounded-lg flex items-center gap-1.5 bg-zinc-900/80"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Progress dots for basics steps */}
      {(isBasicsStep || step === 'class_select') && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {allSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => { if (i <= currentStepIndex) setStep(s); }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase transition-all ${
                  step === s
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                    : i < currentStepIndex
                      ? 'text-emerald-400 cursor-pointer hover:bg-emerald-500/10'
                      : 'text-zinc-600'
                }`}
              >
                {i < currentStepIndex ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[7px]">{i+1}</span>}
                <span className="hidden sm:inline">{STEP_TITLES[s]}</span>
              </button>
              {i < allSteps.length - 1 && <div className={`w-3 h-px ${i < currentStepIndex ? 'bg-emerald-500/40' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* WELCOME */}
        {step === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-5 items-center text-center py-8">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center">
              <Swords className="w-8 h-8 text-amber-400" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-black text-white">Welcome, Commander!</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                This is a <span className="text-white font-bold">turn-based tactics game</span>. You build a squad of 4 characters, place them on a grid, and take turns fighting the enemy team.
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Let's walk through the basics — it only takes a minute.
              </p>
            </div>
            <button
              onClick={() => { setStep('basics_ap'); playSound('click'); }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              Let's Go <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* BASICS: AP */}
        {step === 'basics_ap' && (
          <motion.div key="basics_ap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-5 max-w-lg mx-auto">
            <div className="bg-zinc-900/60 border border-zinc-800/50 p-5 rounded-xl space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" /> Action Points (AP)
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Every character gets <span className="text-amber-400 font-black text-base">2 AP</span> per turn. AP is your "energy" — everything costs AP:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 border border-zinc-800/40 rounded-lg p-3 text-center">
                  <Footprints className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-white">Move</p>
                  <p className="text-[10px] text-zinc-500">Costs 1 AP</p>
                </div>
                <div className="bg-black/40 border border-zinc-800/40 rounded-lg p-3 text-center">
                  <Crosshair className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-white">Attack / Ability</p>
                  <p className="text-[10px] text-zinc-500">Costs 1 AP</p>
                </div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-300">
                  <span className="font-bold">Example:</span> Move once (1 AP) then attack (1 AP) = turn over! Or move twice, or attack then move — you choose.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('welcome')} className="px-4 py-2.5 border border-zinc-700/40 text-xs text-zinc-400 hover:text-white rounded-lg cursor-pointer transition-all">Back</button>
              <button onClick={() => { setStep('basics_movement'); playSound('click'); }} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5">
                Next: Movement <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* BASICS: MOVEMENT */}
        {step === 'basics_movement' && (
          <motion.div key="basics_movement" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-5 max-w-lg mx-auto">
            <div className="bg-zinc-900/60 border border-zinc-800/50 p-5 rounded-xl space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Move className="w-5 h-5 text-emerald-400" /> How Movement Works
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Click one of your characters to select them. <span className="text-emerald-400 font-bold">Green tiles</span> show where they can move.
              </p>
              <div className="flex items-center gap-3 bg-black/30 border border-zinc-800/30 rounded-lg p-3">
                <div className="w-8 h-8 bg-emerald-500/20 border-2 border-emerald-500/60 rounded animate-pulse shrink-0" />
                <p className="text-xs text-zinc-400">Green = you can move here (click to move)</p>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Each class has a <span className="text-white font-bold">mobility stat</span> — some can move farther than others. Scouts are fast (7 tiles), Heavies are slow (2 tiles).
              </p>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-xs text-emerald-300">
                  <span className="font-bold">Tip:</span> Moving a short distance costs 1 AP, but moving far costs 2 AP. Plan carefully!
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('basics_ap')} className="px-4 py-2.5 border border-zinc-700/40 text-xs text-zinc-400 hover:text-white rounded-lg cursor-pointer transition-all">Back</button>
              <button onClick={() => { setStep('basics_attack'); playSound('click'); }} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5">
                Next: Attacking <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* BASICS: ATTACKING */}
        {step === 'basics_attack' && (
          <motion.div key="basics_attack" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-5 max-w-lg mx-auto">
            <div className="bg-zinc-900/60 border border-zinc-800/50 p-5 rounded-xl space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-rose-400" /> Attacking & Abilities
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                To attack, select your character, then <span className="text-rose-400 font-bold">click an enemy</span> in range. If the enemy is highlighted in <span className="text-rose-400 font-bold">red</span>, you can shoot them.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-black/30 border border-zinc-800/30 rounded-lg p-3">
                  <Target className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Regular Attack</p>
                    <p className="text-[10px] text-zinc-500">Click enemy in range — costs 1 AP</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black/30 border border-zinc-800/30 rounded-lg p-3">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Special Ability</p>
                    <p className="text-[10px] text-zinc-500">Each class has a unique ability (heal, charge, build cover...)</p>
                  </div>
                </div>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
                <p className="text-xs text-rose-300">
                  <span className="font-bold">Hit Chance:</span> Attacks aren't always guaranteed to hit! Distance and cover affect accuracy. Close range = 100% hit.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('basics_movement')} className="px-4 py-2.5 border border-zinc-700/40 text-xs text-zinc-400 hover:text-white rounded-lg cursor-pointer transition-all">Back</button>
              <button onClick={() => { setStep('basics_cover'); playSound('click'); }} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5">
                Next: Cover <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* BASICS: COVER & WALLS */}
        {step === 'basics_cover' && (
          <motion.div key="basics_cover" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-5 max-w-lg mx-auto">
            <div className="bg-zinc-900/60 border border-zinc-800/50 p-5 rounded-xl space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" /> Cover, Walls & Line of Sight
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                The map has obstacles that block shots and movement:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-black/30 border border-zinc-800/30 rounded-lg p-3">
                  <div className="w-8 h-8 bg-zinc-700 rounded border border-zinc-600 shrink-0 flex items-center justify-center text-[8px] text-zinc-400 font-bold">WALL</div>
                  <p className="text-xs text-zinc-400"><span className="text-white font-bold">Walls</span> — can't move through, can't shoot through. Permanent.</p>
                </div>
                <div className="flex items-center gap-3 bg-black/30 border border-zinc-800/30 rounded-lg p-3">
                  <div className="w-8 h-8 bg-amber-900/50 rounded border border-amber-700 shrink-0 flex items-center justify-center text-[8px] text-amber-500 font-bold">CRATE</div>
                  <p className="text-xs text-zinc-400"><span className="text-white font-bold">Crates</span> — block shots and give cover. Can be destroyed!</p>
                </div>
                <div className="flex items-center gap-3 bg-black/30 border border-zinc-800/30 rounded-lg p-3">
                  <div className="w-8 h-8 bg-red-900/40 rounded border border-red-700 shrink-0 flex items-center justify-center text-[8px] text-red-500 font-bold">BBL</div>
                  <p className="text-xs text-zinc-400"><span className="text-white font-bold">Barrels</span> — shoot them to explode and damage nearby units!</p>
                </div>
              </div>
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-lg p-3">
                <p className="text-xs text-sky-300">
                  <span className="font-bold">Tip:</span> Standing next to a crate gives your enemies -20% accuracy when shooting at you. Use cover!
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('basics_attack')} className="px-4 py-2.5 border border-zinc-700/40 text-xs text-zinc-400 hover:text-white rounded-lg cursor-pointer transition-all">Back</button>
              <button onClick={() => { setStep('class_select'); playSound('click'); }} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20">
                Now Try It! <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* CLASS SELECTION */}
        {step === 'class_select' && (
          <motion.div
            key="class_select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-5"
          >
            <div className="bg-zinc-900/50 border border-zinc-800/40 p-4 rounded-xl text-center">
              <h3 className="text-base font-black text-white mb-1">Pick a Class to Try</h3>
              <p className="text-xs text-zinc-400">
                Each class plays differently. Pick one to try their movement and special ability on a practice grid.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(() => {
                const unlocked = safeGetItem('assassinUnlocked') === 'true';
                return unlocked ? [...MODULE_CLASSES, 'Assassin'] : MODULE_CLASSES;
              })().map(clsName => {
                const specClass = CLASSES.find(c => c.className === clsName)!;
                const abilityHint = clsName === 'Assault' ? 'Drains enemy AP'
                  : clsName === 'Sniper' ? 'Long-range precision shot'
                  : clsName === 'Medic' ? 'Heals injured allies'
                  : clsName === 'Technician' ? 'Builds cover crates'
                  : 'Lethal melee strike';
                return (
                  <button
                    type="button"
                    key={clsName}
                    onClick={() => initializeSimulation(clsName)}
                    className="p-4 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/50 hover:border-amber-500/40 rounded-xl cursor-pointer transition-all flex items-center gap-3 group text-left"
                  >
                    <div className="w-11 h-11 border border-zinc-700/50 rounded-lg flex items-center justify-center bg-black/40 shrink-0 group-hover:border-amber-500/30 transition-colors">
                      <UnitHelmetAvatar classNameVal={clsName} className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                        {specClass.className}
                      </h3>
                      <p className="text-[10px] text-zinc-500 truncate">{abilityHint}</p>
                      <div className="flex gap-2 mt-1 text-[9px] text-zinc-600">
                        <span>{specClass.stats.maxHP} HP</span>
                        <span>{specClass.stats.damage} DMG</span>
                        <span>{specClass.stats.range} Range</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>

            <button onClick={() => setStep('basics_cover')} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors text-center py-2">
              ← Back to basics
            </button>
          </motion.div>
        )}

        {/* INTERACTIVE: MOVEMENT & ABILITY */}
        {(step === 'movement' || step === 'ability') && (
          <motion.div
            key="sandbox_simulation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-5"
          >
            {/* Guide panel */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="bg-zinc-900/60 border border-zinc-800/50 p-4 rounded-xl">
                <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
                  {step === 'movement' ? (
                    <><Footprints className="w-4 h-4 text-emerald-400" /> Step 1: Move Your Character</>
                  ) : (
                    <><Crosshair className="w-4 h-4 text-rose-400" /> Step 2: Use Your Ability</>
                  )}
                </h3>

                <div className="text-xs text-zinc-300 leading-relaxed space-y-2">
                  {step === 'movement' ? (
                    <>
                      <p>
                        Your <span className="text-white font-bold">{selectedClassName}</span> is on the grid. <span className="text-emerald-400 font-bold">Green tiles</span> show where you can move.
                      </p>
                      <p className="text-amber-400 font-bold flex items-center gap-1">
                        <MousePointer className="w-3 h-3" /> Click a green tile to move there!
                      </p>
                    </>
                  ) : (
                    <>
                      <p>Great move! Now use your ability:</p>
                      {selectedClassName === 'Sniper' && (
                        <p>Click the <span className="text-rose-400 font-bold">red enemy target</span> to fire a long-range Piercing Round!</p>
                      )}
                      {selectedClassName === 'Assault' && (
                        <p>Click the <span className="text-rose-400 font-bold">red enemy target</span> to attack with Tactical Flush!</p>
                      )}
                      {selectedClassName === 'Medic' && (
                        <p>Click the <span className="text-sky-400 font-bold">blue injured ally</span> to heal them!</p>
                      )}
                      {selectedClassName === 'Technician' && (
                        <p>Click any <span className="text-amber-400 font-bold">highlighted tile</span> to build a cover crate!</p>
                      )}
                      {selectedClassName === 'Assassin' && (
                        <p>Click the <span className="text-rose-400 font-bold">red enemy target</span> for a lethal Shadow Strike!</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Character info */}
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-3 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-black/40 border border-zinc-700/50 rounded-lg flex items-center justify-center shrink-0">
                  <UnitHelmetAvatar classNameVal={selectedClassName} className="w-7 h-7" />
                </div>
                <div className="flex-1 text-xs">
                  <span className="font-black text-white block">{selectedClass.className}</span>
                  <div className="flex gap-3 text-[10px] text-zinc-500 mt-0.5">
                    <span>HP: {selectedClass.stats.maxHP}</span>
                    <span>DMG: {selectedClass.stats.damage}</span>
                    <span className="text-amber-400 font-bold">AP: {ap}/2</span>
                  </div>
                </div>
              </div>

              {/* Simple log */}
              <div className="bg-black/50 border border-zinc-800/40 rounded-lg p-2.5 h-[80px] overflow-hidden flex flex-col gap-1">
                <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">Log</span>
                <div className="flex-1 overflow-y-auto space-y-0.5 text-[10px] font-mono">
                  {log.map((lg, i) => (
                    <div key={i} className={i === 0 ? "text-amber-400" : "text-zinc-600"}>
                      {lg}
                    </div>
                  ))}
                </div>
              </div>

              {step === 'movement' && (
                <button
                  onClick={() => {
                    setStep('ability');
                    setAp(1);
                    playSound('click');
                    addLog(`Skipped to ability phase.`);
                  }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-lg border border-amber-400 shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {ap < 2 ? "Done Moving — Use Ability" : "Skip to Ability"} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="md:col-span-7 flex flex-col items-center justify-center">
              <motion.div
                animate={isShaking ? { x: [0, -8, 8, -8, 8, -4, 4, -2, 2, 0], y: [0, 5, -5, 3, -3, 2, -2, 0] } : {}}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="bg-black/50 border border-zinc-800/50 rounded-xl p-3 relative overflow-hidden shadow-xl w-full max-w-[380px]"
              >
                <div className="grid grid-cols-6 gap-1.5 w-full relative">
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

                      let bgClass = "bg-zinc-900/60 border-zinc-800/40";

                      if (cellType === 'wall') bgClass = "bg-zinc-700/60 border-zinc-600/50";
                      else if (cellType === 'crate') bgClass = "bg-amber-900/30 border-amber-700/40";

                      if (reachable) bgClass = "bg-emerald-900/40 border-emerald-500/60 hover:bg-emerald-800/50 cursor-pointer animate-pulse";
                      else if (isTargetable) {
                        if (selectedClassName === 'Medic') bgClass = "bg-sky-900/40 border-sky-500/60 hover:bg-sky-800/50 cursor-pointer animate-pulse";
                        else if (selectedClassName === 'Technician') bgClass = "bg-amber-900/40 border-amber-500/60 hover:bg-amber-800/50 cursor-pointer animate-pulse";
                        else bgClass = "bg-rose-900/40 border-rose-500/60 hover:bg-rose-800/50 cursor-pointer animate-pulse";
                      }

                      return (
                        <div
                          key={`${x}-${y}`}
                          onClick={() => handleCellClick(x, y)}
                          onMouseEnter={() => setHoveredCell({ x, y })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`pt-[100%] relative rounded border transition-all ${bgClass}`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center p-0.5">
                            {activeDamageText && activeDamageText.x === x && activeDamageText.y === y && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: 15 }}
                                animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1.4, 1.4, 0.9], y: [-5, -30, -50, -65] }}
                                transition={{ duration: 1.2, times: [0, 0.12, 0.82, 1] }}
                                className="absolute pointer-events-none z-50 font-black text-[10px] whitespace-nowrap bg-black/90 text-white px-2 py-1 rounded border border-current shadow-lg uppercase"
                                style={{ color: activeDamageText.color }}
                              >
                                {activeDamageText.text}
                              </motion.div>
                            )}

                            {cellType === 'wall' && (
                              <div className="text-[7px] font-bold text-zinc-500 uppercase">Wall</div>
                            )}

                            {cellType === 'crate' && (
                              <div className="text-[7px] font-bold text-amber-600 uppercase">Crate</div>
                            )}

                            {isUnitCell && (
                              <div className="w-[85%] h-[85%] bg-emerald-500/25 border-2 border-emerald-400 rounded flex items-center justify-center relative shadow-[0_0_8px_#10b981]">
                                <UnitHelmetAvatar classNameVal={selectedClassName} className="w-full h-full text-emerald-400" />
                                <div className="absolute -top-1 -right-1 bg-emerald-500 w-1.5 h-1.5 rounded-full animate-ping" />
                              </div>
                            )}

                            {isTargetDummyCell && (
                              <div className="w-[85%] h-[85%] bg-rose-500/20 border-2 border-rose-500 rounded flex flex-col items-center justify-center relative shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                <Target className="w-5 h-5 text-rose-500 animate-pulse" />
                                <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden absolute -bottom-1">
                                  <div className="bg-rose-500 h-full transition-all" style={{ width: `${(targetDummyHP / 80) * 100}%` }} />
                                </div>
                              </div>
                            )}

                            {isInjuredAllyCell && (
                              <div className="w-[85%] h-[85%] bg-sky-500/10 border-2 border-sky-400/80 rounded flex flex-col items-center justify-center relative">
                                <UnitHelmetAvatar classNameVal="Assault" className="w-[70%] h-[70%]" />
                                <Heart className="w-2.5 h-2.5 text-sky-400 absolute top-0.5 right-0.5 animate-pulse" />
                                <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden absolute -bottom-1">
                                  <div className={injuredAllyHP < 55 ? "bg-amber-500 h-full" : "bg-sky-400 h-full"} style={{ width: `${(injuredAllyHP / 85) * 100}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </motion.div>

              <button
                onClick={() => initializeSimulation(selectedClassName)}
                className="mt-3 px-3 py-1.5 bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-600 text-[10px] text-zinc-500 hover:text-zinc-300 transition-all rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Restart
              </button>
            </div>
          </motion.div>
        )}

        {/* ADVANCED TIPS */}
        {step === 'smog_tutorial' && (
          <motion.div
            key="smog_tutorial"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-5 max-w-lg mx-auto py-4"
          >
            <div className="text-center mb-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-lg font-black text-white">Nice Work!</h3>
              <p className="text-xs text-zinc-400 mt-1">You've got the basics down. Here are some advanced features:</p>
            </div>

            <div className="space-y-3">
              <div className="bg-zinc-900/50 border border-zinc-800/40 p-4 rounded-xl">
                <h4 className="text-xs font-black text-amber-400 mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Fog of War
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  When enabled in settings, enemies are <span className="text-white font-bold">hidden</span> unless your units can see them. Makes the game more strategic!
                </p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/40 p-4 rounded-xl">
                <h4 className="text-xs font-black text-sky-400 mb-1.5 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Squad Sizes
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Default is 4v4, but you can play 1v1, 2v2, or 3v3 duels too!
                </p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/40 p-4 rounded-xl">
                <h4 className="text-xs font-black text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Chemistry Bonuses
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Certain class pairs get stat bonuses when on the same team. Check the <span className="text-white font-bold">Squad Chemistries</span> tab to find powerful combos!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setStep('completed');
                safeSetItem('assassinUnlocked', 'true');
                playSound('win');
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black text-sm font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              Got It! <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* COMPLETED */}
        {step === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6 text-center py-6"
          >
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-black text-white">You're Ready!</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                You know the basics: <span className="text-amber-400 font-bold">AP</span>, <span className="text-emerald-400 font-bold">movement</span>, <span className="text-rose-400 font-bold">attacking</span>, and <span className="text-sky-400 font-bold">cover</span>. Time to build your squad and fight!
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-emerald-500/20 max-w-md mx-auto p-4 rounded-xl text-left">
              <h4 className="text-xs font-black text-white mb-2">Quick Reference</h4>
              <ul className="space-y-1.5 text-xs text-zinc-400">
                <li className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">•</span> Each unit gets 2 AP per turn</li>
                <li className="flex items-start gap-2"><span className="text-emerald-400 font-bold shrink-0">•</span> Move costs 1-2 AP, attack costs 1 AP</li>
                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold shrink-0">•</span> Hide behind crates for -20% enemy accuracy</li>
                <li className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">•</span> Eliminate all 4 enemy units to win</li>
                <li className="flex items-start gap-2"><span className="text-fuchsia-400 font-bold shrink-0">•</span> There are {CLASSES.length} classes — experiment with different squads!</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto w-full pt-1">
              <button
                onClick={() => setStep('class_select')}
                className="py-3 bg-zinc-900/60 border border-zinc-800/50 hover:border-amber-500/40 text-zinc-300 hover:text-amber-400 text-xs font-black uppercase rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Try Another Class
              </button>
              <button
                onClick={onBack}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                Start Playing! <Play className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
