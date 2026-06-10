import React, { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Lock, Play, ShieldAlert, Navigation, Star, SearchX, Loader2, RotateCcw } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import { safeGetItem, safeSetItem } from '../lib/storage';

export const BASE_REGIONS = [
  {
    id: 'tutorial',
    name: 'Battle Academy',
    desc: 'Welcome, Commander. Earth is gone. The remnant fleets have scattered. Before we can mount a counter-offensive to reclaim our home, you must prove you can lead a squad. This is a basic simulation.',
    objective: 'Complete training and familiarize yourself with combat mechanics.',
    conditions: 'Controlled simulation environment. Holographic targets.',
  },
  {
    id: 'sector-1',
    name: 'Outpost Delta',
    desc: 'You passed the trials. Our intel shows a small recon detachment of the Supreme Tactical AI has landed on a resource planet on the fringes of Sector 1. Take them out before they can alert the fleet.',
    reward: 'Unlock Class: Heavy',
    objective: 'Eliminate all hostile forces established at Outpost Delta.',
    conditions: 'Standard visual range. Enemy utilizing recon classes.',
  },
  {
    id: 'sector-2',
    name: 'Neon District',
    desc: 'The scouts were a diversion. We tracked their signal to an abandoned urban mining colony. It is heavily polluted. The enemy is using the smog as cover to harvest the reactors.',
    objective: 'Clear the sector of hostile presence to protect the reactor.',
    conditions: 'Smog Cover Active: Targeting visibility reduced. Expect close-quarters engagement.',
  },
  {
    id: 'sector-3',
    name: 'The Citadel',
    desc: 'With the reactor secure, we have enough power to breach their forward operating base. This citadel is heavily fortified and serves as their local command hub.',
    objective: 'Breach the fortress and secure the zone.',
    conditions: 'Heavily fortified. Enemy squad size increased (+1 unit).',
  },
  {
    id: 'sector-4',
    name: 'Frozen Tundra',
    desc: 'We extracted data from the Citadel. It points to a massive cryo-storage facility on the ice world of Kaelen. The enemy is guarding something critical in the deep freeze. Do not let them hold it.',
    objective: 'Survive the assault and eliminate all targets.',
    conditions: 'Extreme cold. Enemy relies heavily on durable classes.',
  },
  {
    id: 'sector-5',
    name: 'Jungle Canopy',
    desc: 'The data retrieved from Kaelen contained the coordinates to their stealth research outpost hidden beneath the dense canopy of Veridia. Expect ambushes.',
    objective: 'Root out the elite hostile squads hidden in the canopy.',
    conditions: 'Smog Cover Active: Thick jungle canopy limits sight lines.',
  },
  {
    id: 'sector-6',
    name: 'Volcanic Ridge',
    desc: 'They are constructing a dreadnought using the geothermal vents of this volcanic ridge. We must strike now before the ship launches. The enemy has deployed heavy ordinance to defend the construction.',
    objective: 'Overcome the heavy ordinance team.',
    conditions: 'Heat distortions and elite enemy classes present.',
  },
  {
    id: 'sector-7',
    name: 'Desert Ruin',
    desc: 'Our forces are spread thin. The Supreme AI has sent assassins to a neutral diplomatic ruin to wipe out our allies. Drop in and intercept them.',
    objective: 'Secure the ruins against high-lethality operatives.',
    conditions: 'Smog Cover Active: Airborne sand limits vision. Assassins highly probable.',
  },
  {
    id: 'sector-8',
    name: 'Oceanic Platform',
    desc: 'The enemy fleet is rallying at this offshore command rig. If we take it down, we severe their communication network entirely, clearing the path to their command.',
    objective: 'Neutralize the command rig garrison.',
    conditions: 'Isolated platform. Standard visual range. Elite enemy presence.',
  },
  {
    id: 'sector-9',
    name: 'Orbital Command',
    desc: 'This is it, Commander. The Supreme Tactical AI core is aboard the Orbital Command station. We are throwing everything at them. If we win here, the war is won.',
    objective: 'Dismantle the supreme tactical AI forces.',
    conditions: 'Smog Cover Active: Artificial smoke deployed. Peak enemy threat level.',
  }
];

