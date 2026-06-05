import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Trash2, Shield, EyeOff, Activity } from 'lucide-react';

export interface LogMessage {
  id: string;
  text: string;
  type: 'info' | 'combat' | 'death' | 'ability' | 'system';
  timestamp: string;
}

interface CombatLogProps {
  logs: LogMessage[];
  onClear: () => void;
}

export default function CombatLog({ logs, onClear }: CombatLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'combat' | 'ability' | 'system'>('all');

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, filter]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'combat') return log.type === 'combat' || log.type === 'death';
    if (filter === 'ability') return log.type === 'ability';
    if (filter === 'system') return log.type === 'system' || log.type === 'info';
    return true;
  });

  const getTypeStyle = (type: LogMessage['type']) => {
    switch (type) {
      case 'combat':
        return 'text-orange-400 font-medium';
      case 'death':
        return 'text-rose-500 font-bold bg-rose-950/20 px-1 border-l-2 border-rose-600 animate-pulse';
      case 'ability':
        return 'text-[#38bdf8] font-semibold';
      case 'info':
        return 'text-emerald-400';
      case 'system':
        return 'text-amber-500/80 font-mono';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div id="combat-log-term" className="bg-[#12150e] border border-[#2d3324] rounded-lg overflow-hidden flex flex-col h-[220px] shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]">
      {/* Header Panel */}
      <div className="bg-[#191e14] border-b border-[#2d3324] px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-ping shrink-0" />
          <Terminal className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#fbbf24] uppercase">
            SECURE_COMMS_FEED
          </span>
          <span className="text-[8px] font-mono text-[#5f684d] font-black tracking-tighter">
            ONLINE
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter badges */}
          <div className="flex bg-black/40 border border-[#2d3324] rounded-sm p-[1.5px] text-[8px] font-mono">
            {(['all', 'combat', 'ability', 'system'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-1.5 py-0.5 rounded-[1px] uppercase font-bold tracking-tight transition-all truncate hover:text-amber-400 ${
                  filter === f 
                    ? 'bg-[#2d3324] text-[#fbbf24]' 
                    : 'text-[#5f684d] font-normal'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button 
            onClick={onClear} 
            title="Wipe Logs"
            className="p-1 text-[#5f684d] hover:text-[#fbbf24] transition-colors rounded hover:bg-black/20"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Log list container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-[9.5px] space-y-1.5 scrollbar-thin scrollbar-thumb-[#2d3324] scrollbar-track-transparent select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#5f684d] font-bold select-none p-4">
            <EyeOff className="w-6 h-6 mb-1 opacity-50" />
            <span className="tracking-widest text-[8.5px] uppercase">COMM_SILENCE_ACTIVE</span>
            <span className="text-[7.5px] font-normal leading-relaxed text-[#5f684d]/70 mt-0.5">Await action trigger input logs</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className="flex items-start gap-1.5 border-b border-[#1b2014]/30 pb-1 leading-relaxed"
            >
              <span className="text-[#5f684d] tracking-tighter shrink-0 select-none">
                [{log.timestamp}]
              </span>
              <span className={`${getTypeStyle(log.type)} flex-1 break-words font-medium`}>
                {log.text}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="bg-[#12150e] border-t border-[#1b2014] px-2.5 py-1 flex justify-between items-center text-[7.5px] font-mono text-[#5f684d]/80 shrink-0">
        <span>LOGS_SYNCD: {filteredLogs.length} / {logs.length}</span>
        <span>SYS_STATUS: READY</span>
      </div>
    </div>
  );
}
