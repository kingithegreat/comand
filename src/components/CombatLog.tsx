import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Trash2, EyeOff } from 'lucide-react';

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
        return 'text-amber-400';
      case 'death':
        return 'text-red-400 font-semibold';
      case 'ability':
        return 'text-sky-400';
      case 'info':
        return 'text-emerald-400';
      case 'system':
        return 'text-zinc-400';
      default:
        return 'text-zinc-300';
    }
  };

  return (
    <div className="glass-dark rounded-xl overflow-hidden flex flex-col h-[220px]">
      {/* Header */}
      <div className="border-b border-zinc-800/50 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
            Combat Log
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800/40 border border-zinc-700/30 rounded-lg p-[2px] text-[8px] font-mono">
            {(['all', 'combat', 'ability', 'system'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-1.5 py-0.5 rounded-md uppercase font-semibold tracking-tight transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-zinc-700/50 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClear}
            title="Clear logs"
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-[9.5px] space-y-1.5 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 select-none p-4">
            <EyeOff className="w-5 h-5 mb-2 opacity-40" />
            <span className="tracking-wider text-[9px] uppercase font-semibold">No events</span>
          </div>
        ) : (
          filteredLogs.slice(-5).map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-1.5 border-b border-zinc-800/20 pb-1 leading-relaxed"
            >
              <span className="text-zinc-600 tracking-tighter shrink-0 select-none text-[9px]">
                {log.timestamp}
              </span>
              <span className={`${getTypeStyle(log.type)} flex-1 break-words`}>
                {log.text}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-zinc-800/30 px-2.5 py-1 flex justify-between items-center text-[7.5px] font-mono text-zinc-600 shrink-0">
        <span>{Math.min(filteredLogs.length, 5)} entries</span>
      </div>
    </div>
  );
}
