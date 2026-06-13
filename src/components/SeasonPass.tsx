import React from 'react';
import { Star, Coins, Palette, Award, ChevronRight, Lock } from 'lucide-react';
import { SEASON_REWARDS, SeasonReward } from '../progression';

interface SeasonPassProps {
  seasonXP: number;
  seasonLevel: number;
  onClaim?: (level: number) => void;
}

export default function SeasonPass({ seasonXP, seasonLevel, onClaim }: SeasonPassProps) {
  const currentReward = SEASON_REWARDS.find(r => r.level === seasonLevel);
  const nextReward = SEASON_REWARDS.find(r => r.level === seasonLevel + 1);
  const xpForNext = nextReward ? nextReward.xpRequired - (currentReward?.xpRequired || 0) : 0;
  const xpProgress = nextReward ? seasonXP - (currentReward?.xpRequired || 0) : 0;
  const xpPct = nextReward ? Math.min(100, (xpProgress / xpForNext) * 100) : 100;

  const getRewardIcon = (reward: SeasonReward['reward']) => {
    if (reward.type === 'credits') return <Coins className="w-3.5 h-3.5 text-amber-400" />;
    if (reward.type === 'theme') return <Palette className="w-3.5 h-3.5 text-fuchsia-400" />;
    return <Award className="w-3.5 h-3.5 text-sky-400" />;
  };

  const getRewardText = (reward: SeasonReward['reward']) => {
    if (reward.type === 'credits') return `${reward.value} Credits`;
    if (reward.type === 'theme') return `${String(reward.value).charAt(0).toUpperCase() + String(reward.value).slice(1)} Theme`;
    return `"${reward.value}" Title`;
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-4 font-mono flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-zinc-800/30 pb-2">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" />
          <h3 className="text-[11px] font-black text-zinc-200 tracking-wider uppercase">Season 1 — Operation Firststrike</h3>
        </div>
        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
          LV {seasonLevel}
        </span>
      </div>

      {/* XP Progress bar */}
      {nextReward && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[8px] text-zinc-500 uppercase">
            <span>Level {seasonLevel}</span>
            <span>{xpProgress}/{xpForNext} XP</span>
            <span>Level {seasonLevel + 1}</span>
          </div>
          <div className="w-full bg-zinc-800/60 h-2 rounded-full overflow-hidden border border-zinc-700/20">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Reward track */}
      <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-1">
        {SEASON_REWARDS.map((sr) => {
          const unlocked = seasonLevel >= sr.level;
          const isCurrent = sr.level === seasonLevel;

          return (
            <div key={sr.level} className={`flex items-center gap-3 p-2 rounded-lg border transition-all text-[10px] ${
              isCurrent
                ? 'border-amber-500/30 bg-amber-500/5'
                : unlocked
                ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                : 'border-zinc-800/20 bg-zinc-900/20 opacity-50'
            }`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                isCurrent
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : unlocked
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800/30 text-zinc-600 border border-zinc-700/20'
              }`}>
                {unlocked ? sr.level : <Lock className="w-3 h-3" />}
              </div>

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {getRewardIcon(sr.reward)}
                <span className={`font-semibold uppercase truncate ${unlocked ? 'text-zinc-200' : 'text-zinc-600'}`}>
                  {getRewardText(sr.reward)}
                </span>
              </div>

              {isCurrent && (
                <ChevronRight className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
