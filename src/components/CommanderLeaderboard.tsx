import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Trophy, Loader2 } from 'lucide-react';
import { db } from '../firebase';

export interface CommanderStat {
  userId: string;
  displayName: string;
  victories: number;
}

export default function CommanderLeaderboard() {
  const [leaders, setLeaders] = useState<CommanderStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchLeaders = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'stats')
        );
        const querySnapshot = await getDocs(q);
        const fetchedLeaders: CommanderStat[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLeaders.push(doc.data() as CommanderStat);
        });
        
        fetchedLeaders.sort((a, b) => b.victories - a.victories);
        
        if (active) {
          setLeaders(fetchedLeaders.slice(0, 10));
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Leaderboard error:', err);
        if (active) {
          setError(err.message || 'Failed to fetch leaderboard data.');
          setLoading(false);
        }
      }
    };

    fetchLeaders();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-[#141810]/80 border border-[#2d3422]/60 rounded-lg p-5 shadow-md flex flex-col gap-4 font-mono">
      <div className="flex items-center gap-2 border-b border-[#2d3422]/30 pb-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs font-extrabold text-[#dae3ce] tracking-widest uppercase">COMMANDER LEADERBOARD</h3>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        </div>
      ) : error ? (
        <div className="text-[10px] text-rose-400 text-center uppercase tracking-wide py-2">
          {error}
        </div>
      ) : leaders.length === 0 ? (
        <div className="text-[10px] text-[#8b9180] text-center uppercase tracking-wide py-4">
          INTELLIGENCE DATABANKS EMPTY. REPORT FOR DEPLOYMENT.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {leaders.map((leader, index) => (
            <div 
              key={leader.userId} 
              className={`flex items-center justify-between p-2 rounded border ${
                index === 0 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                  : index === 1
                  ? 'bg-zinc-300/10 border-zinc-400/40 text-zinc-300'
                  : index === 2
                  ? 'bg-orange-700/20 border-orange-700/50 text-orange-400'
                  : 'bg-black/40 border-[#2d3422]/40 text-[#dae3ce]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black w-4 text-center">
                  #{index + 1}
                </span>
                <span className="text-xs font-bold uppercase truncate max-w-[120px] sm:max-w-[200px]">
                  {leader.displayName}
                </span>
              </div>
              <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="opacity-70">WINS:</span>
                <span className="text-sm">{leader.victories}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
