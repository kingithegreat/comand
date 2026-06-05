import React from 'react';
import { ChevronRight } from 'lucide-react';

interface TurnCounterProps {
  turn: number;
  activeTeam: 'player' | 'enemy';
  mode: 'deploy' | 'play';
  isOnline: boolean | undefined;
  myTeam?: 'player' | 'enemy';
  onEndTurn: () => void;
}

export default function TurnCounter({ turn, activeTeam, mode, isOnline, myTeam, onEndTurn }: TurnCounterProps) {
  return (
    <div className="flex justify-between items-center mb-3 w-full">
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
             {activeTeam === 'player' ? 'Player Turn' : 'Enemy Turn'}
           </span>
        )}
        {isOnline && mode === 'play' && activeTeam !== myTeam && (
            <span className="text-[10px] text-amber-500 animate-pulse font-medium ml-2">Waiting for opponent...</span>
        )}
      </div>
      <button 
        onClick={onEndTurn}
        disabled={mode !== 'play' || (isOnline && activeTeam !== myTeam)}
        className="flex items-center gap-1 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-[#3a3f32] disabled:text-[#6a6f62] disabled:cursor-not-allowed disabled:border-[#4a4f42] border border-amber-500 text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider rounded transition-colors shadow-lg shadow-amber-900/20"
      >
        End Turn
        <ChevronRight className="w-3.5 h-3.5 -mr-1" />
      </button>
    </div>
  );
}
