import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit, arrayUnion } from 'firebase/firestore';
import { Target, Monitor, Users, Globe, LogIn, LogOut, Loader2, BookOpen, Cpu, Shield, Zap, Flame, Rocket, Activity, CheckSquare, Volume2, VolumeX, Copy, Check, Radio, ArrowLeft, Play, Terminal, AlertTriangle, RefreshCw, Wind } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { CLASSES } from './data';
import UnitHelmetAvatar from './components/UnitHelmetAvatar';
import { PlayerProgression, getDefaultProgression, getDailyChallenges, calculateEloChange, getMatchRewards, BOARD_THEMES, SEASON_REWARDS, DailyChallenge } from './progression';
import { useAudio } from './contexts/AudioContext';
import { getCharacterLevelInfo, getBoostedStats } from './logic';
import { CHEMISTRIES, ChemistryDuo } from './chemistries';
import { AbilityTooltip } from './components/AbilityTooltip';
import { BASE_REGIONS } from './campaignData';

const Game = lazy(() => import('./components/Game'));
const TutorialMode = lazy(() => import('./components/TutorialMode'));
const CampaignMode = lazy(() => import('./components/CampaignMode'));
const CommanderLeaderboard = lazy(() => import('./components/CommanderLeaderboard'));
const MatchHistory = lazy(() => import('./components/MatchHistory'));
const DailyChallenges = lazy(() => import('./components/DailyChallenges'));
const CosmeticShop = lazy(() => import('./components/CosmeticShop'));
const SeasonPass = lazy(() => import('./components/SeasonPass'));
const PlayerStats = lazy(() => import('./components/PlayerStats'));
const FriendList = lazy(() => import('./components/FriendList'));