export default function CampaignMode({ onBack, onStartMission }: { onBack: () => void, onStartMission?: (missionId: string) => void }) {
  const { playSound } = useAudio();
  const [regions, setRegions] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [lockedAnim, setLockedAnim] = useState<string | null>(null);
  
  // Tactical Loading Simulation
  const [loadingMission, setLoadingMission] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStuck, setLoadingStuck] = useState<boolean>(false);
  const [showBriefing, setShowBriefing] = useState<boolean>(false);

  useEffect(() => {
    // Determine status for each region
    const processed = BASE_REGIONS.map((r, index) => {
      const isCompleted = safeGetItem(`campaign_${r.id}_completed`) === 'true';
      let status = 'locked';
      if (isCompleted) {
        status = 'completed';
      } else if (index === 0 || index === 1) { 
        status = 'available';
      } else {
        const prevRegion = BASE_REGIONS[index - 1];
        if (safeGetItem(`campaign_${prevRegion.id}_completed`) === 'true') {
          status = 'available';
        }
      }
      return { ...r, status };
    });
    setRegions(processed);
    
    // Auto-select first available or last completed
    const firstAvailable = processed.find(r => r.status === 'available') || processed[0];
    setSelectedRegion(firstAvailable);
  }, []);

  const handleLaunch = () => {
    playSound('click');
    setLoadingMission(true);
    setLoadingProgress(0);
    setLoadingStuck(false);
    
    let simProgress = 0;
    const interval = setInterval(() => {
       simProgress += Math.random() * 30 + 10; // Faster loading, no stall
       if (simProgress >= 100) {
          clearInterval(interval);
          setLoadingProgress(100);
          setTimeout(() => {
            if (onStartMission) onStartMission(selectedRegion.id);
          }, 400);
       } else {
          setLoadingProgress(Math.min(100, simProgress));
       }
    }, 150);
  };
  
  const handleRetryLaunch = () => {
     playSound('click');
     setLoadingStuck(false);
     setLoadingProgress(0);
     handleLaunch();
  };

  if (!selectedRegion) return null;

  if (loadingMission) {
     return (
       <div className="w-full max-w-4xl bg-zinc-950 text-zinc-300 font-mono flex flex-col justify-center items-center relative border border-zinc-800 border-opacity-50 shadow-[0_0_20px_rgba(45,52,34,0.4)] rounded-lg overflow-hidden h-[90vh] mx-auto mt-6">
          <Globe className="w-16 h-16 text-emerald-500 mb-6 animate-pulse" />
          <h2 className="text-2xl font-black uppercase text-emerald-400 tracking-widest mb-2">Establishing Uplink</h2>
          <p className="text-xs text-zinc-500 tracking-widest uppercase mb-8">Target: {selectedRegion.name}</p>
          
          <div className="w-64 h-2 bg-black border border-emerald-900 rounded-full overflow-hidden mb-8 relative">
             <div 
               className={`h-full transition-all duration-300 ${loadingStuck ? 'bg-rose-500' : 'bg-emerald-500'}`} 
               style={{ width: `${loadingProgress}%` }}
             />
          </div>
          
          {loadingStuck ? (
             <div className="flex flex-col items-center animate-fade-in">
                <div className="text-rose-400 text-xs font-bold tracking-widest mb-6">UPLINK STALLED - SIGNAL WEAKNESS DETECTED</div>
                <div className="flex gap-4">
                  <button onClick={handleRetryLaunch} className="flex items-center gap-2 px-6 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/50 hover:border-rose-400 text-rose-400 tracking-widest uppercase font-bold text-xs rounded transition-all cursor-pointer">
                    <RotateCcw className="w-4 h-4" /> TRACE ROUTE & RETRY
                  </button>
                  <button onClick={() => setLoadingMission(false)} className="px-6 py-2 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white uppercase text-xs font-bold tracking-widest rounded transition-colors cursor-pointer">
                    ABORT
                  </button>
                </div>
             </div>
          ) : (
             <div className="flex items-center gap-3 text-emerald-500/70 text-[10px] font-bold tracking-widest uppercase">
                <Loader2 className="w-4 h-4 animate-spin" /> SYNCHRONIZING WITH SECTOR GRID...
             </div>
          )}
       </div>
     );
  }

  return (
    <div className="w-full max-w-4xl bg-zinc-950 text-zinc-300 font-mono flex flex-col relative border border-zinc-800 border-opacity-50 shadow-[0_0_20px_rgba(45,52,34,0.4)] rounded-lg overflow-hidden h-[90vh] sm:h-[80vh] md:h-[90vh] mx-auto mt-6 sm:mt-0">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900 bg-opacity-80 border-b border-zinc-800 border-opacity-50 p-4 shrink-0">
         <div className="flex items-center gap-3">
           <Globe className="w-6 h-6 text-emerald-400 animate-pulse hidden sm:block" />
           <div>
             <h2 className="text-lg sm:text-xl font-black uppercase text-emerald-400 tracking-widest">Global Campaign</h2>
             <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest">Tactical Requisition & Sector Control</p>
           </div>
         </div>
         <div className="flex items-center gap-2">
            <button 
               onClick={() => {
                  if (confirm('Are you sure you want to completely reset the campaign progression?')) {
                     safeSetItem('campaign_tutorial_completed', 'false');
                     for (let i = 1; i <= 9; i++) {
                       safeSetItem(`campaign_sector-${i}_completed`, 'false');
                     }
                     window.location.reload();
                  }
               }}
               className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-900/50 rounded text-[8px] sm:text-[9px] font-bold uppercase transition-colors cursor-pointer text-rose-400"
            >
               RESET
            </button>
            <button 
               onClick={() => { playSound('click'); onBack(); }}
               className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-zinc-800 bg-opacity-80 hover:bg-[#202716] border border-zinc-800 border-opacity-50 hover:border-[#fbbf24] rounded text-[10px] sm:text-xs font-bold uppercase transition-colors cursor-pointer"
            >
               <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" /> RETREAT
            </button>
         </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-1 overflow-y-auto sm:overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiI+CjxyZWN0IHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2YzZjNmIiBzdHJva2Utb3BhY2l0eT0iMC4xIiBzdHJva2Utd2lkdGg9IjEiIC8+Cjwvc3ZnPg==')] opacity-30 pointer-events-none" />
        
        {/* Region Map */}
        <div className="w-full sm:w-2/3 border-b sm:border-b-0 sm:border-r border-zinc-800 border-opacity-50 p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 sm:overflow-y-auto relative bg-zinc-950 shrink-0 sm:shrink">
           <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1 sm:mb-2 sticky top-0 bg-zinc-950 z-10 py-1">Select Tactical Theater</p>
           {regions.map((r, i) => {
             const isSelected = selectedRegion.id === r.id;
             let bgClass = "bg-zinc-900 bg-opacity-80 border-zinc-800 border-opacity-50";
             let iconContent = <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600" />;
             
             if (r.status === 'completed') {
                bgClass = "bg-emerald-950/20 border-emerald-900/50";
                iconContent = <Star className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="currentColor" />;
             } else if (r.status === 'available') {
                bgClass = "bg-amber-950/20 border-amber-500/50";
                iconContent = <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />;
             }

             if (isSelected) {
                bgClass += " ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
             }
             
             if (lockedAnim === r.id) {
                bgClass += " animate-[shake_0.2s_ease-in-out_0s_2]";
             }

             return (
               <div 
                 key={r.id}
                 onClick={() => {
                    if (r.status !== 'locked') {
                       playSound('click');
                       setSelectedRegion(r);
                    } else {
                       playSound('error');
                       setLockedAnim(r.id);
                       setTimeout(() => setLockedAnim(null), 400);
                    }
                 }}
                 className={`${bgClass} p-3 sm:p-4 border rounded-lg flex items-center justify-between cursor-pointer transition-all shrink-0 ${r.status === 'locked' ? 'opacity-50' : 'hover:-translate-y-1'}`}
               >
                 <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-black/40 border border-black/80 flex items-center justify-center shrink-0">
                       {iconContent}
                    </div>
                    <div>
                       <div className="text-[9px] sm:text-[10px] text-zinc-400 font-black tracking-widest mb-0.5 uppercase">SECTOR 0{i+1}</div>
                       <h3 className="text-sm sm:text-base font-bold text-zinc-300 uppercase tracking-wider">{r.name}</h3>
                    </div>
                 </div>
                 {r.status === 'completed' && <div className="text-[9px] sm:text-[10px] text-emerald-500 font-bold uppercase border border-emerald-500/30 px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/10">CLEARED</div>}
               </div>
             );
           })}
        </div>

        {/* Intelligence Briefing */}
        <div className="w-full sm:w-1/3 bg-zinc-900 bg-opacity-80 p-4 sm:p-6 flex flex-col items-center relative sm:overflow-y-auto shrink-0 sm:shrink min-h-[50vh] sm:min-h-0">
           <Navigation className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-700 mb-2 sm:mb-4 shrink-0" />
           <h3 className="text-lg sm:text-xl font-bold uppercase text-center mb-1 sm:mb-2 tracking-widest text-zinc-300 shrink-0">{selectedRegion.name}</h3>
           <p className="text-[10px] sm:text-xs text-zinc-400 text-center mb-4 sm:mb-8 px-2 sm:px-4 leading-relaxed shrink-0">{selectedRegion.desc}</p>

           {selectedRegion.reward && (
             <div className="w-full bg-emerald-950/20 border border-emerald-900/50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-8 text-center flex flex-col items-center gap-1 sm:gap-2 shrink-0">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 tracking-widest">Intel Reward Assessed</div>
                <div className="text-xs sm:text-sm font-black text-zinc-300 uppercase">{selectedRegion.reward}</div>
             </div>
           )}

           <div className="mt-auto w-full pt-4 shrink-0 sticky bottom-0 bg-zinc-900 bg-opacity-80 z-10 pb-2">
              {selectedRegion.status === 'available' || selectedRegion.status === 'completed' ? (
                 <button 
                   onClick={handleLaunch}
                   className="w-full py-3 sm:py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs sm:text-sm tracking-widest rounded transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:-translate-y-0.5"
                 >
                   <Play className="w-4 h-4 sm:w-5 sm:h-5" /> {selectedRegion.status === 'completed' ? 'Re-Infiltrate Sector' : 'Infiltrate Sector'}
                 </button>
              ) : (
                 <button disabled className="w-full py-3 sm:py-4 bg-zinc-900 text-zinc-600 font-black uppercase text-xs sm:text-sm tracking-widest rounded border border-zinc-800 cursor-not-allowed flex items-center justify-center gap-2">
                   <SearchX className="w-4 h-4 sm:w-5 sm:h-5" /> Sector Locked
                 </button>
              )}
           </div>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
