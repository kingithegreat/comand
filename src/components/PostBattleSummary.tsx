import React from 'react';
import { Unit, CharacterClass } from '../types';
import { VictoryConfetti } from './VictoryConfetti';
import {
  Shield,
  Target,
  Activity,
  Flame,
  Crosshair,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  Info,
  Clock,
  Skull,
  Heart
} from 'lucide-react';

interface BattleStats {
  playerShotsFired: number;
  playerShotsHit: number;
  playerDamageDealt: number;
  playerHealsPerformed: number;
  playerAbilitiesUsed: number;
  turnsElapsed: number;
  damageTaken: number;
}

interface PostBattleSummaryProps {
  winner: 'player' | 'enemy';
  myTeam: 'player' | 'enemy' | undefined;
  startingUnits: Unit[];
  survivingUnits: Unit[];
  battleStats: BattleStats;
  turn: number;
  onBack: () => void;
  onNextMission?: () => void;
  onReviewReplay?: () => void;
}

export const PostBattleSummary: React.FC<PostBattleSummaryProps> = ({
  winner,
  myTeam,
  startingUnits,
  survivingUnits,
  battleStats,
  turn,
  onBack,
  onNextMission,
  onReviewReplay,
}) => {
  const playerTeam = myTeam || 'player';
  const isVictory = winner === playerTeam;

  const startingAllies = startingUnits.filter(u => u.team === playerTeam);
  const startingOpponents = startingUnits.filter(u => u.team !== playerTeam);

  const survivingAllies = survivingUnits.filter(u => u.team === playerTeam && u.hp > 0);
  const survivingOpponents = survivingUnits.filter(u => u.team !== playerTeam && u.hp > 0);

  const startingAlliesCount = startingAllies.length || 4;
  const startingOpponentsCount = startingOpponents.length || 4;

  const alliesLostCount = Math.max(0, startingAlliesCount - survivingAllies.length);
  const enemiesNeutralizedCount = Math.max(0, startingOpponentsCount - survivingOpponents.length);

  const survivalRate = (survivingAllies.length / startingAlliesCount) * 100;
  const neutralizationRate = (enemiesNeutralizedCount / startingOpponentsCount) * 100;

  const accuracyRate = battleStats.playerShotsFired > 0
    ? (battleStats.playerShotsHit / battleStats.playerShotsFired) * 105
    : 85;

  const turnFactor = Math.max(30, 100 - (turn * 4));
  let calculatedScore = (survivalRate * 0.4) + (neutralizationRate * 0.3) + (accuracyRate * 0.15) + (turnFactor * 0.15);

  if (!isVictory) {
    calculatedScore = (survivalRate * 0.4) + (neutralizationRate * 0.3) + (accuracyRate * 0.15) + (turnFactor * 0.05);
  }

  const playerUnitsWithStats = startingAllies.map(su => {
    return survivingUnits.find(u => u.id === su.id) || su;
  });

  const enemyUnitsWithStats = startingOpponents.map(su => {
    return survivingUnits.find(u => u.id === su.id) || su;
  });

  const allActiveUnits = [...playerUnitsWithStats, ...enemyUnitsWithStats];

  const getUnitScore = (u: Unit) => {
    return (u.damageDealt || 0) + (u.kills || 0) * 50 + (u.healingDone || 0) + (u.damageTaken || 0) * 0.5;
  };

  const mvpUnit = allActiveUnits.length > 0
    ? allActiveUnits.reduce((prev, current) => getUnitScore(current) > getUnitScore(prev) ? current : prev, allActiveUnits[0])
    : null;

  let rankText = 'D';
  let rankLabel = 'Needs Improvement';
  let rankColorClass = 'text-red-400 border-red-500/20 bg-red-500/5';

  if (calculatedScore >= 92) {
    rankText = 'S';
    rankLabel = 'Legendary';
    rankColorClass = 'text-sky-300 border-sky-500/25 bg-sky-500/5';
  } else if (calculatedScore >= 78) {
    rankText = 'A';
    rankLabel = 'Excellent';
    rankColorClass = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
  } else if (calculatedScore >= 60) {
    rankText = 'B';
    rankLabel = 'Good';
    rankColorClass = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
  } else if (calculatedScore >= 45) {
    rankText = 'C';
    rankLabel = 'Adequate';
    rankColorClass = 'text-zinc-400 border-zinc-700/30 bg-zinc-800/30';
  }

  const StatItem = ({ icon: Icon, label, value, color = 'text-zinc-300' }: { icon: any, label: string, value: string, color?: string }) => (
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-zinc-800/50 border border-zinc-700/30 rounded-lg text-zinc-500">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="font-mono">
        <p className="text-[9px] text-zinc-500 uppercase tracking-wider leading-none">{label}</p>
        <p className={`text-xs font-semibold mt-0.5 leading-none ${color}`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-y-auto p-4 md:p-8">
      {isVictory && <VictoryConfetti />}
      <div className="w-full max-w-4xl glass-dark rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] md:max-h-[85vh] animate-fade-in text-zinc-100 overflow-hidden">

        {/* HEADER */}
        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[10px] font-mono tracking-wider text-zinc-500 font-semibold uppercase">
            After-Action Report
          </span>
          <span className="text-[9px] font-mono text-zinc-600">
            Turn {turn}
          </span>
        </div>

        {/* BODY */}
        <div className="p-5 md:p-7 flex-1 overflow-y-auto flex flex-col gap-6">

          {/* OUTCOME BANNER */}
          <div className="text-center flex flex-col items-center gap-2">
            <h1 className={`text-4xl sm:text-5xl font-black uppercase tracking-[0.2em] leading-none select-none ${
              isVictory
                ? 'text-sky-300 drop-shadow-[0_0_30px_rgba(56,189,248,0.4)]'
                : 'text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]'
            }`} style={{fontFamily: 'Orbitron, monospace'}}>
              {isVictory ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <div className="h-[1px] w-1/3 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
          </div>

          {/* MVP */}
          {mvpUnit && (
            <div className="bg-amber-500/[0.03] border border-amber-500/15 rounded-xl p-4 md:p-5 relative overflow-hidden flex flex-col md:flex-row items-center gap-4">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col items-center justify-center bg-amber-400 text-black px-3.5 py-1.5 rounded-lg font-bold text-[10px] tracking-wider font-mono uppercase shrink-0">
                MVP
              </div>

              <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-amber-300 uppercase tracking-wide leading-tight">
                      {mvpUnit.name || mvpUnit.class.className}
                    </h2>
                    {mvpUnit.name && (
                      <span className="text-[9px] font-mono text-zinc-500 uppercase font-semibold px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/30 rounded-md">
                        {mvpUnit.class.className}
                      </span>
                    )}
                    <span className={`text-[8px] font-mono uppercase px-2 py-[2px] rounded-md font-semibold ${
                      mvpUnit.team === 'player' ? 'text-sky-400 bg-sky-500/10 border border-sky-500/20' : 'text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20'
                    }`}>
                      {mvpUnit.team === 'player' ? 'Blue' : 'Purple'}
                    </span>
                  </div>

                  <div className="flex gap-x-4 gap-y-1 flex-wrap mt-3 text-[10px] font-mono text-zinc-400">
                    <span>Damage: <span className="text-amber-400 font-semibold">{mvpUnit.damageDealt || 0}</span></span>
                    <span>Kills: <span className="text-red-400 font-semibold">{mvpUnit.kills || 0}</span></span>
                    <span>Healing: <span className="text-emerald-400 font-semibold">{mvpUnit.healingDone || 0}</span></span>
                    <span>Abilities: <span className="text-fuchsia-400 font-semibold">{mvpUnit.abilitiesUsed || 0}</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RANK + STATS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">

            {/* RANK */}
            <div className={`md:col-span-4 p-5 rounded-xl border flex flex-col items-center justify-center text-center gap-2 ${rankColorClass}`}>
              <span className="text-[9px] font-mono tracking-wider opacity-60 uppercase font-semibold">
                Rating
              </span>
              <span className="text-6xl font-black font-mono tracking-tight leading-none">
                {rankText}
              </span>
              <span className="text-[10px] font-semibold font-mono tracking-wider uppercase">
                {rankLabel}
              </span>
              <span className="text-[9px] font-mono opacity-50 uppercase">
                {calculatedScore.toFixed(1)} / 100
              </span>
            </div>

            {/* STATS */}
            <div className="md:col-span-8 bg-zinc-800/20 border border-zinc-700/20 p-5 rounded-xl flex flex-col justify-between gap-4">
              <div className="flex items-center gap-1.5 border-b border-zinc-800/40 pb-2 shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                  Battle Statistics
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1 items-center py-1">
                <StatItem icon={Clock} label="Turns" value={`${turn}`} />
                <StatItem icon={Crosshair} label="Accuracy" value={`${accuracyRate.toFixed(0)}% (${battleStats.playerShotsHit}/${battleStats.playerShotsFired})`} />
                <StatItem icon={Flame} label="Damage Dealt" value={`${battleStats.playerDamageDealt}`} color="text-amber-400" />
                <StatItem icon={Zap} label="Abilities Used" value={`${battleStats.playerAbilitiesUsed}`} color="text-fuchsia-400" />
                <StatItem icon={Activity} label="Heals" value={`${battleStats.playerHealsPerformed}`} color="text-emerald-400" />
                <StatItem icon={Skull} label="Allies Lost" value={`${alliesLostCount}`} color="text-red-400" />
              </div>
            </div>
          </div>

          {/* SQUAD ROSTERS */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-zinc-800/40 pb-2">
              <Shield className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                Squad Results
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* BLUE SQUAD */}
              <div className="p-4 rounded-xl bg-zinc-800/15 border border-zinc-700/20 flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-zinc-800/30 pb-1.5">
                  <span className="text-[9px] font-mono text-sky-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 bg-sky-400 rounded-full" />
                    Blue Squad
                  </span>
                  <span className="text-[8px] font-mono text-zinc-500 font-semibold">
                    {survivingAllies.length}/{startingAlliesCount} survived
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {startingAllies.map((startingUnit) => {
                    const currentUnit = survivingUnits.find(u => u.id === startingUnit.id) || startingUnit;
                    const hpPercent = (currentUnit.hp / startingUnit.class.stats.maxHP) * 100;
                    const isAlive = currentUnit.hp > 0;

                    return (
                      <div key={startingUnit.id} className={`flex flex-col border p-3 rounded-lg gap-2 transition-all ${
                        isAlive
                          ? 'bg-zinc-900/30 border-zinc-800/30'
                          : 'bg-red-500/[0.02] border-zinc-800/20 opacity-40'
                      }`}>
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[10px] font-mono font-semibold uppercase truncate ${isAlive ? 'text-zinc-200' : 'text-red-400 line-through'}`}>
                              {currentUnit.name || startingUnit.class.className}
                            </span>
                            {currentUnit.name && (
                              <span className="text-[8px] font-mono text-zinc-500 uppercase">
                                ({startingUnit.class.className})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {(() => {
                              let xpGained = isVictory ? 50 : 15;
                              if (isAlive) xpGained += 20;
                              xpGained += (currentUnit.kills || 0) * 15;
                              xpGained += Math.floor((currentUnit.damageDealt || 0) / 10);
                              xpGained += Math.floor((currentUnit.healingDone || 0) / 5);

                              if (xpGained > 0) {
                                return (
                                  <span className="text-[8px] font-mono uppercase px-1.5 py-[1px] font-semibold rounded-md text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                    +{xpGained} XP
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            <span className={`text-[8px] font-mono uppercase px-1.5 py-[1px] font-semibold rounded-md ${
                              isAlive
                                ? 'text-sky-400 bg-sky-500/10 border border-sky-500/15'
                                : 'text-red-400 bg-red-500/10 border border-red-500/15'
                            }`}>
                              {isAlive ? `${currentUnit.hp}/${startingUnit.class.stats.maxHP}` : 'KIA'}
                            </span>
                          </div>
                        </div>

                        {isAlive && (
                          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-sky-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${hpPercent}%` }}
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] font-mono text-zinc-500 uppercase border-t border-zinc-800/20 pt-1.5">
                          <span>DMG <span className="text-zinc-300">{currentUnit.damageDealt || 0}</span></span>
                          <span>Kills <span className="text-zinc-300">{currentUnit.kills || 0}</span></span>
                          {currentUnit.healingDone > 0 && <span>Heal <span className="text-emerald-400">{currentUnit.healingDone}</span></span>}
                        </div>
                      </div>
                    );
                  })}
                  {startingAllies.length === 0 && (
                    <div className="text-zinc-600 text-xs font-mono text-center py-2">
                      No units deployed.
                    </div>
                  )}
                </div>
              </div>

              {/* PURPLE SQUAD */}
              <div className="p-4 rounded-xl bg-zinc-800/15 border border-zinc-700/20 flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-zinc-800/30 pb-1.5">
                  <span className="text-[9px] font-mono text-fuchsia-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 bg-fuchsia-400 rounded-full" />
                    Purple Squad
                  </span>
                  <span className="text-[8px] font-mono text-zinc-500 font-semibold">
                    {enemiesNeutralizedCount}/{startingOpponentsCount} eliminated
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {startingOpponents.map((startingUnit) => {
                    const currentUnit = survivingUnits.find(u => u.id === startingUnit.id) || startingUnit;
                    const hpPercent = (currentUnit.hp / startingUnit.class.stats.maxHP) * 100;
                    const isAlive = currentUnit.hp > 0;

                    return (
                      <div key={startingUnit.id} className={`flex flex-col border p-3 rounded-lg gap-2 transition-all ${
                        isAlive
                          ? 'bg-zinc-900/30 border-zinc-800/30'
                          : 'bg-zinc-900/10 border-zinc-800/20 opacity-40'
                      }`}>
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[10px] font-mono font-semibold uppercase truncate ${isAlive ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>
                              {currentUnit.name || startingUnit.class.className}
                            </span>
                            {currentUnit.name && (
                              <span className="text-[8px] font-mono text-zinc-500 uppercase">
                                ({startingUnit.class.className})
                              </span>
                            )}
                          </div>
                          <span className={`text-[8px] font-mono uppercase px-1.5 py-[1px] font-semibold rounded-md shrink-0 ${
                            isAlive
                              ? 'text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/15'
                              : 'text-zinc-500 bg-zinc-800/30 border border-zinc-700/20'
                          }`}>
                            {isAlive ? `${currentUnit.hp}/${startingUnit.class.stats.maxHP}` : 'KIA'}
                          </span>
                        </div>

                        {isAlive && (
                          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-fuchsia-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${hpPercent}%` }}
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] font-mono text-zinc-500 uppercase border-t border-zinc-800/20 pt-1.5">
                          <span>DMG <span className="text-zinc-300">{currentUnit.damageDealt || 0}</span></span>
                          <span>Kills <span className="text-zinc-300">{currentUnit.kills || 0}</span></span>
                        </div>
                      </div>
                    );
                  })}
                  {startingOpponents.length === 0 && (
                    <div className="text-zinc-600 text-xs font-mono text-center py-2">
                      No units deployed.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* BOTTOM ACTIONS */}
        <div className="p-4 border-t border-zinc-800/50 flex flex-col sm:flex-row items-center justify-center gap-3 shrink-0 flex-wrap">
          {onNextMission && (
            <button
              type="button"
              onClick={onNextMission}
              className="px-8 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/50 text-amber-300 font-mono text-xs font-semibold uppercase tracking-wider transition-all rounded-xl cursor-pointer max-w-sm w-full text-center shadow-[0_0_20px_rgba(245,158,11,0.1)]"
            >
              Next Mission
            </button>
          )}
          {onReviewReplay && (
            <button
              type="button"
              id="analyze-blackbox-replay-btn"
              onClick={onReviewReplay}
              className="px-8 py-3 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 hover:border-teal-400/40 text-teal-300 font-mono text-xs font-semibold uppercase tracking-wider transition-all rounded-xl cursor-pointer max-w-sm w-full text-center"
            >
              Review Replay
            </button>
          )}
          <button
            type="button"
            id="dismiss-operational-report-btn"
            onClick={onBack}
            className="px-8 py-3 bg-zinc-800/40 hover:bg-zinc-700/40 border border-zinc-700/30 hover:border-zinc-600/40 text-zinc-400 hover:text-zinc-200 font-mono text-xs font-semibold uppercase tracking-wider transition-all rounded-xl cursor-pointer max-w-sm w-full text-center"
          >
            Return to Menu
          </button>
        </div>

      </div>
    </div>
  );
};
