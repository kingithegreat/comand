import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterAbility } from '../types';
import { Clock, Crosshair, Zap, Flame, Shield, HelpCircle, Heart, Box, Activity } from 'lucide-react';

interface AbilityTooltipProps {
  ability: CharacterAbility;
  classNameVal: string;
  children: React.ReactNode;
}

interface TacticalSpecs {
  cooldown: string;
  damageOrHeal: string;
  targetType: string;
  detailedPerk: string;
  intensity: 'High' | 'Medium' | 'Low' | 'Utility';
}

// Map each squad class's active ability to precise tactical specifications
const getTacticalSpecs = (className: string, ability: CharacterAbility): TacticalSpecs => {
  switch (className) {
    case 'Sniper':
      return {
        cooldown: '1 Turn (AP Limited)',
        damageOrHeal: '55 Piercing DMG',
        targetType: 'Hostile Tile (Line-of-Sight)',
        detailedPerk: 'Pierces through unit defensive shields and blocks.',
        intensity: 'High',
      };
    case 'Demoman':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '30 Splash DMG',
        targetType: 'Coordinate Grid (3x3 Area)',
        detailedPerk: 'Deals damage to all units in a 3x3 grid sector.',
        intensity: 'Medium',
      };
    case 'Assault':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '25 Heavy DMG',
        targetType: 'Hostile Unit (5 Range)',
        detailedPerk: 'Drains exactly 1 Action Point (AP) from target on hit.',
        intensity: 'Medium',
      };
    case 'Heavy':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '+50 HP Repaired',
        targetType: 'Self Core Plating',
        detailedPerk: 'Instantly regenerates structural hull integrity points.',
        intensity: 'Utility',
      };
    case 'Medic':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '+55 HP Restored',
        targetType: 'Friendly unit (3 Range)',
        detailedPerk: 'Injects surgical micro-nanites to restore full vitality.',
        intensity: 'Utility',
      };
    case 'Scout':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '+20 HP & +1 AP Return',
        targetType: 'Self Buff Payload',
        detailedPerk: 'Heals self and grants +1 bonus Action Point back.',
        intensity: 'Utility',
      };
    case 'Technician':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '45 Crate HP',
        targetType: 'Adjacent Floor block',
        detailedPerk: 'Constructs temporary solid covers to block lines of sight.',
        intensity: 'Utility',
      };
    case 'Support':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '20 Static DMG',
        targetType: 'Hostile unit (5 Range)',
        detailedPerk: 'Emits EMP disruptor static field; drains target AP by 1 AP.',
        intensity: 'Medium',
      };
    case 'Shotgunner':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '+35 HP Repaired',
        targetType: 'Self Tech Shield',
        detailedPerk: 'Restores tactical barrier integrity and reloads ammo.',
        intensity: 'Utility',
      };
    case 'Flamethrower':
      return {
        cooldown: '1 Turn',
        damageOrHeal: '85 Fire DMG',
        targetType: 'Frontal Cone (2 Range)',
        detailedPerk: 'Releases catastrophic heat. Bypasses cover multipliers.',
        intensity: 'High',
      };
    default:
      return {
        cooldown: '1 Turn',
        damageOrHeal: '20 Standard units',
        targetType: 'Target grid cell',
        detailedPerk: 'Standard action parameters.',
        intensity: 'Low',
      };
  }
};

export const AbilityTooltip: React.FC<AbilityTooltipProps> = ({ ability, classNameVal, children }) => {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const specs = getTacticalSpecs(classNameVal, ability);

  const handlePointerMove = (e: React.PointerEvent) => {
    // Dynamically retrieve client dimensions to ensure tooltip remains inside optimal screen viewport
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const tooltipWidth = 240; 
    let xOffset = 18;
    
    // Shift the floating tooltip left if hovering near the right viewport margin
    if (e.clientX + tooltipWidth > screenWidth - 15) {
      xOffset = -tooltipWidth - 18;
    }

    setCoords({
      x: e.clientX + xOffset,
      y: e.clientY - 90,
    });
  };

  const mapTypeToIcon = (type: string) => {
    switch (type) {
      case 'heal':
        return <Heart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'offensive':
        return <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'deploy':
        return <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
  };

  const getIntensityColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-rose-500 bg-rose-500/10 border-rose-500/35';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/35';
      case 'Low': return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/35';
    }
  };

  return (
    <div
      onPointerEnter={(e) => {
        handlePointerMove(e);
        setIsVisible(true);
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setIsVisible(false)}
      className="relative inline-block w-full"
    >
      {children}

      <AnimatePresence>
        {isVisible && coords && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed pointer-events-none z-[9999] w-[250px] bg-zinc-950/95 border border-zinc-700/40 text-zinc-200 p-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl font-mono"
            style={{
              left: coords.x,
              top: coords.y,
            }}
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5 truncate">
                {mapTypeToIcon(ability.type)}
                <span className="text-[10px] uppercase font-bold tracking-wide text-zinc-100 truncate">
                  {ability.name}
                </span>
              </div>
              <span className={`text-[7px] font-semibold border uppercase rounded-md px-1 shrink-0 ${getIntensityColor(specs.intensity)}`}>
                {specs.intensity}
              </span>
            </div>

            <div className="space-y-1.5 text-[8px] uppercase tracking-wide">
              <div className="flex justify-between items-center bg-zinc-800/30 py-1 px-1.5 rounded-md">
                <span className="text-zinc-500 font-semibold flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-zinc-600" /> Cooldown
                </span>
                <span className="text-zinc-300 font-semibold">{specs.cooldown}</span>
              </div>

              <div className="flex justify-between items-center bg-zinc-800/30 py-1 px-1.5 rounded-md">
                <span className="text-zinc-500 font-semibold flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 text-zinc-600" /> Effect
                </span>
                <span className="text-amber-400 font-semibold">{specs.damageOrHeal}</span>
              </div>

              {ability.range !== undefined && (
                <div className="flex justify-between items-center bg-zinc-800/30 py-1 px-1.5 rounded-md">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1">
                    <Crosshair className="w-2.5 h-2.5 text-zinc-600" /> Range
                  </span>
                  <span className="text-sky-300 font-semibold">{ability.range} cells</span>
                </div>
              )}

              <div className="flex justify-between items-center bg-zinc-800/30 py-1 px-1.5 rounded-md">
                <span className="text-zinc-500 font-semibold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-zinc-600" /> Cost
                </span>
                <span className="text-amber-300 font-semibold">{ability.apCost} AP</span>
              </div>

              <div className="text-[7.5px] border-t border-zinc-800/30 pt-1.5 mt-1.5 leading-relaxed text-zinc-400 normal-case">
                {specs.detailedPerk}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
