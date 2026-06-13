import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Terminal, Shield, Activity, Skull, Navigation, Search, Trash2, Eye } from 'lucide-react';
import { LogMessage } from './CombatLog';

interface HUDCombatLogProps {
  logs: LogMessage[];
  onClear: () => void;
  activeTeam?: 'player' | 'enemy';
}

export default function HUDCombatLog({ logs, onClear, activeTeam }: HUDCombatLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'combat' | 'move' | 'ability' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, filter, searchTerm, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    if (isAtBottom !== autoScroll) {
      setAutoScroll(isAtBottom);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      let matchesCategory = true;
      if (filter === 'combat') {
        matchesCategory = log.type === 'combat' || log.type === 'death';
      } else if (filter === 'move') {
        matchesCategory = log.type === 'info' && (log.text.includes('advanced') || log.text.includes('Maneuver') || log.text.includes('MANEUVER'));
      } else if (filter === 'ability') {
        matchesCategory = log.type === 'ability';
      } else if (filter === 'system') {
        matchesCategory = log.type === 'system' || (log.type === 'info' && !(log.text.includes('advanced') || log.text.includes('Maneuver') || log.text.includes('MANEUVER')));
      }

      const matchesSearch = log.text.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [logs, filter, searchTerm]);

  const getLogStyle = (type: LogMessage['type'], text: string) => {
    const isManeuver = text.includes('MANEUVER') || text.includes('advanced');

    if (type === 'death' || text.includes('FATALITY') || text.includes('neutralized')) {
      return {
        text: 'text-red-400',
        border: 'border-l-red-500/40',
        icon: <Skull className="w-3 h-3 text-red-500/60 shrink-0" />
      };
    }

    if (type === 'combat' || text.includes('ENGAGE') || text.includes('attacked')) {
      return {
        text: 'text-amber-400',
        border: 'border-l-amber-500/40',
        icon: <Activity className="w-3 h-3 text-amber-500/60 shrink-0" />
      };
    }

    if (type === 'ability' || text.includes('HEAL') || text.includes('FORTIFY') || text.includes('STEALTH')) {
      return {
        text: 'text-sky-400',
        border: 'border-l-sky-500/40',
        icon: <Shield className="w-3 h-3 text-sky-400/60 shrink-0" />
      };
    }

    if (isManeuver) {
      return {
        text: 'text-emerald-400',
        border: 'border-l-emerald-500/40',
        icon: <Navigation className="w-3 h-3 text-emerald-400/60 shrink-0 rotate-45" />
      };
    }

    return {
      text: 'text-zinc-400',
      border: 'border-l-zinc-700/40',
      icon: <Terminal className="w-3 h-3 text-zinc-500 shrink-0" />
    };
  };

  return (
    <div className="w-full xl:w-[350px] glass-dark rounded-xl overflow-hidden flex flex-col h-[320px] xl:h-[480px] relative">
      {/* Header */}
      <div className="border-b border-zinc-800/50 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 uppercase">
            Combat Feed
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {logs.length > 0 && (
            <button
              onClick={onClear}
              type="button"
              className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer rounded"
              title="Clear log"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-2.5 py-1.5 border-b border-zinc-800/30 flex flex-wrap gap-1 items-center justify-between shrink-0">
        <div className="flex flex-wrap gap-0.5 text-[8px] font-mono">
          {(['all', 'combat', 'move', 'ability', 'system'] as const).map(f => {
            const label = f === 'all' ? 'All' : f === 'combat' ? 'Combat' : f === 'move' ? 'Move' : f === 'ability' ? 'Ability' : 'System';
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-1.5 py-0.5 rounded-md uppercase tracking-wider transition-all cursor-pointer font-semibold ${
                  filter === f
                    ? 'bg-zinc-700/40 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative flex items-center bg-zinc-800/30 border border-zinc-700/25 rounded-md px-1.5 py-0.5 w-full sm:w-[100px]">
          <Search className="w-2.5 h-2.5 text-zinc-600 mr-1 shrink-0" />
          <input
            type="text"
            placeholder="Filter..."
            title="Search logs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-[8.5px] font-mono text-zinc-300 w-full focus:outline-none placeholder-zinc-600"
          />
        </div>
      </div>

      {/* Auto-scroll jump */}
      {!autoScroll && filteredLogs.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-zinc-700 text-zinc-200 font-mono text-[8px] font-semibold tracking-wider uppercase px-2 py-1 rounded-lg shadow-lg border border-zinc-600 flex items-center gap-1 z-30 cursor-pointer transition-all hover:bg-zinc-600"
        >
          <Eye className="w-2.5 h-2.5" /> Latest
        </button>
      )}

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2.5 space-y-1.5 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-600 font-mono select-none">
            <Terminal className="w-5 h-5 mb-1.5 opacity-40" />
            <span className="tracking-wider text-[9px] uppercase font-semibold">
              {searchTerm ? 'No matches' : 'No events yet'}
            </span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const style = getLogStyle(log.type, log.text);
            return (
              <div
                key={log.id}
                className={`flex gap-2 items-start p-1.5 border border-zinc-800/15 rounded-md border-l-2 ${style.border}`}
              >
                <div className="pt-0.5">
                  {style.icon}
                </div>
                <div className="flex-1 font-mono text-[9px] min-w-0">
                  <span className="text-[7px] text-zinc-600 mr-1.5">{log.timestamp}</span>
                  <span className={`${style.text} break-words leading-relaxed`}>
                    {log.text}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/30 px-3 py-1 flex justify-between items-center text-[7.5px] font-mono text-zinc-600 shrink-0">
        <span>{filteredLogs.length} entries</span>
        <span>{activeTeam === 'player' ? 'Blue turn' : 'Purple turn'}</span>
      </div>
    </div>
  );
}
