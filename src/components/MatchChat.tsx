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
    return <div className="text-red-400 text-xs p-2">Error loading chat...</div>;
  }

  return (
    <div className="flex flex-col h-full glass-dark rounded-xl overflow-hidden">
      <div className="p-2 border-b border-zinc-800/50 flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">Chat</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar flex flex-col">
        {loading ? (
           <div className="text-zinc-600 text-[10px] font-mono animate-pulse">Connecting...</div>
        ) : (!messages || messages.length === 0) ? (
           <div className="text-zinc-600 text-[10px] font-mono text-center my-auto">No messages yet</div>
        ) : (
           messages.map((msg, idx) => {
             const isMe = msg.senderId === user?.uid;
             return (
               <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full text-left`}>
                 <span className="text-[8px] font-mono text-zinc-600 tracking-wider mb-0.5 px-1">{msg.senderName}</span>
                 <div className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] break-words max-w-[90%] ${isMe ? 'bg-sky-500/10 border border-sky-500/20 text-sky-100' : 'bg-zinc-800/30 border border-zinc-700/20 text-zinc-300'}`}>
                   {msg.text}
                 </div>
               </div>
             );
           })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-2 border-t border-zinc-800/50 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-zinc-800/30 border border-zinc-700/30 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          maxLength={120}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          title="Send message"
          className="bg-zinc-800/40 text-zinc-500 p-1.5 rounded-lg border border-zinc-700/30 hover:bg-zinc-700/40 hover:text-zinc-300 disabled:opacity-30 transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
