import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Target, Monitor, Users, Globe, LogIn, LogOut, Loader2, BookOpen, Cpu, Shield, Zap, Flame, Rocket, Activity, CheckSquare, Volume2, VolumeX, Copy, Check, Radio, ArrowLeft, Play, Terminal, AlertTriangle, RefreshCw } from 'lucide-react';
import { auth, db } from './firebase';
import Game from './components/Game';
import TutorialMode from './components/TutorialMode';
import { CLASSES } from './data';
import UnitHelmetAvatar from './components/UnitHelmetAvatar';
import CommanderLeaderboard from './components/CommanderLeaderboard';
import { useAudio } from './contexts/AudioContext';

export default function App() {
  const [gameMode, setGameMode] = useState<'local_ai' | 'local_p2p' | 'online' | 'tutorial' | null>(null);
  const [user, loading] = useAuthState(auth);
  const [profile, profileLoading] = useDocumentData(user ? doc(db, 'users', user.uid) : null);
  const { soundEnabled, toggleSound } = useAudio();
  
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [dbTab, setDbTab] = useState<'tutorial' | 'classes'>('tutorial');
  const [activeClassDesc, setActiveClassDesc] = useState<string>('Scout');

  const [joinCode, setJoinCode] = useState('');
  const [onlineMatchId, setOnlineMatchId] = useState<string | null>(null);
  const [matchData, matchLoading] = useDocumentData(
    onlineMatchId ? doc(db, 'matches', onlineMatchId) : null
  );

  const [hostProfile, setHostProfile] = useState<any>(null);
  const [guestProfile, setGuestProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
     if (profile && !editingProfile) {
        setDisplayNameInput(profile.displayName);
     }
  }, [profile, editingProfile]);

  useEffect(() => {
    if (matchData?.hostId) {
      getDoc(doc(db, 'users', matchData.hostId)).then(snap => {
        if (snap.exists()) {
          setHostProfile(snap.data());
        } else {
          setHostProfile({ displayName: 'Commander Host' });
        }
      }).catch(err => {
        console.error("Error fetching host profile:", err);
        setHostProfile({ displayName: 'Commander Host' });
      });
    } else {
      setHostProfile(null);
    }
    
    if (matchData?.guestId) {
      getDoc(doc(db, 'users', matchData.guestId)).then(snap => {
        if (snap.exists()) {
          setGuestProfile(snap.data());
        } else {
          setGuestProfile({ displayName: 'Commander Guest' });
        }
      }).catch(err => {
        console.error("Error fetching guest profile:", err);
        setGuestProfile({ displayName: 'Commander Guest' });
      });
    } else {
      setGuestProfile(null);
    }
  }, [matchData?.hostId, matchData?.guestId]);

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        const dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.value = code;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleAbortMatch = async () => {
    if (!onlineMatchId) {
      setGameMode(null);
      setOnlineMatchId(null);
      return;
    }
    try {
      const matchRef = doc(db, 'matches', onlineMatchId);
      if (matchData?.hostId === user?.uid) {
        await updateDoc(matchRef, {
          status: 'aborted'
        });
      } else {
        await updateDoc(matchRef, {
          guestId: ""
        });
      }
    } catch (err) {
      console.error("Match link abort error:", err);
    }
    setGameMode(null);
    setOnlineMatchId(null);
  };

  const handleLaunchBattlefield = async () => {
    if (!onlineMatchId) return;
    try {
      const matchRef = doc(db, 'matches', onlineMatchId);
      await updateDoc(matchRef, {
        status: 'deploying'
      });
    } catch (err: any) {
      console.error(err);
      alert("Failed to synchronize battlefield frequencies: " + err.message);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          userId: user.uid,
          displayName: user.displayName || 'Commander',
          email: user.email
        });
      }
    } catch (error) {
      console.error(error);
      alert("Please ensure third-party cookies are not blocked, or open the app in a new tab to authenticate.");
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      if (!profile) {
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          displayName: displayNameInput || user.displayName || 'Commander',
          email: user.email
        });
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: displayNameInput
        });
      }
      setEditingProfile(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error saving profile');
    }
  };

  const createRoom = async () => {
    if (!user) return;
    try {
      const newMatchId = Math.random().toString(36).substring(2, 8).toUpperCase();
      await setDoc(doc(db, 'matches', newMatchId), {
        hostId: user.uid,
        status: 'waiting',
      });
      setOnlineMatchId(newMatchId);
      setGameMode('online');
    } catch(err: any) {
      alert(err.message || "Failed to create room.");
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!user || !cleanCode) return;
    try {
      const matchRef = doc(db, 'matches', cleanCode);
      const matchSnap = await getDoc(matchRef);
      if (matchSnap.exists()) {
         const data = matchSnap.data();
         if (data.status === 'waiting' && data.hostId !== user.uid) {
            await updateDoc(matchRef, {
               guestId: user.uid
            });
         }
         setOnlineMatchId(cleanCode);
         setGameMode('online');
      } else {
        alert("Room not found!");
      }
    } catch(err: any) {
      alert(err.message || "Failed to join room.");
    }
  };

  // Render Game Component if we selected a mode
  if (gameMode === 'local_ai' || gameMode === 'local_p2p') {
    return <Game gameMode={gameMode} onBack={() => setGameMode(null)} />;
  }

  if (gameMode === 'tutorial') {
    return (
      <div className="min-h-screen bg-[#0e100c] text-[#dae3ce] font-sans p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-y-auto selection:bg-[#fbbf24] selection:text-black">
        <TutorialMode onBack={() => setGameMode(null)} />
      </div>
    );
  }

  if (gameMode === 'online' && onlineMatchId) {
    if (matchLoading) {
       return <div className="min-h-screen bg-[#0e100c] flex items-center justify-center text-[#dae3ce] font-mono"><Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" /><span>SECURE TRANS-BANDING SYNCHRONOUS INITIATION...</span></div>;
    }

    // Handlers for aborted rooms
    if (matchData?.status === 'aborted') {
      return (
        <div className="min-h-screen bg-[#0e100c] text-[#dae3ce] font-mono p-6 flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,14,0)_97%,rgba(18,24,14,0.1)_97%)] bg-[length:100%_4px] pointer-events-none z-50"></div>
          <div className="max-w-md w-full bg-[#141810]/95 border border-[#2d3422] p-6 rounded-xl flex flex-col gap-4 text-center relative overflow-hidden shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/40 rounded-full flex items-center justify-center text-rose-500 mx-auto animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">SECNET LINK BROKEN</h2>
            <p className="text-[10px] text-zinc-400 uppercase leading-normal">
              Operational telemetry channel has been de-synchronized or terminated by the other commander. Tactical synchronization aborted.
            </p>
            <button
              onClick={() => {
                setGameMode(null);
                setOnlineMatchId(null);
              }}
              className="w-full py-2 bg-[#161a12] border border-[#2d3422] hover:border-amber-400 text-[#dae3ce] rounded font-bold text-xs uppercase cursor-pointer transition-colors"
            >
              DISCONNECT & RETURN TO HQ
            </button>
          </div>
        </div>
      );
    }

    // Matchmaking screen when status === 'waiting'
    if (matchData?.status === 'waiting') {
      const isRoomHost = matchData?.hostId === user?.uid;
      const isOpponentConnected = !!matchData?.guestId;

      return (
        <div className="min-h-screen bg-[#0e100c] text-[#dae3ce] font-mono p-6 flex flex-col items-center justify-center relative overflow-y-auto selection:bg-[#fbbf24] selection:text-black">
          {/* Scanlines overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,14,0)_97%,rgba(18,24,14,0.1)_97%)] bg-[length:100%_4px] pointer-events-none z-50"></div>
          
          <div className="w-full max-w-lg bg-[#141810]/95 border border-[#2d3422]/60 p-6 rounded-xl flex flex-col gap-6 relative overflow-hidden shadow-2xl">
            {/* Corner aesthetic highlights */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500"></div>

            <div className="text-center space-y-1 pb-3 border-b border-[#2d3422]/30">
              <span className="text-[9px] text-[#fbbf24] font-bold tracking-widest uppercase">TACTICAL COMM MATCHMAKING TERMINAL</span>
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Globe className="w-5 h-5 text-amber-500 animate-[spin_10s_linear_infinite]" /> SECNET HANDSHAKE
              </h2>
            </div>

            {/* Radar / Sonar visualization */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 border border-amber-500/10 rounded-full animate-ping [animation-duration:3s]"></div>
              <div className="absolute inset-3 border border-amber-500/25 rounded-full animate-ping [animation-duration:2.2s]"></div>
              <div className="absolute inset-6 border border-amber-500/35 rounded-full animate-ping [animation-duration:1.5s]"></div>
              <div className="absolute inset-1 border border-dashed border-amber-500/30 rounded-full animate-[spin_12s_linear_infinite]"></div>
              <Radio className="w-8 h-8 text-amber-400 relative z-10 animate-pulse" />
            </div>

            {/* Room Code Display */}
            <div className="bg-black/50 border border-[#2d3422]/50 p-4 rounded flex flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">TRANSMISSION FREQUENCY CODE</span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold tracking-[0.25em] text-white font-mono select-all pl-2">{onlineMatchId}</span>
                <button
                  onClick={() => handleCopyCode(onlineMatchId)}
                  className="p-1.5 rounded border border-[#2d3422]/60 bg-[#161a12] text-[#8b9180] hover:text-[#fbbf24] hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase active:scale-95"
                  title="Copy room code to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400 text-[8px]">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> <span className="text-[8px]">COPY</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Commander Profiles & Connections indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {/* Host Node */}
              <div className="bg-black/30 border border-[#2d3422]/40 rounded p-3 flex flex-col gap-1.5 relative">
                <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-medium">BLUE LEADER (HOST)</span>
                <span className="text-xs font-black text-white leading-normal uppercase truncate">
                  {hostProfile?.displayName || 'Commander Host'}
                </span>
                <span className="text-[8px] font-bold py-0.5 px-1.5 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit uppercase flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></span> ONLINE
                </span>
              </div>

              {/* Guest Node */}
              <div className="bg-black/30 border border-[#2d3422]/40 rounded p-3 flex flex-col gap-1.5 relative">
                <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-medium">RED LEADER (GUEST)</span>
                {isOpponentConnected ? (
                  <>
                    <span className="text-xs font-black text-white leading-normal uppercase truncate">
                      {guestProfile?.displayName || 'Commander Guest'}
                    </span>
                    <span className="text-[8px] font-bold py-0.5 px-1.5 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit uppercase flex items-center gap-1">
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></span> READY TO SYNC
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold text-zinc-500 leading-normal uppercase animate-pulse flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> SCANNING SENSORS...
                    </span>
                    <span className="text-[8.5px] font-mono text-amber-400 bg-amber-400/5 border border-amber-500/10 px-1 hover:border-amber-400/30 rounded-full w-fit animate-pulse font-bold">
                      AWAITING CONNECTION
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Launch Actions and controls */}
            <div className="space-y-3 pt-2">
              {isRoomHost ? (
                <>
                  {isOpponentConnected ? (
                    <button
                      onClick={handleLaunchBattlefield}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-black text-black" /> SYNCHRONIZE GRIDS & LAUNCH OPERATION
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-500 font-extrabold text-xs uppercase tracking-wider rounded cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> AWAITING COMM-LINK INSTANTIATION...
                    </button>
                  )}
                </>
              ) : (
                <div className="bg-amber-400/5 border border-amber-500/25 p-3 rounded text-center space-y-1">
                  <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 uppercase">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> ESTABLISHED INGRESS LINK
                  </div>
                  <p className="text-[8.5px] text-zinc-400 uppercase leading-normal">
                    Frequencies synchronized. Awaiting Host Commander to authorize tactical grid deployment blueprints and start matches.
                  </p>
                </div>
              )}

              {/* Status checklist feed */}
              <div className="bg-black/70 border border-[#2d3422]/50 p-3 rounded text-[8.5px] text-zinc-500 text-left space-y-1 leading-relaxed uppercase">
                <div className="flex items-center justify-between">
                  <span>[TRANS] BEACON SPECTRUM INJECTION</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>[SYS_FREQ] COMMS RESOLVER HANDSHAKE</span>
                  <span className="text-emerald-400 font-bold">AES-256 SECURED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>[LOBBY] RED_CMD STATUS</span>
                  <span className={isOpponentConnected ? "text-emerald-400 font-bold" : "text-amber-400 font-bold tracking-widest animate-pulse"}>
                    {isOpponentConnected ? "SYNCHRONIZED" : "SCANNING SPECTRUM..."}
                  </span>
                </div>
              </div>

              <button
                onClick={handleAbortMatch}
                className="w-full py-2 border border-[#2d3422] hover:border-rose-500 text-zinc-400 hover:text-rose-400 font-bold text-xs uppercase rounded transition-colors bg-transparent cursor-pointer flex items-center justify-center gap-1.5 font-mono"
                title="Disconnect this matchmaking channel"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> ABORT TRANSMISSION & DISCONNECT
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
       <div className="min-h-screen bg-[#0e100c] select-none text-[#dae3ce]">
         <Game 
           gameMode="online" 
           onBack={() => { handleAbortMatch(); }} 
           onlineMatch={{ id: onlineMatchId, ...matchData }} 
           userId={user?.uid} 
         />
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e100c] text-[#dae3ce] font-sans p-6 flex flex-col items-center justify-start relative overflow-y-auto selection:bg-[#fbbf24] selection:text-black">
      {/* Visual CRT Glass Scanlines overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,14,0)_97%,rgba(18,24,14,0.1)_97%)] bg-[length:100%_4px] pointer-events-none z-50"></div>
      
      {/* Ambient background tactical radar layout */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-[#2d3422]/15 rounded-full pointer-events-none z-0">
        <div className="absolute inset-20 border border-[#2d3422]/10 rounded-full"></div>
        <div className="absolute inset-40 border border-[#2d3422]/5 rounded-full"></div>
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#2d3422]/10"></div>
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[#2d3422]/10"></div>
      </div>

      <div className="w-full max-w-2xl mx-auto z-10 flex flex-col gap-6 relative pt-4 pb-12">
         {/* Terminal Header */}
         <div className="text-center space-y-3 pb-2 border-b border-[#2d3422]/30 relative">
           <button 
             onClick={toggleSound} 
             className="absolute right-0 top-0 p-2 rounded-full border border-[#2d3422] bg-[#141810] text-[#8b9180] hover:text-[#fbbf24] hover:border-amber-400 transition-colors"
             title={soundEnabled ? "Disable Audio" : "Enable Audio"}
           >
             {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
           </button>
           <div className="w-16 h-16 bg-[#161a12] border border-[#2d3422] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(45,52,34,0.4)] mx-auto relative group">
              <Target className="w-8 h-8 text-amber-500 absolute scale-105 opacity-40 blur-sm animate-pulse" />
              <Target className="w-8 h-8 text-amber-400 relative z-10 transition-transform group-hover:rotate-45 duration-700" />
           </div>
           <h1 className="text-4xl font-extrabold tracking-widest text-[#dae3ce] font-mono uppercase">
             TACTICAL <span className="text-[#fbbf24] font-black filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">COMMAND</span>
           </h1>
           <div className="flex items-center justify-center gap-4 text-[9.5px] font-mono text-[#8b9180] tracking-wider uppercase">
             <span>SYS_VER: 2.1.0</span>
             <span className="w-1 h-1 rounded-full bg-[#2d3422]"></span>
             <span>LINK_SECURE: AES-256</span>
             <span className="w-1 h-1 rounded-full bg-[#2d3422]"></span>
             <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> ONLINE</span>
           </div>
         </div>

         {/* Modes Selection */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setGameMode('local_ai')}
              className="p-5 bg-[#141810]/80 hover:bg-[#1a2014]/90 border border-[#2d3422]/60 hover:border-amber-400/50 rounded-lg text-left transition-all duration-300 group shadow-md flex flex-col gap-2 cursor-pointer relative overflow-hidden"
            >
               <Monitor className="w-7 h-7 text-[#fbbf24] group-hover:scale-110 transition-transform duration-300" />
               <div>
                  <h3 className="font-extrabold text-[#dae3ce] text-sm font-mono tracking-wider uppercase">OFFLINE SIMULATOR</h3>
                  <p className="text-[10px] text-[#8b9180] mt-1 leading-normal uppercase">Deploy a 4-man customized tactical squad and play against the smart combat AI.</p>
               </div>
               <span className="absolute bottom-2 right-3 text-[7.5px] font-mono text-amber-500/50 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">SYS_ENG_CONFIRM »</span>
            </button>
            <button 
              onClick={() => setGameMode('local_p2p')}
              className="p-5 bg-[#141810]/80 hover:bg-[#1a2014]/90 border border-[#2d3422]/60 hover:border-emerald-500/50 rounded-lg text-left transition-all duration-300 group shadow-md flex flex-col gap-2 cursor-pointer relative overflow-hidden"
            >
               <Users className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
               <div>
                  <h3 className="font-extrabold text-[#dae3ce] text-sm font-mono tracking-wider uppercase">SQUAD PASS & PLAY</h3>
                  <p className="text-[10px] text-[#8b9180] mt-1 leading-normal uppercase">Play hotseat 2-player mode locally. Formulate tactics, then hand off command.</p>
               </div>
               <span className="absolute bottom-2 right-3 text-[7.5px] font-mono text-emerald-400/50 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">SYS_ENG_CONFIRM »</span>
            </button>
            <button 
              onClick={() => setGameMode('tutorial')}
              className="p-5 bg-[#141810]/85 hover:bg-[#202716]/95 border border-[#2d3422]/60 hover:border-[#fbbf24]/60 rounded-lg text-left transition-all duration-300 group shadow-[0_0_15px_rgba(251,191,36,0.05)] flex flex-col gap-2 cursor-pointer relative overflow-hidden"
            >
               <BookOpen className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform duration-300 animate-pulse" />
               <div>
                  <h3 className="font-extrabold text-[#dae3ce] text-sm font-mono tracking-wider uppercase flex items-center gap-1.5">BATTLE ACADEMY <span className="bg-amber-400 text-black text-[7px] px-1 font-black py-0.5 rounded leading-none">NEW</span></h3>
                  <p className="text-[10px] text-[#8b9180] mt-1 leading-normal uppercase">Interactive tactical manual. Learn movement, analyze core abilities, try other characters.</p>
               </div>
               <span className="absolute bottom-2 right-3 text-[7.5px] font-mono text-amber-500/55 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">SYS_ENG_CONFIRM »</span>
            </button>
         </div>

         {/* Online Section */}
         <div className="bg-[#141810]/80 border border-[#2d3422]/60 rounded-lg p-5 shadow-md">
            <div className="flex items-center gap-2.5 mb-4 border-b border-[#2d3422]/30 pb-2">
              <Globe className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-[#dae3ce] text-sm font-mono uppercase tracking-wider">MULTIPLAYER NET-COMM CENTERS</h3>
            </div>

            {loading || profileLoading ? (
               <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : !user ? (
               <div className="text-center py-2 font-mono">
                 <p className="text-[10px] text-[#8b9180] mb-4 uppercase">Establish user credentials to synchronize cloud statistics and access cross-device matchmaking graphs.</p>
                 <button onClick={handleLogin} className="flex items-center justify-center gap-2 w-full py-3 bg-[#fbbf24] text-[#0e100c] hover:bg-amber-300 font-extrabold rounded text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md">
                   <LogIn className="w-4 h-4" /> LINK GOOGLE TACTICAL PROFILE
                 </button>
               </div>
            ) : (
               <div className="space-y-4 font-mono">
                  {/* Profile Section */}
                  <div className="flex items-center justify-between border-b border-[#2d3422]/30 pb-3">
                     <div className="flex items-center gap-3">
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="avatar" className="w-10 h-10 rounded-sm border border-[#2d3422] p-0.5 bg-[#0e100c]" />
                        <div className="text-left leading-none">
                           {(!profile || editingProfile) ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  autoFocus
                                  value={displayNameInput} 
                                  onChange={e => setDisplayNameInput(e.target.value)} 
                                  className="bg-black border border-[#2d3422] rounded px-2 py-1 text-xs text-white w-32 outline-none focus:border-amber-400 font-mono"
                                  placeholder="CO Name"
                                />
                                <button onClick={saveProfile} className="text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded">SAVE</button>
                              </div>
                           ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#fbbf24] text-xs uppercase">{profile.displayName}</span>
                                <button onClick={() => setEditingProfile(true)} className="text-[7.5px] text-amber-400 hover:text-amber-300 uppercase tracking-widest font-extrabold px-1.5 py-0.5 bg-amber-400/10 rounded border border-amber-400/20">RE-ID</button>
                              </div>
                           )}
                           <div className="text-[8.5px] text-[#8b9180] mt-1 uppercase">GRID_KEY: {user.email?.split('@')[0]}</div>
                        </div>
                     </div>
                     <button onClick={() => signOut(auth)} className="p-2 hover:bg-[#202716] rounded border border-transparent hover:border-[#2d3422] text-[#8b9180] hover:text-[#dae3ce] transition-colors" title="De-Authorize Profile">
                        <LogOut className="w-4 h-4" />
                     </button>
                  </div>

                  {/* Room Actions */}
                  {user && !editingProfile && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <button onClick={createRoom} className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/35 text-[#fbbf24] font-bold border border-amber-500/50 rounded text-xs uppercase tracking-wider transition-all cursor-pointer">
                          ESTABLISH ROOM
                        </button>
                        <form onSubmit={joinRoom} className="flex gap-2">
                           <input 
                             value={joinCode} 
                             onChange={e => setJoinCode(e.target.value.toUpperCase())}
                             placeholder="CODE_KEY"
                             maxLength={6}
                             className="w-full bg-black/60 border border-[#2d3422] focus:border-amber-400 rounded px-3 text-xs text-[#fbbf24] font-mono uppercase tracking-widest outline-none text-center"
                           />
                           <button type="submit" disabled={joinCode.length < 5} className="px-5 bg-[#202716] hover:bg-[#2d3a20] border border-[#2d3422] text-[#dae3ce] text-xs font-bold rounded uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                               CONNECT
                           </button>
                        </form>
                     </div>
                  )}
               </div>
            )}
         </div>

         {/* Interactive Tactical Dossier Database */}
         <div className="bg-[#141810]/80 border border-[#2d3422]/60 rounded-lg p-5 shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#2d3422]/30 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono text-xs font-extrabold text-[#dae3ce] tracking-widest uppercase">TACTICAL DATABASE // INTEL DOSSIER</h3>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => setDbTab('tutorial')}
                  className={`px-3 py-1 text-[8.5px] font-mono uppercase rounded transition-all font-black border ${
                    dbTab === 'tutorial' 
                      ? 'bg-amber-500/10 text-[#fbbf24] border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.1)]' 
                      : 'text-zinc-500 border-transparent hover:text-zinc-300 cursor-pointer'
                  }`}
                >
                  Field Manual
                </button>
                <button 
                  onClick={() => setDbTab('classes')}
                  className={`px-3 py-1 text-[8.5px] font-mono uppercase rounded transition-all font-black border ${
                    dbTab === 'classes' 
                      ? 'bg-amber-500/10 text-[#fbbf24] border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.1)]' 
                      : 'text-zinc-500 border-transparent hover:text-zinc-300 cursor-pointer'
                  }`}
                >
                  Squad Bios
                </button>
              </div>
            </div>

            {/* TAB CONTENT: TUTORIAL */}
            {dbTab === 'tutorial' && (
              <div className="space-y-3.5 text-left font-mono text-[9px] text-[#8b9180] leading-relaxed">
                <div className="border border-[#2d3422]/40 bg-black/25 p-3 rounded space-y-1.5">
                  <h4 className="font-bold text-[#dae3ce] uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#fbbf24]" /> 01. OBJECTIVE CONFIGURATION
                  </h4>
                  <p className="uppercase">
                    Your direct mandate is simple: utilize superior cover positioning, smart lines of sight flanking vectors, and specific class actions to completely neutralize all 4 enemy squad units on the grid battlefield.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-[#2d3422]/30 bg-black/10 p-2.5 rounded space-y-1">
                    <h5 className="font-black text-[#dae3ce] uppercase text-[8.5px]">SQUAD DEPLOYMENT</h5>
                    <p className="uppercase text-[8px]">
                      Before engagement begins, you must recruit, select and deploy 4 team members on highlighted quadrant cells in rows 8 to 14. Once locked, tap "Launch" to synchronize terminal frequencies.
                    </p>
                  </div>
                  <div className="border border-[#2d3422]/30 bg-black/10 p-2.5 rounded space-y-1">
                    <h5 className="font-black text-[#dae3ce] uppercase text-[8.5px]">ACTION SYSTEM (AP)</h5>
                    <p className="uppercase text-[8px]">
                      Every active squad unit receives exactly 2 Action Points (AP) per turn. Standard movement costs 1 AP (mobility metric scales cell ranges). Initiating a coordinate weapon attack costs 1 AP.
                    </p>
                  </div>
                </div>

                <div className="border border-[#2d3422]/40 bg-black/25 p-3 rounded space-y-1.5">
                  <h4 className="font-bold text-[#dae3ce] uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" /> 02. COVER & LINE-OF-SIGHT (LOS)
                  </h4>
                  <p className="uppercase">
                    Solid walls and cargo crates absorb primary dynamic ordnance. If a direct tracing vector from shooting coordinate to hostile coordinate hits an obstacle, firing is blocked! Snipers bypass direct range rules but are still blockable by walls. Technicians can build crates anywhere on adjacent floor grids.
                  </p>
                </div>

                <div className="text-center text-[#fbbf24] font-black uppercase text-[8.5px] border border-dashed border-[#2d3422] p-1.5 rounded animate-pulse">
                  ⚡ PRO TIP: ALWAYS INJECT WEAK SQUADMATES WITH SPECIAL MEDIC NANITES TO RESTORE HEALTH DURING AI FLANK ACTIONS!
                </div>

                <div className="border border-amber-500/15 p-2 bg-amber-400/5 rounded text-center">
                  <button 
                    onClick={() => setGameMode('tutorial')}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[9.5px] tracking-wider rounded uppercase cursor-pointer"
                  >
                    🚀 LAUNCH INTERACTIVE BATTLE ACADEMY SIMULATOR
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SQUAD DATABASE */}
            {dbTab === 'classes' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-left font-mono">
                {/* Class selector list */}
                <div className="md:col-span-5 flex flex-col gap-1 max-h-[220px] overflow-y-auto border border-[#2d3422]/30 p-1.5 rounded bg-black/25">
                  {CLASSES.map((c) => {
                    const isActive = activeClassDesc === c.className;
                    return (
                      <button
                        key={c.className}
                        onClick={() => setActiveClassDesc(c.className)}
                        className={`w-full py-1.5 px-2.5 text-left rounded text-[9.5px] font-bold tracking-tight uppercase border transition-all flex items-center gap-2 cursor-pointer ${
                          isActive 
                            ? 'bg-amber-500/15 border-amber-500/70 text-[#fbbf24]' 
                            : 'bg-transparent border-transparent text-[#8b9180] hover:bg-black/35 hover:text-[#dae3ce]'
                        }`}
                      >
                        <UnitHelmetAvatar classNameVal={c.className} className="w-5 h-5 shrink-0" />
                        <span>{c.className}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Class detailed metrics */}
                {(() => {
                  const c = CLASSES.find(cl => cl.className === activeClassDesc) || CLASSES[0];
                  
                  // Compute stats percentage bars
                  const hpPerc = Math.min(100, Math.round((c.stats.maxHP / 150) * 100));
                  const dmgPerc = Math.min(100, Math.round((c.stats.damage / 60) * 100));
                  const rangePerc = Math.min(100, Math.round((c.stats.range / 10) * 100));
                  const speedPerc = Math.min(100, Math.round((c.stats.mobility / 7) * 100));

                  return (
                    <div className="md:col-span-7 border border-[#2d3422]/40 bg-black/40 p-3 rounded flex flex-col justify-between min-h-[220px] relative">
                      <div>
                        {/* Helmet + name block */}
                        <div className="flex gap-2.5 items-center mb-2 pb-1.5 border-b border-[#2d3422]/20">
                          <UnitHelmetAvatar classNameVal={c.className} className="w-11 h-11 shrink-0 border-[#2d3422]" />
                          <div className="leading-tight">
                            <h4 className="text-xs font-black text-white uppercase">{c.className}</h4>
                            <span className="text-[8.5px] text-[#fbbf24] font-bold uppercase tracking-widest">{c.archetype} TYPE</span>
                          </div>
                          <span className="text-[7.5px] font-bold text-[#8b9180] bg-black/50 border border-[#2d3422]/40 rounded px-1.5 py-0.5 ml-auto uppercase shrink-0">
                            TRAIT: {c.personality}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[8.5px] text-[#8b9180] leading-normal uppercase mb-2">
                          {c.description}
                        </p>

                        {/* Active Ability Info */}
                        {c.ability && (
                          <div className="bg-amber-400/5 border border-[#2d3422]/30 p-1.5 rounded mb-2 font-mono text-[7.5px] uppercase">
                            <div className="flex justify-between font-black text-[#fbbf24] mb-0.5">
                              <span>SPEC_ABIL: {c.ability.name}</span>
                              <span>COST: {c.ability.apCost} AP</span>
                            </div>
                            <p className="text-[#8b9180] lowercase italic leading-tight first-letter:uppercase">
                              {c.ability.description}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Stat Bars Grid */}
                      <div className="space-y-1 pt-1.5 border-t border-[#2d3422]/20 text-[7.5px] font-bold text-[#8b9180]">
                        <div>
                          <div className="flex justify-between mb-0.5">
                            <span>HEALTH MAX (HP)</span>
                            <span className="text-white">{c.stats.maxHP} pts</span>
                          </div>
                          <div className="w-full bg-black/40 h-1.5 rounded-sm border border-[#2d3324] overflow-hidden p-[0.5px]">
                            <div className="bg-emerald-400 h-full rounded-sm" style={{ width: `${hpPerc}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5">
                            <span>ATTACK EXERT (DMG)</span>
                            <span className="text-white">{c.stats.damage} pts</span>
                          </div>
                          <div className="w-full bg-black/40 h-1.5 rounded-sm border border-[#2d3324] overflow-hidden p-[0.5px]">
                            <div className="bg-orange-500 h-full rounded-sm" style={{ width: `${dmgPerc}%` }} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex justify-between mb-0.5">
                              <span>WEAPON RANGE</span>
                              <span className="text-white">{c.stats.range}</span>
                            </div>
                            <div className="w-full bg-black/40 h-1 rounded-sm border border-[#2d3324] overflow-hidden p-[0.5px]">
                              <div className="bg-sky-400 h-full rounded-sm" style={{ width: `${rangePerc}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-0.5">
                              <span>MOBILITY RANGE</span>
                              <span className="text-white">{c.stats.mobility}</span>
                            </div>
                            <div className="w-full bg-[#0e100c] h-1 rounded-sm border border-[#2d3324] overflow-hidden p-[0.5px]">
                              <div className="bg-yellow-400 h-full rounded-sm" style={{ width: `${speedPerc}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
         </div>

         {/* Commander Leaderboard */}
         <CommanderLeaderboard />
      </div>
    </div>
  );
}
