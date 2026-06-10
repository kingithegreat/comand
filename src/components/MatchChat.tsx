import React, { useState, useRef, useEffect } from 'react';
import { collection, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { auth, db } from '../firebase';
import { Send, MessageSquare } from 'lucide-react';

interface MatchChatProps {
  matchId: string;
}

export default function MatchChat({ matchId }: MatchChatProps) {
  const [messagesRef] = useState(() => collection(db, 'matches', matchId, 'messages'));
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));
  const [messages, loading, error] = useCollectionData(q) as unknown as [any[] | undefined, boolean, any];
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
       messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !user) return;
    
    setInputText('');
    
    try {
      await addDoc(messagesRef, {
        text,
        senderId: user.uid,
        senderName: user.displayName || 'Commander',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  if (error) {
    return <div className="text-rose-500 text-xs p-2">Error loading comms...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-black/40 border border-[#303a24] rounded-lg overflow-hidden">
      <div className="bg-[#1a2014] p-2 border-b border-[#303a24] flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[#8b9180]" />
        <span className="text-[10px] font-mono text-[#8b9180] font-bold uppercase tracking-wider">Tactical Comms</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar flex flex-col">
        {loading ? (
           <div className="text-zinc-500 text-[10px] font-mono animate-pulse">Establishing uplink...</div>
        ) : (!messages || messages.length === 0) ? (
           <div className="text-zinc-500 text-[10px] font-mono text-center my-auto">No encrypted traffic.</div>
        ) : (
           messages.map((msg, idx) => {
             const isMe = msg.senderId === user?.uid;
             return (
               <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full text-left`}>
                 <span className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase mb-0.5 px-1">{msg.senderName}</span>
                 <div className={`px-2.5 py-1.5 rounded font-mono text-[10px] break-words max-w-[90%] shadow-sm ${isMe ? 'bg-emerald-950/60 border border-emerald-900 text-emerald-100' : 'bg-[#151a10] border border-[#2b3320] text-zinc-300'}`}>
                   {msg.text}
                 </div>
               </div>
             );
           })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-2 border-t border-[#303a24] flex gap-2 bg-[#0e120a]">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Transmit message..."
          className="flex-1 bg-[#151a10] border border-[#2b3320] rounded px-2 py-1.5 text-[10px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors"
          maxLength={120}
        />
        <button 
          type="submit"
          disabled={!inputText.trim()}
          className="bg-zinc-800 text-zinc-400 p-1.5 rounded border border-zinc-700 hover:bg-zinc-700 hover:text-white disabled:opacity-50 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
