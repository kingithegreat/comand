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

  const renderUnitRow = (u: Unit) => {
    const isDead = u.hp <= 0;
    const isSelected = selectedUnitId === u.id;
    const isMyTurn = mode === 'play' && activeTeam === u.team;

    let healthColor = 'bg-emerald-400';
    if (u.hp < u.class.stats.maxHP * 0.3) healthColor = 'bg-red-400';
    else if (u.hp < u.class.stats.maxHP * 0.7) healthColor = 'bg-amber-400';

    return (
      <div
        key={u.id}
        onClick={() => {
          if (!isDead && mode === 'play') {
            onSelectUnit(u.id);
          }
        }}
        className={`w-full p-2 rounded-lg flex items-center justify-between font-mono text-[10px] border transition-all ${
          isDead
            ? 'bg-zinc-900/20 border-zinc-800/30 opacity-35 cursor-not-allowed'
            : isSelected
              ? 'bg-amber-500/5 border-amber-500/25 text-amber-400'
              : 'bg-zinc-800/15 border-zinc-700/15 hover:border-zinc-600/30 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isDead ? (
            <Skull className="w-5 h-5 text-zinc-700 shrink-0" />
          ) : (
            <UnitHelmetAvatar
              classNameVal={u.class.className}
              team={u.team}
              className={`w-6 h-6 border-zinc-700/30 ${
                isMyTurn && u.ap > 0 ? 'ring-1 ring-amber-400/50' : ''
              }`}
            />
          )}
          <div className="truncate text-left flex items-center gap-1.5">
            <span className={`font-semibold ${isDead ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
              {u.class.className}
            </span>
            {!isDead && (
              <span className="text-[7px] text-zinc-500 font-mono px-1 py-[1px] bg-zinc-800/40 rounded-md border border-zinc-700/20">
                {getCoordString(u.x, u.y)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isDead ? (
            <span className="text-[7.5px] font-mono text-red-400/60 font-semibold uppercase">
              KIA
            </span>
          ) : (
            <>
              <div className="flex gap-[2px]">
                {Array.from({ length: 2 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < u.ap ? 'bg-amber-400' : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>

              <div className="text-right min-w-[50px]">
                <div className="text-[8px] text-zinc-500 leading-none mb-0.5 font-semibold">
                  <span className="text-zinc-300 font-semibold">{u.hp}</span>/{u.class.stats.maxHP}
                </div>
                <div className="w-10 bg-zinc-900 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${healthColor} transition-all`}
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
    const deployedCount = units.filter(u => u.team === teamSelection).length;

    return (
      <div className="border border-zinc-700/20 bg-zinc-800/15 p-3 rounded-xl flex flex-col gap-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
            Select Class ({teamSelection === 'player' ? 'Blue' : 'Purple'})
          </span>
          <span className="text-[10px] font-semibold text-zinc-300">
            {deployedCount}/4
          </span>
        </div>

        {!isOnline && (
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-800/30 rounded-lg border border-zinc-700/20">
            <button
              type="button"
              onClick={() => { setTeamSelection('player'); }}
              className={`py-1 text-[9px] font-semibold uppercase rounded-md cursor-pointer transition-all ${
                teamSelection === 'player'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/25'
                  : 'text-zinc-500 border border-transparent'
              }`}
            >
              Blue
            </button>
            <button
              type="button"
              onClick={() => { setTeamSelection('enemy'); }}
              className={`py-1 text-[9px] font-semibold uppercase rounded-md cursor-pointer transition-all ${
                teamSelection === 'enemy'
                  ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/25'
                  : 'text-zinc-500 border border-transparent'
              }`}
            >
              Purple
            </button>
          </div>
        )}

        {isOnline && teamSelection !== myTeam && (
          <div className="text-center py-4 text-[10px] text-zinc-500 bg-zinc-800/20 border border-zinc-700/20 rounded-lg">
            Waiting for opponent to deploy...
          </div>
        )}

        {(!isOnline || teamSelection === myTeam) && (
          <div className="flex flex-col gap-1.5">
            {CLASSES.map((c) => {
              const isSelected = selectedClass?.className === c.className;
              const disabled = deployedCount >= 4 && !isSelected;
              const isPlayer = teamSelection === 'player';

              return (
                <button
                  key={c.className}
                  type="button"
                  disabled={disabled}
                  onClick={() => { setSelectedClass(c); }}
                  className={`
                    w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer
                    ${isSelected
                      ? (isPlayer ? 'border-sky-500/30 bg-sky-500/5 text-sky-300' : 'border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-300')
                      : 'border-zinc-700/15 bg-zinc-800/10 text-zinc-400 hover:border-zinc-600/30'}
                    ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UnitHelmetAvatar classNameVal={c.className} className="w-7 h-7 shrink-0 border-zinc-700/30" />
                    <div className="text-left font-mono">
                      <div className="text-[10px] font-semibold tracking-tight text-zinc-200">
                        {c.className}
                      </div>
                      <div className="text-[8px] text-zinc-600 truncate max-w-[120px] sm:max-w-xs">
                        {c.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 text-[8px] font-mono shrink-0">
                    <span className="text-emerald-400/80">{c.stats.maxHP}hp</span>
                    <span className="text-amber-400/80">{c.stats.damage}dmg</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTeamSection = (teamUnits: Unit[], teamName: string, color: string, healthPerc: number) => (
    <div>
      <div className="flex justify-between items-center mb-1.5 font-mono text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${color === 'sky' ? 'bg-sky-400' : 'bg-fuchsia-400'}`} />
          <span className={`font-semibold ${color === 'sky' ? 'text-sky-400' : 'text-fuchsia-400'} tracking-wider uppercase`}>
            {teamName}
          </span>
        </div>
        <span className={`text-zinc-500 font-semibold ${healthPerc < 40 ? 'text-red-400' : ''}`}>
          {healthPerc}%
        </span>
      </div>

      <div className={`w-full bg-zinc-900 h-1 rounded-full overflow-hidden mb-2`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${color === 'sky' ? 'bg-sky-400' : 'bg-fuchsia-400'}`}
          style={{ width: `${healthPerc}%` }}
        />
      </div>

      <div className="flex flex-col gap-1">
        {teamUnits.length === 0 ? (
          <div className="text-center py-3 text-[9px] font-mono text-zinc-600 bg-zinc-800/10 border border-dashed border-zinc-700/20 rounded-lg">
            No units deployed
          </div>
        ) : (
          teamUnits.map(renderUnitRow)
        )}
      </div>
    </div>
  );

  return (
    <div className="glass-dark rounded-xl p-3 flex flex-col gap-4">
      <div className="border-b border-zinc-800/40 pb-2 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold tracking-wider text-zinc-400 font-mono flex items-center gap-1.5 uppercase">
          <Users className="w-3.5 h-3.5" /> Roster
        </h2>
        <span className="text-[9px] font-mono text-zinc-600">{mode}</span>
      </div>

      {mode === 'deploy' && renderDeploySideSelector()}

      <div className="flex flex-col gap-4">
        {renderTeamSection(players, 'Blue Squad', 'sky', pHealthPerc)}
        {renderTeamSection(enemies, 'Purple Squad', 'fuchsia', eHealthPerc)}
      </div>
    </div>
  );
}