export default function App() {
  const [gameMode, setGameMode] = useState<'local_ai' | 'local_p2p' | 'online' | 'online_coop' | 'tutorial' | 'campaign' | null>(null);
  const [campaignMissionId, setCampaignMissionId] = useState<string | null>(null);
  const [user, loading] = useAuthState(auth);
  const [dbProfile, profileLoading] = useDocumentData(user ? doc(db, 'users', user.uid) : null);
  const [localProfile, setLocalProfile] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('local_campaign_profile');
      return stored ? JSON.parse(stored) : { characterProgress: {} };
    } catch(e) {
      return { characterProgress: {} };
    }
  });
  
  const profile = user ? dbProfile : localProfile;
  const { soundEnabled, toggleSound, playSound } = useAudio();
  
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [dbTab, setDbTab] = useState<'tutorial' | 'classes' | 'chemistries'>('tutorial');
  const [activeClassDesc, setActiveClassDesc] = useState<string>('Scout');

  const [joinCode, setJoinCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.toUpperCase() || '';
  });
  const [onlineMatchId, setOnlineMatchId] = useState<string | null>(null);
  const [matchData, matchLoading] = useDocumentData(
    onlineMatchId ? doc(db, 'matches', onlineMatchId) : null
  );
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.toUpperCase() || null;
  });

  const [hostProfile, setHostProfile] = useState<any>(null);
  const [guestProfile, setGuestProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [smogMode, setSmogMode] = useState(false);
  const [squadSize, setSquadSize] = useState<number>(4);
  const [isLaunching, setIsLaunching] = useState(false);
  const [menuTab, setMenuTab] = useState<'play' | 'progress' | 'shop'>('play');

  const [progression, setProgression] = useState<PlayerProgression>(() => {
    try {
      const stored = localStorage.getItem('tc_progression');
      return stored ? { ...getDefaultProgression(), ...JSON.parse(stored) } : getDefaultProgression();
    } catch { return getDefaultProgression(); }
  });

  useEffect(() => {
    localStorage.setItem('tc_progression', JSON.stringify(progression));
  }, [progression]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (progression.dailyChallengeDate !== today) {
      const templates = getDailyChallenges(today);
      const newChallenges: DailyChallenge[] = templates.map(t => ({ ...t, progress: 0, completed: false }));
      setProgression(p => ({ ...p, dailyChallenges: newChallenges, dailyChallengeDate: today }));
    }
  }, [progression.dailyChallengeDate]);

  const handlePurchaseTheme = (themeId: string) => {
    const theme = BOARD_THEMES.find(t => t.id === themeId);
    if (!theme || progression.credits < theme.price || progression.unlockedThemes.includes(themeId)) return;
    setProgression(p => ({
      ...p,
      credits: p.credits - theme.price,
      unlockedThemes: [...p.unlockedThemes, themeId],
    }));
  };

  const handleEquipTheme = (themeId: string) => {
    if (!progression.unlockedThemes.includes(themeId)) return;
    setProgression(p => ({ ...p, activeTheme: themeId }));
  };

  const handleMatchComplete = (won: boolean, survivalRate: number, turn: number) => {
    setProgression(p => {
      const rewards = getMatchRewards(won, survivalRate, turn);
      const eloChange = calculateEloChange(p.elo, 1000, won);
      const newWinStreak = won ? p.winStreak + 1 : 0;

      let newSeasonXP = p.seasonXP + rewards.seasonXP;
      let newSeasonLevel = p.seasonLevel;
      const newThemes = [...p.unlockedThemes];

      for (const sr of SEASON_REWARDS) {
        if (sr.level > newSeasonLevel && newSeasonXP >= sr.xpRequired) {
          newSeasonLevel = sr.level;
          if (sr.reward.type === 'credits') {
            rewards.credits += sr.reward.value as number;
          }
          if (sr.reward.type === 'theme') {
            const themeId = sr.reward.value as string;
            if (!newThemes.includes(themeId)) newThemes.push(themeId);
          }
        }
      }

      return {
        ...p,
        elo: Math.max(0, p.elo + eloChange),
        credits: p.credits + rewards.credits,
        totalMatches: p.totalMatches + 1,
        wins: won ? p.wins + 1 : p.wins,
        losses: won ? p.losses : p.losses + 1,
        winStreak: newWinStreak,
        bestWinStreak: Math.max(p.bestWinStreak, newWinStreak),
        seasonXP: newSeasonXP,
        seasonLevel: newSeasonLevel,
        unlockedThemes: newThemes,
      };
    });
  };

  const updateChallengeProgress = (type: string, amount: number) => {
    setProgression(p => ({
      ...p,
      dailyChallenges: p.dailyChallenges.map(c => {
        if (c.completed || c.type !== type) return c;
        const newProgress = c.progress + amount;
        const completed = newProgress >= c.target;
        return { ...c, progress: newProgress, completed };
      }),
      credits: p.credits + p.dailyChallenges
        .filter(c => !c.completed && c.type === type && c.progress + amount >= c.target)
        .reduce((sum, c) => sum + c.reward, 0),
    }));
  };

  useEffect(() => {
     if (profile && !editingProfile) {
        setDisplayNameInput(profile.displayName);
     }
  }, [profile, editingProfile]);

  useEffect(() => {
    if (user && pendingRoomCode && !onlineMatchId) {
      const autoJoin = async () => {
        try {
          const matchRef = doc(db, 'matches', pendingRoomCode);
          const matchSnap = await getDoc(matchRef);
          if (matchSnap.exists()) {
            const data = matchSnap.data();
            if (data.hostId !== user.uid) {
              if (!data.guestId) {
                await updateDoc(matchRef, { guestId: user.uid });
              } else if (data.guestId !== user.uid) {
                await updateDoc(matchRef, { spectators: arrayUnion(user.uid) });
              }
            }
            setOnlineMatchId(pendingRoomCode);
            setGameMode(data.isCoop ? 'online_coop' : 'online');
          }
        } catch (err) {
          console.error("Auto-join failed:", err);
        }
        setPendingRoomCode(null);
        window.history.replaceState({}, '', window.location.pathname);
      };
      autoJoin();
    }
  }, [user, pendingRoomCode, onlineMatchId]);

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

  const handleCopyCode = async (code: string, asLink: boolean = false) => {
    const textToCopy = asLink ? `${window.location.origin}${window.location.pathname}?room=${code}` : code;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        const dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.value = textToCopy;
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

  useEffect(() => {
    setIsLaunching(false);
  }, [onlineMatchId]);

  const handleAbortMatch = async () => {
    if (!onlineMatchId) {
      setGameMode(null);
      setCampaignMissionId(null);
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

  const handleUpdateLobbySettings = async (size: number, smog: boolean) => {
    if (!onlineMatchId) return;
    try {
      const matchRef = doc(db, 'matches', onlineMatchId);
      await updateDoc(matchRef, {
        squadSize: size,
        smogEnabled: smog
      });
      // Update local states so they are in sync if the user returns to main screen
      setSquadSize(size);
      setSmogMode(smog);
    } catch (err: any) {
      console.error("Failed to update lobby settings:", err);
    }
  };

  const handleLaunchBattlefield = async () => {
    if (!onlineMatchId) return;
    setIsLaunching(true);
    try {
      const matchRef = doc(db, 'matches', onlineMatchId);
      await updateDoc(matchRef, {
        status: 'deploying'
      });
      // Do not set isLaunching(false) here on success, because the redirect will happen
      // when matchData.status changes to 'deploying'. It acts as a permanent loading state.
    } catch (err: any) {
      console.error(err);
      alert("Failed to synchronize battlefield frequencies: " + err.message);
      setIsLaunching(false);
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
        try {
          await setDoc(userRef, {
            userId: user.uid,
            displayName: user.displayName || 'Commander',
            email: user.email
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
      }
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.startsWith('{') && error.message.endsWith('}')) {
        alert("Authentication frequency synchronization issue: " + error.message);
      } else {
        alert("Please ensure third-party cookies are not blocked, or open the app in a new tab to authenticate.");
      }
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
      try {
        handleFirestoreError(err, profile ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}`);
      } catch (richErr: any) {
        alert(richErr.message || 'Error saving profile');
      }
    }
  };

  const handleUnlockBoost = async (className: string, boostType: string) => {
    if (!profile) return;
    const progress = (profile as any).characterProgress || {};
    const classProg = progress[className] || { xp: 0, level: 1, boosts: [] };
    const xp = classProg.xp || 0;
    const levelInfo = getCharacterLevelInfo(xp);
    const boosts = classProg.boosts || [];
    
    if (boosts.includes(boostType)) return;
    if (boosts.length >= levelInfo.maxUpgrades) return;
    
    const updatedProgress = {
      ...progress,
      [className]: {
        ...classProg,
        boosts: [...boosts, boostType]
      }
    };
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          characterProgress: updatedProgress
        }, { merge: true });
      } catch (err) {
        console.error("Failed to unlock boost", err);
        try {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        } catch (richErr: any) {
          alert("Upgrade synchronization failed: " + richErr.message);
        }
      }
    } else {
       const newLocal = { ...localProfile, characterProgress: updatedProgress };
       setLocalProfile(newLocal);
       localStorage.setItem('local_campaign_profile', JSON.stringify(newLocal));
    }
  };

  const handleResetBoosts = async (className: string) => {
    if (!profile) return;
    const progress = (profile as any).characterProgress || {};
    const classProg = progress[className] || { xp: 0, level: 1, boosts: [] };
    
    const updatedProgress = {
      ...progress,
      [className]: {
        ...classProg,
        boosts: []
      }
    };
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          characterProgress: updatedProgress
        }, { merge: true });
      } catch (err) {
        console.error("Failed to reset boosts", err);
        try {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        } catch (richErr: any) {
          alert("Boost reset failed to synchronize: " + richErr.message);
        }
      }
    } else {
       const newLocal = { ...localProfile, characterProgress: updatedProgress };
       setLocalProfile(newLocal);
       localStorage.setItem('local_campaign_profile', JSON.stringify(newLocal));
    }
  };

  const createRoom = async (isPublic: boolean = false, isCoop: boolean = false) => {
    if (!user) return;
    try {
      let newMatchId = '';
      let attempts = 0;
      while (attempts < 5) {
        newMatchId = crypto.randomUUID().substring(0, 6).toUpperCase();
        const existing = await getDoc(doc(db, 'matches', newMatchId));
        if (!existing.exists()) break;
        attempts++;
      }
      if (!newMatchId) return;
      await setDoc(doc(db, 'matches', newMatchId), {
        hostId: user.uid,
        status: 'waiting',
        smogEnabled: smogMode,
        squadSize: squadSize,
        isPublic: isPublic,
        isCoop: isCoop
      });
      setOnlineMatchId(newMatchId);
      setGameMode(isCoop ? 'online_coop' : 'online');
    } catch(err: any) {
      alert(err.message || "Failed to create room.");
    }
  };

  const quickMatch = async () => {
    if (!user) return;
    try {
      // Look for open public match
      const matchesRef = collection(db, 'matches');
      const q = query(
        matchesRef, 
        where('status', '==', 'waiting'), 
        where('isPublic', '==', true),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      
      let foundMatch = null;
      for (const matchDoc of querySnapshot.docs) {
        const data = matchDoc.data();
        if (data.hostId !== user.uid) {
          foundMatch = { id: matchDoc.id, ...data };
          break;
        }
      }

      if (foundMatch) {
        const matchRef = doc(db, 'matches', foundMatch.id);
        await updateDoc(matchRef, {
           guestId: user.uid
        });
        setOnlineMatchId(foundMatch.id);
        setGameMode(foundMatch.isCoop ? 'online_coop' : 'online');
      } else {
        // Create new public match if none found
        await createRoom(true);
      }
    } catch(err: any) {
      alert("Failed to find or create quick match.");
      console.error(err);
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!user || !cleanCode) {
      if (!user) alert("Please sign in first.");
      return;
    }
    try {
      const matchRef = doc(db, 'matches', cleanCode);
      const matchSnap = await getDoc(matchRef);
      if (matchSnap.exists()) {
         const data = matchSnap.data();
         if (data.hostId === user.uid) {
            setOnlineMatchId(cleanCode);
            setGameMode(data.isCoop ? 'online_coop' : 'online');
            return;
         }
         if (!data.guestId) {
            await updateDoc(matchRef, { guestId: user.uid });
         } else if (data.guestId !== user.uid) {
            await updateDoc(matchRef, { spectators: arrayUnion(user.uid) });
         }
         setOnlineMatchId(cleanCode);
         setGameMode(data.isCoop ? 'online_coop' : 'online');
      } else {
        alert("Room not found! Check the code and try again.");
      }
    } catch(err: any) {
      console.error("Join room error:", err);
      alert("Failed to join room: " + (err?.code || err?.message || "Unknown error"));
    }
  };

  const LazyFallback = <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-300 font-mono"><Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" /><span>LOADING MODULE...</span></div>;

  // Render Game Component if we selected a mode
  if (gameMode === 'local_ai' || gameMode === 'local_p2p') {
    return <Suspense fallback={LazyFallback}><Game
      key={`game-${gameMode}-${campaignMissionId || 'freeplay'}`}
      campaignMissionId={campaignMissionId} 
      gameMode={gameMode} 
      onBack={() => { 
        if (campaignMissionId) {
          setGameMode('campaign');
          setCampaignMissionId(null);
        } else {
          setGameMode(null); 
          setCampaignMissionId(null);
        }
      }} 
      onNextMission={() => {
        if (campaignMissionId) {
           const currentIndex = BASE_REGIONS.findIndex(r => r.id === campaignMissionId);
           if (currentIndex >= 0 && currentIndex < BASE_REGIONS.length - 1) {
             setCampaignMissionId(BASE_REGIONS[currentIndex + 1].id);
           } else {
             // Go back to campaign if there are no more missions
             setGameMode('campaign');
             setCampaignMissionId(null);
           }
        }
      }}
      userProfile={profile}
      smogMode={smogMode}
      squadSize={squadSize}
      onMatchComplete={handleMatchComplete}
      onChallengeProgress={updateChallengeProgress}
      boardTheme={progression.activeTheme}
      playerElo={progression.elo}
    /></Suspense>;
  }

  if (gameMode === 'tutorial') {
    return (
      <Suspense fallback={LazyFallback}>
      <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 text-zinc-300 font-sans p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-y-auto selection:bg-[#fbbf24] selection:text-black">
        <TutorialMode onBack={() => setGameMode(null)} />
      </div>
      </Suspense>
    );
  }

  if (gameMode === 'campaign') {
    return (
      <Suspense fallback={LazyFallback}>
      <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 text-zinc-300 font-sans p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-y-auto selection:bg-[#fbbf24] selection:text-black">
        <CampaignMode onBack={() => { setGameMode(null); setCampaignMissionId(null); }} onStartMission={(missionId) => { setCampaignMissionId(missionId); setGameMode('local_ai'); }} />
      </div>
      </Suspense>
    );
  }

  if ((gameMode === 'online' || gameMode === 'online_coop') && onlineMatchId) {
    if (matchLoading) {
       return <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 flex items-center justify-center text-zinc-300 font-mono"><Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" /><span>SECURE TRANS-BANDING SYNCHRONOUS INITIATION...</span></div>;
    }

    // Handlers for aborted rooms
    if (matchData?.status === 'aborted') {
      return (
        <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 text-zinc-300 font-mono p-6 flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,14,0)_97%,rgba(18,24,14,0.1)_97%)] bg-[length:100%_4px] pointer-events-none z-50"></div>
          <div className="max-w-md w-full bg-zinc-900 bg-opacity-80/95 border border-zinc-800 border-opacity-50 p-6 rounded-xl flex flex-col gap-4 text-center relative overflow-hidden shadow-2xl">
            <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/40 rounded-full flex items-center justify-center text-purple-500 mx-auto animate-pulse">
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
              className="w-full py-2 bg-[#161a12] border border-zinc-800 border-opacity-50 hover:border-amber-400 text-zinc-300 rounded-lg font-bold text-xs uppercase cursor-pointer transition-colors"
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
        <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 text-zinc-300 font-mono p-6 flex flex-col items-center justify-center relative overflow-y-auto selection:bg-[#fbbf24] selection:text-black">
          {/* Scanlines overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,14,0)_97%,rgba(18,24,14,0.1)_97%)] bg-[length:100%_4px] pointer-events-none z-50"></div>
          
          <div className="w-full max-w-lg bg-zinc-900 bg-opacity-80/95 border border-zinc-800 border-opacity-50/60 p-6 rounded-xl flex flex-col gap-6 relative overflow-hidden shadow-2xl">
            {/* Corner aesthetic highlights */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-amber-500"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-amber-500"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500"></div>

            <div className="text-center space-y-1 pb-3 border-b border-zinc-800 border-opacity-50/30">
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
            <div className="bg-black/50 border border-zinc-800 border-opacity-50/50 p-4 rounded-lg flex flex-col items-center gap-2">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-2">TRANSMISSION FREQUENCY CODE <span className={`text-[8.5px] px-1 py-0.5 rounded-lg leading-none ${matchData?.isPublic ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[#2d3422] text-[#8b9180] border border-zinc-800 border-opacity-50'}`}>{matchData?.isPublic ? 'PUBLIC' : 'PRIVATE'}</span></div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold tracking-[0.25em] text-white font-mono select-all pl-2">{onlineMatchId}</span>
                <button
                  onClick={() => handleCopyCode(onlineMatchId!, false)}
                  className="p-1.5 rounded-lg border border-zinc-800 border-opacity-50/60 bg-[#161a12] text-[#8b9180] hover:text-[#fbbf24] hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase active:scale-95"
                  title="Copy room code"
                >
                  <Copy className="w-3.5 h-3.5" /> <span className="text-[8px]">CODE</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(onlineMatchId!, true)}
                className="w-full py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                title="Copy invite link"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">LINK COPIED — SEND TO FRIEND</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> COPY INVITE LINK
                  </>
                )}
              </button>
            </div>

            {/* Commander Profiles & Connections indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {/* Host Node */}
              <div className="bg-black/30 border border-zinc-800 border-opacity-50/40 rounded-lg p-3 flex flex-col gap-1.5 relative">
                <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-medium">BLUE LEADER (HOST)</span>
                <span className="text-xs font-black text-white leading-normal uppercase truncate">
                  {hostProfile?.displayName || 'Commander Host'}
                </span>
                <span className="text-[8px] font-bold py-0.5 px-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit uppercase flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></span> ONLINE
                </span>
              </div>

              {/* Guest Node */}
              <div className="bg-black/30 border border-zinc-800 border-opacity-50/40 rounded-lg p-3 flex flex-col gap-1.5 relative">
                <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-medium">PURPLE LEADER (GUEST)</span>
                {isOpponentConnected ? (
                  <>
                    <span className="text-xs font-black text-white leading-normal uppercase truncate">
                      {guestProfile?.displayName || 'Commander Guest'}
                    </span>
                    <span className="text-[8px] font-bold py-0.5 px-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit uppercase flex items-center gap-1">
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
              
              {/* Spectators Node */}
              {matchData?.spectators && matchData.spectators.length > 0 && (
                <div className="bg-black/30 border border-fuchsia-900/40 rounded-lg p-3 flex flex-col gap-1.5 relative sm:col-span-2">
                  <span className="text-[8px] text-fuchsia-400 uppercase tracking-wide font-medium flex items-center justify-between">
                     <span>OBSERVATORY SENSORS (SPECTATORS)</span>
                     <span className="bg-fuchsia-500/20 px-1.5 py-0.5 rounded-lg text-fuchsia-300 font-bold">{matchData.spectators.length} ONLINE</span>
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                     {matchData.spectators.map((specId: string, idx: number) => (
                        <span key={specId} className="text-[10px] font-mono text-zinc-400 bg-black/50 border border-fuchsia-900/50 px-2 py-0.5 rounded-lg uppercase flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full animate-pulse" /> OBSERVER {idx + 1}
                        </span>
                     ))}
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Mutator / Setup Console inside Lobby */}
            <div className="bg-zinc-900 bg-opacity-80/40 border border-zinc-800 border-opacity-50/60 rounded-2xl p-4 text-left space-y-3 shadow-inner">
              <span className="text-[8.5px] text-amber-500 font-bold uppercase tracking-wider block border-b border-zinc-800 border-opacity-50/30 pb-1.5 font-mono">
                [LOBBY] STRATEGIC MUTATORS CONSOLE
              </span>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Smog Protocol Toggle */}
                <div className="flex items-center justify-between gap-4 bg-black/20 p-2.5 rounded-lg border border-zinc-800 border-opacity-50/40">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-zinc-300 font-mono tracking-wider">SMOG PROTOCOL (FOG OF WAR)</span>
                    <span className="text-[8px] text-[#8b9180] leading-normal uppercase">
                      Hides targets out of friendly visual ranges
                    </span>
                  </div>
                  {isRoomHost ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateLobbySettings(matchData?.squadSize ?? squadSize, !matchData?.smogEnabled);
                        playSound('click');
                      }}
                      className={`px-3 py-1 border font-mono font-black text-[8px] tracking-wider uppercase transition-all duration-150 rounded-lg cursor-pointer ${
                        matchData?.smogEnabled 
                          ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_8px_rgba(251,191,36,0.2)]' 
                          : 'bg-black/50 border-zinc-800 border-opacity-50 text-[#8b9180] hover:text-zinc-300 hover:border-[#8b9180]'
                      }`}
                    >
                      {matchData?.smogEnabled ? 'ACTIVE' : 'DEACTIVATE'}
                    </button>
                  ) : (
                    <span className={`px-2.5 py-1 border font-mono font-bold text-[8px] tracking-wider gap-1.5 uppercase rounded-lg bg-black/60 ${
                      matchData?.smogEnabled 
                        ? 'border-amber-500/50 text-amber-400' 
                        : 'border-zinc-800 border-opacity-50 text-[#8b9180]'
                    }`}>
                      {matchData?.smogEnabled ? 'HOST_ACTIVE' : 'HOST_INACTIVE'}
                    </span>
                  )}
                </div>

                {/* Squad Count Counter */}
                <div className="flex items-center justify-between gap-4 bg-black/20 p-2.5 rounded-lg border border-zinc-800 border-opacity-50/40">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-zinc-300 font-mono tracking-wider">SQUAD OPERATIONS COUNT</span>
                    <span className="text-[8px] text-[#8b9180] leading-normal uppercase">
                      Total active tactical units deployed per side
                    </span>
                  </div>
                  {isRoomHost ? (
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button"
                        disabled={(matchData?.squadSize ?? squadSize) <= 1}
                        onClick={() => {
                          handleUpdateLobbySettings(Math.max(1, (matchData?.squadSize ?? squadSize) - 1), !!matchData?.smogEnabled);
                          playSound('click');
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-black/50 border border-zinc-800 border-opacity-50 hover:border-amber-400 hover:text-amber-400 text-zinc-400 font-mono font-bold text-xs rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-14 text-center font-black text-amber-500 text-[10px] font-mono">
                        {matchData?.squadSize ?? squadSize} { (matchData?.squadSize ?? squadSize) === 1 ? 'UNIT' : 'UNITS' }
                      </span>
                      <button
                        type="button"
                        disabled={(matchData?.squadSize ?? squadSize) >= 8}
                        onClick={() => {
                          handleUpdateLobbySettings(Math.min(8, (matchData?.squadSize ?? squadSize) + 1), !!matchData?.smogEnabled);
                          playSound('click');
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-black/50 border border-zinc-800 border-opacity-50 hover:border-amber-400 hover:text-amber-400 text-zinc-400 font-mono font-bold text-xs rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 border border-zinc-800 border-opacity-50 text-zinc-400 font-mono font-black text-[8px] tracking-wider rounded-lg bg-black/60 font-bold">
                      {matchData?.squadSize ?? squadSize} { (matchData?.squadSize ?? squadSize) === 1 ? 'UNIT' : 'UNITS' } ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Launch Actions and controls */}
            <div className="space-y-3 pt-2">
              {isRoomHost ? (
                <>
                  {isOpponentConnected ? (
                    <button
                      onClick={handleLaunchBattlefield}
                      disabled={isLaunching}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-amber-700 disabled:to-amber-800 text-black font-black text-xs uppercase tracking-wider rounded-lg border border-amber-400 disabled:border-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:cursor-wait flex flex-col items-center justify-center gap-1.5"
                    >
                      {isLaunching ? (
                        <>
                          <div className="flex items-center gap-2">
                             <Loader2 className="w-4 h-4 animate-spin text-black" />
                             <span className="text-black">TRANSMITTING SECURE BLUEPRINTS...</span>
                          </div>
                          <div className="w-48 h-1 bg-black/20 rounded-full overflow-hidden">
                             <div className="h-full bg-black animate-pulse rounded-full" style={{ width: '100%', animationDuration: '1.5s' }} />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                           <Play className="w-4 h-4 fill-black text-black" /> 
                           <span>SYNCHRONIZE GRIDS & LAUNCH OPERATION</span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-500 font-extrabold text-xs uppercase tracking-wider rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> AWAITING COMM-LINK INSTANTIATION...
                    </button>
                  )}
                </>
              ) : (
                <div className="bg-amber-400/5 border border-amber-500/25 p-3 rounded-lg text-center space-y-1">
                  <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 uppercase">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> ESTABLISHED INGRESS LINK
                  </div>
                  <p className="text-[8.5px] text-zinc-400 uppercase leading-normal">
                    {matchData?.guestId !== user?.uid 
                       ? 'Spectator feed synchronized. Awaiting Host Commander to authorize tactical grid deployment blueprints and start match.'
                       : 'Frequencies synchronized. Awaiting Host Commander to authorize tactical grid deployment blueprints and start matches.'}
                  </p>
                </div>
              )}

              {/* Status checklist feed */}
              <div className="bg-black/70 border border-zinc-800 border-opacity-50/50 p-3 rounded-lg text-[8.5px] text-zinc-500 text-left space-y-1 leading-relaxed uppercase">
                <div className="flex items-center justify-between">
                  <span>[TRANS] BEACON SPECTRUM INJECTION</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>[SYS_FREQ] COMMS RESOLVER HANDSHAKE</span>
                  <span className="text-emerald-400 font-bold">AES-256 SECURED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>[LOBBY] PURPLE_CMD STATUS</span>
                  <span className={isOpponentConnected ? "text-emerald-400 font-bold" : "text-amber-400 font-bold tracking-widest animate-pulse"}>
                    {isOpponentConnected ? "SYNCHRONIZED" : "SCANNING SPECTRUM..."}
                  </span>
                </div>
              </div>

              <button
                onClick={handleAbortMatch}
                className="w-full py-2 border border-zinc-800 border-opacity-50 hover:border-purple-500 text-zinc-400 hover:text-purple-400 font-bold text-xs uppercase rounded-lg transition-colors bg-transparent cursor-pointer flex items-center justify-center gap-1.5 font-mono"
                title="Disconnect this matchmaking channel"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> ABORT TRANSMISSION & DISCONNECT
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!user?.uid) {
       return <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 flex items-center justify-center text-zinc-300 font-mono"><Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" /><span>AUTHENTICATING COMMANDER...</span></div>;
    }

    return (
       <Suspense fallback={LazyFallback}>
       <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 select-none text-zinc-300">
         <Game
           gameMode={gameMode as 'online' | 'online_coop'}
           onBack={() => { handleAbortMatch(); }}
           onlineMatch={{ id: onlineMatchId, ...matchData }}
           userId={user.uid}
           userProfile={profile}
           squadSize={squadSize}
           onMatchComplete={handleMatchComplete}
           onChallengeProgress={updateChallengeProgress}
           boardTheme={progression.activeTheme}
           playerElo={progression.elo}
         />
       </div>
       </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans p-6 flex flex-col items-center justify-start relative overflow-y-auto selection:bg-[#fbbf24] selection:text-black">
      {/* Ambient animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.04)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.03)_0%,transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.03)_0%,transparent_40%)]" />
      </div>

      {/* Subtle CRT scanlines */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(18,24,14,0)_97%,rgba(18,24,14,0.06)_97%)] bg-[length:100%_3px] pointer-events-none z-50 opacity-60"></div>

      {/* Animated radar rings */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none z-0">
        <div className="absolute inset-0 border border-zinc-800/10 rounded-full animate-[spin_60s_linear_infinite]"></div>
        <div className="absolute inset-24 border border-zinc-800/8 rounded-full animate-[spin_45s_linear_infinite_reverse]"></div>
        <div className="absolute inset-48 border border-amber-500/5 rounded-full"></div>
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-zinc-800/10 to-transparent"></div>
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-zinc-800/10 to-transparent"></div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[15%] w-1 h-1 rounded-full bg-amber-500/30 animate-particle" />
        <div className="absolute top-[30%] right-[20%] w-1.5 h-1.5 rounded-full bg-sky-500/20 animate-particle-slow" style={{animationDelay: '1s'}} />
        <div className="absolute top-[60%] left-[70%] w-1 h-1 rounded-full bg-purple-500/25 animate-particle" style={{animationDelay: '3s'}} />
        <div className="absolute top-[80%] left-[25%] w-1 h-1 rounded-full bg-emerald-500/20 animate-particle-slow" style={{animationDelay: '2s'}} />
      </div>

      <div className="w-full max-w-2xl mx-auto z-10 flex flex-col gap-6 relative pt-4 pb-12">
         {/* Hero Header */}
         <div className="text-center space-y-4 pb-4 border-b border-zinc-800/30 relative">
           <button
             onClick={toggleSound}
             className="absolute right-0 top-0 p-2.5 rounded-xl border border-zinc-800/50 bg-zinc-900/80 text-zinc-500 hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-300 backdrop-blur-sm"
             title={soundEnabled ? "Disable Audio" : "Enable Audio"}
           >
             {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
           </button>
           <div className="w-20 h-20 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700/50 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.1),0_0_60px_rgba(251,191,36,0.05)] mx-auto relative group">
              <div className="absolute inset-0 rounded-2xl bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Target className="w-9 h-9 text-amber-500/40 absolute scale-110 blur-sm animate-pulse" />
              <Target className="w-9 h-9 text-amber-400 relative z-10 transition-transform group-hover:rotate-90 duration-700" />
           </div>
           <div>
             <h1 className="text-5xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-white to-zinc-300 uppercase" style={{fontFamily: 'Orbitron, monospace'}}>
               TACTICAL
             </h1>
             <h1 className="text-5xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 uppercase mt-[-4px] drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]" style={{fontFamily: 'Orbitron, monospace'}}>
               COMMAND
             </h1>
           </div>
           <div className="flex items-center justify-center gap-4 text-[9px] font-mono text-zinc-500 tracking-wider uppercase">
             <span className="text-zinc-600">SYS v2.1.0</span>
             <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
             <span className="text-zinc-600">AES-256</span>
             <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
             <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse"></span> <span className="text-emerald-500/80">ONLINE</span></span>
           </div>
         </div>

         {/* Match Configuration */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Smog Toggle */}
            <div className={`relative rounded-xl p-4 border transition-all duration-300 ${smogMode ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.06)]' : 'bg-zinc-900/60 border-zinc-800/50'}`}>
               <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${smogMode ? 'bg-amber-500/15 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]' : 'bg-zinc-800/50 text-zinc-500'}`}>
                        <Wind className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="text-sm font-mono font-black text-zinc-200 uppercase tracking-wider leading-none">FOG OF WAR</h4>
                        <p className="text-[10px] text-zinc-500 mt-1 uppercase">Limits visibility to unit sight ranges</p>
                     </div>
                  </div>
                  <button
                     type="button"
                     title={smogMode ? "Disable Fog of War" : "Enable Fog of War"}
                     onClick={() => { setSmogMode(!smogMode); playSound('click'); }}
                     className={`relative w-12 h-7 rounded-full transition-all duration-300 cursor-pointer shrink-0 ${smogMode ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'bg-zinc-700'}`}
                  >
                     <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${smogMode ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'}`} />
                  </button>
               </div>
            </div>

            {/* Squad Size */}
            <div className="relative rounded-xl p-4 border bg-zinc-900/60 border-zinc-800/50">
               <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800/50 text-zinc-500 flex items-center justify-center">
                     <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                     <h4 className="text-sm font-mono font-black text-zinc-200 uppercase tracking-wider leading-none flex items-center gap-2">
                        SQUAD SIZE
                        <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.5 font-black rounded-md leading-none">{squadSize}</span>
                     </h4>
                     <p className="text-[10px] text-zinc-500 mt-1 uppercase">Units per side</p>
                  </div>
               </div>
               <div className="flex flex-col gap-1.5">
                 <input
                   type="range"
                   min="1"
                   max="8"
                   aria-label="Squad size"
                   value={squadSize}
                   onChange={(e) => { setSquadSize(parseInt(e.target.value)); playSound('click'); }}
                   className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                 />
                 <div className="flex justify-between px-0.5 text-[8px] font-mono text-zinc-600">
                   {[1,2,3,4,5,6,7,8].map(n => (
                     <span key={n} className={n === squadSize ? 'text-amber-400 font-bold' : ''}>{n}</span>
                   ))}
                 </div>
               </div>
            </div>
         </div>

         {/* Modes Selection */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setGameMode('campaign')}
              className="group relative p-6 rounded-2xl text-left transition-all duration-300 cursor-pointer overflow-hidden border border-emerald-500/20 hover:border-emerald-400/50 bg-gradient-to-br from-emerald-950/30 via-zinc-950/80 to-zinc-950/90 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transform hover:-translate-y-0.5"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-10 flex flex-col gap-3">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/15 group-hover:border-emerald-400/40 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                     <Globe className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                   </div>
                   <div>
                     <h3 className="font-black text-white text-lg font-mono tracking-wider uppercase">CAMPAIGN</h3>
                     <p className="text-[10px] text-emerald-500/60 font-mono uppercase tracking-wider">Global Operations</p>
                   </div>
                 </div>
                 <p className="text-xs text-zinc-400 leading-relaxed">Command your squad across international battle sectors. Progressive difficulty.</p>
               </div>
               <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </button>
            <button
              onClick={() => setGameMode('local_ai')}
              className="group relative p-6 rounded-2xl text-left transition-all duration-300 cursor-pointer overflow-hidden border border-amber-500/20 hover:border-amber-400/50 bg-gradient-to-br from-amber-950/20 via-zinc-950/80 to-zinc-950/90 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transform hover:-translate-y-0.5"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-10 flex flex-col gap-3">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/15 group-hover:border-amber-400/40 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                     <Cpu className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                   </div>
                   <div>
                     <h3 className="font-black text-white text-lg font-mono tracking-wider uppercase">VS AI</h3>
                     <p className="text-[10px] text-amber-500/60 font-mono uppercase tracking-wider">Offline Simulator</p>
                   </div>
                 </div>
                 <p className="text-xs text-zinc-400 leading-relaxed">Deploy a customized tactical squad and play against the smart combat AI.</p>
               </div>
               <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </button>
            <button
              onClick={() => setGameMode('local_p2p')}
              className="group relative p-6 rounded-2xl text-left transition-all duration-300 cursor-pointer overflow-hidden border border-sky-500/20 hover:border-sky-400/50 bg-gradient-to-br from-sky-950/20 via-zinc-950/80 to-zinc-950/90 hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] transform hover:-translate-y-0.5"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-10 flex flex-col gap-3">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/15 group-hover:border-sky-400/40 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                     <Users className="w-6 h-6 text-sky-400 group-hover:scale-110 transition-transform duration-300" />
                   </div>
                   <div>
                     <h3 className="font-black text-white text-lg font-mono tracking-wider uppercase">PASS & PLAY</h3>
                     <p className="text-[10px] text-sky-500/60 font-mono uppercase tracking-wider">Local 2-Player</p>
                   </div>
                 </div>
                 <p className="text-xs text-zinc-400 leading-relaxed">Hotseat 2-player mode. Formulate tactics, then hand off command.</p>
               </div>
               <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </button>
            <button
              onClick={() => setGameMode('tutorial')}
              className="group relative p-6 rounded-2xl text-left transition-all duration-300 cursor-pointer overflow-hidden border border-purple-500/20 hover:border-purple-400/50 bg-gradient-to-br from-purple-950/20 via-zinc-950/80 to-zinc-950/90 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] transform hover:-translate-y-0.5"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-10 flex flex-col gap-3">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/15 group-hover:border-purple-400/40 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                     <BookOpen className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform duration-300" />
                   </div>
                   <div>
                     <h3 className="font-black text-white text-lg font-mono tracking-wider uppercase flex items-center gap-2">ACADEMY <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-black text-[8px] px-1.5 font-black py-0.5 rounded-md leading-none">NEW</span></h3>
                     <p className="text-[10px] text-purple-500/60 font-mono uppercase tracking-wider">Interactive Tutorial</p>
                   </div>
                 </div>
                 <p className="text-xs text-zinc-400 leading-relaxed">Learn movement, analyze core abilities, and try different character classes.</p>
               </div>
               <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            </button>
         </div>

         {/* Online Section */}
         <div className="relative rounded-2xl p-5 border border-zinc-800/40 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-sky-500/[0.02]" />
            <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800/30 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Globe className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="font-black text-zinc-200 text-sm font-mono uppercase tracking-wider">MULTIPLAYER</h3>
            </div>

            {loading || profileLoading ? (
               <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : !user ? (
               <div className="text-center py-2 font-mono space-y-4">
                 <p className="text-[10px] text-[#8b9180] uppercase">Sign in to create or join a match.</p>
                 <button type="button" onClick={handleLogin} className="flex items-center justify-center gap-2 w-full py-3 bg-[#fbbf24] text-zinc-950 hover:bg-amber-300 font-extrabold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md">
                   <LogIn className="w-4 h-4" /> SIGN IN WITH GOOGLE
                 </button>
                 <div className="border-t border-zinc-800/30 pt-4">
                   <p className="text-[10px] text-zinc-500 uppercase mb-2">Have an invite code? Sign in first, then enter it below.</p>
                   <div className="flex gap-2 w-full h-11">
                     <input
                       value={joinCode}
                       onChange={e => setJoinCode(e.target.value.toUpperCase())}
                       placeholder="ROOM CODE"
                       maxLength={6}
                       className="w-full h-full bg-black/60 border border-zinc-800 border-opacity-50 focus:border-amber-400 rounded-lg px-3 text-sm text-[#fbbf24] font-mono uppercase tracking-widest outline-none text-center"
                     />
                     <button type="button" onClick={handleLogin} disabled={joinCode.length < 5} className="px-6 h-full bg-[#202716] hover:bg-[#2d3a20] border border-zinc-800 border-opacity-50 text-zinc-300 text-sm font-bold rounded-lg uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer">
                       SIGN IN & JOIN
                     </button>
                   </div>
                 </div>
               </div>
            ) : (
               <div className="space-y-4 font-mono">
                  {/* Profile Section */}
                  <div className="flex items-center justify-between border-b border-zinc-800 border-opacity-50/30 pb-3">
                     <div className="flex items-center gap-3">
                        <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="avatar" className="w-10 h-10 rounded-md border border-zinc-800 border-opacity-50 p-0.5 bg-zinc-950" />
                        <div className="text-left leading-none">
                           {(!profile || editingProfile) ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  autoFocus
                                  value={displayNameInput} 
                                  onChange={e => setDisplayNameInput(e.target.value)} 
                                  className="bg-black border border-zinc-800 border-opacity-50 rounded-lg px-2 py-1 text-xs text-white w-32 outline-none focus:border-amber-400 font-mono"
                                  placeholder="CO Name"
                                />
                                <button onClick={saveProfile} className="text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded-lg">SAVE</button>
                              </div>
                           ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#fbbf24] text-xs uppercase">{profile.displayName}</span>
                                <button onClick={() => setEditingProfile(true)} className="text-[7.5px] text-amber-400 hover:text-amber-300 uppercase tracking-widest font-extrabold px-1.5 py-0.5 bg-amber-400/10 rounded-lg border border-amber-400/20">RE-ID</button>
                              </div>
                           )}
                           <div className="text-[8.5px] text-[#8b9180] mt-1 uppercase">GRID_KEY: {user.email?.split('@')[0]}</div>
                        </div>
                     </div>
                     <button onClick={() => signOut(auth)} className="p-2 hover:bg-[#202716] rounded-lg border border-transparent hover:border-zinc-800 border-opacity-50 text-[#8b9180] hover:text-zinc-300 transition-colors" title="De-Authorize Profile">
                        <LogOut className="w-4 h-4" />
                     </button>
                  </div>

                  {/* Room Actions */}
                  {user && !editingProfile && (
                     <div className="flex flex-col gap-4 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <button onClick={() => createRoom(false)} className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/35 text-[#fbbf24] font-bold border border-amber-500/50 rounded-lg text-sm sm:text-base uppercase tracking-wider transition-all cursor-pointer">
                             ESTABLISH PRIVATE ROOM
                           </button>
                           <button onClick={() => createRoom(false, true)} className="w-full py-3 bg-sky-500/20 hover:bg-sky-500/35 text-sky-400 font-bold border border-sky-500/50 rounded-lg text-sm sm:text-base uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2">
                             ESTABLISH CO-OP ROOM
                           </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                           <button onClick={quickMatch} className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 font-bold border border-emerald-500/50 rounded-lg text-sm sm:text-base uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2">
                             <Zap className="w-5 h-5" /> QUICK MATCH
                           </button>
                        </div>
                        <form onSubmit={joinRoom} className="flex gap-2 w-full h-11">
                           <input 
                             value={joinCode} 
                             onChange={e => setJoinCode(e.target.value.toUpperCase())}
                             placeholder="JOIN CODE_KEY"
                             maxLength={6}
                             className="w-full h-full bg-black/60 border border-zinc-800 border-opacity-50 focus:border-amber-400 rounded-lg px-3 text-sm sm:text-base text-[#fbbf24] font-mono uppercase tracking-widest outline-none text-center"
                           />
                           <button type="submit" disabled={joinCode.length < 5} className="px-6 h-full bg-[#202716] hover:bg-[#2d3a20] border border-zinc-800 border-opacity-50 text-zinc-300 text-sm sm:text-base font-bold rounded-lg uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                               CONNECT
                           </button>
                        </form>
                     </div>
                  )}
               </div>
            )}
         </div>
         </div>

         {/* Interactive Tactical Dossier Database */}
         <div className="relative rounded-2xl p-5 border border-zinc-800/40 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm flex flex-col gap-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent" />
            <div className="relative z-10 flex items-center justify-between border-b border-zinc-800/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="font-mono text-sm font-black text-zinc-200 tracking-wider uppercase">TACTICAL DATABASE</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setDbTab('tutorial')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-mono uppercase rounded-lg transition-all font-black border ${
                    dbTab === 'tutorial' 
                      ? 'bg-amber-500/10 text-[#fbbf24] border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.1)]' 
                      : 'text-zinc-500 border-transparent hover:text-zinc-300 cursor-pointer'
                  }`}
                >
                  Field Manual
                </button>
                <button 
                  onClick={() => setDbTab('classes')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-mono uppercase rounded-lg transition-all font-black border ${
                    dbTab === 'classes' 
                      ? 'bg-amber-500/10 text-[#fbbf24] border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.1)]' 
                      : 'text-zinc-500 border-transparent hover:text-zinc-300 cursor-pointer'
                  }`}
                >
                  Squad Bios
                </button>
                <button 
                  onClick={() => setDbTab('chemistries')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-mono uppercase rounded-lg transition-all font-black border ${
                    dbTab === 'chemistries' 
                      ? 'bg-amber-500/10 text-[#fbbf24] border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.1)]' 
                      : 'text-zinc-500 border-transparent hover:text-zinc-300 cursor-pointer'
                  }`}
                >
                  Squad Chemistries
                </button>
              </div>
            </div>

            {/* TAB CONTENT: TUTORIAL */}
            {dbTab === 'tutorial' && (
              <div className="space-y-4 text-left font-mono text-xs sm:text-sm text-[#8b9180] leading-relaxed">
                <div className="border border-zinc-800 border-opacity-50/40 bg-black/25 p-4 rounded-lg space-y-2">
                  <h4 className="font-bold text-zinc-300 uppercase text-xs sm:text-sm tracking-wide flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#fbbf24]" /> 01. OBJECTIVE CONFIGURATION
                  </h4>
                  <p className="uppercase">
                    Your direct mandate is simple: utilize superior cover positioning, smart lines of sight flanking vectors, and specific class actions to completely neutralize all 4 enemy squad units on the grid battlefield.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-zinc-800 border-opacity-50/30 bg-black/10 p-4 rounded-lg space-y-2">
                    <h5 className="font-black text-zinc-300 uppercase text-[10px] sm:text-xs">SQUAD DEPLOYMENT</h5>
                    <p className="uppercase text-[10px] sm:text-xs">
                      Before engagement begins, you must recruit, select and deploy 4 team members on highlighted quadrant cells in rows 8 to 14. Once locked, tap "Launch" to synchronize terminal frequencies.
                    </p>
                  </div>
                  <div className="border border-zinc-800 border-opacity-50/30 bg-black/10 p-4 rounded-lg space-y-2">
                    <h5 className="font-black text-zinc-300 uppercase text-[10px] sm:text-xs">ACTION SYSTEM (AP)</h5>
                    <p className="uppercase text-[10px] sm:text-xs">
                      Every active squad unit receives exactly 2 Action Points (AP) per turn. Standard movement costs 1 AP (mobility metric scales cell ranges). Initiating a coordinate weapon attack costs 1 AP.
                    </p>
                  </div>
                </div>

                <div className="border border-zinc-800 border-opacity-50/40 bg-black/25 p-4 rounded-lg space-y-2">
                  <h4 className="font-bold text-zinc-300 uppercase text-xs sm:text-sm tracking-wide flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" /> 02. COVER & LINE-OF-SIGHT (LOS)
                  </h4>
                  <p className="uppercase">
                    Solid walls and cargo crates absorb primary dynamic ordnance. If a direct tracing vector from shooting coordinate to hostile coordinate hits an obstacle, firing is blocked! Sniper Piercing Rounds ignore cover penalties but are still blockable by walls and crates. Technicians can build crates anywhere on adjacent floor grids.
                  </p>
                </div>

                <div className="text-center text-[#fbbf24] font-black uppercase text-[10px] sm:text-xs border border-dashed border-zinc-800 border-opacity-50 p-2 rounded-lg animate-pulse">
                  ⚡ PRO TIP: ALWAYS INJECT WEAK SQUADMATES WITH SPECIAL MEDIC NANITES TO RESTORE HEALTH DURING AI FLANK ACTIONS!
                </div>

                <div className="border border-amber-500/15 p-3 bg-amber-400/5 rounded-lg text-center">
                  <button 
                    onClick={() => setGameMode('tutorial')}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs sm:text-sm tracking-wider rounded-lg uppercase cursor-pointer"
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
                <div className="md:col-span-5 flex flex-col gap-1 max-h-[300px] overflow-y-auto border border-zinc-800 border-opacity-50/30 p-1.5 rounded-lg bg-black/25">
                  {CLASSES.map((c) => {
                    const isActive = activeClassDesc === c.className;
                    return (
                      <button
                        key={c.className}
                        onClick={() => setActiveClassDesc(c.className)}
                        className={`w-full py-2 px-3 text-left rounded-lg text-xs sm:text-sm font-bold tracking-tight uppercase border transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                          isActive 
                            ? 'bg-amber-500/15 border-amber-500/70 text-[#fbbf24]' 
                            : 'bg-transparent border-transparent text-[#8b9180] hover:bg-black/35 hover:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UnitHelmetAvatar classNameVal={c.className} className="w-5 h-5 shrink-0" />
                          <span>{c.className}</span>
                        </div>
                        {c.ability && (
                          <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                            <AbilityTooltip ability={c.ability} classNameVal={c.className}>
                              <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/8 border border-amber-500/30 hover:border-[#fbbf24] text-[#fbbf24] hover:text-white hover:bg-amber-400/20 text-[9px] sm:text-[10px] font-mono tracking-normal leading-none shrink-0 inline-block align-middle transition-all lowercase italic">
                                {c.ability.name}
                              </span>
                            </AbilityTooltip>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Class detailed metrics */}
                {(() => {
                  const c = CLASSES.find(cl => cl.className === activeClassDesc) || CLASSES[0];
                  
                  const progress = (profile as any)?.characterProgress?.[c.className] || { xp: 0, level: 1, boosts: [] };
                  const boosts = progress.boosts || [];
                  const boostedStats = getBoostedStats(c.stats, boosts);

                  // Compute stats percentage bars
                  const hpPerc = Math.min(100, Math.round((boostedStats.maxHP / 150) * 100));
                  const dmgPerc = Math.min(100, Math.round((boostedStats.damage / 60) * 100));
                  const rangePerc = Math.min(100, Math.round((boostedStats.range / 10) * 100));
                  const speedPerc = Math.min(100, Math.round((boostedStats.mobility / 7) * 100));

                  return (
                    <div className="md:col-span-7 border border-zinc-800 border-opacity-50/40 bg-black/40 p-4 rounded-lg flex flex-col justify-between min-h-[300px] relative">
                      <div>
                        {/* Helmet + name block */}
                        <div className="flex gap-3 items-center mb-3 pb-2 border-b border-zinc-800 border-opacity-50/20">
                          <UnitHelmetAvatar classNameVal={c.className} className="w-12 h-12 shrink-0 border-zinc-800 border-opacity-50" />
                          <div className="leading-tight">
                            <h4 className="text-sm sm:text-base font-black text-white uppercase">{c.className}</h4>
                            <span className="text-[10px] sm:text-xs text-[#fbbf24] font-bold uppercase tracking-widest">{c.archetype} TYPE</span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-[#8b9180] bg-black/50 border border-zinc-800 border-opacity-50/40 rounded-lg px-1.5 py-0.5 ml-auto uppercase shrink-0">
                            TRAIT: {c.personality}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-[10px] sm:text-xs text-[#8b9180] leading-relaxed uppercase mb-3">
                          {c.description}
                        </p>

                        {/* Active Ability Info */}
                        {c.ability && (
                          <AbilityTooltip ability={c.ability} classNameVal={c.className}>
                            <div className="bg-amber-400/5 border border-zinc-800 border-opacity-50/30 hover:border-amber-500/60 p-3 rounded-lg mb-3 font-mono text-[9px] sm:text-[10px] uppercase transition-all cursor-help">
                              <div className="flex justify-between font-black text-[#fbbf24] mb-1">
                                <span className="flex items-center gap-1">SPEC_ABIL: {c.ability.name} <span className="text-[8px] text-zinc-500 font-normal tracking-wide lowercase italic">(hover for full specs)</span></span>
                                <span>COST: {c.ability.apCost} AP</span>
                              </div>
                              <p className="text-[#8b9180] lowercase italic leading-relaxed first-letter:uppercase">
                                {c.ability.description}
                              </p>
                            </div>
                          </AbilityTooltip>
                        )}

                        {/* Level Up & Stat boost panels */}
                        {user && profile ? (() => {
                          const levelInfo = getCharacterLevelInfo(progress.xp);
                          const availablePoints = levelInfo.maxUpgrades - boosts.length;

                          return (
                            <div className="mt-3 pt-3 border-t border-zinc-800 border-opacity-50/20">
                              {/* Level display bar */}
                              <div className="flex gap-2.5 items-center mb-3 text-[10px] sm:text-[11px] bg-sky-950/20 border border-sky-500/20 rounded-lg p-2 font-mono">
                                <div className="font-extrabold text-[#38bdf8] shrink-0 uppercase tracking-widest">
                                  LEVEL {levelInfo.level}
                                </div>
                                <div className="flex-1 bg-black/50 h-2.5 rounded-md border border-sky-900/30 overflow-hidden relative">
                                  <div className="bg-sky-400 h-full transition-all duration-500" style={{ width: `${levelInfo.percentage}%` }} />
                                </div>
                                <div className="text-zinc-400 font-bold shrink-0">
                                  {levelInfo.xp} / {levelInfo.isMaxLevel ? 'MAX' : levelInfo.nextLevelXp} XP
                                </div>
                              </div>

                              {/* Upgrade modules */}
                              <div className="bg-black/25 border border-zinc-800 border-opacity-50/30 p-2 rounded-lg">
                                <div className="flex justify-between items-center mb-1 pb-1 border-b border-zinc-800 border-opacity-50/15">
                                  <span className="text-[7.5px] font-black text-[#fbbf24] uppercase flex items-center gap-1.5">
                                    <Cpu className="w-3 h-3 text-[#fbbf24] animate-pulse" /> TACTICAL UPGRADE CHIPSETS
                                  </span>
                                  <span className="text-[7.5px] font-bold text-zinc-400">
                                    {availablePoints > 0 ? `${availablePoints} SLOT(S) AVAILABLE` : '0 SLOTS'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-[7px] font-bold uppercase select-none">
                                  {[
                                    { id: 'HP_BOOST', label: 'Nano-Plating Upgrade', desc: '+15 MAX HP' },
                                    { id: 'DMG_BOOST', label: 'High-Velocity Rounds', desc: '+4 ATTACK DMG' },
                                    { id: 'RANGE_BOOST', label: 'Subviser Rangefinder', desc: '+1 WEAPON RANGE' },
                                    { id: 'ACC_BOOST', label: 'Sensor Optimization', desc: '+10% ACCURACY' },
                                  ].map((m) => {
                                    const unlocked = boosts.includes(m.id);
                                    return (
                                      <button
                                        key={m.id}
                                        disabled={unlocked || availablePoints <= 0}
                                        onClick={() => handleUnlockBoost(c.className, m.id)}
                                        className={`p-1.5 rounded-lg transition-all flex flex-col text-left border ${
                                          unlocked
                                            ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-400 cursor-not-allowed'
                                            : availablePoints > 0
                                              ? 'bg-sky-500/5 border-sky-500/40 text-sky-400 hover:bg-sky-500/15 cursor-pointer'
                                              : 'bg-transparent border-zinc-800 border-opacity-50/30 text-[#8b9180] cursor-not-allowed'
                                        }`}
                                      >
                                        <div className="flex justify-between w-full font-black leading-tight">
                                          <span>{m.label}</span>
                                          {unlocked && <span className="text-emerald-450 text-[6.5px]">✓</span>}
                                        </div>
                                        <span className={`text-[6.5px] leading-tight mt-0.5 font-bold ${unlocked ? 'text-emerald-500/80' : 'text-zinc-500'}`}>
                                          {m.desc}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {boosts.length > 0 && (
                                  <button
                                    onClick={() => handleResetBoosts(c.className)}
                                    className="w-full mt-2.5 py-1 text-center bg-purple-950/15 border border-purple-500/30 text-purple-400 rounded-lg text-[7px] font-bold hover:bg-purple-950/30 transition-all cursor-pointer uppercase flex items-center justify-center gap-1"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" /> RESET CHIPSET ALLOCATIONS
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="mt-2 p-3 border border-zinc-800 border-opacity-50/20 bg-black/10 rounded-lg text-center text-[10px] sm:text-xs text-[#8b9180] uppercase tracking-wider">
                            🔑 Sign in to enable persistent squad levelling & upgrade modules
                          </div>
                        )}
                      </div>

                      {/* Stat Bars Grid */}
                      <div className="space-y-2 pt-2 border-t border-zinc-800 border-opacity-50/20 text-[9px] sm:text-[10px] font-bold text-[#8b9180] mt-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>HEALTH MAX (HP)</span>
                            {boosts.includes('HP_BOOST') ? (
                              <span className="text-emerald-400 font-black">{boostedStats.maxHP} pts <span className="text-emerald-500 font-bold text-[8px] sm:text-[9px] ml-1">(+15 HP BOOST ACTIVE)</span></span>
                            ) : (
                              <span className="text-white">{c.stats.maxHP} pts</span>
                            )}
                          </div>
                          <div className="w-full bg-black/40 h-2 rounded-md border border-zinc-800 border-opacity-50 overflow-hidden p-[0.5px]">
                            <div className={`h-full rounded-md ${boosts.includes('HP_BOOST') ? 'bg-emerald-400' : 'bg-emerald-600'}`} style={{ width: `${hpPerc}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span>ATTACK EXERT (DMG)</span>
                            {boosts.includes('DMG_BOOST') ? (
                              <span className="text-emerald-400 font-black">{boostedStats.damage} pts <span className="text-emerald-500 font-bold text-[8px] sm:text-[9px] ml-1">(+4 ATK BOOST ACTIVE)</span></span>
                            ) : (
                              <span className="text-white">{c.stats.damage} pts</span>
                            )}
                          </div>
                          <div className="w-full bg-black/40 h-2 rounded-md border border-zinc-800 border-opacity-50 overflow-hidden p-[0.5px]">
                            <div className={`h-full rounded-md ${boosts.includes('DMG_BOOST') ? 'bg-emerald-400' : 'bg-orange-500'}`} style={{ width: `${dmgPerc}%` }} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span>WEAPON RANGE</span>
                              {boosts.includes('RANGE_BOOST') ? (
                                <span className="text-emerald-400 font-black">{boostedStats.range} <span className="text-emerald-500 font-bold text-[8px] sm:text-[9px] ml-1">(+1 RG ACTIVE)</span></span>
                              ) : (
                                <span className="text-white">{c.stats.range}</span>
                              )}
                            </div>
                            <div className="w-full bg-black/40 h-1.5 rounded-md border border-zinc-800 border-opacity-50 overflow-hidden p-[0.5px]">
                              <div className={`h-full rounded-md ${boosts.includes('RANGE_BOOST') ? 'bg-emerald-450' : 'bg-sky-400'}`} style={{ width: `${rangePerc}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span>MOBILITY RANGE</span>
                              <span className="text-white">{c.stats.mobility}</span>
                            </div>
                            <div className="w-full bg-zinc-950 h-1.5 rounded-md border border-zinc-800 border-opacity-50 overflow-hidden p-[0.5px]">
                              <div className="bg-yellow-400 h-full rounded-md" style={{ width: `${speedPerc}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Show extra Sensor/Tac tactical stats adjustments if boosted */}
                        {boosts.includes('ACC_BOOST') && (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-lg mt-3 flex items-center justify-between text-[8px] sm:text-[9px] text-[#8b9180] tracking-wider uppercase font-bold">
                            <span className="text-emerald-400">⚡ SENSOR OPTIMIZATION (TACTICAL IMPLANT ACTIVE)</span>
                            <span className="text-emerald-300 font-extrabold">+10% TAC ACCURACY</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB CONTENT: SQUAD CHEMISTRIES */}
            {dbTab === 'chemistries' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-mono">
                {CHEMISTRIES.map((c) => {
                  const classA = c.classes[0];
                  const classB = c.classes[1];
                  
                  // Get progress levels if authenticated
                  const progA = (profile as any)?.characterProgress?.[classA] || { xp: 0, level: 1 };
                  const progB = (profile as any)?.characterProgress?.[classB] || { xp: 0, level: 1 };
                  
                  return (
                    <div key={c.id} className="border border-zinc-800 border-opacity-50/45 bg-black/45 p-4 rounded-2xl flex flex-col justify-between hover:border-amber-500/35 transition-all duration-300 relative group">
                      <div className="absolute top-3 right-3 bg-amber-500/5 border border-amber-500/20 text-[#fbbf24] text-[8px] sm:text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest">
                        SYNERGY DUO
                      </div>
                      
                      <div>
                        <h4 className="font-extrabold text-[#fbbf24] uppercase text-xs sm:text-sm tracking-wide flex items-center gap-1.5 mb-2 animate-pulse">
                          <Zap className="w-4 h-4 text-[#fbbf24]" /> {c.name}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-[#8b9180] uppercase mb-4 leading-relaxed">
                          {c.description}
                        </p>
                        
                        {/* Chemistry visual linking */}
                        <div className="flex items-center gap-3 bg-black/20 border border-zinc-800 border-opacity-50/20 p-3 rounded-lg mb-4 justify-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <UnitHelmetAvatar classNameVal={classA} className="w-9 h-9 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.2)]" />
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-zinc-300 uppercase">{classA}</span>
                            {user && profile && (
                              <span className="text-[8px] text-zinc-500 font-bold uppercase">LV {progA.level || 1}</span>
                            )}
                          </div>
                          
                          <div className="h-[2px] flex-1 bg-gradient-to-r from-amber-500/10 via-amber-500/60 to-amber-500/10 flex items-center justify-center relative mx-2">
                            <span className="absolute bg-zinc-950 border border-zinc-800 border-opacity-50 text-[#fbbf24] text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                              +
                            </span>
                          </div>
                          
                          <div className="flex flex-col items-center gap-1.5">
                            <UnitHelmetAvatar classNameVal={classB} className="w-9 h-9 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.2)]" />
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-zinc-300 uppercase">{classB}</span>
                            {user && profile && (
                              <span className="text-[8px] text-zinc-500 font-bold uppercase">LV {progB.level || 1}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Buff Override Info */}
                      <div className="bg-sky-950/10 border border-sky-500/20 p-3 rounded-lg text-[10px] sm:text-xs text-[#8b9180] relative overflow-hidden mt-2">
                        <span className="text-sky-400 font-black tracking-wider uppercase block text-[8px] sm:text-[9px] mb-1">
                          ⚡ TACTICAL SYNERGY PASSIVE:
                        </span>
                        <div className="text-zinc-300 font-bold tracking-tight leading-relaxed uppercase">
                          {c.buffText}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
         </div>

         {/* Progression Tabs */}
         <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/30">
           {(['play', 'progress', 'shop'] as const).map(tab => (
             <button
               key={tab}
               type="button"
               onClick={() => setMenuTab(tab)}
               className={`flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer font-mono ${
                 menuTab === tab
                   ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                   : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
               }`}
             >
               {tab === 'play' ? 'Intel' : tab === 'progress' ? 'Progress' : 'Armory'}
             </button>
           ))}
         </div>

         <Suspense fallback={<div className="flex items-center justify-center py-8 text-zinc-500 font-mono text-xs"><Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-2" />LOADING...</div>}>
         {menuTab === 'play' && (
           <>
             {user && <PlayerStats progression={progression} />}
             <DailyChallenges challenges={progression.dailyChallenges} />
             {user && <FriendList />}
             <CommanderLeaderboard />
             <MatchHistory />
           </>
         )}

         {menuTab === 'progress' && (
           <>
             {user && <PlayerStats progression={progression} />}
             <SeasonPass seasonXP={progression.seasonXP} seasonLevel={progression.seasonLevel} />
             <MatchHistory />
           </>
         )}

         {menuTab === 'shop' && (
           <CosmeticShop
             credits={progression.credits}
             unlockedThemes={progression.unlockedThemes}
             activeTheme={progression.activeTheme}
             onPurchase={handlePurchaseTheme}
             onEquip={handleEquipTheme}
           />
         )}
         </Suspense>
      </div>
    </div>
  );
}
