import React from 'react';
import { TrendingUp, Coins, Flame, Trophy, Award } from 'lucide-react';
import { PlayerProgression, getEloRank, ACHIEVEMENTS, getUnlockedAchievements } from '../progression';

interface PlayerStatsProps {
  progression: PlayerProgression;
}

export default function PlayerStats({ progression }: PlayerStatsProps) {
  const rank = getEloRank(progression.elo);
  const winRate = progression.totalMatches > 0
    ? Math.round((progression.wins / progression.totalMatches) * 100)
    : 0;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-4 font-mono">
      <div className="flex items-center gap-2 border-b border-zinc-800/30 pb-2 mb-3">
        <TrendingUp className="w-4 h-4 text-sky-400" />
        <h3 className="text-[11px] font-black text-zinc-200 tracking-wider uppercase">Commander Stats</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* ELO */}
        <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-3 flex flex-col items-center gap-1">
          <Trophy className="w-4 h-4 text-zinc-500" />
          <span className={`text-lg font-black ${rank.color}`}>{progression.elo}</span>
          <span className={`text-[8px] font-bold uppercase tracking-wider ${rank.color}`}>{rank.name}</span>
        </div>

        {/* Win Rate */}
        <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-3 flex flex-col items-center gap-1">
          <TrendingUp className="w-4 h-4 text-zinc-500" />
          <span className="text-lg font-black text-zinc-200">{winRate}%</span>
          <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Win Rate</span>
        </div>

        {/* Win Streak */}
        <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-3 flex flex-col items-center gap-1">
          <Flame className="w-4 h-4 text-zinc-500" />
          <span className={`text-lg font-black ${progression.winStreak >= 3 ? 'text-orange-400' : 'text-zinc-200'}`}>
            {progression.winStreak}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Streak</span>
        </div>

        {/* Credits */}
        <div className="bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-3 flex flex-col items-center gap-1">
          <Coins className="w-4 h-4 text-zinc-500" />
          <span className="text-lg font-black text-amber-400">{progression.credits.toLocaleString()}</span>
          <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Credits</span>
        </div>
      </div>

      <div className="flex justify-between mt-3 text-[9px] text-zinc-500 uppercase">
        <span>{progression.totalMatches} matches played</span>
        <span>W {progression.wins} / L {progression.losses}</span>
        <span>Best streak: {progression.bestWinStreak}</span>
      </div>

      <div className="mt-4 border-t border-zinc-800/30 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-[11px] font-black text-zinc-200 tracking-wider uppercase">
            Achievements ({getUnlockedAchievements(progression).length}/{ACHIEVEMENTS.length})
          </h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {ACHIEVEMENTS.map(a => {
            const unlocked = a.condition(progression);
            return (
              <div
                key={a.id}
                className={`rounded-lg p-2 text-center border transition-all ${
                  unlocked
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-zinc-800/20 border-zinc-700/20 opacity-40'
                }`}
                title={`${a.name}: ${a.description}`}
              >
                <div className="text-lg">{a.icon}</div>
                <div className={`text-[7px] font-bold uppercase tracking-wider mt-1 ${unlocked ? 'text-amber-400' : 'text-zinc-600'}`}>
                  {a.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
