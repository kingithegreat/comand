import React from 'react';
import { Target, CheckCircle, Gift, Clock } from 'lucide-react';
import { DailyChallenge } from '../progression';

interface DailyChallengesProps {
  challenges: DailyChallenge[];
  onClaim?: (challengeId: string) => void;
}

export default function DailyChallenges({ challenges, onClaim }: DailyChallengesProps) {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const hoursLeft = Math.floor((endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60));
  const minsLeft = Math.floor(((endOfDay.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-4 font-mono flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-zinc-800/30 pb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <h3 className="text-[11px] font-black text-zinc-200 tracking-wider uppercase">Daily Ops</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase">
          <Clock className="w-3 h-3" />
          {hoursLeft}h {minsLeft}m
        </div>
      </div>

      {challenges.length === 0 ? (
        <div className="text-[10px] text-zinc-500 text-center py-3 uppercase">Loading missions...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {challenges.map((c) => {
            const progress = Math.min(c.progress, c.target);
            const pct = (progress / c.target) * 100;

            return (
              <div key={c.id} className={`p-3 rounded-lg border transition-all ${
                c.completed
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-zinc-800/30 border-zinc-700/20'
              }`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-zinc-200 uppercase tracking-wide">{c.title}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{c.description}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.completed ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase">
                        <CheckCircle className="w-3 h-3" /> Done
                      </span>
                    ) : progress >= c.target && onClaim ? (
                      <button
                        type="button"
                        onClick={() => onClaim(c.id)}
                        className="flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase cursor-pointer hover:bg-amber-500/25 transition-colors"
                      >
                        <Gift className="w-3 h-3" /> Claim +{c.reward}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase">
                        <Gift className="w-3 h-3" /> {c.reward}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.completed ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[8px] text-zinc-500 mt-1 text-right uppercase">
                  {progress}/{c.target}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
