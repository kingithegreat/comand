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

  // Auto-scroll when new logs arrive, if enabled
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, filter, searchTerm, autoScroll]);

  // Handle manual scroll to toggle autoscroll behavior gracefully
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // If user scrolled near the bottom, enable autoscroll. Otherwise disable.
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    if (isAtBottom !== autoScroll) {
      setAutoScroll(isAtBottom);
    }
  };

  // Filter logs based on category and search query
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filtering
      let matchesCategory = true;
      if (filter === 'combat') {
        matchesCategory = log.type === 'combat' || log.type === 'death';
      } else if (filter === 'move') {
        // [MANEUVER] logs are typically type 'info'
        matchesCategory = log.type === 'info' && (log.text.includes('advanced') || log.text.includes('Maneuver') || log.text.includes('MANEUVER'));
      } else if (filter === 'ability') {
        matchesCategory = log.type === 'ability';
      } else if (filter === 'system') {
        // Other info logs or system logs
        matchesCategory = log.type === 'system' || (log.type === 'info' && !(log.text.includes('advanced') || log.text.includes('Maneuver') || log.text.includes('MANEUVER')));
      }

      // Search term filtering
      const matchesSearch = log.text.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [logs, filter, searchTerm]);

  // Helper styling for individual entry blocks
  const getLogEntryStyles = (type: LogMessage['type'], text: string) => {
    // Check if it's a movement/maneuver
    const isManeuver = text.includes('MANEUVER') || text.includes('advanced');
    
    if (type === 'death' || text.includes('FATALITY') || text.includes('neutralized')) {
      return {
        bg: 'bg-rose-950/20 border-rose-900/30 text-rose-400',
        dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
        border: 'border-l-rose-500',
        icon: <Skull className="w-3 h-3 text-rose-500 shrink-0" />
      };
    }
    
    if (type === 'combat' || text.includes('ENGAGE') || text.includes('attacked')) {
      return {
        bg: 'bg-orange-950/10 border-orange-900/20 text-orange-400',
        dot: 'bg-orange-500 shadow-[0_0_8px_#f97316]',
        border: 'border-l-orange-500',
        icon: <Activity className="w-3 h-3 text-orange-500 shrink-0" />
      };
    }

    if (type === 'ability' || text.includes('HEAL') || text.includes('FORTIFY') || text.includes('STEALTH')) {
      return {
        bg: 'bg-sky-950/15 border-sky-900/20 text-sky-400',
        dot: 'bg-sky-450 shadow-[0_0_8px_#38bdf8]',
        border: 'border-l-sky-500',
        icon: <Shield className="w-3 h-3 text-sky-400 shrink-0" />
      };
    }

    if (isManeuver) {
      return {
        bg: 'bg-emerald-950/10 border-emerald-900/20 text-[#afd19c]',
        dot: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
        border: 'border-l-emerald-500',
        icon: <Navigation className="w-3 h-3 text-[#afd19c] shrink-0 rotate-45" />
      };
    }

    // Default system/info logs
    return {
      bg: 'bg-black/10 border-zinc-800/15 text-zinc-300',
      dot: 'bg-amber-500/80 shadow-[0_0_6px_#f59e0b]',
      border: 'border-l-amber-500/60',
      icon: <Terminal className="w-3 h-3 text-amber-500 shrink-0" />
    };
  };

  return (
    <div 
      id="hud-combat-log-term" 
      className="w-full xl:w-[350px] bg-[#12160d]/75 backdrop-blur-md border border-[#2d3a20]/80 rounded-lg overflow-hidden flex flex-col h-[320px] xl:h-[480px] shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative"
    >
      {/* HUD Header Bar */}
      <div className="bg-[#191f14]/90 border-b border-[#2d3a20]/60 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </div>
          <span className="text-[10px] font-mono font-extrabold tracking-widest text-[#fbbf24] uppercase flex items-center gap-1.5">
            COMBAT MONITOR FEED
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Total display indicator */}
          <span className="text-[8.5px] font-mono text-[#5f684d] font-black tracking-wider uppercase bg-black/40 border border-[#2d3a20] px-1.5 py-0.5 rounded-sm select-none">
            SYNCED
          </span>
          {logs.length > 0 && (
            <button
              onClick={onClear}
              type="button"
              className="p-1 hover:bg-black/40 text-zinc-500 hover:text-rose-400 border border-transparent hover:border-[#2d3a20] rounded-sm transition-all duration-150 cursor-pointer"
              title="Clear Battle Feed Log"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* FILTER BUTTONS ROW */}
      <div className="px-2.5 py-1.5 bg-black/35 border-b border-[#2d3a20]/45 flex flex-wrap gap-1 items-center justify-between gap-y-1.5 shrink-0">
        <div className="flex flex-wrap gap-0.5 text-[8.5px] font-mono">
          {(['all', 'combat', 'move', 'ability', 'system'] as const).map(f => {
            const label = f === 'all' ? 'ALL' : f === 'combat' ? 'COMBAT' : f === 'move' ? 'MOVE' : f === 'ability' ? 'SPEC' : 'SYS';
            const isActive = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-1.5 sm:px-2 py-0.5 rounded-sm uppercase tracking-tighter hover:text-white transition-all cursor-pointer font-bold ${
                  isActive
                    ? 'bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24]'
                    : 'bg-transparent border border-transparent text-[#5f684d]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search input inside HUD Combat Log */}
        <div className="relative flex items-center bg-black/60 border border-[#2d3a20]/50 rounded px-1.5 py-0.5 w-full sm:w-[110px] xl:w-[100px] hover:border-[#3d4f2b] transition-all">
          <Search className="w-2.5 h-2.5 text-zinc-500 mr-1 shrink-0" />
          <input
            type="text"
            placeholder="FILTER..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-[8.5px] font-mono text-zinc-300 w-full focus:outline-none focus:ring-0 placeholder-zinc-650"
          />
        </div>
      </div>

      {/* COMPACT FLOATING AUTO-SCROLL INDICATOR STATUS */}
      {!autoScroll && filteredLogs.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-amber-500 text-black font-mono text-[8px] font-black tracking-wider uppercase px-2 py-1 rounded shadow-lg animate-bounce border border-amber-300 flex items-center gap-1 z-30 opacity-90 transition-all hover:scale-105"
        >
          <Eye className="w-2.5 h-2.5" /> Jump to Live
        </button>
      )}

      {/* Log Feed Items List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2.5 space-y-2 select-text scrollbar-thin scrollbar-thumb-[#2d3a20]/60 scrollbar-track-transparent cursor-default"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5f684d] font-mono select-none">
            <Terminal className="w-5 h-5 mb-1.5 opacity-40 animate-pulse text-[#afd19c]" />
            <span className="tracking-widest text-[8.5px] uppercase font-extrabold text-[#afd19c]">SECTOR_FEED_SILOED</span>
            <span className="text-[7.5px] font-normal leading-relaxed text-[#5f684d] mt-1">
              {searchTerm ? 'No recordings match query parameter scope.' : 'Awaiting tactical vectors telemetry transmissions.'}
            </span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const styles = getLogEntryStyles(log.type, log.text);
            return (
              <div
                key={log.id}
                className={`flex gap-2 items-start p-1.5 border hover:border-zinc-700/50 rounded-sm border-l-2 transition-all leading-normal ${styles.bg} ${styles.border}`}
              >
                <div className="flex flex-col items-center pt-0.5">
                  {styles.icon}
                </div>
                <div className="flex-1 font-mono text-[9px] min-w-0">
                  <div className="flex items-center gap-1.5 justify-between select-none mb-0.5 opacity-60">
                    <span className="text-[8px] font-semibold text-zinc-500">[{log.timestamp}]</span>
                    <span className="text-[7px] font-semibold tracking-widest uppercase">
                      {log.type === 'info' && (log.text.includes('advanced') || log.text.includes('MANEUVER')) ? 'MOVE' : log.type}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap font-medium break-words leading-relaxed select-text select-all">
                    {/* Format some of the text elegantly */}
                    {log.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom informational bar */}
      <div className="bg-[#12160d]/90 border-t border-[#2d3a20]/40 px-3 py-1.5 flex justify-between items-center text-[7.5px] font-mono text-[#5f684d] shrink-0 select-none">
        <span className="font-bold flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          ACTIVE_ITEMS: {filteredLogs.length}
        </span>
        <span className="tracking-wider text-right uppercase">
          {activeTeam === 'player' ? 'ALLIED TURNS CORED' : 'HOSTILE CORRESPONDENCE LOCK'}
        </span>
      </div>
    </div>
  );
}
