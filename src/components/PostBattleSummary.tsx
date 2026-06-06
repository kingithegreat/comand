import React from 'react';
import { Unit, CharacterClass } from '../types';
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
}

export const PostBattleSummary: React.FC<PostBattleSummaryProps> = ({
  winner,
  myTeam,
  startingUnits,
  survivingUnits,
  battleStats,
  turn,
  onBack,
}) => {
  // Identify player team
  const playerTeam = myTeam || 'player';
  const isVictory = winner === playerTeam;

  // Split starting units into player vs enemy
  const startingAllies = startingUnits.filter(u => u.team === playerTeam);
  const startingOpponents = startingUnits.filter(u => u.team !== playerTeam);

  // Split surviving units
  const survivingAllies = survivingUnits.filter(u => u.team === playerTeam);
  const survivingOpponents = survivingUnits.filter(u => u.team !== playerTeam);

  // Calculates rates
  const startingAlliesCount = startingAllies.length || 4; // default to 4 as fallback if empty
  const startingOpponentsCount = startingOpponents.length || 4;

  const alliesLostCount = Math.max(0, startingAlliesCount - survivingAllies.length);
  const enemiesNeutralizedCount = Math.max(0, startingOpponentsCount - survivingOpponents.length);

  const survivalRate = (survivingAllies.length / startingAlliesCount) * 100;
  const neutralizationRate = (enemiesNeutralizedCount / startingOpponentsCount) * 100;

  const accuracyRate = battleStats.playerShotsFired > 0
    ? (battleStats.playerShotsHit / battleStats.playerShotsFired) * 100
    : 85; // high baseline if no direct weapon discharge occurred

  // Score formula
  const turnFactor = Math.max(30, 100 - (turn * 4));
  let calculatedScore = (survivalRate * 0.4) + (neutralizationRate * 0.3) + (accuracyRate * 0.15) + (turnFactor * 0.15);

  if (!isVictory) {
    calculatedScore = (survivalRate * 0.4) + (neutralizationRate * 0.3) + (accuracyRate * 0.15) + (turnFactor * 0.05);
  }

  // Rank determination
  let rankIconColor = 'text-amber-500';
  let rankText = 'D-RANK';
  let rankLabel = 'CRITICAL OVERHAUL REQUIRED';
  let rankColorClass = 'text-red-500 border-red-500/35 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.25)]';

  if (calculatedScore >= 92) {
    rankText = 'S-RANK';
    rankLabel = 'LEGENDARY OPERATIONAL MERIT';
    rankColorClass = 'text-sky-300 border-sky-450 bg-sky-950/30 shadow-[0_0_20px_rgba(56,189,248,0.35)]';
    rankIconColor = 'text-sky-400';
  } else if (calculatedScore >= 78) {
    rankText = 'A-RANK';
    rankLabel = 'EXCELLENT TACTICAL COMMAND';
    rankColorClass = 'text-emerald-400 border-emerald-500 bg-emerald-950/25 shadow-[0_0_15px_rgba(16,185,129,0.25)]';
    rankIconColor = 'text-emerald-400';
  } else if (calculatedScore >= 60) {
    rankText = 'B-RANK';
    rankLabel = 'SATISFACTORY SECTOR SECURITY';
    rankColorClass = 'text-amber-400 border-amber-500 bg-amber-950/25 shadow-[0_0_12px_rgba(245,158,11,0.2)]';
    rankIconColor = 'text-amber-400';
  } else if (calculatedScore >= 45) {
    rankText = 'C-RANK';
    rankLabel = 'ADEQUATE DISPATCH METRICS';
    rankColorClass = 'text-zinc-300 border-zinc-700 bg-zinc-900/40';
    rankIconColor = 'text-zinc-400';
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#070905]/95 backdrop-blur-md overflow-y-auto p-4 md:p-8 selection:bg-amber-500/30">
      <div className="w-full max-w-4xl bg-[#11140e] border-2 border-[#2d3422] rounded-xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-[85vh] animate-fade-in text-zinc-100 overflow-hidden">
        
        {/* UPPER STATUS BAR (GRID TERMINAL HEADER) */}
        <div className="p-4 bg-[#141810] border-b border-[#242b1b] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
            <span className="text-[10px] font-mono tracking-widest text-[#8b9180] font-black uppercase">
              POST-ACTION DEBRIEFING // OPERATIONS COMMAND
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded bg-black/30">
            SYSTEM ID: {Math.floor(Math.random() * 900000 + 100000)}
          </span>
        </div>

        {/* BODY WRAPPER */}
        <div className="p-5 md:p-7 flex-1 overflow-y-auto flex flex-col gap-6">
          
          {/* OPERATION OUTCOME BANNER */}
          <div className="text-center flex flex-col items-center">
            <h1 className={`text-4xl sm:text-6xl font-black uppercase tracking-[0.2em] mb-2 leading-none select-none ${
              isVictory 
                ? 'text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]' 
                : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]'
            }`}>
              {isVictory ? 'TACTICAL VICTORY' : 'TACTICAL DEFEAT'}
            </h1>
            <p className="text-[9.5px] font-mono text-[#8b9180] tracking-[0.3em] uppercase max-w-md mx-auto line-clamp-1 border-b border-[#2d3422] pb-3 w-full">
              SECURE GRID SYSTEM INSERTION ENVELOPE DISMISSED
            </p>
          </div>

          {/* TWO COLUMN GRID: RANK SCALE VS CORE ANALYTICS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch mt-1">
            
            {/* TACTICAL EFFICIENCY RATING GAUGE (4 Cols) */}
            <div className={`md:col-span-5 p-5 rounded-lg border flex flex-col items-center justify-center text-center gap-3 transition-shadow ${rankColorClass}`}>
              <span className="text-[9px] font-mono tracking-widest opacity-70 uppercase font-black">
                TACTICAL RATINGS EVALUATION
              </span>
              <div className="relative flex items-center justify-center my-1 select-none">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-current opacity-15 animate-[spin_20s_linear_infinite]" />
                <span className="text-5xl sm:text-6xl font-black font-mono tracking-tighter px-4 py-2 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
                  {rankText}
                </span>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[10px] font-black font-mono tracking-wider text-white">
                  {rankLabel}
                </span>
                <span className="text-[9px] font-mono opacity-80 uppercase tracking-wide">
                  COEFFICIENT SCORE: {calculatedScore.toFixed(1)} / 100.0
                </span>
              </div>
            </div>

            {/* HIGH-LEVEL STATISTICS SHEET (7 Cols) */}
            <div className="md:col-span-7 bg-black/25 border border-[#2d3422] p-5 rounded-lg flex flex-col justify-between gap-4">
              <div className="flex items-center gap-1.5 border-b border-[#2d3422]/60 pb-1.5 shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[9.5px] font-mono text-zinc-300 font-extrabold uppercase tracking-widest">
                  TACTICAL METRIC LOGS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 flex-1 items-center py-1">
                
                {/* CYCLES ELAPSED */}
                <div className="flex items-center gap-2.5">
                  <div className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono text-xs">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-mono">
                    <p className="text-[8.5px] text-zinc-500 uppercase tracking-wider leading-none">Cycles Spent</p>
                    <p className="text-xs text-zinc-300 font-black mt-1 leading-none">{turn} Turns</p>
                  </div>
                </div>

                {/* ACCURACY RATING */}
                <div className="flex items-center gap-2.5">
                  <div className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono text-xs">
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-mono">
                    <p className="text-[8.5px] text-zinc-500 uppercase tracking-wider leading-none">Weapon Accuracy</p>
                    <p className="text-xs text-zinc-300 font-black mt-1 leading-none">
                      {accuracyRate.toFixed(0)}% <span className="text-[9.5px] font-normal text-zinc-500">({battleStats.playerShotsHit}/{battleStats.playerShotsFired})</span>
                    </p>
                  </div>
                </div>

                {/* DISCHARGED DAMAGE */}
                <div className="flex items-center gap-2.5">
                  <div className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono text-xs">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-mono">
                    <p className="text-[8.5px] text-zinc-500 uppercase tracking-wider leading-none">Damage Discharged</p>
                    <p className="text-xs text-zinc-300 font-black mt-1 leading-none">{battleStats.playerDamageDealt} HP</p>
                  </div>
                </div>

                {/* SPECIAL ABILITIES ACTIVATED */}
                <div className="flex items-center gap-2.5">
                  <div className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono text-xs">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-mono">
                    <p className="text-[8.5px] text-zinc-500 uppercase tracking-wider leading-none">Skill Amplifiers</p>
                    <p className="text-xs text-zinc-300 font-black mt-1 leading-none">{battleStats.playerAbilitiesUsed} Used</p>
                  </div>
                </div>

                {/* NANITE HEALING PROVIDED */}
                <div className="flex items-center gap-2.5">
                  <div className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 rounded text-emerald-500/70 font-mono text-xs">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-mono">
                    <p className="text-[8.5px] text-zinc-500 uppercase tracking-wider leading-none">Nanite Heales</p>
                    <p className="text-xs text-zinc-300 font-black mt-1 leading-none">{battleStats.playerHealsPerformed} Activated</p>
                  </div>
                </div>

                {/* COMBUT CASUALTIES SUSTAINED */}
                <div className="flex items-center gap-2.5">
                  <div className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 rounded text-rose-500/70 font-mono text-xs">
                    <Skull className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-mono">
                    <p className="text-[8.5px] text-zinc-500 uppercase tracking-wider leading-none">Losses Sustained</p>
                    <p className="text-xs text-rose-400 font-black mt-1 leading-none">{alliesLostCount} Allied</p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* SQUAD INTEGRITY ROSTERS */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#2d3422]/60 pb-1.5 max-w-full">
              <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-[9.5px] font-mono text-zinc-300 font-extrabold uppercase tracking-widest leading-none">
                SQUAD COMPOSITION EVALUATION
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* ALLIED INTEGRITY (BLUE SQUAD) */}
              <div className="p-4 rounded-lg bg-[#141810] border border-[#232b1b] flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-[#2d3422]/70 pb-1.5">
                  <span className="text-[9px] font-mono text-sky-300 font-black uppercase tracking-widest flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-sky-400 rounded-sm" />
                    Secure Allied Forces (Blue)
                  </span>
                  <span className="text-[8px] font-mono text-zinc-400 font-black bg-sky-505/10 border border-sky-500/20 px-1.5 py-[1px] rounded">
                    {survivingAllies.length} / {startingAlliesCount} FIT FOR ACTIVE ACTION
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {startingAllies.map((startingUnit) => {
                    const currentUnit = survivingUnits.find(u => u.id === startingUnit.id);
                    const hpPercent = currentUnit ? (currentUnit.hp / startingUnit.class.stats.maxHP) * 100 : 0;
                    const isAlive = currentUnit && currentUnit.hp > 0;

                    return (
                      <div key={startingUnit.id} className={`flex items-center justify-between border p-2 rounded gap-4 transition-all duration-300 ${
                        isAlive 
                          ? 'bg-black/30 border-sky-950 hover:bg-black/45' 
                          : 'bg-[#1b080b]/30 border-red-950 opacity-40'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className={`text-[10px] font-mono font-black uppercase truncate ${isAlive ? 'text-zinc-200' : 'text-red-400 line-through'}`}>
                              {startingUnit.class.className}
                            </span>
                            <span className={`text-[8px] font-mono uppercase px-1.5 py-[1px] font-black rounded ${
                              isAlive 
                                ? 'text-sky-300 bg-sky-500/10' 
                                : 'text-red-400 bg-red-500/10'
                            }`}>
                              {isAlive ? `${currentUnit.hp} / ${startingUnit.class.stats.maxHP} HP` : 'K.I.A.'}
                            </span>
                          </div>
                          
                          {/* HEALTH PROGRESS BAR */}
                          {isAlive && (
                            <div className="w-full bg-zinc-950 h-1.5 rounded-sm overflow-hidden mt-1.5 border border-[#2d3422]/40 relative">
                              <div 
                                className="bg-sky-500 h-full rounded-sm transition-all duration-300 shadow-[0_0_5px_rgba(56,189,248,0.4)]"
                                style={{ width: `${hpPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {startingAllies.length === 0 && (
                    <div className="text-[#8b9180] text-xs font-mono uppercase tracking-wider italic text-center py-2 border border-dashed border-[#2d3422]/50 rounded">
                      Null insertion configurations logged.
                    </div>
                  )}
                </div>
              </div>

              {/* HOSTILE THREAT EVALUATION (RED SQUAD) */}
              <div className="p-4 rounded-lg bg-[#141810] border border-[#232b1b] flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-[#2d3422]/70 pb-1.5">
                  <span className="text-[9px] font-mono text-rose-300 font-black uppercase tracking-widest flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-rose-450 rounded-sm" />
                    AOP Adversary Forces (Red)
                  </span>
                  <span className="text-[8px] font-mono text-zinc-400 font-black bg-rose-505/10 border border-rose-500/20 px-1.5 py-[1px] rounded">
                    {enemiesNeutralizedCount} / {startingOpponentsCount} ELIMINATED
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {startingOpponents.map((startingUnit) => {
                    const currentUnit = survivingUnits.find(u => u.id === startingUnit.id);
                    const hpPercent = currentUnit ? (currentUnit.hp / startingUnit.class.stats.maxHP) * 100 : 0;
                    const isAlive = currentUnit && currentUnit.hp > 0;

                    return (
                      <div key={startingUnit.id} className={`flex items-center justify-between border p-2 rounded gap-4 transition-all duration-300 ${
                        isAlive 
                          ? 'bg-black/30 border-rose-950 hover:bg-black/45' 
                          : 'bg-[#1b080b]/30 border-zinc-900 opacity-40'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className={`text-[10px] font-mono font-black uppercase truncate ${isAlive ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>
                              {startingUnit.class.className}
                            </span>
                            <span className={`text-[8px] font-mono uppercase px-1.5 py-[1px] font-black rounded ${
                              isAlive 
                                ? 'text-rose-300 bg-rose-500/10' 
                                : 'text-zinc-500 bg-zinc-500/10'
                            }`}>
                              {isAlive ? `${currentUnit.hp} / ${startingUnit.class.stats.maxHP} HP` : 'NEUTRALIZED'}
                            </span>
                          </div>
                          
                          {/* HEALTH PROGRESS BAR FOR ALIVE ENEMY */}
                          {isAlive && (
                            <div className="w-full bg-zinc-950 h-1.5 rounded-sm overflow-hidden mt-1.5 border border-[#2d3422]/40 relative">
                              <div 
                                className="bg-rose-500 h-full rounded-sm transition-all duration-300 shadow-[0_0_5px_rgba(239,68,68,0.4)]"
                                style={{ width: `${hpPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {startingOpponents.length === 0 && (
                    <div className="text-[#8b9180] text-xs font-mono uppercase tracking-wider italic text-center py-2 border border-dashed border-[#2d3422]/50 rounded">
                      Null adversary units logged.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="p-4 bg-[#141810] border-t border-[#242b1b] flex items-center justify-center shrink-0">
          <button 
            type="button"
            id="dismiss-operational-report-btn"
            onClick={onBack} 
            className="px-10 py-3 bg-[#242b1e] hover:bg-[#323c2a] hover:text-[#fbcd5a] text-[#fbbf24] font-mono text-xs font-black uppercase tracking-widest transition-all border border-[#424f35] rounded-lg shadow-lg active:scale-95 cursor-pointer max-w-sm w-full text-center hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
          >
            DISMISS REPORT & RETURN
          </button>
        </div>

      </div>
    </div>
  );
};
