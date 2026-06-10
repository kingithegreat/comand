import React from 'react';
import { History, CheckCircle, XCircle } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface MatchRecord {
  result: 'win' | 'loss';
  timestamp: number;
}

export default function MatchHistory() {
  const [user] = useAuthState(auth);
  const [profile, loading] = useDocumentData(
    user ? doc(db, 'users', user.uid) : null
  );

  if (!user) return null;

  const matchHistory: MatchRecord[] = profile?.matchHistory || [];

  return (
    <div className="bg-[#141810]/80 border border-[#2d3422]/60 rounded-lg p-5 shadow-md flex flex-col gap-4 font-mono mt-4">
      <div className="flex items-center gap-2 border-b border-[#2d3422]/30 pb-2">
        <History className="w-4 h-4 text-sky-400" />
        <h3 className="text-xs font-extrabold text-[#dae3ce] tracking-widest uppercase">RECENT ENGAGEMENTS</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : matchHistory.length === 0 ? (
        <div className="text-[10px] text-[#8b9180] text-center uppercase tracking-wide py-4">
          NO COMBAT RECORDS FOUND.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {matchHistory.map((match, index) => {
            const isWin = match.result === 'win';
            const date = new Date(match.timestamp);
            const dateString = date.toLocaleDateString(undefined, { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            });
            const timeString = date.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={index} 
                className={`flex items-center justify-between p-2 rounded border ${
                  isWin 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isWin ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isWin ? 'VICTORY' : 'DEFEAT'}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-[#8b9180] text-right uppercase tracking-wider leading-tight">
                  <div className="text-[#dae3ce]">{dateString}</div>
                  <div>{timeString}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
