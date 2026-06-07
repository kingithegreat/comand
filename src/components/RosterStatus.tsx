import React from 'react';
import { Shield, Users, Heart, Power, Trash2, Skull, Target, Zap, Flame, Rocket, Activity, Crosshair } from 'lucide-react';
import { Unit, CharacterClass } from '../types';
import { CLASSES } from '../data';
import UnitHelmetAvatar from './UnitHelmetAvatar';

interface RosterStatusProps {
  units: Unit[];
  activeTeam: 'player' | 'enemy';
  selectedUnitId: string | null;
  onSelectUnit: (id: string | null) => void;
  mode: 'deploy' | 'play' | 'finished';
  teamSelection: 'player' | 'enemy';
  setTeamSelection: (team: 'player' | 'enemy') => void;
  selectedClass: CharacterClass | null;
  setSelectedClass: (c: CharacterClass) => void;
  isOnline: boolean;
  myTeam?: 'player' | 'enemy';
}

export default function RosterStatus({
  units,
  activeTeam,
  selectedUnitId,
  onSelectUnit,
  mode,
  teamSelection,
  setTeamSelection,
  selectedClass,
  setSelectedClass,
  isOnline,
  myTeam
}: RosterStatusProps) {
  const players = units.filter(u => u.team === 'player');
  const enemies = units.filter(u => u.team === 'enemy');

  const getTeamHealthPerc = (teamUnits: Unit[]) => {
    if (teamUnits.length === 0) return 0;
    const totalMax = teamUnits.reduce((acc, u) => acc + u.class.stats.maxHP, 0);
    const totalCur = teamUnits.reduce((acc, u) => acc + Math.max(0, u.hp), 0);
    return Math.round((totalCur / totalMax) * 100);
  };

  const pHealthPerc = getTeamHealthPerc(players);
  const eHealthPerc = getTeamHealthPerc(enemies);

  const getCoordString = (x: number, y: number) => {
    return `${String.fromCharCode(65 + x)}${(y + 1).toString().padStart(2, '0')}`;
  };

  const getArchetypeIcon = (archetype: string, className = "w-3.5 h-3.5") => {
    switch (archetype) {
      case 'Short Range': return <Flame className={`${className} text-orange-400`} />;
      case 'Long Range': return <Target className={`${className} text-sky-400`} />;
      case 'Support': return <Activity className={`${className} text-emerald-400`} />;
      case 'Explosives': return <Rocket className={`${className} text-yellow-500`} />;
      case 'Assault': return <Zap className={`${className} text-zinc-300`} />;
      default: return <Shield className={`${className} text-indigo-400`} />;
    }
  };

  const renderUnitRow = (u: Unit) => {
    const isDead = u.hp <= 0;
    const isSelected = selectedUnitId === u.id;
    const isMyTurn = mode === 'play' && activeTeam === u.team;

    // Determine archetype color
    let healthColor = 'bg-emerald-400';
    if (u.hp < u.class.stats.maxHP * 0.3) healthColor = 'bg-rose-500';
    else if (u.hp < u.class.stats.maxHP * 0.7) healthColor = 'bg-amber-400';

    return (
      <div 
        key={u.id}
        onClick={() => {
          if (!isDead && mode === 'play') {
            onSelectUnit(u.id);
          }
        }}
        className={`w-full p-2.5 rounded flex items-center justify-between font-mono text-[10px] border transition-all ${
          isDead 
            ? 'bg-zinc-950/20 border-zinc-900/45 opacity-40 select-none cursor-not-allowed'
            : isSelected 
              ? 'bg-[#fbbf24]/10 border-[#fbbf24] text-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.15)] scale-[1.01]'
              : 'bg-[#1a2014]/40 border-[#2d3324] hover:border-[#4a5538] hover:bg-[#202716]/30 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isDead ? (
            <Skull className="w-5 h-5 text-zinc-600 shrink-0 bg-black/40 border border-zinc-900 rounded p-0.5" />
          ) : (
            <UnitHelmetAvatar 
              classNameVal={u.class.className} 
              team={u.team} 
              className={`w-6 h-6 border-[#2d3422]/65 hover:scale-105 transition-transform ${
                isMyTurn && u.ap > 0 ? 'ring-1 ring-amber-400' : ''
              }`} 
            />
          )}
          <div className="truncate text-left flex items-center gap-1.5">
            <span className={`font-bold ${isDead ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
              {u.class.className}
            </span>
            <span className="text-[7.5px] text-[#fbbf24] font-bold px-1 py-[0.5px] bg-black/45 rounded border border-[#2d3422]/50">
              {getCoordString(u.x, u.y)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isDead ? (
            <span className="text-[7.5px] font-mono text-zinc-500 font-extrabold uppercase bg-red-950/10 px-1 border border-red-950/30">
              K.I.A.
            </span>
          ) : (
            <>
              {/* AP Dots */}
              <div className="flex gap-[2px]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full border border-black/40 ${
                      i < u.ap ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.6)]' : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
              
              {/* HP stats */}
              <div className="text-right min-w-[55px]">
                <div className="text-[8.5px] text-[#b0c0a5] leading-none mb-0.5 font-bold">
                  HP <span className="font-extrabold text-[#fbbf24]">{u.hp}</span>
                </div>
                {/* Health Bar Mini */}
                <div className="w-12 bg-black/60 h-[3px] rounded-sm overflow-hidden p-[0.5px] border border-zinc-900">
                  <div 
                    className={`h-full rounded-sm ${healthColor}`} 
                    style={{ width: `${Math.max(0, (u.hp / u.class.stats.maxHP) * 100)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDeploySideSelector = () => {
    const isPlayer = teamSelection === 'player';
    const deployedCount = units.filter(u => u.team === teamSelection).length;
    
    return (
      <div className="border border-[#2d3324] bg-[#141810] p-3 rounded flex flex-col gap-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            RECRUITMENT PLATFORM ({teamSelection === 'player' ? 'BLUE' : 'RED'} FORCE)
          </span>
          <span className="text-xs font-black text-[#fbbf24]">
            {deployedCount} / 4 SQUAD SIZE
          </span>
        </div>

        {/* Toggle between configuring friendly or enemy deployment */}
        {!isOnline && (
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-black/45 rounded border border-[#2d3324]">
            <button
              onClick={() => { setTeamSelection('player'); }}
              className={`py-1 text-[9px] font-bold uppercase rounded ${
                teamSelection === 'player' 
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' 
                  : 'text-zinc-500 border border-transparent'
              }`}
            >
              BLUE TEAM (PLAYER)
            </button>
            <button
              onClick={() => { setTeamSelection('enemy'); }}
              className={`py-1 text-[9px] font-bold uppercase rounded ${
                teamSelection === 'enemy' 
                  ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40' 
                  : 'text-zinc-500 border border-transparent'
              }`}
            >
              PURPLE TEAM (ENEMY AI)
            </button>
          </div>
        )}

        {isOnline && teamSelection !== myTeam && (
          <div className="text-center py-4 text-[10px] text-fuchsia-400 bg-fuchsia-950/20 border border-fuchsia-950/40 rounded">
            LOCKED: OPPONENT TEAM DEPLOYMENT UNDERWAY
          </div>
        )}

        {(!isOnline || teamSelection === myTeam) && (
          <div className="flex flex-col gap-1.5">
            {CLASSES.map((c) => {
              const isSelected = selectedClass?.className === c.className;
              const disabled = deployedCount >= 4 && !isSelected;
              
              return (
                <button
                  key={c.className}
                  disabled={disabled}
                  onClick={() => { setSelectedClass(c); }}
                  className={`
                    w-full text-left p-2 rounded border transition-all flex items-center justify-between
                    ${isSelected 
                      ? (isPlayer ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300')
                      : 'border-[#2d3324] bg-[#1a2014]/40 text-zinc-400 hover:border-zinc-700'}
                    ${disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UnitHelmetAvatar classNameVal={c.className} className="w-8 h-8 shrink-0 border-[#2d3422]/70 group-hover:scale-105 transition-transform" />
                    <div className="text-left font-mono">
                      <div className="text-[10px] font-bold tracking-tight text-zinc-200">
                        {c.className}
                      </div>
                      <div className="text-[8px] text-zinc-500 truncate max-w-[130px] sm:max-w-xs md:max-w-[160px]">
                        {c.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 text-[9px] font-mono shrink-0">
                    <span className="text-emerald-400 border border-emerald-400/20 px-1 py-[0.5px] rounded bg-emerald-400/5">HP: {c.stats.maxHP}</span>
                    <span className="text-orange-400 border border-orange-400/20 px-1 py-[0.5px] rounded bg-orange-400/5">DMG: {c.stats.damage}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="text-[9px] text-zinc-500 bg-black/20 border border-[#2d3324]/55 p-2 rounded leading-relaxed">
          {teamSelection === 'player' 
            ? "DEPLOY ADVICE: Place your Blue forces in rows 8-14. Select class, then click valid highlighted grid floor."
            : "DEPLOY ADVICE: Place Purple forces in rows 0-6. AI forces auto-populate if left empty upon Battle launch."
          }
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#141810] border border-[#2d3422] rounded-lg p-3 flex flex-col gap-4 shadow-lg">
      <div className="border-b border-[#2d3422]/60 pb-2 flex items-center justify-between">
        <h2 className="text-xs font-black tracking-widest text-[#fbbf24] font-mono flex items-center gap-1.5">
          <Users className="w-4 h-4" /> BATTLE GRID ROSTER
        </h2>
        <span className="text-[9px] font-mono text-zinc-500 font-bold">MODE: {mode.toUpperCase()}</span>
      </div>

      {mode === 'deploy' && renderDeploySideSelector()}

      {/* Force Integrity Tracking */}
      <div className="flex flex-col gap-4">
        {/* Friendly Section */}
        <div>
          <div className="flex justify-between items-center mb-1.5 font-mono text-[10px]">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-black text-sky-400 tracking-wider uppercase">BLUE SQUAD (PLAYER)</span>
            </div>
            <div className="text-right flex items-center gap-1.5">
              <span className="text-zinc-500 font-bold">INTEGRITY:</span>
              <span className={`font-black tracking-widest ${pHealthPerc < 40 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                {pHealthPerc}%
              </span>
            </div>
          </div>
          
          {/* Progress Bar of Integrity */}
          <div className="w-full bg-[#1b2014] h-1.5 rounded border border-[#2d3324]/60 overflow-hidden mb-2 p-[0.5px]">
            <div 
              className={`h-full rounded-sm transition-all duration-500 shadow-[0_0_6px_rgba(56,189,248,0.3)] ${
                pHealthPerc < 40 ? 'bg-red-500' : 'bg-sky-400'
              }`}
              style={{ width: `${pHealthPerc}%` }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {players.length === 0 ? (
              <div className="text-center py-3 text-[9px] font-mono text-zinc-600 bg-black/10 border border-dashed border-[#2d3324] rounded">
                NO UNITS IN COMM CHANNELS. INITIALIZE DEPLOYMENT.
              </div>
            ) : (
              players.map(renderUnitRow)
            )}
          </div>
        </div>

        {/* Enemy Section */}
        <div>
          <div className="flex justify-between items-center mb-1.5 font-mono text-[10px]">
            <div className="flex items-center gap-1.5">
              <Skull className="w-3.5 h-3.5 text-fuchsia-400" />
              <span className="font-black text-fuchsia-400 tracking-wider uppercase">PURPLE SQUAD (ENEMIES)</span>
            </div>
            <div className="text-right flex items-center gap-1.5">
              <span className="text-zinc-500 font-bold font-mono">INTEGRITY:</span>
              <span className={`font-black tracking-widest ${eHealthPerc < 40 ? 'text-fuchsia-400 animate-pulse' : 'text-fuchsia-500'}`}>
                {eHealthPerc}%
              </span>
            </div>
          </div>
          
          {/* Progress Bar of Enemy Integrity */}
          <div className="w-full bg-[#1b2014] h-1.5 rounded border border-[#2d3324]/60 overflow-hidden mb-2 p-[0.5px]">
            <div 
              className={`h-full rounded-sm transition-all duration-500 shadow-[0_0_6px_rgba(217,70,239,0.3)] ${
                eHealthPerc < 40 ? 'bg-fuchsia-600' : 'bg-fuchsia-500'
              }`}
              style={{ width: `${eHealthPerc}%` }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {enemies.length === 0 ? (
              <div className="text-center py-3 text-[9px] font-mono text-zinc-600 bg-black/10 border border-dashed border-[#2d3324] rounded">
                AWAITING HOSTILE DEPLOYMENT SCAN.
              </div>
            ) : (
              enemies.map(renderUnitRow)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
