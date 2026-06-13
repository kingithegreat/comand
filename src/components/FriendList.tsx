import React, { useState, useEffect } from 'react';
import { Users, UserPlus, X, Copy, Check, Send, Loader2 } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface FriendListProps {
  onInvite?: (friendId: string) => void;
  roomCode?: string | null;
}

export default function FriendList({ onInvite, roomCode }: FriendListProps) {
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [addInput, setAddInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [invitedId, setInvitedId] = useState<string | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const loadFriends = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const friendIds: string[] = data.friends || [];
          const loaded: { id: string; name: string }[] = [];
          for (const fid of friendIds.slice(0, 20)) {
            try {
              const fSnap = await getDoc(doc(db, 'users', fid));
              loaded.push({ id: fid, name: fSnap.exists() ? fSnap.data().displayName || 'Commander' : 'Unknown' });
            } catch {
              loaded.push({ id: fid, name: 'Unknown' });
            }
          }
          setFriends(loaded);
        }
      } catch (err) {
        console.error('Error loading friends:', err);
      }
      setLoading(false);
    };
    loadFriends();
  }, [user]);

  const handleAdd = async () => {
    if (!user || !addInput.trim()) return;
    const friendId = addInput.trim();
    if (friendId === user.uid) { setError("That's your own ID"); return; }
    if (friends.some(f => f.id === friendId)) { setError('Already added'); return; }

    setAdding(true);
    setError('');
    try {
      const fSnap = await getDoc(doc(db, 'users', friendId));
      if (!fSnap.exists()) { setError('Commander not found'); setAdding(false); return; }

      await updateDoc(doc(db, 'users', user.uid), { friends: arrayUnion(friendId) });
      setFriends(prev => [...prev, { id: friendId, name: fSnap.data().displayName || 'Commander' }]);
      setAddInput('');
    } catch (err) {
      console.error('Error adding friend:', err);
      setError('Failed to add');
    }
    setAdding(false);
  };

  const handleRemove = async (friendId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { friends: arrayRemove(friendId) });
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  const handleCopyId = () => {
    if (!user) return;
    navigator.clipboard?.writeText(user.uid).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const handleInviteFriend = (friendId: string) => {
    if (onInvite) {
      onInvite(friendId);
      setInvitedId(friendId);
      setTimeout(() => setInvitedId(null), 2000);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-4 font-mono flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-zinc-800/30 pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          <h3 className="text-[11px] font-black text-zinc-200 tracking-wider uppercase">Squad Contacts</h3>
        </div>
        <span className="text-[9px] text-zinc-500 font-bold">{friends.length} contacts</span>
      </div>

      {/* Your ID */}
      <div className="flex items-center gap-2 bg-zinc-800/30 border border-zinc-700/20 rounded-lg p-2">
        <span className="text-[9px] text-zinc-500 uppercase shrink-0">Your ID:</span>
        <span className="text-[9px] text-zinc-300 font-bold truncate flex-1">{user.uid}</span>
        <button
          type="button"
          onClick={handleCopyId}
          className="text-[8px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md uppercase shrink-0 cursor-pointer hover:bg-sky-500/20 transition-colors flex items-center gap-1"
        >
          {copiedId ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>

      {/* Add friend */}
      <div className="flex gap-2">
        <input
          value={addInput}
          onChange={e => setAddInput(e.target.value)}
          placeholder="Paste friend's ID"
          className="flex-1 bg-black/50 border border-zinc-800/50 focus:border-sky-500/40 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 font-mono outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !addInput.trim()}
          className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 text-[9px] font-bold uppercase rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
          Add
        </button>
      </div>
      {error && <span className="text-[9px] text-red-400">{error}</span>}

      {/* Friend list */}
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
        </div>
      ) : friends.length === 0 ? (
        <div className="text-[10px] text-zinc-500 text-center py-3 uppercase">
          No contacts yet. Share your ID with friends to connect.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
          {friends.map(f => (
            <div key={f.id} className="flex items-center gap-2 p-2 bg-zinc-800/20 border border-zinc-700/15 rounded-lg">
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full shrink-0" />
              <span className="text-[10px] font-bold text-zinc-200 uppercase truncate flex-1">{f.name}</span>
              {roomCode && onInvite && (
                <button
                  type="button"
                  onClick={() => handleInviteFriend(f.id)}
                  className="text-[8px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase shrink-0 cursor-pointer hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                >
                  {invitedId === f.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Send className="w-3 h-3" />}
                  {invitedId === f.id ? 'Sent' : 'Invite'}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(f.id)}
                title="Remove contact"
                className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
