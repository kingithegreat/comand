import React from 'react';
import { Target, Shield, Zap, Flame, Rocket, ChevronRight, Activity, Crosshair, HelpCircle, AlertTriangle, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { Unit, GridCell } from '../types';
import { checkLineOfSight, calculateHitChance } from '../logic';
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
  onPassUnit: () => void;
  mode?: 'deploy' | 'play';
  onRenameUnit?: (unitId: string, newName: string) => void;
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
  onPassUnit,
  mode,
  onRenameUnit
}: SelectedUnitConsoleProps) {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState('');

  React.useEffect(() => {
    if (selectedUnit) {
      setTempName(selectedUnit.name || selectedUnit.class.className);
    }
    setIsEditingName(false);
  }, [selectedUnit?.id, selectedUnit?.name]);

  if (!selectedUnit) {
    return (
      <div className="glass-dark rounded-xl p-5 flex flex-col items-center justify-center text-center select-none min-h-[180px] font-mono text-xs">
        <Activity className="w-6 h-6 text-zinc-600 mb-2" />
        <span className="text-zinc-500 tracking-wider text-[10px] uppercase font-semibold">
          No Unit Selected
        </span>
        <p className="text-[9px] text-zinc-600 max-w-[220px] mt-1.5 leading-normal">
          Click a unit on the grid to view stats and actions.
        </p>
      </div>
    );
  }

  const isPlayerTeam = selectedUnit.team === 'player';
  const isMyUnitControl = activeTeam === selectedUnit.team && (!isOnline || myTeam === selectedUnit.team);
  const isOpponentUnit = selectedUnit.team !== myTeam && isOnline;

  const getCoord = (x: number, y: number) => {
    return `${String.fromCharCode(65 + x)}${(y + 1).toString().padStart(2, '0')}`;
  };

  const unitCoord = selectedUnit.x >= 0 ? getCoord(selectedUnit.x, selectedUnit.y) : "—";

  let statusBadge = "Active";
  let statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";

  if (mode === 'deploy') {
    if (selectedUnit.team === 'player') {
      statusBadge = "Deploying (Blue)";
      statusColor = "text-sky-400 border-sky-500/20 bg-sky-500/5";
    } else {
      statusBadge = "Deploying (Purple)";
      statusColor = "text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5";
    }
  } else if (selectedUnit.hp <= 0) {
    statusBadge = "KIA";
    statusColor = "text-red-400 border-red-500/20 bg-red-500/5";
  } else if (selectedUnit.ap === 0) {
    statusBadge = "No AP";
    statusColor = "text-zinc-400 border-zinc-700/30 bg-zinc-800/30";
  } else if (isAbilityActive) {
    statusBadge = "Targeting Ability";
    statusColor = "text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5 animate-pulse";
  } else if (!isMyUnitControl) {
    statusBadge = "Standby";
    statusColor = "text-zinc-400 border-zinc-700/30 bg-zinc-800/30";
  }

  const hoveredUnit = activeHoveredTile
    ? units.find(u => u.x === activeHoveredTile.x && u.y === activeHoveredTile.y && u.hp > 0)
    : null;

  let liveWarning: string | null = null;
  let actionHint = "Select a tile to act";

  if (selectedUnit && activeHoveredTile && isMyUnitControl) {
    const tileX = activeHoveredTile.x;
    const tileY = activeHoveredTile.y;
    const cell = mapEnvironment[tileY]?.[tileX];

    if (cell) {
      if (cell.type === 'wall') {
        liveWarning = "Blocked — wall obstacle";
      } else if (hoveredUnit) {
        if (hoveredUnit.id === selectedUnit.id) {
          liveWarning = null;
        } else if (hoveredUnit.team !== selectedUnit.team) {
          const dx = Math.abs(selectedUnit.x - hoveredUnit.x);
          const dy = Math.abs(selectedUnit.y - hoveredUnit.y);
          const dist = dx + dy;
          const hasLos = checkLineOfSight(selectedUnit.x, selectedUnit.y, hoveredUnit.x, hoveredUnit.y, mapEnvironment);
          const inRange = dist <= selectedUnit.class.stats.range;

          if (selectedUnit.ap < 1) {
            liveWarning = "No AP — cannot fire";
          } else if (!inRange) {
            liveWarning = `Out of range (${dist} tiles, max ${selectedUnit.class.stats.range})`;
          } else if (!hasLos) {
            liveWarning = "No line of sight — obstacle blocking";
          } else {
            const { chance, isCovered } = calculateHitChance(selectedUnit, hoveredUnit, mapEnvironment);
            actionHint = `Hit chance: ${chance}% — click to fire`;
          }
        } else if (hoveredUnit.team === selectedUnit.team) {
          liveWarning = "Friendly unit — cannot attack";
        }
      } else {
        const dx = Math.abs(selectedUnit.x - tileX);
        const dy = Math.abs(selectedUnit.y - tileY);
        const dist = dx + dy;
        const reached = dist <= selectedUnit.class.stats.mobility && selectedUnit.ap >= 1;

        if (selectedUnit.ap < 1) {
          liveWarning = "No AP remaining";
        } else if (dist > selectedUnit.class.stats.mobility) {
          liveWarning = `Too far (${dist} tiles, mobility ${selectedUnit.class.stats.mobility})`;
        } else if (reached) {
          actionHint = `Move to ${getCoord(tileX, tileY)} (${dist > selectedUnit.class.stats.mobility ? 2 : 1} AP)`;
        }
      }
    }
  }

  return (
    <div className="glass-dark rounded-xl overflow-hidden flex flex-col text-left font-mono">
      {/* Title Bar */}
      <div className="border-b border-zinc-800/50 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className={`w-3.5 h-3.5 ${isPlayerTeam ? 'text-sky-400' : 'text-fuchsia-400'}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Unit Console
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[8px] font-semibold px-1.5 py-[2px] rounded-md uppercase tracking-wider select-none border ${statusColor}`}>
            {statusBadge}
          </span>
          <button type="button" title="Deselect unit" className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer p-0.5" onClick={onCancelSelection}>
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Identity */}
        <div className="md:col-span-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-800/30 pb-3 md:pb-0 md:pr-3">
          <div>
            <div className="flex gap-3 items-center mb-2">
              <div className="w-12 h-12 relative bg-zinc-900 border border-zinc-700/30 rounded-lg overflow-hidden shrink-0">
                <div className="absolute inset-0 flex items-center justify-center">
                  <UnitHelmetAvatar classNameVal={selectedUnit.class.className} team={selectedUnit.team} className="w-9 h-9 border-transparent bg-transparent shrink-0" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[8px] font-semibold uppercase tracking-wider ${isPlayerTeam ? 'text-sky-400' : 'text-fuchsia-400'}`}>
                    {selectedUnit.class.archetype}
                  </span>
                </div>
                {isEditingName ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (tempName.trim() && onRenameUnit) {
                      onRenameUnit(selectedUnit.id, tempName.trim());
                    }
                    setIsEditingName(false);
                  }} className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      placeholder="Unit name"
                      className="bg-black/50 border border-zinc-700/50 text-zinc-200 font-mono text-xs px-2 py-0.5 rounded-md w-full focus:outline-none focus:border-zinc-500 h-6"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      maxLength={15}
                      autoFocus
                    />
                    <button type="submit" className="text-[8px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold px-1.5 py-0.5 h-6 rounded-md border border-emerald-500/20 cursor-pointer">OK</button>
                    <button type="button" onClick={() => setIsEditingName(false)} className="text-[8px] bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 font-semibold px-1.5 py-0.5 h-6 rounded-md border border-zinc-700/30 cursor-pointer">X</button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-100 leading-tight uppercase truncate max-w-[120px]">
                      {selectedUnit.name || selectedUnit.class.className}
                    </h3>
                    {isMyUnitControl && onRenameUnit && !selectedUnit.id.startsWith('preview-') && (
                      <button
                        type="button"
                        onClick={() => {
                          setTempName(selectedUnit.name || selectedUnit.class.className);
                          setIsEditingName(true);
                        }}
                        className="text-[7px] text-zinc-500 hover:text-zinc-300 font-semibold uppercase bg-zinc-800/40 hover:bg-zinc-700/40 border border-zinc-700/30 px-1 py-0.5 rounded-md cursor-pointer transition-all shrink-0"
                      >
                        Rename
                      </button>
                    )}
                  </div>
                )}
                {selectedUnit.name && (
                  <span className="text-[8px] text-zinc-500 uppercase block mt-0.5">
                    {selectedUnit.class.className}
                  </span>
                )}
                <span className="inline-block mt-1 text-[8px] font-mono bg-zinc-800/50 border border-zinc-700/30 rounded-md text-zinc-400 font-semibold px-1.5 py-0.5 select-none">
                  {unitCoord}
                </span>
              </div>
            </div>
            <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">
              {selectedUnit.class.description}
            </p>
          </div>
        </div>

        {/* Parameters */}
        <div className="md:col-span-7 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-2 text-center flex flex-col justify-center">
              <span className="text-[7px] text-zinc-500 font-semibold tracking-wider mb-1 uppercase">HP</span>
              <span className="text-sm font-bold text-emerald-400 font-mono leading-none">
                {selectedUnit.hp}<span className="text-[8px] text-zinc-500 font-normal">/{selectedUnit.class.stats.maxHP}</span>
              </span>
              <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${(selectedUnit.hp / selectedUnit.class.stats.maxHP) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-2 text-center flex flex-col justify-center">
              <span className="text-[7px] text-zinc-500 font-semibold tracking-wider mb-1 uppercase">AP</span>
              <span className="text-sm font-bold text-amber-300 font-mono leading-none">
                {selectedUnit.ap}<span className="text-[8px] text-zinc-500 font-normal">/2</span>
              </span>
              <div className="flex gap-1 justify-center mt-1.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-1 rounded-full ${i < selectedUnit.ap ? 'bg-amber-400' : 'bg-zinc-800'}`}
                  />
                ))}
              </div>
            </div>

            <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-2 text-center flex flex-col justify-center">
              <span className="text-[7px] text-zinc-500 font-semibold tracking-wider mb-1 uppercase">Range</span>
              <span className="text-sm font-bold text-sky-300 font-mono leading-none">
                {selectedUnit.class.stats.range}
              </span>
              <span className="text-[7px] text-zinc-600 mt-1 uppercase">
                Move: {selectedUnit.class.stats.mobility}
              </span>
            </div>

            <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-2 text-center flex flex-col justify-center">
              <span className="text-[7px] text-zinc-500 font-semibold tracking-wider mb-1 uppercase">Damage</span>
              <span className="text-sm font-bold text-red-400 font-mono leading-none">
                {selectedUnit.class.stats.damage}
              </span>
              <span className="text-[7px] text-zinc-600 mt-1 uppercase">
                Acc: {selectedUnit.class.stats.accuracy}%
              </span>
            </div>
          </div>

          {/* Ability */}
          {selectedUnit.class.ability && (
            <div className="bg-fuchsia-500/[0.03] border border-fuchsia-500/15 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
              <div className="px-2 py-1 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 text-center shrink-0 min-w-[90px]">
                <span className="block text-[7px] text-fuchsia-400/60 font-semibold uppercase tracking-wider">Ability</span>
                <span className="text-[9px] text-fuchsia-300 font-bold uppercase">{selectedUnit.class.ability.name}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-zinc-400 leading-relaxed">
                  {selectedUnit.class.ability.description}
                </p>
                <div className="flex flex-wrap gap-x-2 mt-1.5 font-mono text-[7px] text-zinc-500 font-semibold">
                  <span>{selectedUnit.class.ability.apCost} AP</span>
                  {selectedUnit.class.ability.range !== undefined && (
                    <span>Range: {selectedUnit.class.ability.range}</span>
                  )}
                  <span className="uppercase">{selectedUnit.class.ability.type}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-zinc-800/15 border border-zinc-700/15 p-2 rounded-lg flex flex-col gap-1.5">
            {mode === 'deploy' ? (
              <>
                <div className="text-[9px] font-semibold font-mono text-amber-400/80 bg-amber-500/5 px-2 py-1.5 rounded-md border border-amber-500/10 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                  Click a highlighted cell to place this unit
                </div>
                <div className="flex gap-2 w-full mt-0.5">
                  <button
                    type="button"
                    onClick={onCancelSelection}
                    className="bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-500 hover:text-zinc-300 font-semibold border border-zinc-700/30 px-3 py-1.5 rounded-lg transition-all text-[9px] uppercase cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {liveWarning ? (
                  <div className="text-[9px] font-semibold font-mono text-red-400/80 bg-red-500/5 px-2 py-1.5 rounded-md border border-red-500/10 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400/60" />
                    <span className="truncate">{liveWarning}</span>
                  </div>
                ) : hoveredUnit && isMyUnitControl ? (
                  <div className="text-[9px] font-semibold font-mono text-emerald-400/80 bg-emerald-500/5 px-2 py-1.5 rounded-md border border-emerald-500/10 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400/60 animate-spin [animation-duration:6s]" />
                    <span className="truncate">{actionHint}</span>
                  </div>
                ) : isMyUnitControl ? (
                  <div className="text-[9px] font-semibold text-zinc-500 bg-zinc-800/30 px-2 py-1.5 rounded-md border border-zinc-700/20 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span className="truncate">Click a tile to move or an enemy to fire</span>
                  </div>
                ) : (
                  <div className="text-[9px] font-semibold text-zinc-500 bg-zinc-800/20 px-2 py-1.5 rounded-md border border-zinc-700/15 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span>Viewing opponent's unit</span>
                  </div>
                )}

                {isMyUnitControl ? (
                  <div className="flex gap-2 w-full mt-0.5">
                    {selectedUnit.class.ability && (
                      <button
                        type="button"
                        onClick={onToggleAbility}
                        disabled={selectedUnit.ap < selectedUnit.class.ability.apCost}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-[9px] uppercase tracking-wider text-center transition-all border cursor-pointer ${
                          isAbilityActive
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : selectedUnit.ap < selectedUnit.class.ability.apCost
                              ? 'bg-zinc-800/20 border-zinc-800/30 text-zinc-600 cursor-not-allowed opacity-50'
                              : 'bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border-fuchsia-500/25 text-fuchsia-300 hover:text-fuchsia-200'
                        }`}
                        title={`Cost: ${selectedUnit.class.ability.apCost} AP`}
                      >
                        {isAbilityActive ? 'Cancel' : selectedUnit.class.ability.name}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onPassUnit}
                      className="bg-zinc-800/30 hover:bg-zinc-700/30 text-zinc-500 hover:text-zinc-300 font-semibold border border-zinc-700/25 px-2.5 py-1.5 rounded-lg transition-all text-[9px] uppercase cursor-pointer shrink-0"
                      title="Skip this unit's remaining AP"
                    >
                      Pass
                    </button>

                    <button
                      type="button"
                      onClick={onCancelSelection}
                      className="bg-zinc-800/30 hover:bg-zinc-700/30 text-zinc-500 hover:text-zinc-300 font-semibold border border-zinc-700/25 px-2.5 py-1.5 rounded-lg transition-all text-[9px] uppercase cursor-pointer shrink-0"
                    >
                      Deselect
                    </button>
                  </div>
                ) : isOpponentUnit ? (
                  <div className="text-[8px] text-zinc-600 font-semibold italic p-1 text-center rounded">
                    Enemy unit — view only
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
