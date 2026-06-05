import React from 'react';
import { Target, Shield, Zap, Flame, Rocket, ChevronRight, Activity, Crosshair, HelpCircle, AlertTriangle, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { Unit, GridCell } from '../types';
import { checkLineOfSight } from '../logic';
import UnitHelmetAvatar from './UnitHelmetAvatar';

interface SelectedUnitConsoleProps {
  selectedUnit: Unit | null;
  activeTeam: 'player' | 'enemy';
  onEndTurn: () => void;
  onCancelSelection: () => void;
  isAbilityActive: boolean;
  onToggleAbility: () => void;
  mapEnvironment: GridCell[][];
  units: Unit[];
  activeHoveredTile: { x: number; y: number } | null;
  isOnline: boolean | undefined;
  myTeam?: 'player' | 'enemy';
  onPassUnit: () => void; // Reduce chosen unit's AP to 0 so they pass turn
}

export default function SelectedUnitConsole({
  selectedUnit,
  activeTeam,
  onEndTurn,
  onCancelSelection,
  isAbilityActive,
  onToggleAbility,
  mapEnvironment,
  units,
  activeHoveredTile,
  isOnline,
  myTeam,
  onPassUnit
}: SelectedUnitConsoleProps) {
  if (!selectedUnit) {
    return (
      <div className="bg-[#12150e] border border-[#2d3324] rounded-lg p-5 flex flex-col items-center justify-center text-center select-none min-h-[180px] shadow-inner font-mono text-xs">
        <Activity className="w-8 h-8 text-[#bfcfb5]/50 mb-2 animate-pulse" />
        <span className="text-[#fbbf24] tracking-widest text-[9.5px] uppercase font-black">
          CONSOLE_OFFLINE
        </span>
        <p className="text-[8.5px] text-[#bfcfb5] max-w-[240px] mt-1.5 leading-normal uppercase">
          Select any active battlefield squad unit on the network graph grid to initialize visual metrics and actions.
        </p>
      </div>
    );
  }

  const isPlayerTeam = selectedUnit.team === 'player';
  const isMyUnitControl = activeTeam === selectedUnit.team && (!isOnline || myTeam === selectedUnit.team);
  const isOpponentUnit = selectedUnit.team !== myTeam && isOnline;
  
  // Coords conversion
  const getCoord = (x: number, y: number) => {
    return `${String.fromCharCode(65 + x)}${(y + 1).toString().padStart(2, '0')}`;
  };

  const unitCoord = getCoord(selectedUnit.x, selectedUnit.y);

  // Status computation for unit
  let statusBadge = "OPERATIONAL";
  let statusColor = "text-emerald-400 border-emerald-400/50 bg-emerald-500/10";

  if (selectedUnit.hp <= 0) {
    statusBadge = "DECEASED / K.I.A.";
    statusColor = "text-rose-400 border-rose-500/50 bg-rose-500/10";
  } else if (selectedUnit.ap === 0) {
    statusBadge = "DEPLETED / WAIT";
    statusColor = "text-zinc-300 border-zinc-700 bg-zinc-800/20";
  } else if (isAbilityActive) {
    statusBadge = "CASTING / ABILITY_TARGETING";
    statusColor = "text-indigo-400 border-indigo-400/50 bg-indigo-500/15 animate-pulse";
  } else if (!isMyUnitControl) {
    statusBadge = "SECURED_STANDBY";
    statusColor = "text-sky-300 border-sky-400/40 bg-sky-950/30";
  }

  // Find target under hovered tile for live guidance
  const hoveredUnit = activeHoveredTile
    ? units.find(u => u.x === activeHoveredTile.x && u.y === activeHoveredTile.y && u.hp > 0)
    : null;

  let liveWarning: string | null = null;
  let actionCostIndicator: string = "SELECT CELL TO INITIATE";

  // Compute live warnings based on hovered tiles
  if (selectedUnit && activeHoveredTile && isMyUnitControl) {
    const tileX = activeHoveredTile.x;
    const tileY = activeHoveredTile.y;
    const cell = mapEnvironment[tileY]?.[tileX];
    
    if (cell) {
      if (cell.type === 'wall') {
        liveWarning = "OBSTACLE DETECTED: IMPACT / COVER ZONE SEGMENT BLOCKED";
      } else if (hoveredUnit) {
        if (hoveredUnit.id === selectedUnit.id) {
          liveWarning = "SELF UNIT CENTERED: CLICK CELL TO FOCUS ATOMIC VIEWPORTS";
        } else if (hoveredUnit.team !== selectedUnit.team) {
          // Analyze dynamic firing range and line of sight
          const dx = Math.abs(selectedUnit.x - hoveredUnit.x);
          const dy = Math.abs(selectedUnit.y - hoveredUnit.y);
          const dist = dx + dy;
          const hasLos = checkLineOfSight(selectedUnit.x, selectedUnit.y, hoveredUnit.x, hoveredUnit.y, mapEnvironment);
          const inRange = dist <= selectedUnit.class.stats.range;

          if (selectedUnit.ap < 1) {
            liveWarning = "WEAPON CRITICAL LOCK PREVENTS FIRING: NOT ENOUGH AP (MIN 1 AP)";
          } else if (!inRange) {
            liveWarning = `FIRE SYSTEM OUT OF RANGE (TARGET IS ${dist} BLOCKS, WEAPON RANGE IS ${selectedUnit.class.stats.range})`;
          } else if (!hasLos) {
            liveWarning = "BLOCKED DIRECT TRACE LINE: STRUCTURAL OBSTACLE OBSCURES LINE-OF-SIGHT";
          } else {
            actionCostIndicator = "READY FOR HOSTILE STRIKE: CLICK ENEMY UNIT TO DISCHARGE PRIMARY WEAPON";
          }
        } else if (hoveredUnit.team === selectedUnit.team) {
          liveWarning = "TACTICAL CO-UNIT DETECTED: ENGAGE TARGET DENIED (ACCIDENTAL FRIENDLY PROTOCOLS SHIELED)";
        }
      } else {
        // Movement validation helper
        const dx = Math.abs(selectedUnit.x - tileX);
        const dy = Math.abs(selectedUnit.y - tileY);
        const dist = dx + dy;
        const reached = dist <= selectedUnit.class.stats.mobility && selectedUnit.ap >= 1; // Movement helper cost checking
        
        if (selectedUnit.ap < 1) {
          liveWarning = "TACTICAL ENGINES DISENGAGED (0 AP REMAINING: ROTATE TEAM TURNS FOR RECHARGE)";
        } else if (dist > selectedUnit.class.stats.mobility) {
          liveWarning = `ENERGY BARRIER REACHED: ATTEMPTING CELL RANGE (${dist}) BEYOND MOBILITY STAT (${selectedUnit.class.stats.mobility})`;
        } else if (reached) {
          actionCostIndicator = `MOVE PLANNED: ${getCoord(tileX, tileY)} (COST: ${dist > 2 ? 2 : 1} AP)`;
        }
      }
    }
  }

  return (
    <div className="bg-[#12150e] border border-[#2d3324] rounded-lg overflow-hidden flex flex-col shadow-md text-left font-mono">
      {/* Console Title Bar */}
      <div className="bg-[#191e14] border-b border-[#2d3324] px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className={`w-3.5 h-3.5 ${isPlayerTeam ? 'text-sky-400' : 'text-red-400'}`} />
          <span className="text-[9.5px] font-bold uppercase tracking-widest text-zinc-300">
            METRICS_CONSOLE / UNIT_DEV
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[8.5px] font-bold px-1.5 py-[2px] rounded-sm uppercase tracking-tighter select-none border ${statusColor}`}>
            {statusBadge}
          </span>
          <span className="text-[10px] text-zinc-500 font-bold bg-[#1a2014]/50 hover:text-rose-500 border border-[#2d3324]/30 rounded px-1.5 cursor-pointer" onClick={onCancelSelection}>
            ✕
          </span>
        </div>
      </div>

      {/* Main Stats Area */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Unit Identity Column */}
        <div className="md:col-span-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#2d3a20] pb-3 md:pb-0 md:pr-3">
          <div>
            <div className="flex gap-3 items-center mb-2">
              {/* Tactical Holographic Video Feed Box */}
              <div className="w-14 h-14 relative bg-black border border-[#4d5c32]/80 rounded overflow-hidden shrink-0 group shadow-md text-emerald-500">
                {/* Seeded Operator Satellite Image Styled to Cyberpunk Nightvision */}
                <img 
                  src={`https://picsum.photos/seed/cyber-operator-${selectedUnit.class.className.toLowerCase()}-${selectedUnit.team}/120/120`}
                  alt={`${selectedUnit.class.className} Diagnostic Link`}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover opacity-60 mix-blend-color-dodge transition-all duration-300 filter contrast-135 brightness-110 grayscale saturate-[150%] ${selectedUnit.team === 'player' ? 'hue-rotate-[140deg] sepia-[20%]' : 'hue-rotate-[-30deg] sepia-[10%] brightness-95 animate-pulse'}`}
                />
                
                {/* Dynamic Helmet Overlay centered on top of the cyber texture */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <UnitHelmetAvatar classNameVal={selectedUnit.class.className} team={selectedUnit.team} className="w-10 h-10 border-transparent bg-transparent shrink-0 opacity-85 shadow-none" />
                </div>

                {/* CRT Screen Scan lines effect overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40"></div>
                
                {/* Blinking Live indicator */}
                <div className="absolute top-1 left-1 flex items-center gap-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-ping ${selectedUnit.team === 'player' ? 'bg-sky-450' : 'bg-rose-500'}`} />
                  <span className="text-[5.5px] font-black tracking-tighter text-zinc-450">FEED_SEC</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5 mb-0.5">
                  <span className="text-zinc-400 text-[9px] uppercase font-bold">ARC ID:</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isPlayerTeam ? 'text-sky-300' : 'text-rose-350'}`}>
                    {selectedUnit.class.archetype}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white leading-tight uppercase">
                  {selectedUnit.class.className}
                </h3>
                <span className="inline-block mt-1 text-[8.5px] font-mono bg-black/60 border border-[#3b4632] rounded text-[#fbbf24] font-bold px-1.5 py-0.5 select-none shrink-0">
                  LOC: {unitCoord}
                </span>
              </div>
            </div>
            <p className="text-[9.5px] text-zinc-350 mt-1.5 leading-relaxed uppercase">
              {selectedUnit.class.description}
            </p>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-[8px] bg-[#1a2014] border border-[#3b4632] px-1.5 py-0.5 rounded text-zinc-300 font-extrabold">
              TRAIT_PERSONALITY: {selectedUnit.class.personality || 'Tactical'}
            </span>
            <span className="text-[8px] bg-sky-950/40 border border-sky-800/40 px-1.5 py-0.5 rounded text-sky-300 font-extrabold">
              BUFF_STATUS: NOMINAL
            </span>
          </div>
        </div>

        {/* Tactical Parameters Column */}
        <div className="md:col-span-7 flex flex-col justify-between gap-3">
          {/* Attributes Multi Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/45 border border-[#2d3a20] rounded p-1.5 text-center flex flex-col justify-center">
              <span className="text-[7.5px] text-[#b6caa2] font-black tracking-tight mb-0.5">HEALTH INTEGRITY</span>
              <span className="text-xs font-black text-emerald-400 font-mono leading-none">
                {selectedUnit.hp} <span className="text-[8px] text-zinc-400 font-normal">/ {selectedUnit.class.stats.maxHP}</span>
              </span>
              <div className="w-full bg-black/60 h-[3px] rounded-sm overflow-hidden p-[0.3px] mt-1 border border-[#344426]">
                <div 
                  className="h-full rounded bg-emerald-400 shadow-[0_0_4px_#34d399]"
                  style={{ width: `${(selectedUnit.hp / selectedUnit.class.stats.maxHP) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-black/45 border border-[#2d3a20] rounded p-1.5 text-center flex flex-col justify-center">
              <span className="text-[7.5px] text-[#b6caa2] font-black tracking-tight mb-0.5">ACTION POINTS</span>
              <span className="text-xs font-black text-amber-300 font-mono leading-none">
                {selectedUnit.ap} <span className="text-[8px] text-zinc-400 font-normal">/ 2 AP</span>
              </span>
              <div className="flex gap-[2px] justify-center mt-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full ${i < selectedUnit.ap ? 'bg-amber-400 shadow-[0_0_3px_#fbbf24]' : 'bg-zinc-800'}`}
                  />
                ))}
              </div>
            </div>

            <div className="bg-black/45 border border-[#2d3a20] rounded p-1.5 text-center flex flex-col justify-center">
              <span className="text-[7.5px] text-[#b6caa2] font-black tracking-tight mb-0.5">RANGE POTENTIAL</span>
              <span className="text-xs font-black text-sky-300 font-mono leading-none">
                {selectedUnit.class.stats.range} <span className="text-[8px] text-[#b6caa2] font-black">CELLS</span>
              </span>
              <span className="text-[6.5px] text-[#b6caa2] font-black truncate tracking-tight mt-1 uppercase">MOBILITY: {selectedUnit.class.stats.mobility}</span>
            </div>
          </div>

          {/* Action List Section */}
          <div className="bg-black/30 border border-[#2d3a20] p-1.5 sm:p-2 rounded flex flex-col gap-1.5">
            {/* Live feedback warnings in selection console */}
            {liveWarning ? (
              <div className="text-[8.5px] font-bold font-mono text-red-400 bg-red-950/25 px-2 py-1 rounded border border-red-500/35 flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span className="uppercase truncate">{liveWarning}</span>
              </div>
            ) : hoveredUnit && isMyUnitControl ? (
              <div className="text-[8.5px] font-bold font-mono text-emerald-305 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="uppercase truncate">{actionCostIndicator}</span>
              </div>
            ) : isMyUnitControl ? (
              <div className="text-[8.5px] font-bold text-zinc-200 bg-[#1e2716]/65 px-2 py-1 rounded border border-[#3e4a32] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="uppercase truncate">{actionCostIndicator === "SELECT CELL TO INITIATE" ? "CELL GUIDE: CLICK A TILE TO MOVE OR LOCKED ENEMY TO FIRE." : actionCostIndicator}</span>
              </div>
            ) : (
              <div className="text-[8.5px] font-bold text-sky-300 bg-sky-950/20 px-2 py-1 rounded border border-sky-800/25 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="uppercase">MONITOR_MODE: AWAITING ACTIVE COMMAND MATRIX AUTHORIZATION</span>
              </div>
            )}

            {/* Tactical Control Actions */}
            {isMyUnitControl ? (
              <div className="flex gap-2 w-full mt-0.5">
                {/* Special Ability Activation Toggle */}
                {selectedUnit.class.ability && (
                  <button
                    onClick={onToggleAbility}
                    disabled={selectedUnit.ap < selectedUnit.class.ability.apCost}
                    className={`flex-1 py-1.5 px-2 rounded font-black text-[9px] uppercase tracking-wider text-center transition-all border shrink-0 ${
                      isAbilityActive 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)] animate-pulse'
                        : selectedUnit.ap < selectedUnit.class.ability.apCost
                          ? 'bg-zinc-800/30 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-50'
                          : 'bg-indigo-900/40 hover:bg-indigo-600/60 border-indigo-500 text-[#c7d2fe] hover:text-white cursor-pointer active:scale-95'
                    }`}
                    title={`Cost: ${selectedUnit.class.ability.apCost} AP`}
                  >
                    {isAbilityActive ? 'Cancel Spec' : `SPEC_ABIL: ${selectedUnit.class.ability.name}`}
                  </button>
                )}

                {/* Force unit to pass (reduce ap to 0 so next behaves) */}
                <button
                  onClick={onPassUnit}
                  className="bg-[#202518] hover:bg-stone-800 text-[#dae3ce] font-black border border-[#2d3a20] px-2.5 py-1.5 rounded transition-all text-[9px] uppercase hover:text-red-400 active:scale-95 shrink-0"
                  title="Spends all remaining AP of this unit to terminate its selection activity"
                >
                  Pass Unit
                </button>

                <button
                  onClick={onCancelSelection}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold border border-zinc-700/30 px-2.5 py-1.5 rounded transition-all text-[9px] uppercase hover:text-white active:scale-95 shrink-0"
                >
                  unselect
                </button>
              </div>
            ) : isOpponentUnit ? (
              <div className="text-[8px] text-red-400 font-extrabold uppercase italic p-1 border border-dashed border-red-500/20 bg-red-950/5 text-center rounded">
                ⚡ SECURITY PROTOCOLS IN PROGRESS: HOSTILE COMMAND CONSOLE LOCKED
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
