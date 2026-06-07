import React from 'react';
import { ChevronRight, Clock, AlertTriangle } from 'lucide-react';

interface TurnCounterProps {
  turn: number;
  activeTeam: 'player' | 'enemy';
  mode: 'deploy' | 'play';
  isOnline: boolean | undefined;
  myTeam?: 'player' | 'enemy';
  onEndTurn: () => void;
  gameMode: 'local_ai' | 'local_p2p' | 'online';
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
    TurnLabel = activeTeam === 'player' ? 'Blue Squad (P1) Turn' : 'Purple Squad (P2) Turn';
  } else if (gameMode === 'local_ai') {
    TurnLabel = activeTeam === 'player' ? 'Your Turn' : 'AI Turn';
  } else {
    TurnLabel = activeTeam === 'player' ? 'Blue Turn' : 'Purple Turn';
  }

  const isMyTurn = isOnline && activeTeam === myTeam;
  const showTimer = isOnline && mode === 'play' && typeof timeLeft === 'number';

  // Format time left to mm:ss or ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeft !== undefined && timeLeft <= 15;

  const activeUnits = units?.filter(u => u.team === activeTeam) || [];
  const outOfAP = activeUnits.length > 0 && activeUnits.every(u => u.ap <= 0);

  return (
    <div className="flex flex-col gap-2 mb-3 w-full">
      <div className="flex justify-between items-center w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-[10px] font-semibold text-amber-100/70 uppercase tracking-widest bg-black/40 border border-[#8b7355] px-2 py-1 rounded">
            Turn {turn}
          </span>
          {mode === 'play' && (
             <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
               activeTeam === 'player' 
                ? 'text-[#38bdf8] border-[#38bdf8]/50 bg-[#0c4a6e]/80 shadow-[0_0_10px_rgba(56,189,248,0.4)]' 
                : 'text-[#ef4444] border-[#ef4444] bg-[#7f1d1d]/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
             }`}>
               {TurnLabel}
             </span>
          )}
          {isOnline && mode === 'play' && !isMyTurn && (
               <span className="text-[10px] text-amber-500 animate-pulse font-medium ml-2">Waiting for opponent...</span>
          )}
        </div>

        <button 
          onClick={onEndTurn}
          disabled={mode !== 'play' || (isOnline && !isMyTurn)}
          className={`flex items-center gap-1 px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider rounded transition-all shadow-lg shadow-inner ${
            outOfAP
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400 ring-offset-2 ring-offset-black'
              : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 shadow-amber-900/20 disabled:bg-[#3a3f32] disabled:text-[#6a6f62] disabled:cursor-not-allowed disabled:border-[#4a4f42]'
          }`}
        >
          {outOfAP ? "OUT OF AP - END TURN" : "End Turn"}
          <ChevronRight className="w-3.5 h-3.5 -mr-1" />
        </button>
      </div>

      {/* Visual Turn Timer Banner */}
      {showTimer && (
        <div className={`w-full flex items-center justify-between p-2 rounded border gap-3 transition-all duration-300 font-mono text-[10px] sm:text-xs uppercase font-extrabold ${
          isLowTime 
            ? 'bg-red-950/45 border-red-500/70 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse' 
            : isMyTurn 
              ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-500'
        }`}>
          <div className="flex items-center gap-1.5 leading-none">
            <Clock className={`w-3.5 h-3.5 shrink-0 ${isLowTime ? 'text-red-400 animate-pulse' : isMyTurn ? 'text-emerald-450' : 'text-amber-500'}`} />
            <span>
              {isMyTurn ? "Your Action Cycle:" : "Opponent Cycle Active:"}
            </span>
            <span className="font-mono text-xs sm:text-sm tracking-wider font-extrabold bg-black/50 px-2 py-0.5 rounded border border-[#3e4835]/40 ml-1">
              {formatTime(timeLeft!)}
            </span>
          </div>

          <div className="flex-1 max-w-[200px] h-1.5 bg-black/45 rounded-full overflow-hidden border border-[#3e4835]/25 mx-2 hidden md:block">
            <div 
              className={`h-full transition-all duration-1000 ${isLowTime ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : isMyTurn ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, (timeLeft! / 60) * 100)}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            {timeLeft === 0 && !isMyTurn ? (
              <button 
                onClick={onForceEndTurn}
                className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[9px] uppercase tracking-wider rounded transition-all animate-bounce border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
              >
                <AlertTriangle className="w-3 h-3" /> Force claim turn
              </button>
            ) : (
              <span className={`text-[8.5px] lowercase italic font-normal tracking-wide leading-none ${isLowTime ? 'text-red-400' : 'text-zinc-500'}`}>
                {isMyTurn ? "make moves before timer expires" : "synchronizing match timeline..."}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
