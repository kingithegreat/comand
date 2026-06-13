import React from 'react';
import { ChevronRight, Clock, AlertTriangle } from 'lucide-react';

interface TurnCounterProps {
  turn: number;
  activeTeam: 'player' | 'enemy';
  mode: 'deploy' | 'play';
  isOnline: boolean | undefined;
  myTeam?: 'player' | 'enemy';
  onEndTurn: () => void;
  gameMode: 'local_ai' | 'local_p2p' | 'online' | 'online_coop';
  timeLeft?: number;
  onForceEndTurn?: () => void;
  units?: any[];
}

export default function TurnCounter({
  turn,
  activeTeam,
  mode,
  isOnline,
  myTeam,
  onEndTurn,
  gameMode,
  timeLeft,
  onForceEndTurn,
  units
}: TurnCounterProps) {
  let TurnLabel = '';
  if (gameMode === 'local_p2p') {
    TurnLabel = activeTeam === 'player' ? 'Blue (P1)' : 'Purple (P2)';
  } else if (gameMode === 'local_ai') {
    TurnLabel = activeTeam === 'player' ? 'Your Turn' : 'AI Turn';
  } else {
    TurnLabel = activeTeam === 'player' ? 'Blue' : 'Purple';
  }

  const isMyTurn = isOnline && activeTeam === myTeam;
  const isSpectator = isOnline && myTeam === undefined;
  const showTimer = isOnline && mode === 'play' && typeof timeLeft === 'number';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeft !== undefined && timeLeft <= 15;

  const activeUnits = units?.filter(u => u.team === activeTeam && u.hp > 0) || [];
  const outOfAP = activeUnits.length > 0 && activeUnits.every(u => u.ap <= 0);

  React.useEffect(() => {
    if (mode === 'play' && outOfAP && !isSpectator) {
      if (!isOnline || activeTeam === myTeam) {
        const timer = setTimeout(() => {
          onEndTurn();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [outOfAP, mode, isOnline, activeTeam, myTeam, isSpectator, onEndTurn]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-800/50 border border-zinc-700/40 px-2 py-1 rounded-lg font-mono">
            Turn {turn}
          </span>
          {mode === 'play' && (
             <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border font-mono ${
               activeTeam === 'player'
                ? 'text-sky-300 border-sky-500/30 bg-sky-500/10'
                : 'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10'
             }`}>
               {TurnLabel}
             </span>
          )}
          {isOnline && mode === 'play' && !isMyTurn && !isSpectator && (
               <span className="text-[10px] text-zinc-500 animate-pulse font-mono ml-2">Waiting...</span>
          )}
          {isSpectator && mode === 'play' && (
               <span className="text-[10px] text-fuchsia-400/70 animate-pulse font-mono ml-2">Spectating</span>
          )}
        </div>

        {!isSpectator && (
        <button
          type="button"
          onClick={onEndTurn}
          disabled={mode !== 'play' || (isOnline && !isMyTurn)}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-all font-mono cursor-pointer ${
            outOfAP
              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 border border-zinc-700/40 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          {outOfAP ? "No AP — End Turn" : "End Turn"}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        )}
      </div>

      {showTimer && (
        <div className={`w-full flex items-center justify-between p-2 rounded-lg border gap-3 transition-all duration-300 font-mono text-[10px] sm:text-[11px] uppercase font-semibold ${
          isLowTime
            ? 'bg-red-500/10 border-red-500/30 text-red-300 animate-pulse'
            : isMyTurn
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
              : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-500'
        }`}>
          <div className="flex items-center gap-1.5 leading-none">
            <Clock className={`w-3.5 h-3.5 shrink-0 ${isLowTime ? 'text-red-400' : isMyTurn ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span className="font-mono text-xs sm:text-sm tracking-wider font-bold bg-black/30 px-2 py-0.5 rounded-md border border-zinc-800/50 ml-1">
              {formatTime(timeLeft!)}
            </span>
          </div>

          <div className="flex-1 max-w-[200px] h-1 bg-black/30 rounded-full overflow-hidden border border-zinc-800/30 mx-2 hidden md:block">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${isLowTime ? 'bg-red-500' : isMyTurn ? 'bg-emerald-400' : 'bg-zinc-600'}`}
              style={{ width: `${Math.min(100, (timeLeft! / 60) * 100)}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            {timeLeft === 0 && !isMyTurn && !isSpectator ? (
              <button
                type="button"
                onClick={onForceEndTurn}
                className="flex items-center gap-1 px-3 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-300 font-semibold text-[9px] uppercase tracking-wider rounded-lg transition-all border border-red-500/30 cursor-pointer"
              >
                <AlertTriangle className="w-3 h-3" /> Claim Turn
              </button>
            ) : (
              <span className={`text-[8.5px] font-normal tracking-wide leading-none ${isLowTime ? 'text-red-400/70' : 'text-zinc-600'}`}>
                {isSpectator ? "spectating" : (isMyTurn ? "your move" : "opponent's turn")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
